import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'tabisuru-ashi',description:'一张个人地图，一份旅行档案。记录经过、游玩、住宿、居住经历与时间，和指定朋友交换各自的城市足迹。',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
