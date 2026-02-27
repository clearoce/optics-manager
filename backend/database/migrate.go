package database

import (
	"database/sql"
	"fmt"
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
			created_at     DATETIME DEFAULT (datetime('now', '+8 hours')),
			deleted_at     DATETIME
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
			product_name_snapshot TEXT NOT NULL,
			product_sku_snapshot TEXT,
			product_category_snapshot TEXT NOT NULL,
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

	if err := ensureProductsDeletedAtColumn(); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	if err := ensureOrderItemsSnapshotColumns(); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	log.Println("数据库迁移完成，所有表已就绪")
}

func ensureOrderItemsPaidPriceColumn() error {
	hasPaidPrice, err := hasColumn("order_items", "paid_price")
	if err != nil {
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

func ensureProductsDeletedAtColumn() error {
	hasDeletedAt, err := hasColumn("products", "deleted_at")
	if err != nil {
		return err
	}
	if hasDeletedAt {
		return nil
	}

	if _, err := DB.Exec(`ALTER TABLE products ADD COLUMN deleted_at DATETIME`); err != nil {
		return err
	}

	log.Println("已为 products 表补齐 deleted_at 字段")
	return nil
}

func ensureOrderItemsSnapshotColumns() error {
	type snapshotColumn struct {
		name string
		sql  string
		log  string
	}

	columns := []snapshotColumn{
		{
			name: "product_name_snapshot",
			sql:  `ALTER TABLE order_items ADD COLUMN product_name_snapshot TEXT NOT NULL DEFAULT ''`,
			log:  "已为 order_items 表补齐 product_name_snapshot 字段",
		},
		{
			name: "product_sku_snapshot",
			sql:  `ALTER TABLE order_items ADD COLUMN product_sku_snapshot TEXT`,
			log:  "已为 order_items 表补齐 product_sku_snapshot 字段",
		},
		{
			name: "product_category_snapshot",
			sql:  `ALTER TABLE order_items ADD COLUMN product_category_snapshot TEXT NOT NULL DEFAULT ''`,
			log:  "已为 order_items 表补齐 product_category_snapshot 字段",
		},
	}

	for _, column := range columns {
		hasColumnValue, err := hasColumn("order_items", column.name)
		if err != nil {
			return err
		}
		if hasColumnValue {
			continue
		}

		if _, err := DB.Exec(column.sql); err != nil {
			return err
		}
		log.Println(column.log)
	}

	if _, err := DB.Exec(`UPDATE order_items
		SET
			product_name_snapshot = COALESCE(
				NULLIF(product_name_snapshot, ''),
				(SELECT p.name FROM products p WHERE p.id = order_items.product_id),
				''
			),
			product_sku_snapshot = COALESCE(
				product_sku_snapshot,
				(SELECT p.sku FROM products p WHERE p.id = order_items.product_id)
			),
			product_category_snapshot = COALESCE(
				NULLIF(product_category_snapshot, ''),
				(SELECT p.category FROM products p WHERE p.id = order_items.product_id),
				''
			)
	`); err != nil {
		return err
	}

	return nil
}

func hasColumn(tableName string, columnName string) (bool, error) {
	rows, err := DB.Query(fmt.Sprintf("PRAGMA table_info(%s)", tableName))
	if err != nil {
		return false, err
	}
	defer rows.Close()

	hasColumnValue := false
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
			return false, err
		}
		if name == columnName {
			hasColumnValue = true
			break
		}
	}

	if err := rows.Err(); err != nil {
		return false, err
	}

	return hasColumnValue, nil
}
