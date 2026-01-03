package ws

import (
	"encoding/json"
	"log"
	"os"
	"time"
)

// HandleVoiceSignal processes voice signaling messages
func (c *Client) HandleVoiceSignal(msg *Message) {
	// Route voice signal to specific user (all their sessions or specific session)
	c.routeVoiceSignal(msg)
}

// routeVoiceSignal sends a voice signal to a specific user
func (c *Client) routeVoiceSignal(msg *Message) {
	// #region agent log
	logEntry := map[string]interface{}{
		"location":     "voice.go:14",
		"message":      "routeVoiceSignal called",
		"data": map[string]interface{}{
			"fromUser":    c.Username,
			"fromSession": c.SessionID,
			"toUser":      msg.ToUser,
			"toSessionID": msg.ToSessionID,
		},
		"timestamp":   time.Now().UnixMilli(),
		"sessionId":   "debug-session",
		"runId":       "run1",
		"hypothesisId": "B",
	}
	if logData, err := json.Marshal(logEntry); err == nil {
		if f, err := os.OpenFile("/home/strix/Workspace/Projects/chadvc/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
			f.WriteString(string(logData) + "\n")
			f.Close()
		}
	}
	// #endregion

	c.hub.mu.RLock()
	sessions, exists := c.hub.clients[msg.ToUser]
	c.hub.mu.RUnlock()

	if !exists || len(sessions) == 0 {
		log.Printf("Target user not found: %s", msg.ToUser)
		// #region agent log
		logEntry = map[string]interface{}{
			"location":     "voice.go:20",
			"message":      "Target user not found",
			"data": map[string]interface{}{
				"toUser": msg.ToUser,
				"exists":  exists,
			},
			"timestamp":   time.Now().UnixMilli(),
			"sessionId":   "debug-session",
			"runId":       "run1",
			"hypothesisId": "B",
		}
		if logData, err := json.Marshal(logEntry); err == nil {
			if f, err := os.OpenFile("/home/strix/Workspace/Projects/chadvc/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
				f.WriteString(string(logData) + "\n")
				f.Close()
			}
		}
		// #endregion
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
				// #region agent log
				logEntry = map[string]interface{}{
					"location":     "voice.go:36",
					"message":      "Voice signal sent to specific session",
					"data": map[string]interface{}{
						"fromUser":    c.Username,
						"toUser":      msg.ToUser,
						"toSessionID": msg.ToSessionID,
					},
					"timestamp":   time.Now().UnixMilli(),
					"sessionId":   "debug-session",
					"runId":       "run1",
					"hypothesisId": "B",
				}
				if logData, err := json.Marshal(logEntry); err == nil {
					if f, err := os.OpenFile("/home/strix/Workspace/Projects/chadvc/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
						f.WriteString(string(logData) + "\n")
						f.Close()
					}
				}
				// #endregion
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
		// #region agent log
		logEntry = map[string]interface{}{
			"location":     "voice.go:47",
			"message":      "User not in voice",
			"data": map[string]interface{}{
				"toUser":        msg.ToUser,
				"voiceSessionID": voiceSessionID,
			},
			"timestamp":   time.Now().UnixMilli(),
			"sessionId":   "debug-session",
			"runId":       "run1",
			"hypothesisId": "B",
		}
		if logData, err := json.Marshal(logEntry); err == nil {
			if f, err := os.OpenFile("/home/strix/Workspace/Projects/chadvc/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
				f.WriteString(string(logData) + "\n")
				f.Close()
			}
		}
		// #endregion
		return
	}

	c.hub.mu.RLock()
	targetClient, exists := sessions[voiceSessionID]
	c.hub.mu.RUnlock()

	if exists {
		select {
		case targetClient.send <- msg:
			// #region agent log
			logEntry = map[string]interface{}{
				"location":     "voice.go:57",
				"message":      "Voice signal sent to voice session",
				"data": map[string]interface{}{
					"fromUser":      c.Username,
					"toUser":        msg.ToUser,
					"voiceSessionID": voiceSessionID,
				},
				"timestamp":   time.Now().UnixMilli(),
				"sessionId":   "debug-session",
				"runId":       "run1",
				"hypothesisId": "B",
			}
			if logData, err := json.Marshal(logEntry); err == nil {
				if f, err := os.OpenFile("/home/strix/Workspace/Projects/chadvc/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
					f.WriteString(string(logData) + "\n")
					f.Close()
				}
			}
			// #endregion
		default:
			log.Printf("Failed to send voice signal to %s (session: %s)", msg.ToUser, voiceSessionID)
		}
	}
}

// HandleVoiceJoin processes voice join notifications
func (c *Client) HandleVoiceJoin(msg *Message) {
	// #region agent log
	logEntry := map[string]interface{}{
		"location":     "voice.go:65",
		"message":      "HandleVoiceJoin called",
		"data": map[string]interface{}{
			"username": c.Username,
			"sessionID": c.SessionID,
		},
		"timestamp":   time.Now().UnixMilli(),
		"sessionId":   "debug-session",
		"runId":       "run1",
		"hypothesisId": "C",
	}
	if logData, err := json.Marshal(logEntry); err == nil {
		if f, err := os.OpenFile("/home/strix/Workspace/Projects/chadvc/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
			f.WriteString(string(logData) + "\n")
			f.Close()
		}
	}
	// #endregion

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

	// Get list of users currently in voice (before adding this user)
	voiceUsers := c.hub.GetVoiceUsers()

	// #region agent log
	logEntry = map[string]interface{}{
		"location":     "voice.go:86",
		"message":      "Voice users list retrieved",
		"data": map[string]interface{}{
			"username":   c.Username,
			"voiceUsers": voiceUsers,
			"count":      len(voiceUsers),
		},
		"timestamp":   time.Now().UnixMilli(),
		"sessionId":   "debug-session",
		"runId":       "run1",
		"hypothesisId": "C",
	}
	if logData, err := json.Marshal(logEntry); err == nil {
		if f, err := os.OpenFile("/home/strix/Workspace/Projects/chadvc/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
			f.WriteString(string(logData) + "\n")
			f.Close()
		}
	}
	// #endregion

	// Send the list of existing voice users to the joining client
	existingVoiceMsg := &Message{
		Type:  MessageTypeVoiceJoin,
		Users: voiceUsers,
	}
	select {
	case c.send <- existingVoiceMsg:
		log.Printf("Sent list of %d voice users to %s", len(voiceUsers), c.Username)
		// #region agent log
		logEntry = map[string]interface{}{
			"location":     "voice.go:94",
			"message":      "Voice users list sent to client",
			"data": map[string]interface{}{
				"username":   c.Username,
				"voiceUsers": voiceUsers,
				"count":      len(voiceUsers),
			},
			"timestamp":   time.Now().UnixMilli(),
			"sessionId":   "debug-session",
			"runId":       "run1",
			"hypothesisId": "C",
		}
		if logData, err := json.Marshal(logEntry); err == nil {
			if f, err := os.OpenFile("/home/strix/Workspace/Projects/chadvc/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
				f.WriteString(string(logData) + "\n")
				f.Close()
			}
		}
		// #endregion
	default:
		log.Printf("Failed to send voice users list to %s", c.Username)
	}

	// Broadcast voice join notification to all other clients
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
