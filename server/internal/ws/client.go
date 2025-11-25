package ws

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512 KB
)

// Client represents a WebSocket client connection
type Client struct {
	// The user ID of this client (from database)
	UserID uint

	// The username of this client
	Username string

	// The websocket connection
	conn *websocket.Conn

	// The hub this client is registered to
	hub *Hub

	// Buffered channel of outbound messages
	send chan *Message
}

// NewClient creates a new Client instance (deprecated, use NewClientWithID)
func NewClient(username string, conn *websocket.Conn, hub *Hub) *Client {
	return &Client{
		UserID:   0,
		Username: username,
		conn:     conn,
		hub:      hub,
		send:     make(chan *Message, 256),
	}
}

// NewClientWithID creates a new Client instance with user ID
func NewClientWithID(userID uint, username string, conn *websocket.Conn, hub *Hub) *Client {
	return &Client{
		UserID:   userID,
		Username: username,
		conn:     conn,
		hub:      hub,
		send:     make(chan *Message, 256),
	}
}

// ReadPump pumps messages from the websocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, messageData, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(messageData, &msg); err != nil {
			log.Printf("Failed to unmarshal message: %v", err)
			continue
		}

		// Set the username from the client
		msg.Username = c.Username
		msg.Timestamp = time.Now()

		// Handle different message types
		switch msg.Type {
		case MessageTypeChat:
			// Save and broadcast chat messages
			c.hub.SaveAndBroadcastMessage(c.UserID, c.Username, msg.Content)

		case MessageTypeLoadMore:
			// Handle pagination request
			c.handleLoadMore(msg.BeforeID)

		case MessageTypeVoiceSignal:
			// Route voice signal to specific user
			c.routeVoiceSignal(&msg)

		case MessageTypeVoiceJoin:
			// Broadcast voice join notification
			msg.Type = MessageTypeVoiceJoin
			c.hub.broadcast <- &msg

		case MessageTypeVoiceLeave:
			// Broadcast voice leave notification
			msg.Type = MessageTypeVoiceLeave
			c.hub.broadcast <- &msg

		case MessageTypeTyping:
			// Broadcast typing indicator
			c.hub.broadcast <- &msg

		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}
}

// WritePump pumps messages from the hub to the websocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}

			// Encode and write the message
			if err := json.NewEncoder(w).Encode(message); err != nil {
				log.Printf("Failed to encode message: %v", err)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// routeVoiceSignal sends a voice signal to a specific user
func (c *Client) routeVoiceSignal(msg *Message) {
	c.hub.mu.RLock()
	targetClient, exists := c.hub.clients[msg.ToUser]
	c.hub.mu.RUnlock()

	if !exists {
		log.Printf("Target user not found: %s", msg.ToUser)
		return
	}

	// Forward the signal to the target user
	msg.FromUser = c.Username
	select {
	case targetClient.send <- msg:
	default:
		log.Printf("Failed to send voice signal to %s", msg.ToUser)
	}
}

// handleLoadMore handles pagination requests for older messages
func (c *Client) handleLoadMore(beforeID uint) {
	if beforeID == 0 {
		log.Printf("Invalid beforeID for load_more request")
		return
	}

	messages, hasMore, err := c.hub.GetMessagesBefore(beforeID, 50)
	if err != nil {
		log.Printf("Failed to get older messages: %v", err)
		return
	}

	historyMsg := &Message{
		Type:     MessageTypeMessageHistory,
		Messages: messages,
		HasMore:  hasMore,
	}

	select {
	case c.send <- historyMsg:
	default:
		log.Printf("Failed to send message history to %s", c.Username)
	}
}
