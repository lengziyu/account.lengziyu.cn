# Product Spec v1 - Personal Account Vault

## 1. 产品定义

Personal Account Vault 是一个面向个人使用的自托管账号信息管理工具，用于记录和管理用户的各类账号信息，包括社交平台、网站、设备登录信息等。

本产品强调：

* 快速录入
* 简洁管理
* 多设备访问
* 自托管部署

⚠️ 注意：
本项目第一版本不实现端到端加密，仅作为个人私有数据管理工具。

---

## 2. 核心目标

### 必须实现

1. 用户可以登录系统
2. 用户可以新增账号记录
3. 用户可以查看账号列表
4. 用户可以编辑账号信息
5. 用户可以删除账号
6. 用户可以搜索账号
7. 用户可以在多个设备访问同一数据

---

## 3. 用户模型

### User

| 字段           | 类型       | 说明   |
| ------------ | -------- | ---- |
| id           | string   | 主键   |
| email        | string   | 登录邮箱 |
| passwordHash | string   | 密码哈希 |
| name         | string   | 昵称   |
| createdAt    | datetime | 创建时间 |
| updatedAt    | datetime | 更新时间 |

---

## 4. 账号数据模型

### VaultItem

| 字段        | 类型       | 说明     |
| --------- | -------- | ------ |
| id        | string   | 主键     |
| userId    | string   | 所属用户   |
| title     | string   | 标题（必填） |
| platform  | string   | 平台名称   |
| url       | string   | 登录地址   |
| username  | string   | 用户名/邮箱 |
| password  | string   | 密码     |
| category  | string   | 分类     |
| notes     | text     | 备注     |
| favorite  | boolean  | 是否收藏   |
| createdAt | datetime | 创建时间   |
| updatedAt | datetime | 更新时间   |

---

## 5. 标签模型

### Tag

| 字段     | 类型     | 说明   |
| ------ | ------ | ---- |
| id     | string | 主键   |
| itemId | string | 关联记录 |
| tag    | string | 标签内容 |

---

## 6. 功能模块

### 6.1 认证模块

功能：

* 用户注册
* 用户登录
* 用户登出

规则：

* 使用邮箱 + 密码
* 密码必须加密存储
* 登录后维持 session

---

### 6.2 账号管理模块

#### 新增账号

用户可以创建一条账号记录

必填：

* title

#### 编辑账号

用户可以修改所有字段

#### 删除账号

* 软删除或直接删除（v1 允许直接删除）

#### 查看详情

* 展示所有字段

---

### 6.3 搜索模块

支持模糊搜索：

* title
* platform
* username
* notes

---

### 6.4 分类与标签

分类（预设）：

* social
* website
* device
* dev
* finance
* other

标签：

* 用户自定义
* 多标签

---

### 6.5 收藏功能

* 用户可以标记 favorite
* 首页显示收藏列表

---

### 6.6 首页（Dashboard）

显示：

* 搜索框
* 最近更新记录
* 收藏记录
* 快速新增入口

---

## 7. 页面结构

必须包含页面：

* /login
* /register
* /dashboard
* /items
* /items/[id]
* /settings

---

## 8. API 规范

### Auth

* POST /api/auth/register
* POST /api/auth/login
* POST /api/auth/logout
* GET /api/auth/me

### Items

* GET /api/items
* POST /api/items
* GET /api/items/:id
* PATCH /api/items/:id
* DELETE /api/items/:id

---

## 9. 权限规则

必须保证：

* 用户只能访问自己的数据
* 所有接口必须校验用户身份
* 所有查询必须带 userId

---

## 10. 数据同步策略

* 所有数据存储在服务器数据库
* 客户端直接请求 API
* 不做离线同步
* 更新采用“最后修改覆盖”

---

## 11. 非目标（V1 不实现）

* 浏览器自动填充
* 浏览器插件
* 端到端加密
* 2FA 动态码
* 团队协作
* 权限管理系统
* 审计日志

---

## 12. 技术约束

必须使用：

* Next.js
* TypeScript
* Prisma
* PostgreSQL

推荐：

* Tailwind CSS
* shadcn/ui

---

## 13. 成功标准

如果满足以下条件，则认为 v1 成功：

* 可以稳定创建账号记录
* 可以快速搜索账号
* 手机和电脑访问一致
* UI 清晰，录入流程简单
* 部署后可长期使用

---
