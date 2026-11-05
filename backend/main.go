package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"ubatuba-conecta-backend/internal/auth"
	"ubatuba-conecta-backend/internal/handlers"
	"ubatuba-conecta-backend/internal/store"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Clerk-User-Id, X-Clerk-User-Email, X-Clerk-User-Name")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func startExpirationMonitor(st *store.Store) {
	ticker := time.NewTicker(15 * time.Minute)
	go func() {
		for range ticker.C {
			for _, sub := range st.GetAllSubscriptions() {
				if sub.ExpiringSoon || sub.Expired {
					auth.SyncClerkUserMetadata(sub.UserID, sub)
				}
			}
		}
	}()
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dataPath := filepath.Join("data", "store.json")
	uploadDir := "uploads"

	st, err := store.NewStore(dataPath)
	if err != nil {
		log.Fatalf("Erro ao inicializar banco de dados local: %v", err)
	}

	startExpirationMonitor(st)

	api := handlers.NewAPIHandler(st, uploadDir)
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","service":"ubatuba-conecta-go-api"}`))
	})

	// Clerk User + Partner + Subscription + 3-Day Expiration Check
	mux.HandleFunc("GET /api/me/partner", api.GetMePartner)
	mux.HandleFunc("POST /api/me/simulate-expiration", api.SimulateExpiration)

	// Mercado Pago Recurring Checkout & Webhook
	mux.HandleFunc("POST /api/payments/checkout", api.CreateCheckout)
	mux.HandleFunc("POST /api/payments/confirm", api.ConfirmPayment)
	mux.HandleFunc("POST /api/webhooks/mercadopago", api.MercadoPagoWebhook)

	// Partner Business Registration & Image Upload (Protected by Active Subscription)
	mux.HandleFunc("POST /api/partner/upload", api.UploadPartnerImages)
	mux.HandleFunc("POST /api/partner/profile", api.SavePartnerProfile)
	mux.HandleFunc("PUT /api/partner/profile", api.SavePartnerProfile)

	// Public Partners Feed & WhatsApp Analytics
	mux.HandleFunc("GET /api/partners/public", api.ListPublicPartners)
	mux.HandleFunc("POST /api/partners/{id}/click", api.RegisterPartnerClick)

	// Static file server for uploaded partner business images
	fs := http.FileServer(http.Dir(uploadDir))
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", fs))

	log.Printf("🚀 Ubatuba Conecta Go Backend rodando em http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, corsMiddleware(mux)); err != nil {
		log.Fatalf("Erro no servidor HTTP: %v", err)
	}
}
