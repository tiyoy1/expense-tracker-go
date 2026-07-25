package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"expense-tracker-go/db"
	"expense-tracker-go/middleware"
	"expense-tracker-go/models"
)

//buat tipe data addTransactionRequest untuk nerima parse JSON
type addTransactionRequest struct {
	Type            string  `json:"type"`
	Amount          float64 `json:"amount"`
	CategoryID      *int    `json:"category_id"`
	Description     string  `json:"description"`
	TransactionDate string  `json:"transaction_date"`
}


func AddTransaction(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	var req addTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Type != "income" && req.Type != "expense" {
		http.Error(w, "Type must be 'income' or 'expense'", http.StatusBadRequest)
		return
	}

	if req.Amount <= 0 {
		http.Error(w, "Must be positive", http.StatusBadRequest)
		return
	}

	id, err := models.CreateTransaction(db.DB, userID, req.Type, req.Amount, req.CategoryID, req.Description, req.TransactionDate)
	if err != nil {
		http.Error(w, "Couldn't create transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{"id" : id})
}

func ListTransactions(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	query := r.URL.Query()
	month := query.Get("month")
	categoryIDstr := query.Get("category_id")
	txType := query.Get("type")
	
	filters := models.TransactionFilters{
		Month : month,
		Type : txType,
	}
	
	filters.Search = query.Get("search")
	
	if categoryIDstr != "" {
		categoryID, err := strconv.Atoi(categoryIDstr)
		if err != nil {
			http.Error(w, "category_id must be a number", http.StatusBadRequest)
			return
		}
		filters.CategoryID = &categoryID
	}

	transactions, err := models.GetTransactionByUser(db.DB, userID, filters)
	if err != nil {
		http.Error(w, "Couldn't fetch transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")	
	json.NewEncoder(w).Encode(transactions)
}

func UpdateTransactionHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	// r.PathValue reads the {id} segment from the route pattern — Go 1.22+'s
	// router extracts it automatically, no manual URL parsing needed.
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid transaction id", http.StatusBadRequest)
		return
	}

	var req addTransactionRequest // reusing the same shape as create — same fields needed
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Type != "income" && req.Type != "expense" {
		http.Error(w, "type must be 'income' or 'expense'", http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 {
		http.Error(w, "amount must be positive", http.StatusBadRequest)
		return
	}

	rowsAffected, err := models.UpdateTransaction(db.DB, id, userID, req.Type, req.Amount, req.CategoryID, req.Description, req.TransactionDate)
	if err != nil {
		http.Error(w, "could not update transaction", http.StatusInternalServerError)
		return
	}
	if rowsAffected == 0 {
		http.Error(w, "transaction not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"message": "transaction updated"})
}

func DeleteTransactionHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid transaction id", http.StatusBadRequest)
		return
	}

	rowsAffected, err := models.DeleteTransaction(db.DB, id, userID)
	if err != nil {
		http.Error(w, "could not delete transaction", http.StatusInternalServerError)
		return
	}
	if rowsAffected == 0 {
		http.Error(w, "transaction not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"message": "transaction deleted"})
}