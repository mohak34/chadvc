package ws

import (
	"log"
	"sync"
)

// Hub maintains the set of active clients and broadcasts messages to them
type Hub struct {
	// Registered clients mapped by username
	clients map[string]*Client

	// Inbound messages from clients
	broadcast chan *Message

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Mutex for thread-safe operations
	mu sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		broadcast:  make(chan *Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.Username] = client
			h.mu.Unlock()
			log.Printf("Client registered: %s (Total: %d)", client.Username, len(h.clients))

			// Notify all clients about the new user
			h.broadcastUserList()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.Username]; ok {
				delete(h.clients, client.Username)
				close(client.send)
				log.Printf("Client unregistered: %s (Total: %d)", client.Username, len(h.clients))
			}
			h.mu.Unlock()

			// Notify all clients about user leaving
			h.broadcastUserList()

		case message := <-h.broadcast:
			h.mu.RLock()
			for username, client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Client's send buffer is full, disconnect them
					close(client.send)
					delete(h.clients, username)
					log.Printf("Client disconnected due to full buffer: %s", username)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// broadcastUserList sends the current user list to all clients
func (h *Hub) broadcastUserList() {
	h.mu.RLock()
	usernames := make([]string, 0, len(h.clients))
	for username := range h.clients {
		usernames = append(usernames, username)
	}
	h.mu.RUnlock()

	message := &Message{
		Type:  MessageTypeUserList,
		Users: usernames,
	}

	h.mu.RLock()
	for _, client := range h.clients {
		select {
		case client.send <- message:
		default:
		}
	}
	h.mu.RUnlock()
}

// GetOnlineUsers returns a list of currently online usernames
func (h *Hub) GetOnlineUsers() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	usernames := make([]string, 0, len(h.clients))
	for username := range h.clients {
		usernames = append(usernames, username)
	}
	return usernames
}
