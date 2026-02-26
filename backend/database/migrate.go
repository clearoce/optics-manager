package database

import (
	"database/sql"
	"log"
)

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
			paid_price REAL    NOT NULL,
			subtotal   REAL    NOT NULL,
			FOREIGN KEY (order_id)   REFERENCES orders(id),
			FOREIGN KEY (product_id) REFERENCES products(id)
		)`,
		// 测试数据 SQL 已迁移至 backend/database/test_data.sql
	}

	for _, stmt := range statements {
		if _, err := DB.Exec(stmt); err != nil {
			log.Fatalf("数据库迁移失败: %v\nSQL: %s", err, stmt)
		}
	}

	if err := ensureOrderItemsPaidPriceColumn(); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	log.Println("数据库迁移完成，所有表已就绪")
}

func ensureOrderItemsPaidPriceColumn() error {
	rows, err := DB.Query(`PRAGMA table_info(order_items)`)
	if err != nil {
		return err
	}
	defer rows.Close()

	hasPaidPrice := false
	for rows.Next() {
		var (
			cid          int
			name         string
			columnType   string
			notNull      int
			defaultValue sql.NullString
			pk           int
		)
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &pk); err != nil {
			return err
		}
		if name == "paid_price" {
			hasPaidPrice = true
			break
		}
	}

	if err := rows.Err(); err != nil {
		return err
	}

	if hasPaidPrice {
		return nil
	}

	if _, err := DB.Exec(`ALTER TABLE order_items ADD COLUMN paid_price REAL NOT NULL DEFAULT 0`); err != nil {
		return err
	}

	if _, err := DB.Exec(`UPDATE order_items SET paid_price = unit_price WHERE paid_price = 0`); err != nil {
		return err
	}

	log.Println("已为 order_items 表补齐 paid_price 字段")
	return nil
}
