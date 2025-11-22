package ws

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
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

// HandleWebSocket handles WebSocket upgrade requests
func HandleWebSocket(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get username from query parameter
		username := c.Query("username")
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "username is required"})
			return
		}

		// Check if username is already taken
		hub.mu.RLock()
		_, exists := hub.clients[username]
		hub.mu.RUnlock()

		if exists {
			c.JSON(http.StatusConflict, gin.H{"error": "username already taken"})
			return
		}

		// Upgrade HTTP connection to WebSocket
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to upgrade connection: %v", err)
			return
		}

		// Create new client
		client := NewClient(username, conn, hub)

		// Register client with hub
		hub.register <- client

		// Start client pumps in separate goroutines
		go client.WritePump()
		go client.ReadPump()
	}
}
