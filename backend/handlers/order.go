package handlers

import (
	"net/http"
	"optics-manager/database"
	"optics-manager/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

type OrderItemRequest struct {
	ProductID int64 `json:"product_id" binding:"required"`
	Quantity  int   `json:"quantity"   binding:"required,gt=0"`
}

type CreateOrderRequest struct {
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
		Price         float64
		StockQuantity int
		Name          string
	}
	productMap := make(map[int64]productSnapshot)
	requestedQtyMap := make(map[int64]int)

	for _, item := range req.Items {
		requestedQtyMap[item.ProductID] += item.Quantity
	}

	for productID, totalQty := range requestedQtyMap {
		var snap productSnapshot
		err := database.DB.QueryRow(
			`SELECT price, stock_quantity, name FROM products WHERE id = ?`, productID,
		).Scan(&snap.Price, &snap.StockQuantity, &snap.Name)
		if err != nil {
			errorResponse(c, http.StatusBadRequest, "商品ID "+strconv.FormatInt(productID, 10)+" 不存在")
			return
		}
		if snap.StockQuantity < totalQty {
			errorResponse(c, http.StatusBadRequest, "商品「"+snap.Name+"」库存不足，当前库存: "+strconv.Itoa(snap.StockQuantity))
			return
		}
		productMap[productID] = snap
	}

	var totalAmount float64
	for _, item := range req.Items {
		totalAmount += productMap[item.ProductID].Price * float64(item.Quantity)
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
		subtotal := snap.Price * float64(item.Quantity)

		_, err = tx.Exec(
			`INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)`,
			orderID, item.ProductID, item.Quantity, snap.Price, subtotal,
		)
		if err != nil {
			errorResponse(c, http.StatusInternalServerError, "插入订单明细失败: "+err.Error())
			return
		}

		result, err := tx.Exec(
			`UPDATE products
			 SET stock_quantity = stock_quantity - ?
			 WHERE id = ?
			   AND stock_quantity >= ?`,
			item.Quantity, item.ProductID, item.Quantity,
		)
		if err != nil {
			errorResponse(c, http.StatusInternalServerError, "扣减库存失败: "+err.Error())
			return
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			errorResponse(c, http.StatusBadRequest, "商品库存不足，无法完成下单")
			return
		}

		_, err = tx.Exec(
			`INSERT INTO inventory_logs (product_id, change_amount, reason, reference_id) VALUES (?, ?, '订单出库', ?)`,
			item.ProductID, -item.Quantity, orderID,
		)
		if err != nil {
			errorResponse(c, http.StatusInternalServerError, "写入库存日志失败: "+err.Error())
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
		`SELECT id, order_id, product_id, quantity, unit_price, subtotal FROM order_items WHERE order_id = ?`, id,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "查询订单明细失败: "+err.Error())
		return
	}
	defer rows.Close()

	items := []models.OrderItem{}
	for rows.Next() {
		var item models.OrderItem
		if err := rows.Scan(&item.ID, &item.OrderID, &item.ProductID, &item.Quantity, &item.UnitPrice, &item.Subtotal); err != nil {
			errorResponse(c, http.StatusInternalServerError, "解析订单明细失败: "+err.Error())
			return
		}
		items = append(items, item)
	}

	successResponse(c, models.OrderDetail{Order: o, Items: items})
}
