// Package middleware provides HTTP middleware for the ChadVC server.
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/strix/chadvc/internal/auth"
)

const (
	// AuthorizationHeader is the header key for the authorization token.
	AuthorizationHeader = "Authorization"
	// BearerPrefix is the prefix for bearer tokens.
	BearerPrefix = "Bearer "
	// UserIDKey is the context key for the authenticated user ID.
	UserIDKey = "userID"
	// UsernameKey is the context key for the authenticated username.
	UsernameKey = "username"
)

// AuthMiddleware creates a Gin middleware that validates JWT tokens.
func AuthMiddleware(authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authorization header is required",
			})
			return
		}

		if !strings.HasPrefix(authHeader, BearerPrefix) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization header format",
			})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, BearerPrefix)
		claims, err := authService.ValidateAccessToken(tokenString)
		if err != nil {
			status := http.StatusUnauthorized
			message := "invalid token"

			if err == auth.ErrExpiredToken {
				message = "token has expired"
			}

			c.AbortWithStatusJSON(status, gin.H{
				"error": message,
			})
			return
		}

		// Set user information in context
		c.Set(UserIDKey, claims.UserID)
		c.Set(UsernameKey, claims.Username)

		c.Next()
	}
}

// GetUserID retrieves the authenticated user ID from the context.
func GetUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get(UserIDKey)
	if !exists {
		return 0, false
	}
	id, ok := userID.(uint)
	return id, ok
}

// GetUsername retrieves the authenticated username from the context.
func GetUsername(c *gin.Context) (string, bool) {
	username, exists := c.Get(UsernameKey)
	if !exists {
		return "", false
	}
	name, ok := username.(string)
	return name, ok
}
