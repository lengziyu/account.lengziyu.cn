# Vercel PostgreSQL Cutover

本项目当前已经完成两件关键准备：

- 线上 SQLite 数据已备份到 `migration/online/dev.db`
- 同一份数据已导出为 `migration/online/online-export.json`

因此，正式切换到 Vercel + PostgreSQL 时，不需要再使用本地旧 SQLite 数据。

## 1. 准备生产 PostgreSQL

推荐任选其一：

- Neon
- Supabase Postgres
- Railway Postgres

拿到一条生产库连接串，格式类似：

```bash
postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public
```

## 2. 把生产库初始化为当前 Prisma 结构

在本地项目目录执行：

```bash
DATABASE_URL="你的生产 Postgres URL" npx prisma db push
```

这一步只创建表结构。

## 3. 把线上 SQLite 的真实数据导入生产库

继续执行：

```bash
DATABASE_URL="你的生产 Postgres URL" \
SQLITE_EXPORT_PATH="migration/online/online-export.json" \
npm run db:import-postgres
```

这一步会：

- 清空目标 PostgreSQL 当前数据
- 导入 `online-export.json` 中的线上真实数据

## 4. 给 Vercel 配环境变量

在 Vercel Project Settings -> Environment Variables 中配置：

```bash
DATABASE_URL=你的生产 Postgres URL
NEXTAUTH_URL=https://你的线上域名
NEXTAUTH_SECRET=一串随机长字符串
CRON_SECRET=另一串随机长字符串
PUSH_CHANNELS=telegram,feishu
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
FEISHU_WEBHOOK_URL=...
FEISHU_SIGN_SECRET=...
```

说明：

- `CRON_SECRET` 用于保护 `/api/notifications/scan`
- 如果你暂时只想开 Telegram，就把 `PUSH_CHANNELS=telegram`

## 5. 重新部署 Vercel

环境变量修改后，需要重新部署，旧部署不会自动继承新值。

## 6. 上线后验证

最少验证这几项：

1. 能否正常登录
2. 账号列表数量是否和线上旧系统一致
3. 详情页是否能打开
4. “提醒与推送”页能否打开
5. Telegram / 飞书测试消息是否成功
6. 手动触发一次 `/api/notifications/scan` 是否返回 200

## 7. 切换完成后

确认新站一切正常后：

- 原线上 SQLite 不再作为主数据源
- 后续所有新增/修改都只写生产 PostgreSQL
- 本地如果需要同步数据，重新从生产库导出，不要再把旧 SQLite 回灌

## 建议的最稳操作顺序

1. 先创建生产 Postgres
2. `prisma db push`
3. `db:import-postgres`
4. 在 Vercel 填环境变量
5. 重新部署
6. 登录验证
7. 测试推送

## 回滚方式

如果切换后发现异常：

- 先不要删除 `migration/online/dev.db`
- 保留 `migration/online/online-export.json`
- 把 Vercel 的 `DATABASE_URL` 改回旧系统可用的数据源，重新部署

当前你最需要的其实只剩一项：

拿到生产 PostgreSQL 的 `DATABASE_URL`

有了它，就可以直接执行第 2、3 步完成生产数据灌库。
