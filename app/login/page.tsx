import LoginForm from './login-form';
import {configured} from '@/lib/supabase/server';
export default async function LoginPage({searchParams}:{searchParams:Promise<{access?:string;next?:string}>}){
  const p=await searchParams;
  return <LoginForm ready={configured()} denied={p.access==='denied'} next={p.next?.startsWith('/?owner=')?p.next:'/'} />;
}
