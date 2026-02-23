package handlers

import (
	"net/http"
	"optics-manager/database"
	"optics-manager/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

type CreateCustomerRequest struct {
	Name  string  `json:"name"  binding:"required"`
	Phone string  `json:"phone" binding:"required"`
	Notes *string `json:"notes"`
}

type UpdateCustomerRequest struct {
	Name  string  `json:"name"  binding:"required"`
	Phone string  `json:"phone" binding:"required"`
	Notes *string `json:"notes"`
}

func successResponse(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func errorResponse(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, gin.H{"success": false, "error": message})
}

func CreateCustomer(c *gin.Context) {
	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	result, err := database.DB.Exec(
		`INSERT INTO customers (name, phone, notes) VALUES (?, ?, ?)`,
		req.Name, req.Phone, req.Notes,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "新增客户失败: "+err.Error())
		return
	}

	newID, _ := result.LastInsertId()
	successResponse(c, gin.H{"id": newID, "message": "客户创建成功"})
}

func GetCustomers(c *gin.Context) {
	phone := c.Query("phone")

	query := `SELECT id, name, phone, notes, created_at FROM customers ORDER BY created_at DESC`
	args := []any{}
	if phone != "" {
		query = `SELECT id, name, phone, notes, created_at FROM customers WHERE phone LIKE ? ORDER BY created_at DESC`
		args = append(args, "%"+phone+"%")
	}

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "查询客户列表失败: "+err.Error())
		return
	}
	defer rows.Close()

	customers := []models.Customer{}
	for rows.Next() {
		var c2 models.Customer
		// 用 string 先接收时间字段，再用 ParseTime 明确指定时区解析
		// 这是解决 SQLite 驱动不遵守 time.Local 的核心手段
		var createdAtStr string
		if err := rows.Scan(&c2.ID, &c2.Name, &c2.Phone, &c2.Notes, &createdAtStr); err != nil {
			errorResponse(c, http.StatusInternalServerError, "解析客户数据失败: "+err.Error())
			return
		}
		if t, err := database.ParseTime(createdAtStr); err == nil {
			c2.CreatedAt = t
		}
		customers = append(customers, c2)
	}

	successResponse(c, customers)
}

func GetCustomerByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的客户ID")
		return
	}

	var customer models.Customer
	var createdAtStr string
	err = database.DB.QueryRow(
		`SELECT id, name, phone, notes, created_at FROM customers WHERE id = ?`, id,
	).Scan(&customer.ID, &customer.Name, &customer.Phone, &customer.Notes, &createdAtStr)

	if err != nil {
		errorResponse(c, http.StatusNotFound, "客户不存在")
		return
	}
	if t, err := database.ParseTime(createdAtStr); err == nil {
		customer.CreatedAt = t
	}

	successResponse(c, customer)
}

func UpdateCustomer(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的客户ID")
		return
	}

	var req UpdateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	result, err := database.DB.Exec(
		`UPDATE customers SET name = ?, phone = ?, notes = ? WHERE id = ?`,
		req.Name, req.Phone, req.Notes, id,
	)
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "更新客户信息失败: "+err.Error())
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		errorResponse(c, http.StatusNotFound, "客户不存在")
		return
	}

	successResponse(c, gin.H{"message": "客户信息更新成功"})
}
