package models

import "time"

// Customer 对应数据库中的 customers 表
// 每个字段后面的 `db:"..."` 叫做"标签"（tag），它告诉数据库操作库
// Go结构体里的字段名和数据库里的列名是怎么对应的
// 因为Go习惯用驼峰命名（CreatedAt），而数据库习惯用下划线命名（created_at）
type Customer struct {
	ID            int64                `db:"id"`
	Name          string               `db:"name"`
	Phone         string               `db:"phone"`
	Notes         *string              `db:"notes"` // 用指针类型表示"可以为空"：*string 可以是 nil，而 string 不行
	CreatedAt     time.Time            `db:"created_at"`
	VisionRecords []CustomerVisionData `json:"vision_records,omitempty"`
}

// CustomerVisionData 对应客户验光参数历史表 customer_vision_records
// 一个客户可以有多组验光参数，通过 recorded_at 进行区分
type CustomerVisionData struct {
	ID                int64     `db:"id" json:"id"`
	CustomerID        int64     `db:"customer_id" json:"customer_id"`
	RecordedAt        time.Time `db:"recorded_at" json:"recorded_at"`
	LeftSphere        float64   `db:"left_sphere" json:"left_sphere"`
	LeftCylinder      float64   `db:"left_cylinder" json:"left_cylinder"`
	LeftAxis          int       `db:"left_axis" json:"left_axis"`
	LeftPD            float64   `db:"left_pd" json:"left_pd"`
	LeftVisualAcuity  float64   `db:"left_visual_acuity" json:"left_visual_acuity"`
	RightSphere       float64   `db:"right_sphere" json:"right_sphere"`
	RightCylinder     float64   `db:"right_cylinder" json:"right_cylinder"`
	RightAxis         int       `db:"right_axis" json:"right_axis"`
	RightPD           float64   `db:"right_pd" json:"right_pd"`
	RightVisualAcuity float64   `db:"right_visual_acuity" json:"right_visual_acuity"`
	CreatedAt         time.Time `db:"created_at" json:"created_at"`
}
