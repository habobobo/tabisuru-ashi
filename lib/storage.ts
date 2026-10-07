import {createClient} from './supabase/server';

export class AccessError extends Error {constructor(public status:number,message:string){super(message);}}
export async function identity(){
  const d=await createClient();
  const {data:{user},error}=await d.auth.getUser();
  if(error||!user?.email)throw new AccessError(401,'请登录后再操作');
  const {data:admitted,error:accessError}=await d.rpc('is_admitted');
  if(accessError)throw accessError;
  if(!admitted)throw new AccessError(403,'这个账号尚未获得网站访问权限，请联系网站主人');
  return {d,userId:user.id,email:user.email.toLowerCase(),fullName:String(user.user_metadata?.full_name||'我的足迹')};
}
export function sameOrigin(r:Request){
  const o=r.headers.get('origin');if(!o)return false;
  try{
    const url=new URL(r.url),origin=new URL(o);
    // Next.js may normalize the internal URL to localhost. Host stays the
    // browser's destination; Vercel sets the external protocol at its proxy.
    const host=r.headers.get('host')||url.host;
    const protocol=(r.headers.get('x-forwarded-proto')||url.protocol.replace(':','')).split(',')[0].trim()+':';
    return ['http:','https:'].includes(origin.protocol)&&origin.host===host.toLowerCase()&&origin.protocol===protocol;
  }catch{return false;}
}
export function errorResponse(e:unknown){
  if(e instanceof AccessError)return Response.json({error:e.message},{status:e.status});
  console.error('Footprints request failed',e);
  return Response.json({error:'操作未完成，请稍后重试。你的输入仍然保留。'},{status:503});
}
export function rowToExperience(r:any){return{id:r.id,cityId:r.city_id,kind:r.kind,startDate:r.start_date,endDate:r.end_date,ongoing:r.ongoing,note:r.note,updatedAt:Number(r.updated_at)};}
export const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
