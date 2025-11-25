package ws

import "time"

// MessageType defines the type of WebSocket message
type MessageType string

const (
	MessageTypeChat           MessageType = "message"
	MessageTypeUserList       MessageType = "user_list"
	MessageTypeUserJoined     MessageType = "user_joined"
	MessageTypeUserLeft       MessageType = "user_left"
	MessageTypeVoiceSignal    MessageType = "voice_signal"
	MessageTypeVoiceJoin      MessageType = "voice_join"
	MessageTypeVoiceLeave     MessageType = "voice_leave"
	MessageTypeTyping         MessageType = "typing"
	MessageTypeError          MessageType = "error"
	MessageTypeMessageHistory MessageType = "message_history"
	MessageTypeLoadMore       MessageType = "load_more"
)

// HistoryMessage represents a single message in history (from database)
type HistoryMessage struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

// Message represents a WebSocket message
type Message struct {
	Type      MessageType `json:"type"`
	Username  string      `json:"username,omitempty"`
	Content   string      `json:"content,omitempty"`
	Timestamp time.Time   `json:"timestamp,omitempty"`
	Users     []string    `json:"users,omitempty"`

	// Message ID (for persisted messages)
	ID uint `json:"id,omitempty"`

	// Message history (for message_history type)
	Messages []HistoryMessage `json:"messages,omitempty"`
	HasMore  bool             `json:"has_more,omitempty"`

	// Pagination (for load_more requests)
	BeforeID uint `json:"before_id,omitempty"`

	// Voice-related fields
	ToUser   string `json:"to_user,omitempty"`
	FromUser string `json:"from_user,omitempty"`
	Signal   any    `json:"signal,omitempty"`

	// Error field
	Error string `json:"error,omitempty"`
}
