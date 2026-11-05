package auth

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"ubatuba-conecta-backend/internal/models"
)

type AuthenticatedUser struct {
	ID    string
	Email string
	Name  string
}

type jwtClaims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Exp   int64  `json:"exp"`
}

// ExtractUser authenticates the request using a Clerk Bearer JWT token or local dev headers.
func ExtractUser(r *http.Request) (*AuthenticatedUser, error) {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if token != "" {
			if user, err := parseBearerToken(token, r); err == nil && user.ID != "" {
				return user, nil
			}
		}
	}

	// Fallback for Clerk header forwarding / local development mode
	userID := strings.TrimSpace(r.Header.Get("X-Clerk-User-Id"))
	if userID != "" {
		email := strings.TrimSpace(r.Header.Get("X-Clerk-User-Email"))
		name := strings.TrimSpace(r.Header.Get("X-Clerk-User-Name"))
		return &AuthenticatedUser{
			ID:    userID,
			Email: email,
			Name:  name,
		}, nil
	}

	return nil, fmt.Errorf("usuário não autenticado: faça login com Clerk para acessar a área de parceiros")
}

func parseBearerToken(token string, r *http.Request) (*AuthenticatedUser, error) {
	parts := strings.Split(token, ".")
	if len(parts) == 3 {
		payload, err := base64.RawURLEncoding.DecodeString(parts[1])
		if err != nil {
			return nil, err
		}
		var claims jwtClaims
		if err := json.Unmarshal(payload, &claims); err != nil {
			return nil, err
		}
		if claims.Exp > 0 && time.Now().Unix() > claims.Exp {
			return nil, fmt.Errorf("sessão Clerk expirada")
		}
		if claims.Sub != "" {
			email := claims.Email
			if email == "" {
				email = strings.TrimSpace(r.Header.Get("X-Clerk-User-Email"))
			}
			name := claims.Name
			if name == "" {
				name = strings.TrimSpace(r.Header.Get("X-Clerk-User-Name"))
			}
			return &AuthenticatedUser{
				ID:    claims.Sub,
				Email: email,
				Name:  name,
			}, nil
		}
	}
	return nil, fmt.Errorf("token JWT inválido")
}

// SyncClerkUserMetadata updates the user's public_metadata in Clerk Backend API
// so subscription status and the 3-day expiration alert come directly with the Clerk login session.
func SyncClerkUserMetadata(userID string, sub *models.Subscription) {
	secretKey := strings.TrimSpace(os.Getenv("CLERK_SECRET_KEY"))
	if secretKey == "" || userID == "" || strings.HasPrefix(userID, "dev_") {
		return
	}

	payload := map[string]any{
		"public_metadata": map[string]any{
			"partnerSubscriptionStatus": sub.Status,
			"partnerPlanId":             sub.PlanID,
			"partnerPlanName":           sub.PlanName,
			"partnerExpiresAt":          sub.ExpiresAt.Format(time.RFC3339),
			"partnerDaysRemaining":      sub.DaysRemaining,
			"partnerExpiringSoon":       sub.ExpiringSoon,
			"partnerExpired":            sub.Expired,
			"partnerCanPost":            sub.CanPost,
			"partnerAlertMessage":       sub.AlertMessage,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return
	}

	url := fmt.Sprintf("https://api.clerk.com/v1/users/%s/metadata", userID)
	req, err := http.NewRequest(http.MethodPatch, url, bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Authorization", "Bearer "+secretKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(req)
	if err == nil && resp != nil {
		_ = resp.Body.Close()
	}
}
