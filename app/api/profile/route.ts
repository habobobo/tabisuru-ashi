import {identity,errorResponse,sameOrigin} from '@/lib/storage';
export async function GET(){try{const {d,userId,fullName}=await identity();
  const {error}=await d.from('profiles').upsert({id:userId,name:fullName.slice(0,40)||'我的足迹'},{onConflict:'id',ignoreDuplicates:true});if(error)throw error;
  const {data,error:readError}=await d.from('profiles').select('id,name').eq('id',userId).single();if(readError)throw readError;
  return Response.json(data,{headers:{'Cache-Control':'no-store'}});
}catch(e){return errorResponse(e);}}
export async function PUT(r:Request){try{if(!sameOrigin(r))return new Response(null,{status:403});const {d,userId}=await identity(),b=await r.json();
  if(typeof b?.name!=='string'||!b.name.trim()||b.name.trim().length>40)return Response.json({error:'名称请填写 1–40 字'},{status:400});
  const {error}=await d.from('profiles').upsert({id:userId,name:b.name.trim()},{onConflict:'id'});if(error)throw error;
  return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
