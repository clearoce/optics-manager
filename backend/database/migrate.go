package database

import "log"

// Migrate 负责在数据库中创建所有需要的表
// "IF NOT EXISTS" 让这个函数可以在每次程序启动时安全地调用：
// 已有的表不会被重建，不会丢失任何数据。
func Migrate() {
	statements := []string{
		// ---- 客户表 ----
		// 注意 DEFAULT 值从 CURRENT_TIMESTAMP 改成了 datetime('now', '+8 hours')
		// CURRENT_TIMESTAMP 是 SQLite 的内置常量，永远返回 UTC 时间
		// datetime('now', '+8 hours') 则是一个表达式，会在写入时计算 UTC+8 的当前时间
		// 两者写入的都是没有时区标记的纯文本，区别在于数值本身是否已经加了8小时
		`CREATE TABLE IF NOT EXISTS customers (
			id         INTEGER  PRIMARY KEY AUTOINCREMENT,
			name       TEXT     NOT NULL,
			phone      TEXT     UNIQUE NOT NULL,
			notes      TEXT,
			created_at DATETIME DEFAULT (datetime('now', '+8 hours'))
		)`,

		// ---- 商品表 ----
		`CREATE TABLE IF NOT EXISTS products (
			id             INTEGER  PRIMARY KEY AUTOINCREMENT,
			name           TEXT     NOT NULL,
			category       TEXT     NOT NULL,
			sku            TEXT     NOT NULL UNIQUE,
			price          REAL     NOT NULL,
			stock_quantity INTEGER  NOT NULL DEFAULT 0,
			low_stock_threshold INTEGER NOT NULL DEFAULT 10,
			extra_info     TEXT,
			created_at     DATETIME DEFAULT (datetime('now', '+8 hours'))
		)`,

		// ---- 订单表 ----
		`CREATE TABLE IF NOT EXISTS orders (
			id           INTEGER  PRIMARY KEY AUTOINCREMENT,
			customer_id  INTEGER  NOT NULL,
			total_amount REAL     NOT NULL,
			order_date   DATETIME DEFAULT (datetime('now', '+8 hours')),
			notes        TEXT,
			extra_info   TEXT,
			FOREIGN KEY (customer_id) REFERENCES customers(id)
		)`,

		// ---- 订单明细表（无时间字段，不需要修改）----
		`CREATE TABLE IF NOT EXISTS order_items (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			order_id   INTEGER NOT NULL,
			product_id INTEGER NOT NULL,
			quantity   INTEGER NOT NULL DEFAULT 1,
			unit_price REAL    NOT NULL,
			subtotal   REAL    NOT NULL,
			FOREIGN KEY (order_id)   REFERENCES orders(id),
			FOREIGN KEY (product_id) REFERENCES products(id)
		)`,

		// ---- 库存变动日志表 ----
		`CREATE TABLE IF NOT EXISTS inventory_logs (
			id            INTEGER  PRIMARY KEY AUTOINCREMENT,
			product_id    INTEGER  NOT NULL,
			change_amount INTEGER  NOT NULL,
			reason        TEXT     NOT NULL,
			reference_id  INTEGER,
			created_at    DATETIME DEFAULT (datetime('now', '+8 hours')),
			FOREIGN KEY (product_id) REFERENCES products(id)
		)`,

		// test data
		// `INSERT INTO customers (name, phone, notes) VALUES
		// ('张伟',   '13800001111', '高度近视，偏好轻薄镜片'),
		// ('李梅',   '13900002222', NULL),
		// ('王小明', '13700003333', '对金属镜框过敏，只选板材');`,
		// `INSERT INTO products (name, category, sku, price, stock_quantity, low_stock_threshold, extra_info) VALUES
		// ('Ray-Ban RB5154 板材镜框', '镜框',     'RB-5154-BLK', 980.00,  15, 5,  '{"color":"哑光黑","material":"板材","size":"51mm"}'),
		// ('依视路钻晶A4 1.67镜片',  '镜片',     'EX-A4-167',   650.00,  40, 10, '{"refractive_index":1.67,"coating":"防蓝光","type":"单焦点"}'),
		// ('海昌月抛隐形眼镜',        '隐形眼镜', 'HC-MONTH-12', 120.00, 100, 20, '{"duration":"月抛","package_count":6,"water_content":"55%"}');`,

		// `INSERT INTO orders (customer_id, total_amount, notes, extra_info) VALUES
		// (1, 1630.00, '客户要求加急，3天内取货', '{"pd":64,"od_sph":-6.00,"os_sph":-5.75}'),
		// (2,  120.00, NULL,                    NULL),
		// (1,  650.00, '旧镜框不换，只换镜片',   '{"pd":64,"od_sph":-6.25,"os_sph":-6.00}');`,

		// `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
		// (1, 1, 1, 980.00,  980.00),   -- 订单1：买了一副Ray-Ban镜框
		// (1, 2, 1, 650.00,  650.00),   -- 订单1：同时配了一副依视路镜片
		// (2, 3, 1, 120.00,  120.00),   -- 订单2：李梅买了一盒隐形眼镜
		// (3, 2, 1, 650.00,  650.00);   -- 订单3：张伟再次购买镜片（度数加深）`,

		// `INSERT INTO inventory_logs (product_id, change_amount, reason, reference_id) VALUES
		// (1,  20, '初始入库',   NULL),  -- 镜框初始入库20副
		// (2,  42, '初始入库',   NULL),  -- 镜片初始入库42片
		// (3, 100, '初始入库',   NULL),  -- 隐形眼镜初始入库100盒
		// (1,  -1, '订单出库', 1),       -- 订单1完成，镜框库存-1（现在剩15副）
		// (2,  -1, '订单出库', 1),       -- 订单1完成，镜片库存-1
		// (3,  -1, '订单出库', 2),       -- 订单2完成，隐形眼镜库存-1（现在剩99盒）
		// (2,  -1, '订单出库', 3);       -- 订单3完成，镜片库存再-1（现在剩40片）`,
	}

	for _, stmt := range statements {
		if _, err := DB.Exec(stmt); err != nil {
			log.Fatalf("数据库迁移失败: %v\nSQL: %s", err, stmt)
		}
	}

	// 兼容老库：若 products 表缺少 low_stock_threshold 字段，则补列
	if !columnExists("products", "low_stock_threshold") {
		if _, err := DB.Exec(`ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 10`); err != nil {
			log.Fatalf("补充 products.low_stock_threshold 字段失败: %v", err)
		}
	}

	log.Println("数据库迁移完成，所有表已就绪")
}

func columnExists(tableName, columnName string) bool {
	rows, err := DB.Query(`PRAGMA table_info(` + tableName + `)`)
	if err != nil {
		return false
	}
	defer rows.Close()

	for rows.Next() {
		var cid int
		var name string
		var columnType string
		var notNull int
		var defaultValue any
		var pk int
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &pk); err != nil {
			return false
		}
		if name == columnName {
			return true
		}
	}

	return false
}
