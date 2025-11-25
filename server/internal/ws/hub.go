package ws

import (
	"log"
	"sync"

	"github.com/strix/chadvc/internal/message"
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

	// Message service for persistence
	messageService *message.Service
}

// NewHub creates a new Hub instance
func NewHub(messageService *message.Service) *Hub {
	return &Hub{
		clients:        make(map[string]*Client),
		broadcast:      make(chan *Message),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		messageService: messageService,
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

			// Send message history to the new client
			h.sendMessageHistory(client)

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

// sendMessageHistory sends recent message history to a client
func (h *Hub) sendMessageHistory(client *Client) {
	if h.messageService == nil {
		return
	}

	messages, err := h.messageService.GetRecentMessages(50)
	if err != nil {
		log.Printf("Failed to get message history: %v", err)
		return
	}

	historyMessages := make([]HistoryMessage, len(messages))
	for i, msg := range messages {
		historyMessages[i] = HistoryMessage{
			ID:        msg.ID,
			Username:  msg.User.Username,
			Content:   msg.Content,
			Timestamp: msg.CreatedAt,
		}
	}

	// Check if there are more messages
	hasMore := len(messages) == 50

	historyMsg := &Message{
		Type:     MessageTypeMessageHistory,
		Messages: historyMessages,
		HasMore:  hasMore,
	}

	select {
	case client.send <- historyMsg:
	default:
		log.Printf("Failed to send message history to %s", client.Username)
	}
}

// SaveAndBroadcastMessage saves a message to database and broadcasts it
func (h *Hub) SaveAndBroadcastMessage(userID uint, username, content string) {
	var msg *Message

	if h.messageService != nil {
		// Save to database
		savedMsg, err := h.messageService.SaveMessage(userID, content)
		if err != nil {
			log.Printf("Failed to save message: %v", err)
			// Still broadcast even if save fails
			msg = &Message{
				Type:      MessageTypeChat,
				Username:  username,
				Content:   content,
				Timestamp: savedMsg.CreatedAt,
			}
		} else {
			msg = &Message{
				Type:      MessageTypeChat,
				ID:        savedMsg.ID,
				Username:  savedMsg.User.Username,
				Content:   savedMsg.Content,
				Timestamp: savedMsg.CreatedAt,
			}
		}
	} else {
		// No message service, just broadcast
		msg = &Message{
			Type:     MessageTypeChat,
			Username: username,
			Content:  content,
		}
	}

	h.broadcast <- msg
}

// GetMessagesBefore fetches older messages for pagination
func (h *Hub) GetMessagesBefore(beforeID uint, limit int) ([]HistoryMessage, bool, error) {
	if h.messageService == nil {
		return nil, false, nil
	}

	messages, err := h.messageService.GetMessagesBefore(beforeID, limit)
	if err != nil {
		return nil, false, err
	}

	historyMessages := make([]HistoryMessage, len(messages))
	for i, msg := range messages {
		historyMessages[i] = HistoryMessage{
			ID:        msg.ID,
			Username:  msg.User.Username,
			Content:   msg.Content,
			Timestamp: msg.CreatedAt,
		}
	}

	hasMore := len(messages) == limit

	return historyMessages, hasMore, nil
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
