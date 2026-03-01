-- optics-manager 测试数据（覆盖导入）
-- 用法示例：
-- sqlite3 optics.db ".read test_data.sql"

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- 覆盖导入：先清空旧数据并重置自增序列
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM sqlite_sequence WHERE name IN ('order_items', 'orders', 'products', 'customers');

INSERT INTO customers (id, name, phone, notes) VALUES
(1, '张伟',   '13800001111', '高度近视，偏好轻薄镜片'),
(2, '李梅',   '13900002222', NULL),
(3, '王小明', '13700003333', '对金属镜框过敏，只选板材');

INSERT INTO products (id, name, category, sku, price, extra_info) VALUES
(1, 'Ray-Ban RB5154 板材镜框', '镜框',     'RB-5154-BLK', 980.00, '{"color":"哑光黑","material":"板材","size":"51mm"}'),
(2, '依视路钻晶A4 1.67镜片',  '镜片',     'EX-A4-167',   650.00, '{"refractive_index":1.67,"coating":"防蓝光","type":"单焦点"}'),
(3, '海昌月抛隐形眼镜',        '隐形眼镜', 'HC-MONTH-12', 120.00, '{"duration":"月抛","package_count":6,"water_content":"55%"}');

INSERT INTO orders (id, customer_id, total_amount, notes, extra_info) VALUES
(1, 1, 1630.00, '客户要求加急，3天内取货', '{"pd":64,"od_sph":-6.00,"os_sph":-5.75}'),
(2, 2,  120.00, NULL,                    NULL),
(3, 1,  650.00, '旧镜框不换，只换镜片',   '{"pd":64,"od_sph":-6.25,"os_sph":-6.00}');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, paid_price, subtotal) VALUES
(1, 1, 1, 980.00, 980.00,  980.00),   -- 订单1：买了一副 Ray-Ban 镜框
(1, 2, 1, 650.00, 650.00,  650.00),   -- 订单1：同时配了一副依视路镜片
(2, 3, 1, 120.00, 120.00,  120.00),   -- 订单2：李梅买了一盒隐形眼镜
(3, 2, 1, 650.00, 650.00,  650.00);   -- 订单3：张伟再次购买镜片（度数加深）

COMMIT;
PRAGMA foreign_keys = ON;
