package models

import "time"

// Order 对应数据库中的 orders 表
type Order struct {
	ID          int64     `db:"id"`
	CustomerID  int64     `db:"customer_id"`
	TotalAmount float64   `db:"total_amount"`
	OrderDate   time.Time `db:"order_date"`
	Notes       *string   `db:"notes"`
	ExtraInfo   *string   `db:"extra_info"`
}

// OrderItem 对应数据库中的 order_items 表
// 注意它和 Order 是分开定义的两个结构体，因为它们对应的是两张表
type OrderItem struct {
	ID        int64   `db:"id"`
	OrderID   int64   `db:"order_id"`
	ProductID int64   `db:"product_id"`
	Quantity  int     `db:"quantity"`
	UnitPrice float64 `db:"unit_price"` // 标价快照
	PaidPrice float64 `db:"paid_price"` // 实付单价
	Subtotal  float64 `db:"subtotal"`
}

// OrderDetail 是一个"视图结构体"，不直接对应任何一张表
// 它的用途是在展示订单详情时，把 Order 和它的所有 OrderItem 组合在一起
// 这样在业务逻辑层就可以把一张订单的完整信息当作一个整体来传递，而不是分散的两部分
type OrderDetail struct {
	Order Order
	Items []OrderItem
}
