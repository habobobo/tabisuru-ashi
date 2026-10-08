# 在 Render 部署 tabisuru-ashi

Render 可以运行现有 Next.js 服务。代码、登录、记录和好友分享不需要重写；数据库与账号使用 Supabase。

## 准备数据库

1. 在 Supabase 创建项目，并在 SQL Editor 按文件名顺序执行 `supabase/migrations/` 中的 SQL。已有项目只需执行新增升级文件；`202610090001_add_pass.sql` 增加「经过」类型并保留现有记录和访问权限。
2. 在 Authentication 中关闭开放注册，创建并确认你的邮箱账号。自行设置密码，不要把密码发到聊天或仓库。
3. 在 SQL Editor 把你的登录邮箱加入 `public.allowed_users`，参考 README 中的 SQL。
4. 获取项目 URL 和 publishable key。不要使用 secret 或 service_role key。

## 部署网站

在 Render 中创建 Blueprint，选择 `habobobo/tabisuru-ashi` 的 `main` 分支，使用根目录的 `render.yaml`。这份配置指定免费 Node.js 网页服务，位于新加坡，并在 GitHub 检查通过后自动部署。

创建时填写两项配置：

| 变量 | 内容 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 你的 Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 你的 Supabase publishable key |

也可以在 Render 创建 Web Service，并按 `render.yaml` 手动填写设置。构建命令包含开发依赖，因为 TypeScript 和 Tailwind 需要它们。启动命令监听 Render 提供的端口。

等待部署显示 Live，打开 Render 实际返回的网址。用上述邮箱账号登录，保存经历、刷新确认仍然存在，再验证朋友的只读分享和撤销。健康检查通过仅表示登录页能响应，不能替代这些验证。

## 免费服务的限制

Render 免费网页服务连续 15 分钟没有请求会休眠，下一次打开通常约需 1 分钟启动。访问速度需要在你和朋友实际使用的网络上验证。

旅行记录保存在 Supabase。不要将记录存入 Render 免费服务的本地文件，也不要采用会在 30 天后到期的 Render 免费 PostgreSQL 来保存正式旅行数据。

这份配置文件准备完成不代表网站已经上线。仍需 Render 与 Supabase 的账号、数据库和正式部署。

官方参考：

- https://render.com/docs/deploy-nextjs-app
- https://render.com/docs/blueprint-spec
- https://render.com/docs/free
