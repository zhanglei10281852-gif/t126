# 古树名木保护管理平台 - 后端 API 基座

基于 Node.js + Express + MySQL 的纯后端管理平台基座，提供管理员登录与古树名木档案的基础管理能力。全链路使用 utf8mb4 编码，确保中文（含生僻字）正确存储与返回。

## 技术栈

| 技术               | 用途                              |
| ------------------ | --------------------------------- |
| Node.js + Express  | HTTP API 框架                     |
| MySQL 8（utf8mb4） | 数据持久化                        |
| mysql2             | 数据库驱动（连接池 + 预处理语句） |
| jsonwebtoken       | JWT 登录令牌                      |
| bcryptjs           | 密码哈希                          |
| Jest + supertest   | 接口测试                          |

## 快速开始

### 方式一：Docker 一键启动（推荐）

```bash
docker compose up --build
```

启动后 API 在 `http://localhost:7763`，数据库初始化、内置管理员与种子数据均自动完成。

### 方式二：本地运行

先用 docker 起一个 MySQL（或使用已有实例，按 `.env` 配置连接）：

```bash
docker compose up -d db
cp .env.example .env   # Windows: copy .env.example .env
npm install
npm start
```

## 默认账号

| 用户名 | 密码     |
| ------ | -------- |
| admin  | admin123 |

仅 `admin` 单一角色。

## 接口清单

| 方法   | 路径              | 鉴权 | 说明                                                     |
| ------ | ----------------- | ---- | -------------------------------------------------------- |
| GET    | `/api/health`     | 否   | 健康检查                                                 |
| POST   | `/api/auth/login` | 否   | 登录，返回 JWT                                           |
| GET    | `/api/auth/me`    | 是   | 当前登录用户信息                                         |
| GET    | `/api/trees`      | 是   | 古树列表（`page`/`pageSize`/`level`/`status`/`keyword`） |
| GET    | `/api/trees/:id`  | 是   | 古树详情                                                 |
| POST   | `/api/trees`      | 是   | 新增古树                                                 |
| PUT    | `/api/trees/:id`  | 是   | 更新古树                                                 |
| DELETE | `/api/trees/:id`  | 是   | 删除古树                                                 |

鉴权方式：请求头 `Authorization: Bearer <token>`。

## 数据模型（trees）

| 字段                            | 说明                          |
| ------------------------------- | ----------------------------- |
| code                            | 古树编号（唯一）              |
| species / latin_name            | 树种 / 拉丁学名               |
| age_estimate                    | 估测树龄（年）                |
| protection_level                | 保护等级 1/2/3                |
| growth_status                   | 生长状态：正常/衰弱/濒危/死亡 |
| location / longitude / latitude | 生长位置与经纬度              |
| guardian                        | 管护责任人                    |
| description                     | 描述                          |

## 测试

需要 MySQL 已就绪（`docker compose up -d db`），然后：

```bash
npm test
```

测试覆盖：健康检查、登录与鉴权、古树 CRUD、分页与中文关键词筛选、唯一编号冲突、参数校验与 404。
