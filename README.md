# NexusAdmin - 现代眼镜店管理系统

NexusAdmin 是一款专为小型眼镜店设计的现代化管理系统。该系统采用前后端分离架构，提供了库存管理、客户管理、订单处理以及经营数据分析等核心功能。

## 🌟 核心功能

- **仪表盘**：
  - 统计卡片展示商品总数、订单总数、客户总数。
  - 按日期区间查看收入趋势折线图。
  - 支持超长时间范围横轴标签自动抽样显示。
- **商品管理**：
  - 商品信息维护（名称、价格、备注）。
  - 支持关键字搜索与金额区间筛选。
  - 支持批量勾选与批量删除、分页浏览。
- **客户管理**：
  - 维护客户基础信息（姓名、电话、备注）。
  - 支持验光参数记录（双眼球镜/柱镜/轴位/瞳距/视力）并展示最新记录。
  - 支持查看客户历史订单、累计消费与最后下单信息。
- **订单管理**：
  - 支持新建、编辑、删除、批量删除订单。
  - 支持按客户信息搜索、按日期区间与金额区间筛选。
  - 订单详情支持查看标价（`unit_price`）、实付单价（`paid_price`）、数量与小计。

- **主题模式**：
  - 基于 `next-themes` 的日间/夜间模式切换。
  - 默认日间模式，可在页面右上角一键切换。

## 🆕 最近更新

- **主题系统修复与统一**：
  - 前端已切换为 `next-themes` 管理主题。
  - 修复 Tailwind CDN 配置顺序导致的主题异常。
- **依赖与代码清理**：
  - 移除未使用的 `recharts` 依赖。
  - 清理未引用的前端文件与样式资源。
- **订单价格模型稳定化**：
  - 明确区分商品标价快照（`unit_price`）与订单实付单价（`paid_price`）。
  - 行小计按 `subtotal = paid_price × quantity` 计算。
- **列表交互增强**：
  - 商品/订单支持批量选择与批量删除。
  - 商品、订单、客户列表均支持分页，订单/商品新增金额筛选。

### 订单接口字段说明（关键变更）

创建/更新订单时，`items` 中需要同时传入 `unit_price` 与 `paid_price`：

```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 101,
      "quantity": 2,
      "unit_price": 199.00,
      "paid_price": 188.00
    }
  ],
  "notes": "到店自取"
}
```

说明：后端会同时记录商品标价到 `unit_price`，用于后续对账与价格追溯。

## 🛠️ 技术栈

- **前端**: React + Vite + TypeScript + TailwindCSS + Lucide Icons
- **后端**: Go + Gin Web Framework
- **数据库**: SQLite (轻量级且无需额外配置)

## 🚀 快速启动

### 方式一：一键启动（推荐，支持源码目录与发行版）
直接双击根目录下的 **`启动系统.bat`**。

- 系统将在**后台静默运行**（不会弹出黑窗口）。
- 浏览器会自动打开 `http://localhost:8080` 进入管理界面。
- 若检测不到 `backend/optics-server.exe`，脚本会自动尝试：
  1. 构建前端（`npm run build`）
  2. 同步 `frontend/dist` 到 `backend/dist`
  3. 构建后端可执行文件（`go build -o optics-server.exe .`）

> 这意味着：在**源码目录**中也可以直接双击启动，无需手动先编译。

### 方式二：手动启动
1. 进入 `backend` 目录。
2. 运行 `./optics-server.exe`。

### ⏹️ 如何关闭系统
双击根目录下的 **`停止系统.bat`** 即可完全退出后台服务。

## 📦 发行版打包（脚本已更新）

根目录执行 **`打包发行版.bat`**，会自动完成：

1. 前端构建（Vite）
2. 前端产物同步到后端嵌入目录
3. 后端编译（`go build -ldflags="-w -s" -o optics-server.exe .`）
4. 组装 `release/` 目录（含启动/停止脚本、README、测试数据）

脚本已改为基于脚本所在目录解析路径（`%~dp0`），避免从不同工作目录执行时路径错乱的问题。

## 🧪 测试数据（覆盖导入）

为便于维护，测试数据 SQL 已从 `backend/database/migrate.go` 中拆分到独立文件：

- `backend/database/test_data.sql`

该脚本采用**覆盖导入**方式：

- 先清空 `order_items / orders / products / customers`
- 重置自增序列
- 再写入固定 ID 的测试数据

> ⚠️ 注意：执行后会覆盖现有业务数据，请勿在生产数据上直接使用。

### 导入命令

在项目根目录执行：

```bash
sqlite3 backend/optics.db ".read backend/database/test_data.sql"
```

或在 `backend` 目录执行：

```bash
sqlite3 optics.db ".read database/test_data.sql"
```

## 🛡️ 数据安全与备份

- **自动备份**: 系统每 4 小时会自动在 `backend/backups` 文件夹内生成一个带时间戳的安全备份文件（例如 `optics_backup_20231027_100000.db`）。
- **备份策略**: 系统会自动保留最近的 20 个备份文件，超出后会自动清理旧记录。
- **手动备份**: 你也可以随时手动复制 `backend/optics.db` 文件进行异地备份。

---
NexusAdmin - 让门店管理更高效、更直观。
