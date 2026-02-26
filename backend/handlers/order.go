package handlers

import (
	"net/http"
	"optics-manager/database"
	"optics-manager/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

type OrderItemRequest struct {
	ProductID int64   `json:"product_id" binding:"required"`
	Quantity  int     `json:"quantity"   binding:"required,gt=0"`
	PaidPrice float64 `json:"paid_price" binding:"required,gt=0"`
}

type CreateOrderRequest struct {
	CustomerID int64              `json:"customer_id" binding:"required"`
	Items      []OrderItemRequest `json:"items"       binding:"required,min=1"`
	Notes      *string            `json:"notes"`
	ExtraInfo  *string            `json:"extra_info"`
}

type UpdateOrderRequest struct {
	CustomerID int64              `json:"customer_id" binding:"required"`
	Items      []OrderItemRequest `json:"items"       binding:"required,min=1"`
	Notes      *string            `json:"notes"`
	ExtraInfo  *string            `json:"extra_info"`
}

func CreateOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	var customerExists int
	err := database.DB.QueryRow(`SELECT COUNT(1) FROM customers WHERE id = ?`, req.CustomerID).
		Scan(&customerExists)
	if err != nil || customerExists == 0 {
		errorResponse(c, http.StatusBadRequest, "客户不存在")
		return
	}

	type productSnapshot struct {
		Price float64
	}
	productMap := make(map[int64]productSnapshot)

	for _, item := range req.Items {
		if _, exists := productMap[item.ProductID]; exists {
			continue
		}

		var snap productSnapshot
		err := database.DB.QueryRow(
			`SELECT price FROM products WHERE id = ?`, item.ProductID,
		).Scan(&snap.Price)
		if err != nil {
			errorResponse(c, http.StatusBadRequest, "商品ID "+strconv.FormatInt(item.ProductID, 10)+" 不存在")
			return
		}

		productMap[item.ProductID] = snap
	}

	var totalAmount float64
	for _, item := range req.Items {
		totalAmount += item.PaidPrice * float64(item.Quantity)
	}

	tx, err := database.DB.Begin()
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "开启事务失败: "+err.Error())
		return
	}
	committed := false
	defer func() {
		if !committed {
			tx.Rollback()
		}
	}()

	result, err := tx.Exec(
		`INSERT INTO orders (customer_id, total_amount, notes, extra_info) VALUES (?, ?, ?, ?)`,
		req.CustomerID, totalAmount, req.Notes, req.ExtraInfo,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "创建订单失败: "+err.Error())
		return
	}
	orderID, _ := result.LastInsertId()

	for _, item := range req.Items {
		snap := productMap[item.ProductID]
		subtotal := item.PaidPrice * float64(item.Quantity)

		_, err = tx.Exec(
			`INSERT INTO order_items (order_id, product_id, quantity, unit_price, paid_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)`,
			orderID, item.ProductID, item.Quantity, snap.Price, item.PaidPrice, subtotal,
		)
		if err != nil {
			errorResponse(c, http.StatusInternalServerError, "插入订单明细失败: "+err.Error())
			return
		}
	}

	if err := tx.Commit(); err != nil {
		errorResponse(c, http.StatusInternalServerError, "提交事务失败: "+err.Error())
		return
	}
	committed = true

	successResponse(c, gin.H{"order_id": orderID, "total_amount": totalAmount, "message": "订单创建成功"})
}

func GetOrders(c *gin.Context) {
	customerIDStr := c.Query("customer_id")

	query := `SELECT id, customer_id, total_amount, order_date, notes, extra_info FROM orders ORDER BY order_date DESC`
	args := []any{}
	if customerIDStr != "" {
		customerID, err := strconv.ParseInt(customerIDStr, 10, 64)
		if err != nil {
			errorResponse(c, http.StatusBadRequest, "无效的客户ID")
			return
		}
		query = `SELECT id, customer_id, total_amount, order_date, notes, extra_info FROM orders WHERE customer_id = ? ORDER BY order_date DESC`
		args = append(args, customerID)
	}

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "查询订单列表失败: "+err.Error())
		return
	}
	defer rows.Close()

	orders := []models.Order{}
	for rows.Next() {
		var o models.Order
		var orderDateStr string
		if err := rows.Scan(&o.ID, &o.CustomerID, &o.TotalAmount, &orderDateStr, &o.Notes, &o.ExtraInfo); err != nil {
			errorResponse(c, http.StatusInternalServerError, "解析订单数据失败: "+err.Error())
			return
		}
		if t, err := database.ParseTime(orderDateStr); err == nil {
			o.OrderDate = t
		}
		orders = append(orders, o)
	}

	successResponse(c, orders)
}

func GetOrderDetail(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的订单ID")
		return
	}

	var o models.Order
	var orderDateStr string
	err = database.DB.QueryRow(
		`SELECT id, customer_id, total_amount, order_date, notes, extra_info FROM orders WHERE id = ?`, id,
	).Scan(&o.ID, &o.CustomerID, &o.TotalAmount, &orderDateStr, &o.Notes, &o.ExtraInfo)
	if err != nil {
		errorResponse(c, http.StatusNotFound, "订单不存在")
		return
	}
	if t, err := database.ParseTime(orderDateStr); err == nil {
		o.OrderDate = t
	}

	rows, err := database.DB.Query(
		`SELECT id, order_id, product_id, quantity, unit_price, paid_price, subtotal FROM order_items WHERE order_id = ?`, id,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "查询订单明细失败: "+err.Error())
		return
	}
	defer rows.Close()

	items := []models.OrderItem{}
	for rows.Next() {
		var item models.OrderItem
		if err := rows.Scan(&item.ID, &item.OrderID, &item.ProductID, &item.Quantity, &item.UnitPrice, &item.PaidPrice, &item.Subtotal); err != nil {
			errorResponse(c, http.StatusInternalServerError, "解析订单明细失败: "+err.Error())
			return
		}
		items = append(items, item)
	}

	successResponse(c, models.OrderDetail{Order: o, Items: items})
}

func UpdateOrder(c *gin.Context) {
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

	var orderExists int
	if err := database.DB.QueryRow(`SELECT COUNT(1) FROM orders WHERE id = ?`, id).Scan(&orderExists); err != nil {
		errorResponse(c, http.StatusInternalServerError, "校验订单失败: "+err.Error())
		return
	}
	if orderExists == 0 {
		errorResponse(c, http.StatusNotFound, "订单不存在")
		return
	}

	var customerExists int
	err = database.DB.QueryRow(`SELECT COUNT(1) FROM customers WHERE id = ?`, req.CustomerID).
		Scan(&customerExists)
	if err != nil || customerExists == 0 {
		errorResponse(c, http.StatusBadRequest, "客户不存在")
		return
	}

	type productSnapshot struct {
		Price float64
	}
	productMap := make(map[int64]productSnapshot)

	for _, item := range req.Items {
		if _, exists := productMap[item.ProductID]; exists {
			continue
		}

		var snap productSnapshot
		err := database.DB.QueryRow(
			`SELECT price FROM products WHERE id = ?`, item.ProductID,
		).Scan(&snap.Price)
		if err != nil {
			errorResponse(c, http.StatusBadRequest, "商品ID "+strconv.FormatInt(item.ProductID, 10)+" 不存在")
			return
		}

		productMap[item.ProductID] = snap
	}

	var totalAmount float64
	for _, item := range req.Items {
		totalAmount += item.PaidPrice * float64(item.Quantity)
	}

	tx, err := database.DB.Begin()
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "开启事务失败: "+err.Error())
		return
	}
	committed := false
	defer func() {
		if !committed {
			tx.Rollback()
		}
	}()

	result, err := tx.Exec(
		`UPDATE orders SET customer_id = ?, total_amount = ?, notes = ?, extra_info = ? WHERE id = ?`,
		req.CustomerID, totalAmount, req.Notes, req.ExtraInfo, id,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "更新订单失败: "+err.Error())
		return
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		errorResponse(c, http.StatusNotFound, "订单不存在")
		return
	}

	if _, err := tx.Exec(`DELETE FROM order_items WHERE order_id = ?`, id); err != nil {
		errorResponse(c, http.StatusInternalServerError, "清理旧订单明细失败: "+err.Error())
		return
	}

	for _, item := range req.Items {
		snap := productMap[item.ProductID]
		subtotal := item.PaidPrice * float64(item.Quantity)

		_, err = tx.Exec(
			`INSERT INTO order_items (order_id, product_id, quantity, unit_price, paid_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)`,
			id, item.ProductID, item.Quantity, snap.Price, item.PaidPrice, subtotal,
		)
		if err != nil {
			errorResponse(c, http.StatusInternalServerError, "写入订单明细失败: "+err.Error())
			return
		}
	}

	if err := tx.Commit(); err != nil {
		errorResponse(c, http.StatusInternalServerError, "提交事务失败: "+err.Error())
		return
	}
	committed = true

	successResponse(c, gin.H{"message": "订单更新成功", "total_amount": totalAmount})
}

func DeleteOrder(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的订单ID")
		return
	}

	var exists int
	if err := database.DB.QueryRow(`SELECT COUNT(1) FROM orders WHERE id = ?`, id).Scan(&exists); err != nil {
		errorResponse(c, http.StatusInternalServerError, "校验订单失败: "+err.Error())
		return
	}
	if exists == 0 {
		errorResponse(c, http.StatusNotFound, "订单不存在")
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "开启事务失败: "+err.Error())
		return
	}
	committed := false
	defer func() {
		if !committed {
			tx.Rollback()
		}
	}()

	if _, err := tx.Exec(`DELETE FROM order_items WHERE order_id = ?`, id); err != nil {
		errorResponse(c, http.StatusInternalServerError, "删除订单明细失败: "+err.Error())
		return
	}

	result, err := tx.Exec(`DELETE FROM orders WHERE id = ?`, id)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "删除订单失败: "+err.Error())
		return
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		errorResponse(c, http.StatusNotFound, "订单不存在")
		return
	}

	if err := tx.Commit(); err != nil {
		errorResponse(c, http.StatusInternalServerError, "提交事务失败: "+err.Error())
		return
	}
	committed = true

	successResponse(c, gin.H{"message": "订单删除成功"})
}
