package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
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

		// ---- 客户验光参数历史表 ----
		`CREATE TABLE IF NOT EXISTS customer_vision_records (
			id                 INTEGER PRIMARY KEY AUTOINCREMENT,
			customer_id        INTEGER NOT NULL,
			recorded_at        DATETIME NOT NULL,
			left_sphere        TEXT NOT NULL,
			left_cylinder      REAL NOT NULL,
			left_axis          INTEGER NOT NULL,
			left_pd            REAL NOT NULL,
			left_visual_acuity TEXT NOT NULL,
			right_sphere       TEXT NOT NULL,
			right_cylinder     REAL NOT NULL,
			right_axis         INTEGER NOT NULL,
			right_pd           REAL NOT NULL,
			right_visual_acuity TEXT NOT NULL,
			created_at         DATETIME DEFAULT (datetime('now', '+8 hours')),
			FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
		)`,

		`CREATE INDEX IF NOT EXISTS idx_customer_vision_records_customer_id_recorded_at
		ON customer_vision_records(customer_id, recorded_at DESC, id DESC)`,

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
			id                     INTEGER  PRIMARY KEY AUTOINCREMENT,
			customer_id            INTEGER  NOT NULL,
			customer_name_snapshot TEXT     NOT NULL DEFAULT '',
			customer_phone_snapshot TEXT    NOT NULL DEFAULT '',
			total_amount           REAL     NOT NULL,
			order_date             DATETIME DEFAULT (datetime('now', '+8 hours')),
			notes                  TEXT,
			extra_info             TEXT
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

	if err := ensureOrdersCustomerSnapshotColumns(); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	if err := ensureOrdersSupportDeletingCustomer(); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	if err := ensureCustomerVisionRecordStringColumns(); err != nil {
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
				NULL
			),
			product_category_snapshot = COALESCE(
				NULLIF(product_category_snapshot, ''),
				''
			)
	`); err != nil {
		return err
	}

	return nil
}

func ensureOrdersCustomerSnapshotColumns() error {
	type snapshotColumn struct {
		name string
		sql  string
		log  string
	}

	columns := []snapshotColumn{
		{
			name: "customer_name_snapshot",
			sql:  `ALTER TABLE orders ADD COLUMN customer_name_snapshot TEXT NOT NULL DEFAULT ''`,
			log:  "已为 orders 表补齐 customer_name_snapshot 字段",
		},
		{
			name: "customer_phone_snapshot",
			sql:  `ALTER TABLE orders ADD COLUMN customer_phone_snapshot TEXT NOT NULL DEFAULT ''`,
			log:  "已为 orders 表补齐 customer_phone_snapshot 字段",
		},
	}

	for _, column := range columns {
		hasColumnValue, err := hasColumn("orders", column.name)
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

	if _, err := DB.Exec(`UPDATE orders
		SET
			customer_name_snapshot = COALESCE(
				NULLIF(customer_name_snapshot, ''),
				(SELECT c.name FROM customers c WHERE c.id = orders.customer_id),
				''
			),
			customer_phone_snapshot = COALESCE(
				NULLIF(customer_phone_snapshot, ''),
				(SELECT c.phone FROM customers c WHERE c.id = orders.customer_id),
				''
			)
	`); err != nil {
		return err
	}

	return nil
}

func ensureOrdersSupportDeletingCustomer() (err error) {
	hasForeignKey, err := hasForeignKeyToTable("orders", "customers")
	if err != nil {
		return err
	}
	if !hasForeignKey {
		return nil
	}

	if _, err = DB.Exec(`PRAGMA foreign_keys = OFF`); err != nil {
		return err
	}
	defer func() {
		if _, execErr := DB.Exec(`PRAGMA foreign_keys = ON`); err == nil && execErr != nil {
			err = execErr
		}
	}()

	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	if _, err := tx.Exec(`CREATE TABLE orders_new (
		id                     INTEGER  PRIMARY KEY AUTOINCREMENT,
		customer_id            INTEGER  NOT NULL,
		customer_name_snapshot TEXT     NOT NULL DEFAULT '',
		customer_phone_snapshot TEXT    NOT NULL DEFAULT '',
		total_amount           REAL     NOT NULL,
		order_date             DATETIME DEFAULT (datetime('now', '+8 hours')),
		notes                  TEXT,
		extra_info             TEXT
	)`); err != nil {
		return err
	}

	if _, err := tx.Exec(`INSERT INTO orders_new (
		id,
		customer_id,
		customer_name_snapshot,
		customer_phone_snapshot,
		total_amount,
		order_date,
		notes,
		extra_info
	)
	SELECT
		id,
		customer_id,
		COALESCE(
			NULLIF(customer_name_snapshot, ''),
			(SELECT c.name FROM customers c WHERE c.id = orders.customer_id),
			''
		),
		COALESCE(
			NULLIF(customer_phone_snapshot, ''),
			(SELECT c.phone FROM customers c WHERE c.id = orders.customer_id),
			''
		),
		total_amount,
		order_date,
		notes,
		extra_info
	FROM orders`); err != nil {
		return err
	}

	if _, err := tx.Exec(`DROP TABLE orders`); err != nil {
		return err
	}

	if _, err := tx.Exec(`ALTER TABLE orders_new RENAME TO orders`); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	committed = true

	log.Println("已重建 orders 表：允许删除有关联订单的客户，订单保留客户快照")
	return nil
}

func ensureCustomerVisionRecordStringColumns() (err error) {
	rows, err := DB.Query(`PRAGMA table_info(customer_vision_records)`)
	if err != nil {
		return err
	}
	defer rows.Close()

	expectedTextColumns := map[string]struct{}{
		"left_sphere":         {},
		"left_visual_acuity":  {},
		"right_sphere":        {},
		"right_visual_acuity": {},
	}

	needsRebuild := false
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

		if _, ok := expectedTextColumns[name]; !ok {
			continue
		}

		if !strings.Contains(strings.ToUpper(columnType), "TEXT") {
			needsRebuild = true
			break
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if !needsRebuild {
		return nil
	}

	if _, err = DB.Exec(`PRAGMA foreign_keys = OFF`); err != nil {
		return err
	}
	defer func() {
		if _, execErr := DB.Exec(`PRAGMA foreign_keys = ON`); err == nil && execErr != nil {
			err = execErr
		}
	}()

	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	if _, err := tx.Exec(`CREATE TABLE customer_vision_records_new (
		id                  INTEGER PRIMARY KEY AUTOINCREMENT,
		customer_id         INTEGER NOT NULL,
		recorded_at         DATETIME NOT NULL,
		left_sphere         TEXT NOT NULL,
		left_cylinder       REAL NOT NULL,
		left_axis           INTEGER NOT NULL,
		left_pd             REAL NOT NULL,
		left_visual_acuity  TEXT NOT NULL,
		right_sphere        TEXT NOT NULL,
		right_cylinder      REAL NOT NULL,
		right_axis          INTEGER NOT NULL,
		right_pd            REAL NOT NULL,
		right_visual_acuity TEXT NOT NULL,
		created_at          DATETIME DEFAULT (datetime('now', '+8 hours')),
		FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
	)`); err != nil {
		return err
	}

	if _, err := tx.Exec(`INSERT INTO customer_vision_records_new (
		id,
		customer_id,
		recorded_at,
		left_sphere,
		left_cylinder,
		left_axis,
		left_pd,
		left_visual_acuity,
		right_sphere,
		right_cylinder,
		right_axis,
		right_pd,
		right_visual_acuity,
		created_at
	)
	SELECT
		id,
		customer_id,
		recorded_at,
		CAST(left_sphere AS TEXT),
		left_cylinder,
		left_axis,
		left_pd,
		CAST(left_visual_acuity AS TEXT),
		CAST(right_sphere AS TEXT),
		right_cylinder,
		right_axis,
		right_pd,
		CAST(right_visual_acuity AS TEXT),
		created_at
	FROM customer_vision_records`); err != nil {
		return err
	}

	if _, err := tx.Exec(`DROP TABLE customer_vision_records`); err != nil {
		return err
	}

	if _, err := tx.Exec(`ALTER TABLE customer_vision_records_new RENAME TO customer_vision_records`); err != nil {
		return err
	}

	if _, err := tx.Exec(`CREATE INDEX IF NOT EXISTS idx_customer_vision_records_customer_id_recorded_at
	ON customer_vision_records(customer_id, recorded_at DESC, id DESC)`); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	committed = true

	log.Println("已重建 customer_vision_records 表：球镜与矫正视力字段升级为 TEXT")
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

func hasForeignKeyToTable(tableName string, targetTable string) (bool, error) {
	rows, err := DB.Query(fmt.Sprintf("PRAGMA foreign_key_list(%s)", tableName))
	if err != nil {
		return false, err
	}
	defer rows.Close()

	hasForeignKey := false
	for rows.Next() {
		var (
			id       int
			seq      int
			table    string
			from     string
			to       string
			onUpdate string
			onDelete string
			match    string
		)

		if err := rows.Scan(&id, &seq, &table, &from, &to, &onUpdate, &onDelete, &match); err != nil {
			return false, err
		}

		if table == targetTable {
			hasForeignKey = true
			break
		}
	}

	if err := rows.Err(); err != nil {
		return false, err
	}

	return hasForeignKey, nil
}
