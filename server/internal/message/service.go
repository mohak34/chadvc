// Package message provides message persistence and retrieval services.
package message

import (
	"github.com/strix/chadvc/internal/models"
	"gorm.io/gorm"
)

const (
	// DefaultLimit is the default number of messages to fetch
	DefaultLimit = 50
)

// Service handles message persistence operations.
type Service struct {
	db *gorm.DB
}

// NewService creates a new message service.
func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// SaveMessage saves a new message to the database.
func (s *Service) SaveMessage(userID uint, content string) (*models.Message, error) {
	msg := &models.Message{
		UserID:  userID,
		Content: content,
	}

	if err := s.db.Create(msg).Error; err != nil {
		return nil, err
	}

	// Load the user association for the response
	if err := s.db.Preload("User").First(msg, msg.ID).Error; err != nil {
		return nil, err
	}

	return msg, nil
}

// GetRecentMessages fetches the most recent messages (newest first, then reversed for display).
func (s *Service) GetRecentMessages(limit int) ([]models.Message, error) {
	if limit <= 0 {
		limit = DefaultLimit
	}

	var messages []models.Message
	err := s.db.Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Find(&messages).Error

	if err != nil {
		return nil, err
	}

	// Reverse to get chronological order (oldest first)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

// GetMessagesBefore fetches messages older than the given message ID for pagination.
func (s *Service) GetMessagesBefore(beforeID uint, limit int) ([]models.Message, error) {
	if limit <= 0 {
		limit = DefaultLimit
	}

	var messages []models.Message
	err := s.db.Preload("User").
		Where("id < ?", beforeID).
		Order("created_at DESC").
		Limit(limit).
		Find(&messages).Error

	if err != nil {
		return nil, err
	}

	// Reverse to get chronological order (oldest first)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}
