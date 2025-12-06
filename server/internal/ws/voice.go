package ws

import (
	"log"
)

// HandleVoiceSignal processes voice signaling messages
func (c *Client) HandleVoiceSignal(msg *Message) {
	// Route voice signal to specific user (all their sessions or specific session)
	c.routeVoiceSignal(msg)
}

// routeVoiceSignal sends a voice signal to a specific user
func (c *Client) routeVoiceSignal(msg *Message) {
	c.hub.mu.RLock()
	sessions, exists := c.hub.clients[msg.ToUser]
	c.hub.mu.RUnlock()

	if !exists || len(sessions) == 0 {
		log.Printf("Target user not found: %s", msg.ToUser)
		return
	}

	// Set the from user info
	msg.FromUser = c.Username
	msg.SessionID = c.SessionID

	// If a specific session is targeted, send only to that session
	if msg.ToSessionID != "" {
		c.hub.mu.RLock()
		targetClient, exists := sessions[msg.ToSessionID]
		c.hub.mu.RUnlock()

		if exists {
			select {
			case targetClient.send <- msg:
			default:
				log.Printf("Failed to send voice signal to %s (session: %s)", msg.ToUser, msg.ToSessionID)
			}
		}
		return
	}

	// Otherwise, send to the session that's in voice
	voiceSessionID := c.hub.GetVoiceSessionID(msg.ToUser)
	if voiceSessionID == "" {
		log.Printf("User %s is not in voice", msg.ToUser)
		return
	}

	c.hub.mu.RLock()
	targetClient, exists := sessions[voiceSessionID]
	c.hub.mu.RUnlock()

	if exists {
		select {
		case targetClient.send <- msg:
		default:
			log.Printf("Failed to send voice signal to %s (session: %s)", msg.ToUser, voiceSessionID)
		}
	}
}

// HandleVoiceJoin processes voice join notifications
func (c *Client) HandleVoiceJoin(msg *Message) {
	// Check if user has another session in voice and kick it
	kickedClient := c.hub.SetVoiceSession(c.Username, c.SessionID)

	if kickedClient != nil {
		// Send voice_kick message to the other session
		kickMsg := &Message{
			Type:   MessageTypeVoiceKick,
			Reason: "joined_from_another_device",
		}
		select {
		case kickedClient.send <- kickMsg:
			log.Printf("Kicked %s from voice (session: %s) - joined from another device",
				kickedClient.Username, kickedClient.SessionID)
		default:
		}
	}

	c.InVoice = true

	// Broadcast voice join notification
	msg.Type = MessageTypeVoiceJoin
	msg.SessionID = c.SessionID
	c.hub.broadcast <- msg
}

// HandleVoiceLeave processes voice leave notifications
func (c *Client) HandleVoiceLeave(msg *Message) {
	c.hub.ClearVoiceSession(c.Username, c.SessionID)
	c.InVoice = false

	// Broadcast voice leave notification
	msg.Type = MessageTypeVoiceLeave
	msg.SessionID = c.SessionID
	c.hub.broadcast <- msg
}
