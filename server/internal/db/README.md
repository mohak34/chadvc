// Package db handles database connections and queries
package db

// TODO: Database setup
// Decision pending: GORM vs Prisma vs Drizzle
// 
// Options:
// 1. GORM (recommended for Go) - native, simple
// 2. Prisma with prisma-client-go - great DX
// 3. SQL with sqlx - lightweight, manual
//
// For MVP: Can start with in-memory map
// Add persistence after chat/voice works
