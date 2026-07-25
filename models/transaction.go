package models

import (
	"database/sql"

)

type Transaction struct {
	ID              int     `json:"id"`
	UserID          int     `json:"user_id"`
	CategoryID      *int    `json:"category_id"`
	Type            string  `json:"type"`
	Amount          float64 `json:"amount"`
	Description     string  `json:"description"`
	TransactionDate string  `json:"transaction_date"`
}

type TransactionFilters struct {
	Month		string
	CategoryID	*int
	Type		string
	Search		string
}

func CreateTransaction(db *sql.DB, userID int, txType string, amount float64, categoryID *int, description, date string) (int, error) {
	var catID sql.NullInt64
	if categoryID != nil {
		catID = sql.NullInt64{Int64: int64(*categoryID), Valid: true}
	}

	result, err := db.Exec(
		`INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date)
		VALUES (?, ?, ?, ?, ?, ?)`,
		userID, catID, txType, amount, description, date,
	)
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return int(id), nil
}

func GetTransactionByUser(db *sql.DB, userID int, filters TransactionFilters) ([]Transaction, error) {
	queryStr := `SELECT id, category_id, type, amount, description, transaction_date
	             FROM transactions WHERE user_id = ?`
	args := []any{userID}

	if filters.Month != "" {
		queryStr += " AND DATE_FORMAT(transaction_date, '%Y-%m') = ?"
		args = append(args, filters.Month)
	}
	if filters.CategoryID != nil {
		queryStr += " AND category_id = ?"
		args = append(args, *filters.CategoryID)
	}
	if filters.Type != "" {
		queryStr += " AND type = ?"
		args = append(args, filters.Type)
	}
	if filters.Search != "" {
		queryStr += " AND description LIKE ?"
		args = append(args, "%"+filters.Search+"%")
	}

	queryStr += " ORDER BY transaction_date DESC, id DESC"
	
	rows, err := db.Query(queryStr, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []Transaction
	for rows.Next() {
		var t Transaction
		var catID sql.NullInt64

		if err := rows.Scan(&t.ID, &catID, &t.Type, &t.Amount, &t.Description, &t.TransactionDate); err != nil {
			return nil, err
		}
		if catID.Valid {
			id := int(catID.Int64)
			t.CategoryID = &id
		}
		t.UserID = userID
		transactions = append(transactions, t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return transactions, nil
}

func UpdateTransaction(db *sql.DB, id, userID int, txType string, amount float64, categoryID *int, description, date string) (int64, error) {
	var catID sql.NullInt64
	if categoryID != nil {
		catID = sql.NullInt64{Int64: int64(*categoryID), Valid: true}
	}

	result, err := db.Exec(
		`UPDATE transactions SET type = ?, amount = ?, category_id = ?, description = ?, transaction_date = ?
		 WHERE id = ? AND user_id = ?`,
		txType, amount, catID, description, date, id, userID,
	)
	if err != nil {
		return 0, err
	}
	// RowsAffected tells us whether anything actually matched. 0 means either
	// the ID doesn't exist, or it belongs to someone else — either way, the
	// caller should treat that as "not found," not a silent success.
	return result.RowsAffected()
}

// DeleteTransaction removes a transaction, scoped to the owning user the same way.
func DeleteTransaction(db *sql.DB, id, userID int) (int64, error) {
	result, err := db.Exec(
		"DELETE FROM transactions WHERE id = ? AND user_id = ?",
		id, userID,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}