# Account Vault - 专属账号管理

一个极简、功能强大、设计出众（紫/黑光晕暗色主题支持）的私密账号本地保管系统。

## ✨ 核心特性

- **现代科技感主题**：全局支持亮色模式与内置了极致光晕径向波动的 Dark Mode 紫色高级暗黑主题。
- **动态悬浮菜单 (Tabbar)**：移动端优先（Mobile-first）设计的下置栏居中大悬浮增加按钮结构，在跨端有着极其丝滑的全局展示呈现。
- **沉浸式雷达看板**：具备专属设置界面，能够实时提炼账号仓库、唯一使用标签等数据总揽。
- **高级 Tag 系统**：完全抛弃旧有的表单式硬分类，使用非常活泛的 Markdown 支持和 标签组 搭建你的个人存储库。
- **智能辅助**：
  - “一键速查”邮箱域名尾缀匹配建议；
  - 智能隐藏式无感一键复制密码功能。
  - **批量识别添加功能**：可自动解析你杂乱复制下的 `账号：xxx 密码：yyy` 字符串并批量切分成表单保存入库。

## 🛠️ 技术栈

- 🚀 前端架构：**Next.js 14** (App Router 机制), **React 18**
- 🎨 UI/交互基座：**Tailwind CSS**, `lucide-react` (图标系)
- 💾 存储交互：**Prisma ORM**, `SQLite` 驱动 
- 🪪 身份安全：**NextAuth.js** (credentials-based 鉴权流程, bcrypt哈希验证)

## 📦 快速起步部署

1. **安装基本构建库**
   ```bash
   npm install
   ```

2. **环境变量设置**
   确保根目录附有有效的 `.env` 文件。
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="用任何安全的随机生成器填入"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **数据库迁移与填充**
   ```bash
   # 生成本地客户端
   npx prisma generate
   # 映射数据库
   npx prisma db push
   # (可选) 填充初始测试账号
   npm run seed
   ```

4. **开启应用**
   ```bash
   npm run dev
   ```

前往 [http://localhost:3000](http://localhost:3000) 即可开始您的专属之旅！
