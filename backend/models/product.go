package models

import "time"

// Product 对应数据库中的 products 表
type Product struct {
	ID        int64      `db:"id"`
	Name      string     `db:"name"`
	Category  string     `db:"category"`
	SKU       *string    `db:"sku"`
	Price     float64    `db:"price"`
	ExtraInfo *string    `db:"extra_info"` // 存储JSON字符串，由应用层负责序列化和反序列化
	CreatedAt time.Time  `db:"created_at"`
	DeletedAt *time.Time `db:"deleted_at"`
}
