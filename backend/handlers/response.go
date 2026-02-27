package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func successResponse(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func errorResponse(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, gin.H{"success": false, "error": message})
}
