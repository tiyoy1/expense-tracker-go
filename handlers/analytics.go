package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"expense-tracker-go/db"
	"expense-tracker-go/middleware"
	"expense-tracker-go/models"
)

func CategoryBreakdownHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	month := r.URL.Query().Get("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}

	breakdown, err := models.GetCategoryBreakdown(db.DB, userID, month)
	if err != nil {
		http.Error(w, "could not fetch category breakdown", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(breakdown)
}

func TrendHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	trend, err := models.GetMonthlyTrend(db.DB, userID, 6)
	if err != nil {
		http.Error(w, "could not fetch trend", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trend)
}