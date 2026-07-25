package models

import "database/sql"

type DashboardSummary struct {
	TotalIncome      float64 `json:"total_income"`
	TotalExpense     float64 `json:"total_expense"`
	RemainingBalance float64 `json:"remaining_balance"`
	Budget           float64 `json:"budget"`
	DailySafeSpend   float64 `json:"daily_safe_spend"`
	DaysRemaining    int     `json:"days_remaining"`
	PredictedMonthTotal float64 `json:"predicted_month_total"`
	OverspendingWarning bool `json:"overspending_warning"`
}

func GetMonthlyTotals(db *sql.DB, userID int, yearMonth string) (income, expense float64, err error) {
	err = db.QueryRow(
		`SELECT
			COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
		FROM transactions
		WHERE user_id = ? AND DATE_FORMAT(transaction_date, '%Y-%m') = ?`,
		userID, yearMonth,
	).Scan(&income, &expense)
	return
}