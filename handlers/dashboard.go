package handlers

import(
	"encoding/json"
	"net/http"
	"log"
	"time"

	"expense-tracker-go/db"
	"expense-tracker-go/middleware"
	"expense-tracker-go/models"
)

func Dashboard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	log.Println("DEBUG : userID =", userID)

	now := time.Now()
	yearMonth := now.Format("2006-01")
	log.Println("DEBUG : yearMonth =", yearMonth)

	income, expense, err := models.GetMonthlyTotals(db.DB, userID, yearMonth)
	log.Println("DEBUG: income =", income, "expense =", expense, "err =", err)
	if err != nil {
		http.Error(w, "Couldn't fetch totals", http.StatusInternalServerError)
		return
	}

	budget, err := models.GetBudget(db.DB, userID, yearMonth)
	log.Println("DEBUG: budget =", budget, "err =", err)
	if err != nil {
		http.Error(w, "Couldn't fetch budget", http.StatusInternalServerError)
		return
	}

	firstOfNextMonth := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())
	lastDayOfMonth := firstOfNextMonth.AddDate(0, 0, -1).Day()

	daysRemaining := lastDayOfMonth - now.Day() +1

	var dailySafeSpend float64 
	if daysRemaining > 0 {
		dailySafeSpend = (budget - expense) / float64(daysRemaining)
	}

	summary := models.DashboardSummary{
		TotalIncome: income,
		TotalExpense: expense,
		RemainingBalance: income - expense,
		Budget: budget,
		DailySafeSpend: dailySafeSpend,
		DaysRemaining: daysRemaining,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

type setBudgetRequest struct {
	Amount float64 `json:"amount"`
}

func SetBudget(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	var req setBudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body request", http.StatusBadRequest)
		return
	}

	if req.Amount < 0 {
		http.Error(w, "Amount must be positive", http.StatusBadRequest)
		return
	}

	yearMonth := time.Now().Format("2006-01")
	if err := models.SetBudget(db.DB, userID, yearMonth, req.Amount); err != nil {
		http.Error(w, "Couldn't set budget", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{"message": "budget updated"})
}