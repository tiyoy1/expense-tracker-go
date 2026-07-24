package config

import "os"

var JWTSecret = []byte(getEnvOrDefault("JWT_SECRET", "insecure-dev-fallback"))

func getEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}