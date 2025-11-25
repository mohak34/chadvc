// Package models defines the database models for the ChadVC application.
package models

import (
	"time"

	"gorm.io/gorm"
)

// Message represents a chat message stored in the database.
type Message struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"index;not null" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Content   string         `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time      `gorm:"index" json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for the Message model.
func (Message) TableName() string {
	return "messages"
}
