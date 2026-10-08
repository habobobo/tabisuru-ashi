import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

test('actual Supabase SDK and route handlers: verified login, allowlist and logout',async()=>{
  const ownerId='00000000-0000-4000-8000-000000000001';
  const expires=Math.floor(Date.now()/1000)+3600;
  const user=email=>({id:ownerId,aud:'authenticated',role:'authenticated',email,email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()});
  const token=email=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:ownerId,email,role:'authenticated',aud:'authenticated',exp:expires})).toString('base64url'),'test-signature'].join('.');
  let userLookups=0;
  const auth=http.createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    res.setHeader('Content-Type','application/json');
    if(req.url.startsWith('/auth/v1/token')){
      const b=JSON.parse(body);
      if(b.password!=='test-password'){res.writeHead(400);res.end(JSON.stringify({code:'invalid_credentials',msg:'Invalid login credentials'}));return;}
      res.end(JSON.stringify({access_token:token(b.email),token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'test-refresh',user:user(b.email)}));return;
    }
    if(req.url==='/auth/v1/user'){
      userLookups++;
      const bearer=(req.headers.authorization||'').replace('Bearer ','');
      try{const b=JSON.parse(Buffer.from(bearer.split('.')[1],'base64url').toString());if(bearer!==token(b.email))throw Error();res.end(JSON.stringify(user(b.email)));}catch{res.writeHead(401);res.end(JSON.stringify({msg:'Invalid token'}));}return;
    }
    if(req.url==='/rest/v1/rpc/is_admitted'){
      const bearer=(req.headers.authorization||'').replace('Bearer ','');
      const b=JSON.parse(Buffer.from(bearer.split('.')[1],'base64url').toString());res.end(JSON.stringify(b.email==='owner@example.com'));return;
    }
    if(req.url.startsWith('/auth/v1/logout')){res.writeHead(204);res.end();return;}
    res.writeHead(404);res.end('{}');
  });
  await new Promise(r=>auth.listen(0,'127.0.0.1',r));
  const folder=await mkdtemp(join(tmpdir(),'tabisuru-auth-'));
  process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:'+auth.address().port;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-publishable-key';
  try{
    await build({stdin:{contents:`export {POST as login} from './app/api/auth/login/route.ts';export {POST as logout} from './app/api/auth/logout/route.ts';export {identity,sameOrigin} from './lib/storage.ts';export {context} from 'next/headers';export {validateExperience,kinds} from './lib/types.ts';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:join(folder,'routes.mjs'),banner:{js:"import {createRequire} from 'node:module';const require=createRequire(import.meta.url);"},plugins:[{name:'test-cookie-context',setup(b){b.onResolve({filter:/^next\/headers$/},()=>({path:'cookies',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`import {AsyncLocalStorage} from 'node:async_hooks';export const context=new AsyncLocalStorage();export async function cookies(){return context.getStore();}`,loader:'js'}));}}]});
    const {login,logout,identity,sameOrigin,context,validateExperience,kinds}=await import(pathToFileURL(join(folder,'routes.mjs')).href);
    const passing={cityId:'310000',kind:'pass',startDate:'2026-10-01',endDate:'2026-10-02',ongoing:false,note:'  换乘  '};
    assert.deepEqual(validateExperience(passing,new Set(['310000'])),{...passing,note:'换乘'});
    assert.equal(kinds.pass.level,2);
    for(const kind of ['unknown','toString','__proto__'])assert.throws(()=>validateExperience({...passing,kind},new Set(['310000'])),/经历类型/);
    assert.throws(()=>validateExperience({...passing,startDate:'2026-02-30'},new Set(['310000'])),/时间格式/);
    const jar=()=>{const m=new Map();return {getAll:()=>[...m].map(([name,value])=>({name,value})),set:(name,value)=>m.set(name,value)};};
    const request=(email,password='test-password')=>new Request('http://localhost/api/auth/login',{method:'POST',headers:{'host':'travel.example.com','x-forwarded-proto':'https','origin':'https://travel.example.com','Content-Type':'application/json'},body:JSON.stringify({email,password})});
    assert.equal(sameOrigin(request('owner@example.com')),true);
    assert.equal(sameOrigin(new Request('https://travel.example.com',{method:'POST',headers:{origin:'https://attacker.example'}})),false);
    assert.equal(sameOrigin(new Request('https://travel.example.com')),false);
    await context.run(jar(),()=>assert.rejects(identity(),e=>e.status===401));
    const ownerCookies=jar();
    await context.run(ownerCookies,async()=>{
      assert.equal((await login(request('owner@example.com','bad-password'))).status,401);
      assert.equal((await login(request('OWNER@example.com'))).status,200);
      const u=await identity();assert.equal(u.email,'owner@example.com');assert.equal(u.userId,ownerId);assert(userLookups>0,'identity must check the Auth server');
      assert.equal((await logout(new Request('https://travel.example.com/api/auth/logout',{method:'POST',headers:{origin:'https://travel.example.com'}}))).status,200);
      await assert.rejects(identity(),e=>e.status===401);
    });
    await context.run(jar(),async()=>{
      assert.equal((await login(request('uninvited@example.com'))).status,403);
      await assert.rejects(identity(),e=>e.status===401);
      assert.equal((await login(new Request('https://travel.example.com/api/auth/login',{method:'POST',headers:{origin:'https://attacker.example'},body:'{}'}))).status,403);
    });
  }finally{await new Promise(r=>auth.close(r));await rm(folder,{recursive:true,force:true});delete process.env.NEXT_PUBLIC_SUPABASE_URL;delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;}
});
