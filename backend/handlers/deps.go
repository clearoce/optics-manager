package handlers

import (
	"optics-manager/services"

	"github.com/gin-gonic/gin"
)

type Dependencies struct {
	CustomerService services.CustomerService
	ProductService  services.ProductService
	OrderService    services.OrderService
}

type Handler struct {
	deps Dependencies
}

func NewHandler(deps Dependencies) *Handler {
	return &Handler{deps: deps}
}

func (h *Handler) getDeps(c *gin.Context) (*Dependencies, bool) {
	if h == nil {
		errorResponse(c, 500, "服务未初始化")
		return nil, false
	}

	return &h.deps, true
}
