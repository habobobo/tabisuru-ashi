import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {configured} from '@/lib/supabase/server';

export async function proxy(request:NextRequest){
  let response=NextResponse.next({request});
  response.headers.set('Cache-Control','private, no-store');
  if(!configured())return response;
  const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
    cookies:{getAll(){return request.cookies.getAll();},setAll(items){
      for(const {name,value} of items)request.cookies.set(name,value);
      response=NextResponse.next({request});
      for(const {name,value,options} of items)response.cookies.set(name,value,options);
      response.headers.set('Cache-Control','private, no-store');
    }}
  });
  await client.auth.getClaims();
  return response;
}
export const config={matcher:['/','/login','/api/:path*']};
