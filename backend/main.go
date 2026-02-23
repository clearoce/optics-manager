package main

import (
	"log"
	"optics-manager/database"
	"optics-manager/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	database.Init("optics.db")
	database.Migrate()
	database.StartAutoBackup()

	r := gin.Default()

	// 允许前端开发环境跨域访问后端 API
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	api := r.Group("/api")
	{
		// 客户管理
		customers := api.Group("/customers")
		{
			customers.POST("", handlers.CreateCustomer)
			customers.GET("", handlers.GetCustomers)
			customers.GET("/:id", handlers.GetCustomerByID)
			customers.PUT("/:id", handlers.UpdateCustomer)
		}

		// 商品管理
		products := api.Group("/products")
		{
			products.POST("", handlers.CreateProduct)
			products.GET("", handlers.GetProducts)
			products.GET("/:id", handlers.GetProductByID)
			products.PUT("/:id", handlers.UpdateProduct)
			products.DELETE("/:id", handlers.DeleteProduct)
			// 库存调整接口，路径设计成 /products/:id/stock，语义清晰
			// 商品库存变更日志查询
			products.GET("/:id/inventory-logs", handlers.GetProductInventoryLogs)
			products.POST("/:id/stock", handlers.AdjustStock)
		}

		// 订单管理
		orders := api.Group("/orders")
		{
			orders.POST("", handlers.CreateOrder)
			orders.GET("", handlers.GetOrders)
			orders.GET("/:id", handlers.GetOrderDetail)
		}
	}

	// ---------------------------------------------------------
	// 静态资源服务 (前端)
	// ---------------------------------------------------------
	// 服务前端编译后的静态资源
	r.Static("/assets", "../frontend/dist/assets")

	// 单页应用 (SPA) 路由支持：所有非 API 请求都指向 index.html
	r.NoRoute(func(c *gin.Context) {
		// 如果是访问具体文件（如 .js, .css）但 Static 没匹配到，则 404
		// 否则返回 index.html 让前端路由接管
		c.File("../frontend/dist/index.html")
	})

	log.Println("服务器启动，监听端口 :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}
