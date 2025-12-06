package ws

import (
	"log"
	"sync"

	"github.com/strix/chadvc/internal/message"
)

// Hub maintains the set of active clients and broadcasts messages to them
type Hub struct {
	// Registered clients mapped by username -> sessionID -> client
	// This allows multiple sessions (devices) per user
	clients map[string]map[string]*Client

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

	// Track which sessions are in voice (username -> sessionID)
	voiceSessions map[string]string
	voiceMu       sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub(messageService *message.Service) *Hub {
	return &Hub{
		clients:        make(map[string]map[string]*Client),
		broadcast:      make(chan *Message),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		messageService: messageService,
		voiceSessions:  make(map[string]string),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			// Initialize user's session map if not exists
			if h.clients[client.Username] == nil {
				h.clients[client.Username] = make(map[string]*Client)
			}
			h.clients[client.Username][client.SessionID] = client
			sessionCount := len(h.clients[client.Username])
			totalUsers := len(h.clients)
			h.mu.Unlock()

			log.Printf("Client registered: %s (session: %s, user sessions: %d, total users: %d)",
				client.Username, client.SessionID, sessionCount, totalUsers)

			// Send message history to the new client
			h.sendMessageHistory(client)

			// Notify all clients about the updated user list
			h.broadcastUserList()

		case client := <-h.unregister:
			h.mu.Lock()
			if sessions, ok := h.clients[client.Username]; ok {
				if _, exists := sessions[client.SessionID]; exists {
					delete(sessions, client.SessionID)
					close(client.send)

					// If no more sessions for this user, remove the user entry
					if len(sessions) == 0 {
						delete(h.clients, client.Username)
					}

					log.Printf("Client unregistered: %s (session: %s, remaining sessions: %d)",
						client.Username, client.SessionID, len(sessions))
				}
			}
			h.mu.Unlock()

			// Clean up voice session if this client was in voice
			h.voiceMu.Lock()
			if voiceSession, ok := h.voiceSessions[client.Username]; ok && voiceSession == client.SessionID {
				delete(h.voiceSessions, client.Username)
				client.InVoice = false
			}
			h.voiceMu.Unlock()

			// Notify all clients about user leaving
			h.broadcastUserList()

		case message := <-h.broadcast:
			h.mu.RLock()
			for username, sessions := range h.clients {
				for sessionID, client := range sessions {
					select {
					case client.send <- message:
					default:
						// Client's send buffer is full, mark for disconnect
						close(client.send)
						delete(sessions, sessionID)
						if len(sessions) == 0 {
							delete(h.clients, username)
						}
						log.Printf("Client disconnected due to full buffer: %s (session: %s)", username, sessionID)
					}
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
	// Get unique usernames (not sessions)
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
	for _, sessions := range h.clients {
		for _, client := range sessions {
			select {
			case client.send <- message:
			default:
			}
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

// GetClient returns a specific client by username and sessionID
func (h *Hub) GetClient(username, sessionID string) *Client {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if sessions, ok := h.clients[username]; ok {
		return sessions[sessionID]
	}
	return nil
}

// GetUserSessions returns all sessions for a user
func (h *Hub) GetUserSessions(username string) []*Client {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var clients []*Client
	if sessions, ok := h.clients[username]; ok {
		for _, client := range sessions {
			clients = append(clients, client)
		}
	}
	return clients
}

// SendToUser sends a message to all sessions of a user
func (h *Hub) SendToUser(username string, msg *Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if sessions, ok := h.clients[username]; ok {
		for _, client := range sessions {
			select {
			case client.send <- msg:
			default:
			}
		}
	}
}

// SendToSession sends a message to a specific session
func (h *Hub) SendToSession(username, sessionID string, msg *Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if sessions, ok := h.clients[username]; ok {
		if client, exists := sessions[sessionID]; exists {
			select {
			case client.send <- msg:
			default:
			}
		}
	}
}

// SetVoiceSession marks a user's session as being in voice, disconnecting other sessions
func (h *Hub) SetVoiceSession(username, sessionID string) *Client {
	h.voiceMu.Lock()
	defer h.voiceMu.Unlock()

	// Check if user already has another session in voice
	if existingSessionID, ok := h.voiceSessions[username]; ok && existingSessionID != sessionID {
		// Get the existing client and kick them from voice
		h.mu.RLock()
		if sessions, ok := h.clients[username]; ok {
			if existingClient, exists := sessions[existingSessionID]; exists {
				existingClient.InVoice = false
				h.mu.RUnlock()

				// Return the client that needs to be kicked
				h.voiceSessions[username] = sessionID
				return existingClient
			}
		}
		h.mu.RUnlock()
	}

	// Set the new voice session
	h.voiceSessions[username] = sessionID
	return nil
}

// ClearVoiceSession removes a user's voice session
func (h *Hub) ClearVoiceSession(username, sessionID string) {
	h.voiceMu.Lock()
	defer h.voiceMu.Unlock()

	if existingSessionID, ok := h.voiceSessions[username]; ok && existingSessionID == sessionID {
		delete(h.voiceSessions, username)
	}
}

// IsInVoice checks if a user has any session in voice
func (h *Hub) IsInVoice(username string) bool {
	h.voiceMu.RLock()
	defer h.voiceMu.RUnlock()

	_, ok := h.voiceSessions[username]
	return ok
}

// GetVoiceSessionID returns the session ID of the user's voice session
func (h *Hub) GetVoiceSessionID(username string) string {
	h.voiceMu.RLock()
	defer h.voiceMu.RUnlock()

	return h.voiceSessions[username]
}
