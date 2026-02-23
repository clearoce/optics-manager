package models

import "time"

// Customer 对应数据库中的 customers 表
// 每个字段后面的 `db:"..."` 叫做"标签"（tag），它告诉数据库操作库
// Go结构体里的字段名和数据库里的列名是怎么对应的
// 因为Go习惯用驼峰命名（CreatedAt），而数据库习惯用下划线命名（created_at）
type Customer struct {
	ID        int64     `db:"id"`
	Name      string    `db:"name"`
	Phone     string    `db:"phone"`
	Notes     *string   `db:"notes"` // 用指针类型表示"可以为空"：*string 可以是 nil，而 string 不行
	CreatedAt time.Time `db:"created_at"`
}
