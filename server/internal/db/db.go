// Package db provides database connection and initialization for the ChadVC application.
package db

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/strix/chadvc/internal/config"
	"github.com/strix/chadvc/internal/models"
)

// DB is the global database instance.
var DB *gorm.DB

// Init initializes the database connection and runs migrations.
func Init(cfg *config.Config) error {
	dsn := cfg.GetDSN()

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Run auto-migrations
	if err := runMigrations(db); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	DB = db
	log.Println("Database connection established successfully")
	return nil
}

// runMigrations runs auto-migrations for all models.
func runMigrations(db *gorm.DB) error {
	log.Println("Running database migrations...")

	err := db.AutoMigrate(
		&models.User{},
		&models.Message{},
		&models.RefreshToken{},
	)
	if err != nil {
		return err
	}

	log.Println("Database migrations completed successfully")
	return nil
}

// GetDB returns the database instance.
func GetDB() *gorm.DB {
	return DB
}

// Close closes the database connection.
func Close() error {
	if DB == nil {
		return nil
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	return sqlDB.Close()
}
