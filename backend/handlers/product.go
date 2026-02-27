package handlers

import (
	"errors"
	"net/http"
	"optics-manager/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type CreateProductRequest struct {
	Name      string  `json:"name"     binding:"required"`
	Category  string  `json:"category" binding:"required"`
	SKU       *string `json:"sku"`
	Price     float64 `json:"price"    binding:"required,gt=0"`
	ExtraInfo *string `json:"extra_info"`
}

type UpdateProductRequest struct {
	Name      string  `json:"name"     binding:"required"`
	Category  string  `json:"category" binding:"required"`
	Price     float64 `json:"price"    binding:"required,gt=0"`
	ExtraInfo *string `json:"extra_info"`
}

func CreateProduct(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	newID, err := deps.ProductService.CreateProduct(c.Request.Context(), services.ProductCreateInput{
		Name:      req.Name,
		Category:  req.Category,
		SKU:       req.SKU,
		Price:     req.Price,
		ExtraInfo: req.ExtraInfo,
	})
	if err != nil {
		if errors.Is(err, services.ErrProductSKUAlreadyExists) {
			errorResponse(c, http.StatusBadRequest, "SKU 已存在：可修改 SKU，或直接使用该 SKU 以恢复已删除商品")
			return
		}
		errorResponse(c, http.StatusInternalServerError, "新增商品失败: "+err.Error())
		return
	}

	successResponse(c, gin.H{"id": newID, "message": "商品创建成功"})
}

func GetProducts(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	products, err := deps.ProductService.GetProducts(c.Request.Context(), c.Query("category"))
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "查询商品列表失败: "+err.Error())
		return
	}

	successResponse(c, products)
}

func GetProductByID(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的商品ID")
		return
	}

	product, err := deps.ProductService.GetProductByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrProductNotFound) {
			errorResponse(c, http.StatusNotFound, "商品不存在")
			return
		}
		errorResponse(c, http.StatusInternalServerError, "查询商品失败: "+err.Error())
		return
	}

	successResponse(c, product)
}

func UpdateProduct(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

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

	err = deps.ProductService.UpdateProduct(c.Request.Context(), id, services.ProductUpdateInput{
		Name:      req.Name,
		Category:  req.Category,
		Price:     req.Price,
		ExtraInfo: req.ExtraInfo,
	})
	if err != nil {
		if errors.Is(err, services.ErrProductNotFound) {
			errorResponse(c, http.StatusNotFound, "商品不存在")
			return
		}
		errorResponse(c, http.StatusInternalServerError, "更新商品信息失败: "+err.Error())
		return
	}

	successResponse(c, gin.H{"message": "商品信息更新成功"})
}

func DeleteProduct(c *gin.Context) {
	deps, ok := getDeps(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的商品ID")
		return
	}

	err = deps.ProductService.DeleteProduct(c.Request.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProductNotFound):
			errorResponse(c, http.StatusNotFound, "商品不存在")
		default:
			errorResponse(c, http.StatusInternalServerError, "删除商品失败: "+err.Error())
		}
		return
	}

	successResponse(c, gin.H{"message": "商品删除成功"})
}
