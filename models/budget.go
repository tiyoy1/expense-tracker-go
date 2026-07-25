package models

import "database/sql"

//insert the budget into db
func SetBudget(db *sql.DB, userID int, yearMonth string, amount float64) error {
	_, err := db.Exec(
		`INSERT INTO budgets (user_id, period, amount) VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE amount=?`,
		userID, yearMonth, amount, amount,
	)
	return err
}

//get budget from db, looking for amount, user, and period
func GetBudget(db *sql.DB, userID int, yearMonth string) (float64, error) {
	var amount float64
	err := db.QueryRow(
		"SELECT amount FROM budgets WHERE user_id = ? AND period = ?",
		userID, yearMonth,
	).Scan(&amount)

	if err == sql.ErrNoRows {
		return 0, nil
	}

	if err != nil {
		return 0, err
	}

	return amount, nil
}