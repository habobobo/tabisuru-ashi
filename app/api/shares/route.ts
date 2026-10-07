import {identity,errorResponse,sameOrigin,uuid} from '@/lib/storage';
export async function GET(){try{const {d,userId,email}=await identity();
  const [a,b]=await Promise.all([d.from('shares').select('id,viewer_email,created_at').eq('owner_id',userId).order('created_at',{ascending:false}),d.from('shares').select('owner_id').eq('viewer_email',email)]);if(a.error)throw a.error;if(b.error)throw b.error;
  const owners=[...new Set((b.data||[]).map(s=>s.owner_id))];let incoming:unknown[]=[];
  if(owners.length){const {data,error}=await d.from('profiles').select('id,name').in('id',owners);if(error)throw error;incoming=data||[];}
  return Response.json({outgoing:(a.data||[]).map(s=>({id:s.id,email:s.viewer_email,createdAt:s.created_at})),incoming},{headers:{'Cache-Control':'no-store'}});
}catch(e){return errorResponse(e);}}
export async function POST(r:Request){try{if(!sameOrigin(r))return new Response(null,{status:403});const {d,userId,email:ownEmail}=await identity(),b=await r.json(),email=typeof b?.email==='string'?b.email.trim().toLowerCase():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return Response.json({error:'请填写朋友的网站登录邮箱'},{status:400});if(email===ownEmail)return Response.json({error:'无需向自己分享'},{status:400});
  const {error:profileError}=await d.from('profiles').upsert({id:userId,name:'我的足迹'},{onConflict:'id',ignoreDuplicates:true});if(profileError)throw profileError;
  const {count,error:countError}=await d.from('shares').select('*',{count:'exact',head:true}).eq('owner_id',userId);if(countError)throw countError;if((count||0)>=30)return Response.json({error:'最多分享给 30 位朋友'},{status:400});
  const {error}=await d.from('shares').upsert({owner_id:userId,viewer_email:email},{onConflict:'owner_id,viewer_email',ignoreDuplicates:true});if(error)throw error;return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
export async function DELETE(r:Request){try{if(!sameOrigin(r))return new Response(null,{status:403});const {d,userId}=await identity(),b=await r.json();if(typeof b?.id!=='string'||!uuid.test(b.id))return new Response(null,{status:400});
  const {error}=await d.from('shares').delete().eq('id',b.id).eq('owner_id',userId);if(error)throw error;return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
