package models

import "time"

// Product 对应数据库中的 products 表
type Product struct {
	ID                int64     `db:"id"`
	Name              string    `db:"name"`
	Category          string    `db:"category"`
	SKU               *string   `db:"sku"`
	Price             float64   `db:"price"`
	StockQuantity     int       `db:"stock_quantity"`
	LowStockThreshold int       `db:"low_stock_threshold"`
	ExtraInfo         *string   `db:"extra_info"` // 存储JSON字符串，由应用层负责序列化和反序列化
	CreatedAt         time.Time `db:"created_at"`
}
