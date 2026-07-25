package models

import "database/sql"

type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

//select from db, get all category and order it by Name
func GetAllCategories(db *sql.DB) ([]Category, error) {
	rows, err := db.Query("SELECT id, name FROM categories ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

//looks category's name & id, then append it, return categories
	var categories []Category
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return categories, nil
}