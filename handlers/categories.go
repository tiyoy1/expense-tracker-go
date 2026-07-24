package handlers

import (
	"encoding/json"
	"net/http"

	"expense-tracker-go/db"
	"expense-tracker-go/models"
)

func ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := models.GetAllCategories(db.DB)
	if err != nil {
		http.Error(w, "could not fetch categories", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}