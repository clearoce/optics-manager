package handlers

import (
	"net/http"
	"optics-manager/database"
	"optics-manager/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

type CreateProductRequest struct {
	Name              string  `json:"name"                binding:"required"`
	Category          string  `json:"category"            binding:"required"`
	SKU               *string `json:"sku"`
	Price             float64 `json:"price"               binding:"required,gt=0"`
	LowStockThreshold int     `json:"low_stock_threshold" binding:"gte=0"`
	ExtraInfo         *string `json:"extra_info"`
}

type UpdateProductRequest struct {
	Name              string  `json:"name"                binding:"required"`
	Category          string  `json:"category"            binding:"required"`
	Price             float64 `json:"price"               binding:"required,gt=0"`
	LowStockThreshold int     `json:"low_stock_threshold" binding:"gte=0"`
	ExtraInfo         *string `json:"extra_info"`
}

type AdjustStockRequest struct {
	ChangeAmount int    `json:"change_amount" binding:"required"`
	Reason       string `json:"reason"        binding:"required"`
}

func CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	result, err := database.DB.Exec(
		`INSERT INTO products (name, category, sku, price, stock_quantity, low_stock_threshold, extra_info) VALUES (?, ?, ?, ?, 0, ?, ?)`,
		req.Name, req.Category, req.SKU, req.Price, req.LowStockThreshold, req.ExtraInfo,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "新增商品失败: "+err.Error())
		return
	}

	newID, _ := result.LastInsertId()
	successResponse(c, gin.H{"id": newID, "message": "商品创建成功"})
}

func GetProducts(c *gin.Context) {
	category := c.Query("category")

	query := `SELECT id, name, category, sku, price, stock_quantity, low_stock_threshold, extra_info, created_at FROM products ORDER BY created_at DESC`
	args := []any{}
	if category != "" {
		query = `SELECT id, name, category, sku, price, stock_quantity, low_stock_threshold, extra_info, created_at FROM products WHERE category = ? ORDER BY created_at DESC`
		args = append(args, category)
	}

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "查询商品列表失败: "+err.Error())
		return
	}
	defer rows.Close()

	products := []models.Product{}
	for rows.Next() {
		var p models.Product
		var createdAtStr string
		if err := rows.Scan(&p.ID, &p.Name, &p.Category, &p.SKU, &p.Price, &p.StockQuantity, &p.LowStockThreshold, &p.ExtraInfo, &createdAtStr); err != nil {
			errorResponse(c, http.StatusInternalServerError, "解析商品数据失败: "+err.Error())
			return
		}
		if t, err := database.ParseTime(createdAtStr); err == nil {
			p.CreatedAt = t
		}
		products = append(products, p)
	}

	successResponse(c, products)
}

func GetProductByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的商品ID")
		return
	}

	var p models.Product
	var createdAtStr string
	err = database.DB.QueryRow(
		`SELECT id, name, category, sku, price, stock_quantity, low_stock_threshold, extra_info, created_at FROM products WHERE id = ?`, id,
	).Scan(&p.ID, &p.Name, &p.Category, &p.SKU, &p.Price, &p.StockQuantity, &p.LowStockThreshold, &p.ExtraInfo, &createdAtStr)
	if err != nil {
		errorResponse(c, http.StatusNotFound, "商品不存在")
		return
	}
	if t, err := database.ParseTime(createdAtStr); err == nil {
		p.CreatedAt = t
	}

	successResponse(c, p)
}

func UpdateProduct(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的商品ID")
		return
	}

	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	result, err := database.DB.Exec(
		`UPDATE products SET name = ?, category = ?, price = ?, low_stock_threshold = ?, extra_info = ? WHERE id = ?`,
		req.Name, req.Category, req.Price, req.LowStockThreshold, req.ExtraInfo, id,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "更新商品信息失败: "+err.Error())
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		errorResponse(c, http.StatusNotFound, "商品不存在")
		return
	}

	successResponse(c, gin.H{"message": "商品信息更新成功"})
}

func AdjustStock(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的商品ID")
		return
	}

	var req AdjustStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
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

	result, err := tx.Exec(
		`UPDATE products
		 SET stock_quantity = stock_quantity + ?
		 WHERE id = ?
		   AND stock_quantity + ? >= 0`,
		req.ChangeAmount, id, req.ChangeAmount,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "更新库存失败: "+err.Error())
		return
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		var exists int
		err = tx.QueryRow(`SELECT COUNT(1) FROM products WHERE id = ?`, id).Scan(&exists)
		if err != nil {
			errorResponse(c, http.StatusInternalServerError, "校验商品失败: "+err.Error())
			return
		}
		if exists == 0 {
			errorResponse(c, http.StatusNotFound, "商品不存在")
			return
		}
		errorResponse(c, http.StatusBadRequest, "库存不足，不能调整为负数")
		return
	}

	_, err = tx.Exec(
		`INSERT INTO inventory_logs (product_id, change_amount, reason, reference_id) VALUES (?, ?, ?, NULL)`,
		id, req.ChangeAmount, req.Reason,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "写入库存日志失败: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		errorResponse(c, http.StatusInternalServerError, "提交事务失败: "+err.Error())
		return
	}
	committed = true

	successResponse(c, gin.H{"message": "库存调整成功"})
}

func DeleteProduct(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的商品ID")
		return
	}

	var exists int
	if err := database.DB.QueryRow(`SELECT COUNT(1) FROM products WHERE id = ?`, id).Scan(&exists); err != nil {
		errorResponse(c, http.StatusInternalServerError, "校验商品失败: "+err.Error())
		return
	}
	if exists == 0 {
		errorResponse(c, http.StatusNotFound, "商品不存在")
		return
	}

	var orderItemCount int
	if err := database.DB.QueryRow(`SELECT COUNT(1) FROM order_items WHERE product_id = ?`, id).Scan(&orderItemCount); err != nil {
		errorResponse(c, http.StatusInternalServerError, "校验商品订单关联失败: "+err.Error())
		return
	}
	if orderItemCount > 0 {
		errorResponse(c, http.StatusBadRequest, "该商品已有订单记录，不能删除")
		return
	}

	_, err = database.DB.Exec(`DELETE FROM inventory_logs WHERE product_id = ?`, id)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "删除库存日志失败: "+err.Error())
		return
	}

	result, err := database.DB.Exec(`DELETE FROM products WHERE id = ?`, id)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "删除商品失败: "+err.Error())
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		errorResponse(c, http.StatusNotFound, "商品不存在")
		return
	}

	successResponse(c, gin.H{"message": "商品删除成功"})
}

func GetProductInventoryLogs(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的商品ID")
		return
	}

	var exists int
	if err := database.DB.QueryRow(`SELECT COUNT(1) FROM products WHERE id = ?`, id).Scan(&exists); err != nil {
		errorResponse(c, http.StatusInternalServerError, "校验商品失败: "+err.Error())
		return
	}
	if exists == 0 {
		errorResponse(c, http.StatusNotFound, "商品不存在")
		return
	}

	rows, err := database.DB.Query(
		`SELECT id, product_id, change_amount, reason, reference_id, created_at
		 FROM inventory_logs
		 WHERE product_id = ?
		 ORDER BY created_at DESC, id DESC`,
		id,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "查询库存日志失败: "+err.Error())
		return
	}
	defer rows.Close()

	logs := []models.InventoryLog{}
	for rows.Next() {
		var logItem models.InventoryLog
		var createdAtStr string
		if err := rows.Scan(&logItem.ID, &logItem.ProductID, &logItem.ChangeAmount, &logItem.Reason, &logItem.ReferenceID, &createdAtStr); err != nil {
			errorResponse(c, http.StatusInternalServerError, "解析库存日志失败: "+err.Error())
			return
		}
		if t, err := database.ParseTime(createdAtStr); err == nil {
			logItem.CreatedAt = t
		}
		logs = append(logs, logItem)
	}

	successResponse(c, logs)
}
