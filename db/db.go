package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func Connect() {
	// Falls back to your existing local Laragon defaults when these env
	// vars aren't set — so this still works unchanged on your machine,
	// and picks up Railway's values automatically once deployed.
	host := getEnvOrDefault("MYSQLHOST", "127.0.0.1")
	port := getEnvOrDefault("MYSQLPORT", "3306")
	user := getEnvOrDefault("MYSQLUSER", "root")
	password := os.Getenv("MYSQLPASSWORD") // empty string is a valid local default
	database := getEnvOrDefault("MYSQLDATABASE", "expense_tracker_go")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?tls=preferred", user, password, host, port, database)
	
	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("failed to open db: ", err)
	}
	if err = DB.Ping(); err != nil {
		log.Fatal("failed to connect to db: ", err)
	}
	fmt.Println("database connected")
}

func getEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}