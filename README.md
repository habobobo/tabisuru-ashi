# tabisuru-ashi

中国城市足迹地图：记录经过、游玩、住宿、居住经历以及对应时间。391 个地图单元，每个获邀账号拥有独立足迹，可按邮箱授权朋友只读查看，并撤销授权。

## 已实现

- 地图点击、城市搜索、省份筛选、缩放；每座城市可添加多段经历。
- 四种经历独立记录和筛选：经过、游玩、住宿、居住；同一城市可以记录多种经历和多次到访。
- 地图集与城市档案布局：米白底色、朱红地图、日期印记、省内城市覆盖进度和独立排版的图片导出。
- 年、月、日三种时间精度，开始与结束时间、持续至今、备注。
- 云端保存、编辑、删除；按年份筛选、时间线、PNG 导出、JSON 备份。
- 独立邮箱账号登录，网站访问名单、按地图分别授权，数据库行级权限。

GitHub 只保存程序和地图，不保存旅行记录、邮箱名单或密码。本版使用标准 Next.js、Supabase 和 Vercel，运行与登录不依赖 ChatGPT Sites。

## 部署到你的账号

1. 在 GitHub 创建 `tabisuru-ashi` **Private** 仓库，并允许 GitHub 连接访问该仓库。
2. 在 Supabase 创建项目。按文件名顺序执行 `supabase/migrations/` 中的 SQL：先执行 `202610070001_initial.sql`，再执行 `202610090001_add_pass.sql`。已初始化的项目只需执行后一个升级文件，它保留现有记录和访问权限。
3. 在 Authentication → Settings 关闭开放注册（Allow new users to sign up）；在 Authentication → Users → Add user → Create new user 创建你的邮箱账号，设置一个独立密码并确认邮箱。密码不要提交到仓库。
4. 在 SQL Editor 添加网站访问名单，将示例邮箱换成你的邮箱：

   ```sql
   insert into public.allowed_users(email) values ('your-email@example.com');
   ```

5. 在 Vercel 导入该 GitHub 仓库，选择 Next.js。在 Project Settings → Environment Variables 配置 `.env.example` 中的两项，Production 和 Preview 使用你希望对应的数据库项目。使用 Supabase 的 **publishable key**，绝不使用 secret / service_role key。
6. 部署后用上述邮箱和密码登录，保存一段经历并刷新页面确认仍然存在。

没有数据库配置时，首页会明确显示准备中的状态，不会跳转到无效登录入口。构建无需生产凭据。

## 邀请朋友

网站主人在 Supabase 创建朋友的账号并将其邮箱加入 `allowed_users`。以安全方式分别提供初始密码；建议为每个账号使用不同的随机密码。朋友获准登录后有自己的空白地图。

在应用中点击分享，输入朋友的网站登录邮箱授权查看你的地图。复制链接发给对方。这里不自动发送邮件，不需要朋友拥有 GitHub 或 ChatGPT 账号。

点击“收回权限”会删除对应的地图授权，朋友下次读取时将无法查看。查看过的人仍可能保留截图、导出文件或已加载的内容。网站访问名单和地图授权是两个不同的权限。

移除整个网站访问权限：

```sql
delete from public.allowed_users where email='friend@example.com';
```

## 本地开发

Node.js 22+。

```bash
npm ci
cp .env.example .env.local
# 填入你自己的 Supabase 项目配置
npm run dev
```

验证：`npm run typecheck`、`npm test`、`npm run build`、`npm run test:smoke`。测试使用真实 PostgreSQL（PGlite）执行生产迁移和行级权限，覆盖账号隔离、分享/撤销、只读朋友、未获邀账号、日期与城市校验、编辑删除以及站点访问撤销。登录测试用实际 Supabase SDK 与实际路由连接本地认证服务替身，验证账号白名单、会话和退出。最后通过构建后的 HTTP 服务检查首页、登录页和地图资源。

## 数据与地图

地图单元为大陆地级行政区、直辖市、省直辖县级单位；香港、澳门各一项；台湾 22 县市。2026-10-07 获取的数据快照用于旅行示意，不保证包含最新行政调整。

地图来源：[DataV.GeoAtlas](https://geo.datav.aliyun.com/areas_v3/bound/) 与 [Taiwan-GeoJSON](https://github.com/titaneric/Taiwan-GeoJSON)。本地静态地图不需要 API 密钥。

「全部」地图统一标记有记录的城市；切换经历类型时仅标记该类型对应的城市。覆盖度按当前地区、时间和类型筛选下的城市去重统计，四类经历数量可以重叠。城市档案保留所有时间的记录。JSON 备份为导出功能，当前没有批量恢复导入功能。

品牌名称始终使用 `tabisuru-ashi`，不添加汉字副名。标志采用植物线条，呼应名称中 ashi 的意象；城市名称与操作文字使用中文。

## 发布状态

源码准备与测试完成并不代表线上部署完成。只有 GitHub 仓库实际写入、Supabase 迁移与账号配置完成、Vercel 部署成功后，才会有新的可使用网址。
