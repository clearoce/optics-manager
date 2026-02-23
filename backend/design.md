# 眼镜店管理系统 · 开发进度文档

> 最后更新：2026-02-23

---

## 一、项目概述

本项目是一套面向眼镜店店主的单人管理系统，核心功能包括客户管理、订单管理、库存管理与库存变更审计。采用本地部署（单机）架构，数据存储在 SQLite 文件中，通过浏览器访问前端页面并调用本地后端 API。

---

## 二、技术选型

| 层次 | 技术 | 选型理由 |
|------|------|----------|
| 后端框架 | Go 1.21 + Gin | 语法接近 C 族语言，适合有 C++ 背景的开发者；编译产物为单一可执行文件，部署简单 |
| 数据库 | SQLite | 单文件存储，备份即复制，无需额外服务进程，适合单机 C/S 场景 |
| SQLite 驱动 | `modernc.org/sqlite` | 纯 Go 实现，无需 CGO，跨平台编译无障碍 |
| 前端 | React 19 + TypeScript + Vite | 工程化完善，类型约束强，开发体验好 |
| 架构模式 | C/S（本地部署） | 零运维成本，数据完全本地，将来可平滑迁移至 B/S |

---

## 三、项目结构

```
optics-manager/backend
├── main.go                  # 程序入口，负责组装各模块并启动 HTTP 服务器
├── go.mod                   # Go 模块定义，管理依赖版本
├── database/
│   ├── db.go                # 数据库连接初始化，WAL 模式，外键约束
│   ├── migrate.go           # 建表逻辑（幂等，程序每次启动时安全调用）
│   └── time.go              # 时间解析工具，处理 SQLite 驱动的时间格式兼容问题
├── models/
│   ├── customer.go          # 客户数据结构
│   ├── product.go           # 商品数据结构
│   ├── order.go             # 订单 / 订单明细 / 订单详情组合结构
│   └── inventory.go         # 库存日志数据结构
└── handlers/
    ├── customer.go          # 客户管理接口处理器
    ├── product.go           # 商品管理接口处理器
    └── order.go             # 订单管理接口处理器
```

---

## 四、数据库设计

### 4.1 表结构总览

```
customers ──< orders ──< order_items >── products
                                              │
                                        inventory_logs
```

### 4.2 各表说明

**`customers`（客户表）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 客户姓名 |
| phone | TEXT UNIQUE | 手机号，唯一标识，不可修改 |
| notes | TEXT | 备注（可为空） |
| created_at | DATETIME | 创建时间，默认 UTC+8 |

**`products`（商品表）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 商品名称 |
| category | TEXT | 分类（如镜框、镜片、隐形眼镜） |
| sku | TEXT UNIQUE | 商品编号（可为空） |
| price | REAL | 当前售价 |
| stock_quantity | INTEGER | 当前库存数量 |
| low_stock_threshold | INTEGER | 低库存阈值（默认 10） |
| extra_info | TEXT | JSON 格式，预留拓展字段 |
| created_at | DATETIME | 创建时间，默认 UTC+8 |

**`orders`（订单表）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| customer_id | INTEGER FK | 关联客户 |
| total_amount | REAL | 订单总金额（服务端计算，不信任客户端） |
| order_date | DATETIME | 下单时间，默认 UTC+8 |
| notes | TEXT | 备注（可为空） |
| extra_info | TEXT | JSON 格式，预留拓展字段（如瞳距、度数） |

**`order_items`（订单明细表）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| order_id | INTEGER FK | 关联订单 |
| product_id | INTEGER FK | 关联商品 |
| quantity | INTEGER | 购买数量 |
| unit_price | REAL | 成交时的价格快照（与当前售价解耦） |
| subtotal | REAL | 小计（quantity × unit_price） |

**`inventory_logs`（库存变动日志表）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| product_id | INTEGER FK | 关联商品 |
| change_amount | INTEGER | 变动数量，正数入库，负数出库 |
| reason | TEXT | 变动原因（如"订单出库"、"手动盘点"） |
| reference_id | INTEGER | 触发变动的订单 ID，手动调整时为 NULL |
| created_at | DATETIME | 记录时间，默认 UTC+8 |

### 4.3 重要设计决策

**价格快照**：`order_items.unit_price` 在订单创建时独立存储当时的成交价，与 `products.price` 完全解耦。商品涨价不会影响历史订单金额。

**JSON 拓展字段**：`orders.extra_info` 和 `products.extra_info` 使用 JSON 字符串存储将来可能新增的字段（如配镜度数、瞳距），无需修改表结构。

**库存双重记录**：`products.stock_quantity` 记录当前库存结果，`inventory_logs` 记录每次变动的过程。前者用于快速查询，后者用于审计追溯，两者互相印证。

**库存修改强制留日志**：库存变更被独立成专用接口（`POST /api/products/:id/stock`），从接口设计层面杜绝了"改库存但不写日志"的可能性。

**低库存阈值内置化**：每个商品独立维护 `low_stock_threshold`，前端按 `stock_quantity <= low_stock_threshold` 判定库存预警状态，避免硬编码固定阈值。

---

## 五、API 接口文档

服务器默认运行于 `http://localhost:8080`，所有接口均以 `/api` 为前缀。

所有接口的响应格式统一如下：

```json
// 成功
{ "success": true, "data": { ... } }

// 失败
{ "success": false, "error": "错误描述" }
```

### 5.1 客户管理

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/customers` | 新增客户 |
| GET | `/api/customers` | 查询客户列表，支持 `?phone=` 模糊搜索 |
| GET | `/api/customers/:id` | 查询单个客户 |
| PUT | `/api/customers/:id` | 修改客户信息（手机号不可修改） |

**新增客户请求示例：**

```json
{
    "name": "张伟",
    "phone": "13800001111",
    "notes": "高度近视，偏好轻薄镜片"
}
```

### 5.2 商品管理

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/products` | 新增商品 |
| GET | `/api/products` | 查询商品列表，支持 `?category=` 分类筛选 |
| GET | `/api/products/:id` | 查询单个商品（含库存） |
| PUT | `/api/products/:id` | 修改商品信息（不含库存） |
| DELETE | `/api/products/:id` | 删除商品（有订单关联时禁止删除） |
| POST | `/api/products/:id/stock` | 手动调整库存 |
| GET | `/api/products/:id/inventory-logs` | 查询指定商品库存变更日志 |

**手动调整库存请求示例（入库）：**

```json
{
    "change_amount": 20,
    "reason": "初始入库"
}
```

**手动调整库存请求示例（出库修正）：**

```json
{
    "change_amount": -3,
    "reason": "盘点损耗"
}
```

### 5.3 订单管理

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/orders` | 创建订单（含事务保护） |
| GET | `/api/orders` | 查询订单列表，支持 `?customer_id=` 按客户筛选 |
| GET | `/api/orders/:id` | 查询订单详情（含所有商品明细） |

**创建订单请求示例：**

```json
{
    "customer_id": 1,
    "items": [
        { "product_id": 1, "quantity": 1 },
        { "product_id": 2, "quantity": 1 }
    ],
    "notes": "客户要求3天内取货",
    "extra_info": "{\"pd\": 64, \"od_sph\": -6.00, \"os_sph\": -5.75}"
}
```

**订单创建会自动完成以下操作（在同一个事务内）：**

1. 验证客户存在
2. 验证每件商品库存充足
3. 以数据库当前价格计算总金额（不信任客户端传入的金额）
4. 写入 `orders` 记录
5. 写入每条 `order_items` 明细
6. 扣减 `products.stock_quantity`
7. 写入 `inventory_logs` 出库记录

---

## 六、已解决的技术问题

### 6.1 SQLite 时间时区问题

**问题描述**：SQLite 的 `CURRENT_TIMESTAMP` 返回 UTC 时间；`modernc.org/sqlite` 驱动读取时间后会将其转换为带 `Z` 后缀的 ISO 8601 格式字符串（如 `"2026-02-19T20:36:12Z"`）传给 Go，`Z` 表示 UTC，与实际存储的 UTC+8 时间语义冲突。

**解决方案**：

- 建表时将默认值从 `CURRENT_TIMESTAMP` 改为 `datetime('now', '+8 hours')`，确保存入数据库的时间字符串本身就是北京时间的数值
- 在 `database/time.go` 中封装 `ParseTime()` 函数，使用 `time.ParseInLocation` 而非 `time.Parse`，将格式字符串中的 `Z` 作为字面字符匹配（仅消耗输入中的 Z 字符），而时区始终强制指定为 `Asia/Shanghai`
- 所有 handler 中的时间字段改为先以 `string` 类型接收，再调用 `ParseTime()` 解析

**最终效果**：API 返回的时间格式为 `"2026-02-19T20:36:12+08:00"`，语义正确。

### 6.2 事务保护订单创建

**问题描述**：创建订单需要同时操作四张表，任何一步失败都可能导致数据不一致（如订单已创建但库存未扣减）。

**解决方案**：使用 `database/sql` 的事务（`tx.Begin` / `tx.Commit` / `tx.Rollback`），配合 Go 的 `defer` 机制实现自动回滚，确保"要么全部成功，要么全部撤销"。

### 6.3 商品低库存阈值与老库兼容

**问题描述**：库存预警阈值最初为前端固定值，无法按商品类型精细化设置；且老版本数据库缺失该字段。

**解决方案**：

- 在 `products` 表新增 `low_stock_threshold INTEGER NOT NULL DEFAULT 10`
- 在创建/更新/查询商品接口中读写该字段
- 在迁移逻辑中增加兼容处理：若老库缺列，则执行 `ALTER TABLE` 补齐字段

**最终效果**：每个商品可独立设置预警阈值，且老数据可平滑升级。

### 6.4 库存日志查询与删除约束

**问题描述**：库存日志虽已写入，但缺少独立查询接口；商品删除也需要防止破坏订单历史一致性。

**解决方案**：

- 新增 `GET /api/products/:id/inventory-logs`，按时间倒序返回日志
- 新增商品删除接口 `DELETE /api/products/:id`
- 删除前校验 `order_items` 是否引用该商品；若存在历史订单则拒绝删除
- 无订单关联时，先清理该商品库存日志，再删除商品

**最终效果**：库存变更可追溯，且不会因误删商品破坏历史业务数据。

### 6.5 前后端联调与 CORS

**问题描述**：本地前端（Vite）与后端（Gin）端口不同，浏览器同源策略导致接口请求被拦截。

**解决方案**：在 `main.go` 添加简单 CORS 中间件，允许开发环境跨域访问，并处理 `OPTIONS` 预检请求。

**最终效果**：前端可直接调用后端 API 进行联调。

---

## 七、待办事项（TODO）

### 高优先级（核心功能）

- [x] **前端界面（React + TS）**：已完成基础管理界面与后端 API 对接
- [x] **后端 CORS 配置**：已支持开发环境跨域访问
- [ ] **订单状态字段**：在 `orders` 表中增加 `status` 字段（如 `completed` / `cancelled`），为订单取消逻辑做准备

### 中优先级（完善功能）

- [x] **库存历史查询接口**：已实现 `GET /api/products/:id/inventory-logs`
- [ ] **友好的错误提示**：手机号 / SKU 重复时，将数据库原始约束错误转换为中文提示
- [ ] **订单取消逻辑**：将订单状态标记为已取消，并在事务内退回库存
- [ ] **订单商品重复校验**：创建订单时，若 `items` 数组中存在相同 `product_id`，应合并数量而非插入两条明细

### 低优先级（工程质量）

- [ ] **文档与代码一致性持续维护**：接口路径、技术栈描述需随实现及时更新
- [ ] **前端 App 进一步模块化**：将 `App.tsx` 中剩余弹窗与业务逻辑继续拆分为更小模块 / hooks
- [ ] **配置文件**：将数据库路径、端口等硬编码配置提取到 `.env` 或 `config.yaml`
- [ ] **数据备份脚本**：定期复制 `optics.db` 并生成带时间戳的备份文件
- [ ] **数据统计接口**：月销售额、热销商品、高价值客户等汇总查询

---

## 八、本地运行指南

**环境要求**：Go 1.21+、Node.js 18+

```bash
# 1. 进入项目目录
cd backend

# 2. 下载依赖（首次运行或依赖变更后执行）
go mod tidy

# 3. 启动服务器
go run .
```

前端开发运行（另开终端）：

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖（首次）
npm install

# 3. 启动开发服务器
npm run dev
```

启动成功后终端输出：

```
时区已设置为 Asia/Shanghai (UTC+8)
数据库连接成功
数据库迁移完成，所有表已就绪
服务器启动，监听端口 :8080
[GIN-debug] POST   /api/customers
[GIN-debug] GET    /api/customers
...
```

**注意**：如果本地已有旧版 `optics.db` 文件（表结构发生变更时），需先删除该文件，让程序重新初始化数据库。

---

*本文档随开发进度持续更新。*