# Account Vault - 专属账号管理

一个基于 Next.js + Prisma + SQLite 的本地账号保险库。

## 环境要求

- Node.js 20.x（推荐 LTS）
- npm 10+
- 可选：Docker Desktop

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

说明：SQLite 数据会保存在本地 `prisma/dev.db`（compose 已挂载该目录）。

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
