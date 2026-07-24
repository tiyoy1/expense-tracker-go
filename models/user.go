package models

import (
	"database/sql"

	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID 				int
	NAME 			string
	Email 			string
	PasswordHash 	string
}

//ini function buat encrypt, masukin, sama return id user terbaru dari databasenya
func CreateUser(db *sql.DB, name, email, password string) (int, error) {
	// nerima parsing dari auth.go, sesuai sama parameternya terus dia nge encrypt si passwordnya
	hash, err := bcrypt.GenerateFromPassword([] byte(password), bcrypt.DefaultCost)
	if err != nil {
		return	0, err
	}

	//ini masukin name, email sama password yang udah di hash ke dalam Database
	result, err := db.Exec(
		"INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
		name, email, string(hash),
	) // error handling
	if err != nil {
		return 0, err
	}

	//ngambil kolom id yang terakhir dimasukin
	id ,err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	//return id ke auth.go, tapi masih object Go, belum JSON
	return int(id), nil
}

//ini gunanya buat cari user berdasarkan email
func GetUserByEmail(db *sql.DB, email string) (*User, error) {
	//siapin object kosong dari struct User
	var u User
	//jalanin Query
	err := db.QueryRow(
		"SELECT id, name, email, password_hash FROM users WHERE email = ?",
		email, //cari user berdasarkan email
	).Scan(&u.ID, &u.NAME, &u.Email, &u.PasswordHash) //masukin hasil query ke object User
	if err != nil {
		return nil, err //jika gagal, return error
	}
	return &u, nil //jika berhasil, return user tersebut
}