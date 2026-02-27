package handlers

import (
	"errors"
	"net/http"
	"optics-manager/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type OrderItemRequest struct {
	ProductID int64   `json:"product_id" binding:"required"`
	Quantity  int     `json:"quantity"   binding:"required,gt=0"`
	PaidPrice float64 `json:"paid_price" binding:"required,gt=0"`
}

type CreateOrderRequest struct {
	CustomerID  int64              `json:"customer_id" binding:"required"`
	TotalAmount float64            `json:"total_amount" binding:"required,gt=0"`
	Items       []OrderItemRequest `json:"items"       binding:"required,min=1"`
	Notes       *string            `json:"notes"`
	ExtraInfo   *string            `json:"extra_info"`
}

type UpdateOrderRequest struct {
	CustomerID  int64              `json:"customer_id" binding:"required"`
	TotalAmount float64            `json:"total_amount" binding:"required,gt=0"`
	Items       []OrderItemRequest `json:"items"       binding:"required,min=1"`
	Notes       *string            `json:"notes"`
	ExtraInfo   *string            `json:"extra_info"`
}

func CreateOrder(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	input := services.OrderCreateInput{
		CustomerID:  req.CustomerID,
		TotalAmount: req.TotalAmount,
		Items:       mapOrderItems(req.Items),
		Notes:       req.Notes,
		ExtraInfo:   req.ExtraInfo,
	}

	orderID, totalAmount, err := deps.OrderService.CreateOrder(c.Request.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrCustomerNotFound):
			errorResponse(c, http.StatusBadRequest, "客户不存在")
		case errors.Is(err, services.ErrInvalidOrderTotal):
			errorResponse(c, http.StatusBadRequest, "实收金额必须大于 0")
		case services.IsProductNotFoundInOrderError(err):
			errorResponse(c, http.StatusBadRequest, "订单中存在无效商品")
		default:
			errorResponse(c, http.StatusInternalServerError, "创建订单失败: "+err.Error())
		}
		return
	}

	successResponse(c, gin.H{"order_id": orderID, "total_amount": totalAmount, "message": "订单创建成功"})
}

func GetOrders(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	var customerID *int64
	customerIDStr := c.Query("customer_id")
	if customerIDStr != "" {
		parsed, err := strconv.ParseInt(customerIDStr, 10, 64)
		if err != nil {
			errorResponse(c, http.StatusBadRequest, "无效的客户ID")
			return
		}
		customerID = &parsed
	}

	orders, err := deps.OrderService.GetOrders(c.Request.Context(), customerID)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "查询订单列表失败: "+err.Error())
		return
	}

	successResponse(c, orders)
}

func GetOrderDetail(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的订单ID")
		return
	}

	detail, err := deps.OrderService.GetOrderDetail(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			errorResponse(c, http.StatusNotFound, "订单不存在")
			return
		}
		errorResponse(c, http.StatusInternalServerError, "查询订单详情失败: "+err.Error())
		return
	}

	successResponse(c, detail)
}

func UpdateOrder(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的订单ID")
		return
	}

	var req UpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	totalAmount, err := deps.OrderService.UpdateOrder(c.Request.Context(), id, services.OrderUpdateInput{
		CustomerID:  req.CustomerID,
		TotalAmount: req.TotalAmount,
		Items:       mapOrderItems(req.Items),
		Notes:       req.Notes,
		ExtraInfo:   req.ExtraInfo,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrOrderNotFound):
			errorResponse(c, http.StatusNotFound, "订单不存在")
		case errors.Is(err, services.ErrCustomerNotFound):
			errorResponse(c, http.StatusBadRequest, "客户不存在")
		case errors.Is(err, services.ErrInvalidOrderTotal):
			errorResponse(c, http.StatusBadRequest, "实收金额必须大于 0")
		case services.IsProductNotFoundInOrderError(err):
			errorResponse(c, http.StatusBadRequest, "订单中存在无效商品")
		default:
			errorResponse(c, http.StatusInternalServerError, "更新订单失败: "+err.Error())
		}
		return
	}

	successResponse(c, gin.H{"message": "订单更新成功", "total_amount": totalAmount})
}

func DeleteOrder(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的订单ID")
		return
	}

	err = deps.OrderService.DeleteOrder(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			errorResponse(c, http.StatusNotFound, "订单不存在")
			return
		}
		errorResponse(c, http.StatusInternalServerError, "删除订单失败: "+err.Error())
		return
	}

	successResponse(c, gin.H{"message": "订单删除成功"})
}

func mapOrderItems(items []OrderItemRequest) []services.OrderItemInput {
	out := make([]services.OrderItemInput, 0, len(items))
	for _, item := range items {
		out = append(out, services.OrderItemInput{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			PaidPrice: item.PaidPrice,
		})
	}
	return out
}
