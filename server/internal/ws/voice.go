package ws

import (
	"log"
)

// HandleVoiceSignal processes voice signaling messages
func (c *Client) HandleVoiceSignal(msg *Message) {
	// Route voice signal to specific user
	c.routeVoiceSignal(msg)
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

// HandleVoiceJoin processes voice join notifications
func (c *Client) HandleVoiceJoin(msg *Message) {
	// Broadcast voice join notification
	msg.Type = MessageTypeVoiceJoin
	c.hub.broadcast <- msg
}

// HandleVoiceLeave processes voice leave notifications
func (c *Client) HandleVoiceLeave(msg *Message) {
	// Broadcast voice leave notification
	msg.Type = MessageTypeVoiceLeave
	c.hub.broadcast <- msg
}
