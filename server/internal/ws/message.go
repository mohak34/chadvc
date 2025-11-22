package ws

import "time"

// MessageType defines the type of WebSocket message
type MessageType string

const (
	MessageTypeChat        MessageType = "message"
	MessageTypeUserList    MessageType = "user_list"
	MessageTypeUserJoined  MessageType = "user_joined"
	MessageTypeUserLeft    MessageType = "user_left"
	MessageTypeVoiceSignal MessageType = "voice_signal"
	MessageTypeVoiceJoin   MessageType = "voice_join"
	MessageTypeVoiceLeave  MessageType = "voice_leave"
	MessageTypeTyping      MessageType = "typing"
	MessageTypeError       MessageType = "error"
)

// Message represents a WebSocket message
type Message struct {
	Type      MessageType `json:"type"`
	Username  string      `json:"username,omitempty"`
	Content   string      `json:"content,omitempty"`
	Timestamp time.Time   `json:"timestamp,omitempty"`
	Users     []string    `json:"users,omitempty"`

	// Voice-related fields
	ToUser   string      `json:"to_user,omitempty"`
	FromUser string      `json:"from_user,omitempty"`
	Signal   interface{} `json:"signal,omitempty"`

	// Error field
	Error string `json:"error,omitempty"`
}
