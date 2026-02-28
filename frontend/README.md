# NexusAdmin Frontend

本目录是 **NexusAdmin 眼镜店管理系统** 的前端工程，基于 React + TypeScript + Vite 构建。

## 快速开始

> 需要先安装 Node.js（建议 LTS 版本）

```bash
npm install
npm run dev
```

默认开发地址：`http://localhost:5173`

## 常用脚本

- `npm run dev`：启动前端开发服务器
- `npm run build`：执行 TypeScript 检查并构建生产包
- `npm run lint`：执行 ESLint 检查
- `npm run test`：运行 Vitest 单元测试（当前为基础配置）
- `npm run preview`：本地预览构建产物

## 与后端联调

- 前端接口基地址配置在 `src/services/api.ts`：
  - `API_BASE_URL = 'http://localhost:8080/api'`
- 开发时请确保后端服务已启动（默认端口 `8080`）。

## 主要功能模块

- `src/components/views/DashboardView.tsx`：仪表盘统计与收入趋势图
- `src/components/views/InventoryView.tsx`：商品列表、金额筛选、批量删除、分页
- `src/components/views/OrdersView.tsx`：订单列表、日期/金额筛选、详情与编辑
- `src/components/views/CustomersView.tsx`：客户卡片、验光记录、历史订单
- `src/components/modals/*`：订单/客户/商品等弹窗交互

## 主题模式

- 使用 `next-themes` 实现日间/夜间模式切换。
- `ThemeProvider` 位于 `src/main.tsx`。
- 主题切换按钮位于主界面头部（`src/App.tsx`）。

## 构建产物说明

- `npm run build` 会在本目录生成 `dist/`。
- 根目录打包脚本会将 `frontend/dist` 同步到 `backend/dist`，由 Go 后端嵌入并对外提供完整页面服务。
