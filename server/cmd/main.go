package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/strix/chadvc/internal/ws"
)

func main() {
	// Create WebSocket hub
	hub := ws.NewHub()
	go hub.Run()

	// Create Gin router
	router := gin.Default()

	// CORS middleware for development
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Root endpoint
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service": "ChadVC Server",
			"version": "0.1.0",
			"endpoints": gin.H{
				"websocket":    "ws://localhost:8080/ws?username=<your_username>",
				"health":       "GET /health",
				"online_users": "GET /api/users/online",
			},
		})
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"users":  len(hub.GetOnlineUsers()),
		})
	})

	// WebSocket endpoint
	router.GET("/ws", ws.HandleWebSocket(hub))

	// Get online users endpoint
	router.GET("/api/users/online", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"users": hub.GetOnlineUsers(),
		})
	})

	// Start server
	log.Println("ChadVC Server starting on :8080")
	log.Println("WebSocket endpoint: ws://localhost:8080/ws?username=<your_username>")
	log.Println("Health check: http://localhost:8080/health")

	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
