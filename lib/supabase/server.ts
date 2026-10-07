import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

export function configured(){return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);}
export async function createClient(){
  if(!configured())throw new Error('NOT_CONFIGURED');
  const jar=await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
    cookies:{getAll(){return jar.getAll();},setAll(items){try{for(const {name,value,options} of items)jar.set(name,value,options);}catch{/* Server Components are read-only; proxy refreshes the session. */}}}
  });
}
