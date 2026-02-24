package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"optics-manager/database"
	"optics-manager/handlers"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed dist/*
var frontendFiles embed.FS

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
	// 嵌入式静态资源服务 (前端)
	// ---------------------------------------------------------
	distFS, err := fs.Sub(frontendFiles, "dist")
	if err != nil {
		log.Fatalf("无法加载嵌入的前端文件: %v", err)
	}

	// 提前读取 index.html 以提升性能并避免 http 自动重定向逻辑
	indexContent, err := fs.ReadFile(distFS, "index.html")
	if err != nil {
		log.Fatalf("无法加载前端入口文件 index.html: %v", err)
	}

	// 拦截对 assets 等目录下静态文件的请求
	r.GET("/assets/*filepath", func(c *gin.Context) {
		c.FileFromFS(c.Request.URL.Path, http.FS(distFS))
	})

	// 单页应用 (SPA) 路由支持：所有非 API 请求都指向 index.html
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		if strings.HasPrefix(path, "/api") {
			c.Status(http.StatusNotFound)
			return
		}

		filePath := strings.TrimPrefix(path, "/")
		if filePath == "" || filePath == "index.html" {
			// 直接返回内存中的 index.html，不经过 http 库那烦人的重定向
			c.Data(http.StatusOK, "text/html; charset=utf-8", indexContent)
			return
		}

		// 检查非根路由文件是否存在，如果存在并且不是目录就发送它
		file, err := distFS.Open(filePath)
		if err == nil {
			stat, errStat := file.Stat()
			file.Close()
			if errStat == nil && !stat.IsDir() {
				c.FileFromFS(filePath, http.FS(distFS))
				return
			}
		}

		// 文件不存在或其他任意路由，全部交给 React 的 index.html 去做前端路由处理
		c.Data(http.StatusOK, "text/html; charset=utf-8", indexContent)
	})

	log.Println("服务器启动，监听端口 :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}
