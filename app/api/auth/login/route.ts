import {createClient} from '@/lib/supabase/server';
import {sameOrigin} from '@/lib/storage';
export async function POST(r:Request){
  if(!sameOrigin(r))return new Response(null,{status:403});
  try{const raw=await r.text();if(raw.length>4096)return new Response(null,{status:400});const b=JSON.parse(raw);
    if(typeof b?.email!=='string'||typeof b?.password!=='string'||b.email.length>254||b.password.length>1024)return Response.json({error:'请填写邮箱和密码'},{status:400});
    const d=await createClient(),{error}=await d.auth.signInWithPassword({email:b.email.trim().toLowerCase(),password:b.password});
    if(error)return Response.json({error:'邮箱或密码不正确，请重试或联系网站主人'},{status:401});
    const {data:allowed,error:accessError}=await d.rpc('is_admitted');if(accessError||!allowed){await d.auth.signOut();return Response.json({error:accessError?'登录服务暂不可用，请稍后重试':'这个账号尚未获得访问权限，请联系网站主人'},{status:accessError?503:403});}
    return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'登录服务暂不可用，请稍后重试'},{status:503});}
}
