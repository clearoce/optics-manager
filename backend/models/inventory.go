package models

import "time"

// InventoryLog 对应数据库中的 inventory_logs 表
type InventoryLog struct {
	ID           int64     `db:"id"`
	ProductID    int64     `db:"product_id"`
	ChangeAmount int       `db:"change_amount"` // 正数=入库，负数=出库
	Reason       string    `db:"reason"`
	ReferenceID  *int64    `db:"reference_id"`  // 指向触发本次变动的订单ID，手动盘点时为nil
	CreatedAt    time.Time `db:"created_at"`
}
