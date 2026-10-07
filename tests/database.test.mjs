import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('actual PostgreSQL: account isolation, sharing, revocation and persisted dates',async()=>{
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant usage on schema auth,public to authenticated,anon;`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610070001_initial.sql',import.meta.url),'utf8'));
  const users={owner:['00000000-0000-4000-8000-000000000001','owner@example.com'],viewer:['00000000-0000-4000-8000-000000000002','viewer@example.com'],other:['00000000-0000-4000-8000-000000000003','other@example.com'],uninvited:['00000000-0000-4000-8000-000000000004','uninvited@example.com']};
  for(const [id,email] of Object.values(users))await db.query('insert into auth.users(id) values($1)',[id]);
  for(const [,email] of Object.values(users).slice(0,3))await db.query('insert into public.allowed_users(email) values($1)',[email]);
  async function asUser(name,fn){const [sub,email]=users[name];await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub,email})]);try{return await fn();}finally{await db.exec('reset role');}}
  const rows=async(q,params=[]) => (await db.query(q,params)).rows;
  for(const u of ['owner','viewer','other'])await asUser(u,()=>db.query('insert into public.profiles(id,name) values($1,$2)',[users[u][0],u]));
  const note="'; DROP TABLE experiences; --";
  let visit;
  await asUser('owner',async()=>{
    visit=(await rows("insert into public.experiences(city_id,kind,start_date,end_date,note) values('110000','visit','2026-10-01','2026-10-04',$1) returning *",[note]))[0];
    await db.query("insert into public.experiences(city_id,kind,start_date) values('110000','stay','2026-10')");
    await db.query("insert into public.experiences(city_id,kind,start_date,ongoing) values('110000','live','2018',true)");
    assert.equal((await rows('select * from public.experiences')).length,3);
    assert.equal((await rows('select note from public.experiences where id=$1',[visit.id]))[0].note,note);
    await assert.rejects(db.query("insert into public.experiences(city_id,kind,start_date) values('110000','visit','2026-02-30')"));
    await assert.rejects(db.query("insert into public.experiences(city_id,kind,start_date,end_date) values('110000','visit','2026-11','2026-10')"));
    await assert.rejects(db.query("insert into public.experiences(city_id,kind,end_date) values('110000','visit','2026-13')"));
    await assert.rejects(db.query("insert into public.experiences(city_id,kind) values('999999','visit')"));
    await assert.rejects(db.query("insert into public.experiences(city_id,kind,note) values('110000','visit',repeat('a',1001))"));
    await assert.rejects(db.query("insert into public.experiences(owner_id,city_id,kind) values($1,'110000','visit')",[users.other[0]]));
  });
  await asUser('other',async()=>{assert.equal((await rows('select * from public.experiences')).length,0);assert.equal((await rows('select * from public.profiles')).length,1);});
  await asUser('viewer',async()=>{assert.equal((await rows('select * from public.experiences')).length,0);});
  await asUser('owner',()=>db.query('insert into public.shares(viewer_email) values($1)',[users.viewer[1]]));
  await asUser('viewer',async()=>{
    assert.equal((await rows('select * from public.experiences')).length,3);
    assert.equal((await rows('select * from public.profiles')).length,2);
    assert.equal((await rows('update public.experiences set note=$1 where id=$2 returning id',['hacked',visit.id])).length,0);
    assert.equal((await rows('delete from public.experiences where id=$1 returning id',[visit.id])).length,0);
    assert.equal((await rows('delete from public.shares returning id')).length,0);
    await assert.rejects(db.query('update public.shares set viewer_email=$1',[users.other[1]]));
    await assert.rejects(db.query('select * from public.allowed_users'));
  });
  await asUser('uninvited',async()=>{
    assert.equal((await rows('select public.is_admitted() as ok'))[0].ok,false);
    assert.equal((await rows('select * from public.experiences')).length,0);
    await assert.rejects(db.query("insert into public.profiles(name) values('uninvited')"));
  });
  await db.exec('set role anon');await assert.rejects(db.query('select * from public.experiences'));await db.exec('reset role');
  await asUser('owner',()=>db.query('delete from public.shares'));
  await asUser('viewer',async()=>{assert.equal((await rows('select * from public.experiences')).length,0);assert.equal((await rows('select * from public.profiles')).length,1);});
  await asUser('owner',async()=>{
    await db.query('update public.experiences set end_date=$1 where id=$2',['2026-10-05',visit.id]);
    assert.equal((await rows('select end_date from public.experiences where id=$1',[visit.id]))[0].end_date,'2026-10-05');
    await db.query('delete from public.experiences where id=$1',[visit.id]);assert.equal((await rows('select * from public.experiences')).length,2);
  });
  // Revoking site access takes effect even while an authenticated token remains valid.
  await db.query('delete from public.allowed_users where email=$1',[users.owner[1]]);
  await asUser('owner',async()=>{assert.equal((await rows('select * from public.experiences')).length,0);await assert.rejects(db.query("insert into public.experiences(city_id,kind) values('110000','visit')"));});
  await db.close();
});
