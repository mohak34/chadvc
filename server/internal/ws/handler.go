package ws

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"github.com/strix/chadvc/internal/auth"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development
		// TODO: Restrict this in production
		return true
	},
}

// HandleWebSocket handles WebSocket upgrade requests with JWT authentication.
func HandleWebSocket(hub *Hub, authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from query parameter
		token := c.Query("token")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token is required"})
			return
		}

		// Validate token
		claims, err := authService.ValidateAccessToken(token)
		if err != nil {
			if err == auth.ErrExpiredToken {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "token has expired"})
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		username := claims.Username
		userID := claims.UserID

		// Check if username is already connected
		hub.mu.RLock()
		_, exists := hub.clients[username]
		hub.mu.RUnlock()

		if exists {
			c.JSON(http.StatusConflict, gin.H{"error": "user already connected"})
			return
		}

		// Upgrade HTTP connection to WebSocket
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to upgrade connection: %v", err)
			return
		}

		// Create new client with user ID
		client := NewClientWithID(userID, username, conn, hub)

		// Register client with hub
		hub.register <- client

		// Start client pumps in separate goroutines
		go client.WritePump()
		go client.ReadPump()
	}
}
