import {redirect} from 'next/navigation';
import Footprints from './footprints';
import {identity,AccessError} from '@/lib/storage';
import {configured} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{owner?:string}>}){
  if(!configured())return <main className="login-shell"><div className="login-card"><h1>tabisuru-ashi</h1><p>网站正在准备中，还未连接登录与记录服务。</p><p>配置完成后，你可以在这里记录和分享中国城市足迹。</p></div></main>;
  const p=await searchParams;
  let u;
  try{u=await identity();}catch(e){if(e instanceof AccessError){redirect('/login?'+new URLSearchParams({next:typeof p.owner==='string'?'/?owner='+encodeURIComponent(p.owner):'/',...(e.status===403?{access:'denied'}:{})}).toString());}throw e;}
  return <Footprints user={{id:u.userId,email:u.email,name:u.fullName}} initialOwner={typeof p.owner==='string'?p.owner:''}/>;
}
