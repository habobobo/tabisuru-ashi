'use client';
import {useState} from 'react';
import {Compass,Loader2,Lock} from 'lucide-react';
export default function LoginForm({ready,denied,next}:{ready:boolean;denied:boolean;next:string}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(denied?'这个账号尚未获得访问权限，请联系网站主人。':'');
  return <main className="login-shell"><div className="login-card"><span className="brandmark"><Compass size={28}/></span><h1>tabisuru-ashi</h1><p>每个城市，都有一段故事。</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const b=await r.json();if(!r.ok)throw new Error(b.error||'登录失败');location.assign(next);}catch(err){setError((err as Error).message);setBusy(false);}}}>
    <label className="field">邮箱<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">密码<input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {error&&<p className="form-error" role="alert">{error}</p>}{!ready&&<p className="form-error">网站正在配置中，请稍后再试。</p>}<button className="button primary" disabled={busy||!ready}>{busy?<Loader2 className="spin" size={16}/>:<Lock size={16}/>}登录我的足迹</button>
  </form><small>仅向获邀账号开放。请使用网站主人为你准备的账号；未获邀时请联系网站主人。</small></div></main>;
}
