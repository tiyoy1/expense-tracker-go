package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"expense-tracker-go/db"
	"expense-tracker-go/handlers"
	"expense-tracker-go/middleware"
)

func main() {

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using existing environment variables")
	}

	db.Connect()
	mux := http.NewServeMux()
	mux.HandleFunc("POST /register", handlers.Register)
	mux.HandleFunc("POST /login", handlers.Login)
	mux.HandleFunc("POST /transactions", middleware.RequireAuth(handlers.AddTransaction))
	mux.HandleFunc("GET /transactions", middleware.RequireAuth(handlers.ListTransactions))
	mux.HandleFunc("GET /dashboard", middleware.RequireAuth(handlers.Dashboard))
	mux.HandleFunc("POST /budget", middleware.RequireAuth(handlers.SetBudget))
	mux.HandleFunc("GET /categories", handlers.ListCategories)
	mux.HandleFunc("PUT /transactions/{id}", middleware.RequireAuth(handlers.UpdateTransactionHandler))
	mux.HandleFunc("DELETE /transactions/{id}", middleware.RequireAuth(handlers.DeleteTransactionHandler))
	mux.HandleFunc("GET /analytics/categories", middleware.RequireAuth(handlers.CategoryBreakdownHandler))
	mux.HandleFunc("GET /analytics/trend", middleware.RequireAuth(handlers.TrendHandler))

	fileServer := http.FileServer(http.Dir("./web"))
	mux.Handle("/", fileServer)

	port := os.Getenv("PORT") // Railway assigns this automatically at runtime
if port == "" {
	port = "8080" // local dev fallback
}

log.Println("server running on :" + port)
log.Fatal(http.ListenAndServe(":"+port, mux))

}