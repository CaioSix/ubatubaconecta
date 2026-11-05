package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"ubatuba-conecta-backend/internal/auth"
	"ubatuba-conecta-backend/internal/models"
	"ubatuba-conecta-backend/internal/payment"
	"ubatuba-conecta-backend/internal/store"
)

var nonDigitsRegex = regexp.MustCompile(`\D+`)

type APIHandler struct {
	Store     *store.Store
	UploadDir string
}

func NewAPIHandler(st *store.Store, uploadDir string) *APIHandler {
	if os.Getenv("VERCEL") == "" && uploadDir != "" {
		_ = os.MkdirAll(uploadDir, 0o755)
	}
	return &APIHandler{
		Store:     st,
		UploadDir: uploadDir,
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]any{"error": msg})
}

func normalizeWhatsapp(raw string) string {
	digits := nonDigitsRegex.ReplaceAllString(raw, "")
	if len(digits) == 10 || len(digits) == 11 {
		digits = "55" + digits
	}
	if len(digits) == 12 || len(digits) == 13 {
		return digits
	}
	return ""
}

// GetMePartner returns the authenticated user's session, subscription status (including the 3-day expiration warning), and partner profile.
func (h *APIHandler) GetMePartner(w http.ResponseWriter, r *http.Request) {
	user, err := auth.ExtractUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	sub := h.Store.GetSubscription(user.ID)
	partner := h.Store.GetPartner(user.ID)

	go auth.SyncClerkUserMetadata(user.ID, sub)

	writeJSON(w, http.StatusOK, models.UserSessionResponse{
		UserID:       user.ID,
		UserEmail:    user.Email,
		UserName:     user.Name,
		Subscription: sub,
		Partner:      partner,
		Plans:        models.AvailablePlans,
	})
}

// CreateCheckout initiates a Mercado Pago recurring subscription for the authenticated user.
func (h *APIHandler) CreateCheckout(w http.ResponseWriter, r *http.Request) {
	user, err := auth.ExtractUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var req struct {
		PlanID string `json:"planId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	plan := models.FindPlan(req.PlanID)
	if plan == nil {
		writeError(w, http.StatusBadRequest, "Plano inválido. Escolha semanal, mensal ou anual.")
		return
	}

	scheme := "http"
	if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, r.Host)

	res, err := payment.CreateRecurringSubscription(user.ID, user.Email, plan, baseURL)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	sub := h.Store.GetSubscription(user.ID)
	if sub.Status != "active" || sub.Expired {
		sub = &models.Subscription{
			ID:                   res.SubscriptionID,
			UserID:               user.ID,
			PlanID:               plan.ID,
			PlanName:             plan.Nome,
			Price:                plan.Preco,
			Status:               "pending",
			MercadoPagoID:        res.SubscriptionID,
			CheckoutURL:          res.CheckoutURL,
			WarningThresholdDays: store.WarningThresholdDays,
		}
		sub, _ = h.Store.UpsertSubscription(sub)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"checkout":     res,
		"subscription": sub,
	})
}

// ConfirmPayment activates the user's recurring subscription once Mercado Pago payment is confirmed.
func (h *APIHandler) ConfirmPayment(w http.ResponseWriter, r *http.Request) {
	user, err := auth.ExtractUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var req struct {
		PlanID        string `json:"planId"`
		MercadoPagoID string `json:"mercadoPagoId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	existing := h.Store.GetSubscription(user.ID)
	planID := req.PlanID
	if planID == "" && existing != nil {
		planID = existing.PlanID
	}
	if planID == "" {
		planID = "mensal"
	}

	plan := models.FindPlan(planID)
	if plan == nil {
		writeError(w, http.StatusBadRequest, "Plano não encontrado")
		return
	}

	now := time.Now()
	expiresAt := now.AddDate(0, 0, plan.DuracaoDias)
	if existing != nil && existing.Status == "active" && existing.ExpiresAt.After(now) {
		expiresAt = existing.ExpiresAt.AddDate(0, 0, plan.DuracaoDias)
	}

	mpID := req.MercadoPagoID
	if mpID == "" {
		mpID = fmt.Sprintf("mp_approved_%d", now.Unix())
	}

	sub := &models.Subscription{
		ID:                   fmt.Sprintf("sub_%s", user.ID),
		UserID:               user.ID,
		PlanID:               plan.ID,
		PlanName:             plan.Nome,
		Price:                plan.Preco,
		Status:               "active",
		MercadoPagoID:        mpID,
		StartedAt:            now,
		ExpiresAt:            expiresAt,
		WarningThresholdDays: store.WarningThresholdDays,
	}

	updatedSub, err := h.Store.UpsertSubscription(sub)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	go auth.SyncClerkUserMetadata(user.ID, updatedSub)

	writeJSON(w, http.StatusOK, map[string]any{
		"message":      "Pagamento recorrente confirmado com sucesso! Seu acesso para publicar e atualizar seu negócio está liberado.",
		"subscription": updatedSub,
	})
}

// MercadoPagoWebhook receives asynchronous payment/preapproval notifications from Mercado Pago.
func (h *APIHandler) MercadoPagoWebhook(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Type   string `json:"type"`
		Topic  string `json:"topic"`
		Action string `json:"action"`
		Data   struct {
			ID string `json:"id"`
		} `json:"data"`
		ID                string `json:"id"`
		ExternalReference string `json:"external_reference"`
		Status            string `json:"status"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	resourceID := body.Data.ID
	if resourceID == "" {
		resourceID = r.URL.Query().Get("data.id")
	}
	if resourceID == "" {
		resourceID = r.URL.Query().Get("id")
	}

	topic := body.Type
	if topic == "" {
		topic = body.Topic
	}
	if topic == "" {
		topic = r.URL.Query().Get("topic")
	}

	extRef := body.ExternalReference
	approved := body.Status == "approved" || body.Status == "authorized"

	if extRef == "" && resourceID != "" {
		if fetchedRef, isOk, err := payment.FetchMercadoPagoPreapproval(resourceID, topic); err == nil {
			extRef = fetchedRef
			approved = isOk
		}
	}

	if approved && strings.Contains(extRef, "|") {
		parts := strings.SplitN(extRef, "|", 2)
		userID, planID := parts[0], parts[1]
		if plan := models.FindPlan(planID); plan != nil && userID != "" {
			now := time.Now()
			sub := &models.Subscription{
				ID:                   fmt.Sprintf("sub_%s", userID),
				UserID:               userID,
				PlanID:               plan.ID,
				PlanName:             plan.Nome,
				Price:                plan.Preco,
				Status:               "active",
				MercadoPagoID:        resourceID,
				StartedAt:            now,
				ExpiresAt:            now.AddDate(0, 0, plan.DuracaoDias),
				WarningThresholdDays: store.WarningThresholdDays,
			}
			if updated, err := h.Store.UpsertSubscription(sub); err == nil {
				go auth.SyncClerkUserMetadata(userID, updated)
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"received": true})
}

// SimulateExpiration allows testing the 3-day expiration alert on login (e.g. setting daysLeft = 2 or 3, or 0 for expired).
func (h *APIHandler) SimulateExpiration(w http.ResponseWriter, r *http.Request) {
	user, err := auth.ExtractUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var req struct {
		DaysLeft int `json:"daysLeft"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	sub := h.Store.GetSubscription(user.ID)
	if sub == nil || sub.PlanID == "" {
		plan := models.FindPlan("mensal")
		sub = &models.Subscription{
			ID:        fmt.Sprintf("sub_%s", user.ID),
			UserID:    user.ID,
			PlanID:    plan.ID,
			PlanName:  plan.Nome,
			Price:     plan.Preco,
			StartedAt: time.Now().AddDate(0, 0, -27),
		}
	}

	if req.DaysLeft <= 0 {
		sub.Status = "expired"
		sub.ExpiresAt = time.Now().Add(-2 * time.Hour)
	} else {
		sub.Status = "active"
		sub.ExpiresAt = time.Now().Add(time.Duration(req.DaysLeft*24-1) * time.Hour)
	}

	updated, err := h.Store.UpsertSubscription(sub)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	go auth.SyncClerkUserMetadata(user.ID, updated)

	writeJSON(w, http.StatusOK, map[string]any{
		"subscription": updated,
	})
}

// UploadPartnerImages handles multipart image uploads for a paid partner's business gallery and logo.
// On Vercel Serverless Functions (or when UploadDir is empty), it encodes images as Base64 Data URLs
// so they persist inside the partner profile without relying on an ephemeral container filesystem.
func (h *APIHandler) UploadPartnerImages(w http.ResponseWriter, r *http.Request) {
	user, err := auth.ExtractUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	sub := h.Store.GetSubscription(user.ID)
	if !sub.CanPost {
		writeError(w, http.StatusForbidden, "Sua assinatura precisa estar ativa (paga) no Mercado Pago para enviar imagens.")
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Arquivo muito grande (limite de 10MB).")
		return
	}

	files := r.MultipartForm.File["images"]
	if len(files) == 0 {
		writeError(w, http.StatusBadRequest, "Nenhuma imagem enviada.")
		return
	}
	if len(files) > 6 {
		writeError(w, http.StatusBadRequest, "Envie no máximo 6 imagens por vez.")
		return
	}

	useDataURL := os.Getenv("VERCEL") != "" || h.UploadDir == ""
	var uploadedURLs []string

	for idx, fh := range files {
		src, err := fh.Open()
		if err != nil {
			continue
		}
		rawBytes, err := io.ReadAll(src)
		_ = src.Close()
		if err != nil || len(rawBytes) == 0 {
			continue
		}

		if useDataURL {
			mimeType := http.DetectContentType(rawBytes)
			if !strings.HasPrefix(mimeType, "image/") {
				mimeType = "image/jpeg"
			}
			encoded := base64.StdEncoding.EncodeToString(rawBytes)
			uploadedURLs = append(uploadedURLs, fmt.Sprintf("data:%s;base64,%s", mimeType, encoded))
			continue
		}

		ext := strings.ToLower(filepath.Ext(fh.Filename))
		switch ext {
		case ".jpg", ".jpeg", ".png", ".webp", ".gif":
		default:
			ext = ".jpg"
		}

		filename := fmt.Sprintf("partner_%d_%d%s", time.Now().UnixNano(), idx, ext)
		destPath := filepath.Join(h.UploadDir, filename)
		if err := os.WriteFile(destPath, rawBytes, 0o644); err != nil {
			continue
		}
		uploadedURLs = append(uploadedURLs, "/uploads/"+filename)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"urls": uploadedURLs,
	})
}

// SavePartnerProfile saves and publishes the partner's business profile (requires active recurring subscription).
func (h *APIHandler) SavePartnerProfile(w http.ResponseWriter, r *http.Request) {
	user, err := auth.ExtractUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	sub := h.Store.GetSubscription(user.ID)
	if !sub.CanPost {
		writeError(w, http.StatusForbidden, "Pagamento pendente ou assinatura vencida. Ative sua recorrência no Mercado Pago para publicar seu negócio.")
		return
	}

	var req struct {
		ResponsavelNome string   `json:"responsavelNome"`
		Telefone        string   `json:"telefone"`
		EmpresaNome     string   `json:"empresaNome"`
		Ramo            string   `json:"ramo"`
		Regiao          string   `json:"regiao"`
		Endereco        string   `json:"endereco"`
		Descricao       string   `json:"descricao"`
		LogoURL         string   `json:"logoUrl"`
		Imagens         []string `json:"imagens"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Dados inválidos")
		return
	}

	req.ResponsavelNome = strings.TrimSpace(req.ResponsavelNome)
	req.EmpresaNome = strings.TrimSpace(req.EmpresaNome)
	req.Telefone = strings.TrimSpace(req.Telefone)
	req.Ramo = strings.TrimSpace(req.Ramo)
	req.Regiao = strings.TrimSpace(req.Regiao)
	req.Endereco = strings.TrimSpace(req.Endereco)
	req.Descricao = strings.TrimSpace(req.Descricao)

	if req.ResponsavelNome == "" || req.EmpresaNome == "" || req.Telefone == "" {
		writeError(w, http.StatusBadRequest, "Preencha seu nome, telefone/WhatsApp e o nome da empresa.")
		return
	}

	whatsNorm := normalizeWhatsapp(req.Telefone)
	if whatsNorm == "" {
		writeError(w, http.StatusBadRequest, "Informe um telefone/WhatsApp válido com DDD (ex: 12 99999-9999).")
		return
	}

	if len(req.Imagens) == 0 {
		writeError(w, http.StatusBadRequest, "Suba pelo menos 1 imagem referente ao seu negócio para aparecer na vitrine.")
		return
	}

	if req.Regiao == "" {
		req.Regiao = "Centro"
	}
	if req.Ramo == "" {
		req.Ramo = "Comércio & Serviços"
	}

	profile := &models.PartnerProfile{
		UserID:          user.ID,
		UserEmail:       user.Email,
		ResponsavelNome: req.ResponsavelNome,
		Telefone:        req.Telefone,
		WhatsappNorm:    whatsNorm,
		EmpresaNome:     req.EmpresaNome,
		Ramo:            req.Ramo,
		Regiao:          req.Regiao,
		Endereco:        req.Endereco,
		Descricao:       req.Descricao,
		LogoURL:         req.LogoURL,
		Imagens:         req.Imagens,
		Published:       true,
	}

	saved, err := h.Store.UpsertPartner(profile)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"message": "Sua empresa parceira foi publicada com sucesso na vitrine do Ubatuba Conecta!",
		"partner": saved,
	})
}

// ListPublicPartners returns all active, paid partner businesses to display across the site.
func (h *APIHandler) ListPublicPartners(w http.ResponseWriter, r *http.Request) {
	partners := h.Store.ListActivePublicPartners()
	if partners == nil {
		partners = []*models.PartnerProfile{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"partners": partners,
	})
}

// RegisterPartnerClick increments the WhatsApp click counter for a partner's analytics dashboard.
func (h *APIHandler) RegisterPartnerClick(w http.ResponseWriter, r *http.Request) {
	partnerID := r.PathValue("id")
	if partnerID == "" {
		writeError(w, http.StatusBadRequest, "ID do parceiro obrigatório")
		return
	}
	updated, err := h.Store.IncrementPartnerClicks(partnerID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"partner": updated})
}
