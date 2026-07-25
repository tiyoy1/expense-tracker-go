package handlers

import (
	"encoding/json"
	"net/http"

	"golang.org/x/crypto/bcrypt"
)

//ini bikin tipe data loginRequest untuk jadi DTO (data transfer object) yang jadi kontrak untuk request login
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}x

// ini function loginnya, dia punya parameter write & request
func Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest //nyiapin object kosong buat nampung request login

    //Kalo inputnya ga sesuai sama loginRequest, dia bakal kasih error BadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

    //query ke db buat cari user berdasarkan request Email
	user, err := FindUserByEmail(req.Email)
    //error handling kalo credentialnya ga ada
	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

    //ini ngecompare password yang dimasukin sama password yang udah di hash di database
	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(req.Password),
	); err != nil { //kalo ga sesuai habis dicompare, dia error invalid credentials
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

    // kalo bener, dia lanjut untuk generate token JWT untuk user ID yang login
	token, err := GenerateJWT(user.ID)
    //error handling kalo misalnya gagal (tapi apa yang bisa bikin gagal generate JWT token?? GPT jawab aku pls)
	if err != nil {
		http.Error(w, "could not generate token", http.StatusInternalServerError)
		return
	}

    // set untuk content JSON yang mau direturn
	w.Header().Set("Content-Type", "application/json")

    //convert dari Go ke JSON lewat new encode. Parse variable Go jadi value JSON sesuai sama parameter yang diberikan
	json.NewEncoder(w).Encode(map[string]any{
		"token": token,
		"user": map[string]any{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
		},
	})
}