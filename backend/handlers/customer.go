package handlers

import (
	"errors"
	"net/http"
	"optics-manager/services"
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

func CreateCustomer(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	newID, err := deps.CustomerService.CreateCustomer(c.Request.Context(), services.CustomerCreateInput{
		Name:  req.Name,
		Phone: req.Phone,
		Notes: req.Notes,
	})
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "新增客户失败: "+err.Error())
		return
	}

	successResponse(c, gin.H{"id": newID, "message": "客户创建成功"})
}

func GetCustomers(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	customers, err := deps.CustomerService.GetCustomers(c.Request.Context(), c.Query("phone"))
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "查询客户列表失败: "+err.Error())
		return
	}

	successResponse(c, customers)
}

func GetCustomerByID(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的客户ID")
		return
	}

	customer, err := deps.CustomerService.GetCustomerByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrCustomerNotFound) {
			errorResponse(c, http.StatusNotFound, "客户不存在")
			return
		}
		errorResponse(c, http.StatusInternalServerError, "查询客户失败: "+err.Error())
		return
	}

	successResponse(c, customer)
}

func UpdateCustomer(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

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

	err = deps.CustomerService.UpdateCustomer(c.Request.Context(), id, services.CustomerUpdateInput{
		Name:  req.Name,
		Phone: req.Phone,
		Notes: req.Notes,
	})
	if err != nil {
		if errors.Is(err, services.ErrCustomerNotFound) {
			errorResponse(c, http.StatusNotFound, "客户不存在")
			return
		}
		errorResponse(c, http.StatusInternalServerError, "更新客户信息失败: "+err.Error())
		return
	}

	successResponse(c, gin.H{"message": "客户信息更新成功"})
}
