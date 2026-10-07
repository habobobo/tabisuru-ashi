import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import net from 'node:net';

const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:''}});
let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
try{
  const base='http://127.0.0.1:'+port;let home;
  for(let i=0;i<100;i++){try{home=await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
  if(!home)throw new Error('Server did not start: '+logs);
  assert.equal(home.status,200);const h=await home.text();assert(h.includes('tabisuru-ashi'));assert(h.includes('网站正在准备中'));assert(!h.includes('/signin-with-chatgpt'));
  const login=await fetch(base+'/login');assert.equal(login.status,200);assert((await login.text()).includes('邮箱'));
  const map=await fetch(base+'/map.json');assert.equal(map.status,200);assert.equal((await map.json()).cities.length,391);
  const foreign=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:'https://other.example','Content-Type':'application/json'},body:JSON.stringify({email:'test@example.com',password:'test123456'})});assert.equal(foreign.status,403);
  const unconfigured=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.com',password:'test123456'})});assert.equal(unconfigured.status,503);assert((await unconfigured.json()).error);
  console.log('PASS: production homepage, login route, 391-city map, origin rejection and unconfigured service response.');
}finally{child.kill('SIGTERM');}
