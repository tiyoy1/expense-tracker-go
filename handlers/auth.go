package handlers

import (
	"time"
	"encoding/json"
	"net/http"

	"expense-tracker-go/db"
	"expense-tracker-go/models"
	"expense-tracker-go/config"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

//bikin tipe data baru yang isinya nerima json, json:name masuk ke name dan begitu seterusnya
type registerRequest struct {
	Name		string `json:"name"`
	Email 		string `json:"email"`
	Password 	string `json:"password"`
}	

//function ini nerima dan baca http request yang masuk
func Register(w http.ResponseWriter, r * http.Request) {
	//empty instance yang nerima request json:name, json:email, json:password
	var req registerRequest

	//ini gunanya buat ambil body request terus buat parser JSON, lalu baru masukin ke req
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		//kalo error kasih bad request
		http.Error(w, "invalid body request", http.StatusBadRequest)
		return
	}

	//ngecek apakah Name, Email, sama Password keisi semua, kalo iya lanjut CreateUser()
	if req.Name == "" || req.Email == "" || req.Password == "" {
		http.Error(w, "name, email, password are required", http.StatusBadRequest)
		return
	}

	//Disini baru, Name, Email, sama Password masuk ke CreateUser() dan dibuat disitu
	id, err := models.CreateUser(db.DB, req.Name, req.Email, req.Password)
	if err != nil {
		http.Error(w, "Couldn't create user", http.StatusInternalServerError)
		return
	}

	//"gua mau kasih lu application/json nih"
	w.Header().Set("Content-Type", "application/json")
	//kalo berhasil gua kasih 201 AKA berhasil
	w.WriteHeader(http.StatusCreated)
	//ubah object Go menjadi JSON response
	json.NewEncoder(w).Encode(map[string]any{
		"id" : id,
		"message" : "user created AHAAY",
	})
}

//ini struct buat loginRequest
type loginRequest struct {
	Email		string `json:"email"`
	Password	string `json:"password"`
}

//decode JSON
func Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	//cari berdasarkan email
	user, err := models.GetUserByEmail(db.DB, req.Email)
	if err != nil {
		http.Error(w, "Invalid credentials dude", http.StatusUnauthorized) //kalo ga ketemu, kasih 401 Unauthorized
		return
	}

	//compare password yang diinput sama password yang udah dihash (return dari function sebelumnya)
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	//buat JWT isinya user_id sama expiration date
	claims := jwt.MapClaims{
		"sub" : user.ID,
		"exp" : time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims) 
	signedToken, err := token.SignedString(config.JWTSecret) //sign token 
	if err != nil {
		http.Error(w, "Couldn't create token", http.StatusInternalServerError)
		return // error handling kalo ga bisa bikin token
	}

	//kirim token ke client lewat JSON, stepnya sama persis kaya yang register
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"token" : signedToken,
	})
}