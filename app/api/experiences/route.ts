import {identity,errorResponse,rowToExperience,sameOrigin,uuid} from '@/lib/storage';
import {validateExperience} from '@/lib/types';
import cities from '@/lib/city-index.json';
const ids=new Set(cities.map(c=>c.id));
export async function GET(r:Request){try{const {d,userId}=await identity(),owner=new URL(r.url).searchParams.get('owner')||userId;let profile=null;
  if(!uuid.test(owner))return Response.json({error:'地图地址无效'},{status:400});
  if(owner!==userId){const {data,error}=await d.from('profiles').select('id,name').eq('id',owner).maybeSingle();if(error)throw error;if(!data)return Response.json({error:'这张地图尚未向你开放，或分享已被收回'},{status:403});profile=data;}
  const {data,error}=await d.from('experiences').select('*').eq('owner_id',owner).order('updated_at',{ascending:false});if(error)throw error;
  return Response.json({records:(data||[]).map(rowToExperience),owner:profile,readOnly:owner!==userId},{headers:{'Cache-Control':'no-store'}});
}catch(e){return errorResponse(e);}}
export async function POST(r:Request){try{if(!sameOrigin(r))return new Response(null,{status:403});const {d,userId}=await identity(),body=await r.json();let b;
  try{if(!body||typeof body!=='object')throw new Error('记录格式无效');b=validateExperience(body,ids);if(body.id!==undefined&&(typeof body.id!=='string'||!uuid.test(body.id)))throw new Error('记录地址无效');}catch(e){return Response.json({error:(e as Error).message},{status:400});}
  const id=body.id||crypto.randomUUID(),row={city_id:b.cityId,kind:b.kind,start_date:b.startDate,end_date:b.endDate,ongoing:b.ongoing,note:b.note,updated_at:Date.now()};
  const query=body.id?d.from('experiences').update(row).eq('id',id).eq('owner_id',userId):d.from('experiences').insert({...row,id,owner_id:userId});
  const {data,error}=await query.select('*').maybeSingle();if(error)throw error;if(!data)return Response.json({error:'这条记录不存在或不能修改'},{status:403});return Response.json(rowToExperience(data));
}catch(e){return errorResponse(e);}}
export async function DELETE(r:Request){try{if(!sameOrigin(r))return new Response(null,{status:403});const {d,userId}=await identity(),body=await r.json();if(typeof body?.id!=='string'||!uuid.test(body.id))return new Response(null,{status:400});
  const {error}=await d.from('experiences').delete().eq('id',body.id).eq('owner_id',userId);if(error)throw error;return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
