package services

import (
	"context"
	"database/sql"
	"optics-manager/models"
	"time"
)

type CustomerVisionRecordInput struct {
	RecordedAt        *time.Time
	LeftSphere        string
	LeftCylinder      float64
	LeftAxis          int
	LeftPD            float64
	LeftVisualAcuity  string
	RightSphere       string
	RightCylinder     float64
	RightAxis         int
	RightPD           float64
	RightVisualAcuity string
}

type CustomerCreateInput struct {
	Name          string
	Phone         string
	Notes         *string
	VisionRecords []CustomerVisionRecordInput
}

type CustomerUpdateInput struct {
	Name          string
	Phone         string
	Notes         *string
	VisionRecords []CustomerVisionRecordInput
}

type ProductCreateInput struct {
	Name      string
	Price     float64
	ExtraInfo *string
}

type ProductUpdateInput struct {
	Name      string
	Price     float64
	ExtraInfo *string
}

type OrderItemInput struct {
	ProductID int64
	Quantity  int
	UnitPrice float64
	PaidPrice float64
}

type OrderCreateInput struct {
	CustomerID  int64
	TotalAmount float64
	Items       []OrderItemInput
	Notes       *string
	ExtraInfo   *string
}

type OrderUpdateInput struct {
	CustomerID  int64
	TotalAmount float64
	Items       []OrderItemInput
	Notes       *string
	ExtraInfo   *string
}

type CustomerService interface {
	CreateCustomer(ctx context.Context, input CustomerCreateInput) (int64, error)
	GetCustomers(ctx context.Context, phone string) ([]models.Customer, error)
	GetCustomerByID(ctx context.Context, id int64) (models.Customer, error)
	UpdateCustomer(ctx context.Context, id int64, input CustomerUpdateInput) error
	AppendCustomerVisionRecords(ctx context.Context, id int64, records []CustomerVisionRecordInput) error
	DeleteCustomer(ctx context.Context, id int64) error
}

type ProductService interface {
	CreateProduct(ctx context.Context, input ProductCreateInput) (int64, error)
	GetProducts(ctx context.Context) ([]models.Product, error)
	GetProductByID(ctx context.Context, id int64) (models.Product, error)
	UpdateProduct(ctx context.Context, id int64, input ProductUpdateInput) error
	DeleteProduct(ctx context.Context, id int64) error
}

type OrderService interface {
	CreateOrder(ctx context.Context, input OrderCreateInput) (int64, float64, error)
	GetOrders(ctx context.Context, customerID *int64) ([]models.Order, error)
	GetOrderDetail(ctx context.Context, id int64) (models.OrderDetail, error)
	UpdateOrder(ctx context.Context, id int64, input OrderUpdateInput) (float64, error)
	DeleteOrder(ctx context.Context, id int64) error
}

func NewCustomerService(db *sql.DB) CustomerService {
	return &customerService{db: db}
}

func NewProductService(db *sql.DB) ProductService {
	return &productService{db: db}
}

func NewOrderService(db *sql.DB) OrderService {
	return &orderService{db: db}
}
