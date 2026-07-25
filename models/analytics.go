package models

import "database/sql"

type CategoryBreakdown struct {
	CategoryID   *int    `json:"category_id"`
	CategoryName string  `json:"category_name"`
	Total        float64 `json:"total"`
}

func GetCategoryBreakdown(db *sql.DB, userID int, yearMonth string) ([]CategoryBreakdown, error) {
	rows, err := db.Query(
		`SELECT c.id, c.name, SUM(t.amount) as total
		 FROM transactions t
		 LEFT JOIN categories c ON t.category_id = c.id
		 WHERE t.user_id = ? AND t.type = 'expense' AND DATE_FORMAT(t.transaction_date, '%Y-%m') = ?
		 GROUP BY c.id, c.name
		 ORDER BY total DESC`,
		userID, yearMonth,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []CategoryBreakdown
	for rows.Next() {
		var cb CategoryBreakdown
		var catID sql.NullInt64
		var catName sql.NullString
		if err := rows.Scan(&catID, &catName, &cb.Total); err != nil {
			return nil, err
		}
		if catID.Valid {
			id := int(catID.Int64)
			cb.CategoryID = &id
		}
		cb.CategoryName = "Tanpa kategori"
		if catName.Valid {
			cb.CategoryName = catName.String
		}
		result = append(result, cb)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

type MonthlyTrend struct {
	Month   string  `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

func GetMonthlyTrend(db *sql.DB, userID int, months int) ([]MonthlyTrend, error) {
	rows, err := db.Query(
		`SELECT DATE_FORMAT(transaction_date, '%Y-%m') as ym,
		        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
		        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
		 FROM transactions
		 WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
		 GROUP BY ym
		 ORDER BY ym ASC`,
		userID, months,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []MonthlyTrend
	for rows.Next() {
		var mt MonthlyTrend
		if err := rows.Scan(&mt.Month, &mt.Income, &mt.Expense); err != nil {
			return nil, err
		}
		result = append(result, mt)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}