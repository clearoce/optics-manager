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

var appDeps *Dependencies

func InitServices(deps Dependencies) {
	appDeps = &deps
}

func getDeps(c *gin.Context) (*Dependencies, bool) {
	if appDeps == nil {
		errorResponse(c, 500, "服务未初始化")
		return nil, false
	}

	return appDeps, true
}
