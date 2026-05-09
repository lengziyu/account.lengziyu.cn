# Account Vault - 专属账号管理

一个基于 Next.js + Prisma 的个人账号保险库。

现在已支持扩展的“订阅中心”能力：

- 录入会员 / 年费 / 自动续费项目
- 关联已有账号记录
- 配置默认提醒规则
- Telegram / 飞书渠道测试与推送
- 到期扫描接口：`/api/notifications/scan`
- 兼容 `push-telegram` 的环境变量命名

## 环境要求

- Node.js 20.x（推荐 LTS）
- npm 10+
- 可选：Docker Desktop

## PostgreSQL 优先

项目现已切换为 PostgreSQL 优先，适合部署到 Vercel、Railway、Render、Supabase、Neon 等环境。

如果你原来使用的是本地 SQLite 数据，请先执行：

```bash
npm run db:export-sqlite
```

然后在新的 PostgreSQL `DATABASE_URL` 下执行：

```bash
npx prisma db push
npm run db:import-postgres
```

默认会从 `prisma/dev.db` 导出到 `prisma/sqlite-export.json`，你也可以通过 `SQLITE_SOURCE_PATH` / `SQLITE_EXPORT_PATH` 覆盖。

## 本机启动（推荐）

1. 清理跨机器缓存（从其他电脑拷来的项目建议先做）

```bash
rm -rf node_modules .next
```

2. 安装依赖

```bash
npm ci
```

如果 `npm ci` 出现 `E401`（本机 npm 凭据问题），可临时改用：

```bash
pnpm install
```

3. 配置环境变量

```bash
cp .env.example .env
```

如需启用定时推送，请额外配置：

```bash
CRON_SECRET=your-random-secret
```

如需直接沿用 `push-telegram` 的机器人环境变量，也可以继续配置：

```bash
PUSH_CHANNELS=telegram,feishu
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxx
FEISHU_SIGN_SECRET=your_feishu_secret
```

4. 初始化 Prisma（网络不稳定时建议带镜像）

```bash
PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma npx prisma generate
PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma npx prisma db push
```

5. 可选：写入测试账号

```bash
npm run seed
```

默认测试账号：`admin / admin123`

6. 启动项目

```bash
npm run dev
# 或（如果你是用 pnpm 安装）
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)

## Docker 启动

1. 准备环境变量

```bash
cp .env.example .env
```

2. 构建并启动

```bash
docker compose up --build
```

3. 访问 [http://localhost:3000](http://localhost:3000)

说明：`docker compose up --build` 现在会同时启动一个本地 PostgreSQL 16，默认库名为 `account_vault`，映射到宿主机 `127.0.0.1:5433`。

## 订阅提醒说明

1. 在“订阅中心”录入会员信息
2. 二选一：
   - 在“提醒与推送”中手工新增 Telegram / 飞书渠道
   - 或直接在部署环境里填写 `push-telegram` 兼容环境变量
3. 可手动调用 `/api/notifications/scan`，或使用平台定时任务触发

如果部署在 Vercel，仓库内的 [vercel.json](/Users/lens/Documents/web/lengziyu/github/account.lengziyu.cn/vercel.json) 已配置每天 `01:00 UTC` 触发一次扫描。设置 `CRON_SECRET` 后，Vercel 会自动在 `Authorization: Bearer <CRON_SECRET>` 请求头中附带该值；如果你是自建定时任务，也可以手动传 `x-cron-secret`。

## Vercel 接入

1. 把仓库导入 Vercel
2. 在 Vercel Project Settings -> Environment Variables 中至少填写：

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=https://你的域名
CRON_SECRET=another-random-secret
```

3. 如果你想直接复用 `push-telegram` 的机器人配置，再补这些：

```bash
PUSH_CHANNELS=telegram,feishu
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
FEISHU_WEBHOOK_URL=...
FEISHU_SIGN_SECRET=...
```

4. 首次部署后登录系统，进入“提醒与推送”页面：
   - 如果你没有在系统里手工新增渠道，页面会提示“当前使用环境变量渠道”
   - 你可以直接点“测试”确认 Telegram / 飞书是否可用

5. 生产环境注意：
   - `NEXTAUTH_URL` 必须填线上域名
   - 建议在 Vercel 搭配 Neon / Supabase / Railway Postgres
   - 首次切库前先运行 `npm run db:export-sqlite` 备份现有 SQLite 数据
   - 切到 PostgreSQL 后再执行 `npm run db:import-postgres`

## 常见问题

1. 报错 `Cannot find module '.prisma/client/default'`

通常是 Prisma Client 没生成，执行：

```bash
npx prisma generate
npx prisma db push
```

2. `prisma generate` 报 `ECONNRESET`

给 Prisma 配镜像后重试：

```bash
PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma npx prisma generate
```

3. `npm ci` 报 `E401`

这是本机 npm 登录态问题，不是项目代码问题。可先 `npm login` 或临时使用 `pnpm install`。

4. `seed` 报 `attempt to write a readonly database`

跨机器拷文件后 `prisma/dev.db` 可能变成只读，执行：

```bash
chmod u+w prisma/dev.db
```
