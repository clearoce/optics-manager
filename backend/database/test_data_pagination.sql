-- optics-manager 大量分页测试数据（覆盖导入）
-- 用途：快速生成“商品列表 / 订单列表”分页压测数据
-- 用法示例（在 backend 目录下执行）：
-- sqlite3 optics.db ".read database/test_data_pagination.sql"

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- 覆盖导入：先清空旧数据并重置自增序列
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM sqlite_sequence WHERE name IN ('order_items', 'orders', 'products', 'customers');

-- 1) 客户：300 条
INSERT INTO customers (id, name, phone, notes, created_at)
WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 300
)
SELECT
  n,
  printf('分页客户%03d', n),
  printf('139%08d', n),
  CASE
    WHEN n % 10 = 0 THEN '高频复购客户'
    WHEN n % 15 = 0 THEN '价格敏感客户'
    ELSE NULL
  END,
  datetime('now', '+8 hours', printf('-%d days', n % 365))
FROM seq;

-- 2) 商品：500 条
INSERT INTO products (id, name, category, sku, price, extra_info, created_at, deleted_at)
WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 500
)
SELECT
  n,
  printf('分页测试商品%04d', n),
  CASE (n % 5)
    WHEN 0 THEN '镜框'
    WHEN 1 THEN '镜片'
    WHEN 2 THEN '隐形眼镜'
    WHEN 3 THEN '护理液'
    ELSE '配件'
  END,
  printf('SKU-%05d', n),
  CAST(ROUND(80 + (n % 220) * 4.2 + (n % 7) * 0.35, 2) AS REAL),
  printf('{"batch":"pagination","index":%d}', n),
  datetime('now', '+8 hours', printf('-%d days', n % 365)),
  NULL
FROM seq;

-- 3) 订单：3000 条（每单对应 1 条订单明细，足够测试列表分页）
INSERT INTO orders (id, customer_id, total_amount, order_date, notes, extra_info)
WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 3000
)
SELECT
  n,
  ((n - 1) % 300) + 1,
  CAST(ROUND(120 + (n % 180) * 6.5 + (n % 9) * 1.2, 2) AS REAL),
  datetime('now', '+8 hours', printf('-%d days', n % 730)),
  CASE WHEN n % 12 = 0 THEN '分页压测订单' ELSE NULL END,
  CASE WHEN n % 20 = 0 THEN printf('{"source":"bulk","no":%d}', n) ELSE NULL END
FROM seq;

-- 4) 订单明细：每单 1 条，使用商品快照字段
INSERT INTO order_items (
  order_id,
  product_id,
  product_name_snapshot,
  product_sku_snapshot,
  product_category_snapshot,
  quantity,
  unit_price,
  paid_price,
  subtotal
)
SELECT
  o.id,
  p.id,
  p.name,
  p.sku,
  p.category,
  1,
  o.total_amount,
  o.total_amount,
  o.total_amount
FROM orders o
JOIN products p ON p.id = ((o.id - 1) % 500) + 1;

COMMIT;
PRAGMA foreign_keys = ON;
