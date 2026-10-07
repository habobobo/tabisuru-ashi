import {createClient} from '@/lib/supabase/server';
import {sameOrigin} from '@/lib/storage';
export async function POST(r:Request){if(!sameOrigin(r))return new Response(null,{status:403});try{const d=await createClient();const {error}=await d.auth.signOut();if(error)throw error;return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'退出失败，请重试'},{status:503});}}
