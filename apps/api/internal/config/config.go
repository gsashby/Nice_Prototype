package config

import (
	"os"
)

type Config struct {
	APIPort        string
	AllowedOrigins string
	DatabaseURL    string
	RedisURL       string
}

func Load() *Config {
	return &Config{
		APIPort:        getEnv("API_PORT", "8080"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:3000"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ai_trust_center"),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379/0"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
