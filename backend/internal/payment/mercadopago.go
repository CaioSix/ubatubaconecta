package payment

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"ubatuba-conecta-backend/internal/models"
)

type CheckoutResult struct {
	SubscriptionID string `json:"subscriptionId"`
	CheckoutURL    string `json:"checkoutUrl"`
	SandboxMode    bool   `json:"sandboxMode"`
	Message        string `json:"message"`
}

// CreateRecurringSubscription creates a recurring subscription (Preapproval) on Mercado Pago.
// If MERCADO_PAGO_ACCESS_TOKEN is not configured, it creates a local sandbox checkout so the flow can be tested immediately.
func CreateRecurringSubscription(userID, userEmail string, plan *models.Plan, baseURL string) (*CheckoutResult, error) {
	accessToken := strings.TrimSpace(os.Getenv("MERCADO_PAGO_ACCESS_TOKEN"))
	externalRef := fmt.Sprintf("%s|%s", userID, plan.ID)

	if accessToken == "" {
		subID := fmt.Sprintf("mp_sandbox_%d", time.Now().Unix())
		return &CheckoutResult{
			SubscriptionID: subID,
			CheckoutURL:    fmt.Sprintf("%s/?mp_sandbox=1&plan=%s&sub_id=%s#empresas", baseURL, plan.ID, subID),
			SandboxMode:    true,
			Message:        "Modo de teste ativo (MERCADO_PAGO_ACCESS_TOKEN não configurado). Confirme o pagamento simulado abaixo para liberar a postagem imediatamente.",
		}, nil
	}

	payerEmail := userEmail
	if payerEmail == "" {
		payerEmail = "parceiro@ubatubaconecta.com.br"
	}

	backURL := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if backURL == "" {
		backURL = baseURL
	}

	payload := map[string]any{
		"reason":             fmt.Sprintf("Ubatuba Conecta — Parceiro (%s)", plan.Nome),
		"external_reference": externalRef,
		"payer_email":        payerEmail,
		"auto_recurring": map[string]any{
			"frequency":          plan.FrequenciaVal,
			"frequency_type":     plan.FrequenciaTipo,
			"transaction_amount": plan.Preco,
			"currency_id":        "BRL",
		},
		"back_url": backURL,
		"status":   "pending",
	}

	rawBody, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.mercadopago.com/preapproval", bytes.NewReader(rawBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro ao comunicar com Mercado Pago: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("Mercado Pago retornou status %d: %s", resp.StatusCode, string(respBytes))
	}

	var mpResp struct {
		ID        string `json:"id"`
		InitPoint string `json:"init_point"`
	}
	if err := json.Unmarshal(respBytes, &mpResp); err != nil {
		return nil, err
	}

	return &CheckoutResult{
		SubscriptionID: mpResp.ID,
		CheckoutURL:    mpResp.InitPoint,
		SandboxMode:    false,
		Message:        "Assinatura recorrente criada no Mercado Pago. Conclua o pagamento para liberar sua vitrine de parceiro.",
	}, nil
}

// FetchMercadoPagoPreapproval queries Mercado Pago API to verify a preapproval or payment status on webhook notification.
func FetchMercadoPagoPreapproval(resourceID, topic string) (externalRef string, approved bool, err error) {
	accessToken := strings.TrimSpace(os.Getenv("MERCADO_PAGO_ACCESS_TOKEN"))
	if accessToken == "" {
		return "", false, fmt.Errorf("MERCADO_PAGO_ACCESS_TOKEN não configurado")
	}

	endpoint := fmt.Sprintf("https://api.mercadopago.com/preapproval/%s", resourceID)
	if strings.Contains(topic, "payment") {
		endpoint = fmt.Sprintf("https://api.mercadopago.com/v1/payments/%s", resourceID)
	}

	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return "", false, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", false, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return "", false, fmt.Errorf("status %d: %s", resp.StatusCode, string(raw))
	}

	var data struct {
		Status            string `json:"status"`
		ExternalReference string `json:"external_reference"`
	}
	if err := json.Unmarshal(raw, &data); err != nil {
		return "", false, err
	}

	isApproved := data.Status == "authorized" || data.Status == "approved" || data.Status == "active"
	return data.ExternalReference, isApproved, nil
}
