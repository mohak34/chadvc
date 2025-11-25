package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/strix/chadvc/internal/api"
	"github.com/strix/chadvc/internal/auth"
	"github.com/strix/chadvc/internal/config"
	"github.com/strix/chadvc/internal/db"
	"github.com/strix/chadvc/internal/message"
	"github.com/strix/chadvc/internal/middleware"
	"github.com/strix/chadvc/internal/ws"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	if err := db.Init(cfg); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Create auth service
	authService := auth.NewService(cfg)

	// Create message service
	messageService := message.NewService(db.GetDB())

	// Create auth handler
	authHandler := api.NewAuthHandler(authService)

	// Create WebSocket hub with message service
	hub := ws.NewHub(messageService)
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
				"websocket":    "ws://localhost:8080/ws?token=<your_jwt_token>",
				"health":       "GET /health",
				"register":     "POST /api/auth/register",
				"login":        "POST /api/auth/login",
				"refresh":      "POST /api/auth/refresh",
				"logout":       "POST /api/auth/logout",
				"me":           "GET /api/auth/me (requires auth)",
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

	// Auth routes (public)
	authRoutes := router.Group("/api/auth")
	{
		authRoutes.POST("/register", authHandler.Register)
		authRoutes.POST("/login", authHandler.Login)
		authRoutes.POST("/refresh", authHandler.Refresh)
		authRoutes.POST("/logout", authHandler.Logout)
	}

	// Protected auth routes
	authProtected := router.Group("/api/auth")
	authProtected.Use(middleware.AuthMiddleware(authService))
	{
		authProtected.GET("/me", authHandler.GetMe)
	}

	// WebSocket endpoint (uses token query param for auth)
	router.GET("/ws", ws.HandleWebSocket(hub, authService))

	// Get online users endpoint
	router.GET("/api/users/online", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"users": hub.GetOnlineUsers(),
		})
	})

	// Start server
	serverAddr := ":" + cfg.ServerPort
	log.Printf("ChadVC Server starting on %s", serverAddr)
	log.Printf("WebSocket endpoint: ws://localhost:%s/ws?token=<your_jwt_token>", cfg.ServerPort)
	log.Printf("Health check: http://localhost:%s/health", cfg.ServerPort)

	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
