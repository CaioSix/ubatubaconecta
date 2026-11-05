package store

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"ubatuba-conecta-backend/internal/models"
)

const WarningThresholdDays = 3
const kvStoreKey = "ubatuba_conecta_store_v1"

type persistedData struct {
	Subscriptions map[string]*models.Subscription   `json:"subscriptions"`
	Partners      map[string]*models.PartnerProfile `json:"partners"`
}

type Store struct {
	mu       sync.RWMutex
	filePath string
	data     persistedData
}

func resolveWritablePath(preferred string) string {
	if os.Getenv("VERCEL") != "" {
		return filepath.Join(os.TempDir(), "ubatuba-store.json")
	}
	return preferred
}

func NewStore(filePath string) (*Store, error) {
	actualPath := resolveWritablePath(filePath)
	if err := os.MkdirAll(filepath.Dir(actualPath), 0o755); err != nil {
		actualPath = filepath.Join(os.TempDir(), "ubatuba-store.json")
	}

	s := &Store{
		filePath: actualPath,
		data: persistedData{
			Subscriptions: make(map[string]*models.Subscription),
			Partners:      make(map[string]*models.PartnerProfile),
		},
	}

	// 1. Try loading from Vercel KV / Upstash Redis if configured
	if loaded := s.loadFromKV(); loaded {
		return s, nil
	}

	// 2. Fallback to local/tmp file
	if raw, err := os.ReadFile(actualPath); err == nil && len(raw) > 0 {
		_ = json.Unmarshal(raw, &s.data)
		if s.data.Subscriptions == nil {
			s.data.Subscriptions = make(map[string]*models.Subscription)
		}
		if s.data.Partners == nil {
			s.data.Partners = make(map[string]*models.PartnerProfile)
		}
	}

	return s, nil
}

func (s *Store) loadFromKV() bool {
	kvURL := strings.TrimRight(strings.TrimSpace(os.Getenv("KV_REST_API_URL")), "/")
	kvToken := strings.TrimSpace(os.Getenv("KV_REST_API_TOKEN"))
	if kvURL == "" || kvToken == "" {
		return false
	}

	req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/get/%s", kvURL, kvStoreKey), nil)
	if err != nil {
		return false
	}
	req.Header.Set("Authorization", "Bearer "+kvToken)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	var wrapper struct {
		Result string `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&wrapper); err != nil || wrapper.Result == "" {
		return false
	}

	if err := json.Unmarshal([]byte(wrapper.Result), &s.data); err != nil {
		return false
	}
	if s.data.Subscriptions == nil {
		s.data.Subscriptions = make(map[string]*models.Subscription)
	}
	if s.data.Partners == nil {
		s.data.Partners = make(map[string]*models.PartnerProfile)
	}
	return true
}

func (s *Store) saveToKV(raw []byte) {
	kvURL := strings.TrimRight(strings.TrimSpace(os.Getenv("KV_REST_API_URL")), "/")
	kvToken := strings.TrimSpace(os.Getenv("KV_REST_API_TOKEN"))
	if kvURL == "" || kvToken == "" {
		return
	}

	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("%s/set/%s", kvURL, kvStoreKey), bytes.NewReader(raw))
	if err != nil {
		return
	}
	req.Header.Set("Authorization", "Bearer "+kvToken)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err == nil && resp != nil {
		_, _ = io.Copy(io.Discard, resp.Body)
		_ = resp.Body.Close()
	}
}

func (s *Store) saveLocked() error {
	raw, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	s.saveToKV(raw)
	_ = os.WriteFile(s.filePath, raw, 0o644)
	return nil
}

// ComputeSubscriptionState recalculates daysRemaining, expiringSoon (<= 3 days), expired, and canPost.
func ComputeSubscriptionState(sub *models.Subscription, now time.Time) *models.Subscription {
	if sub == nil {
		return &models.Subscription{
			Status:               "none",
			WarningThresholdDays: WarningThresholdDays,
			DaysRemaining:        0,
			ExpiringSoon:         false,
			Expired:              false,
			CanPost:              false,
		}
	}

	cp := *sub
	cp.WarningThresholdDays = WarningThresholdDays

	if cp.Status == "none" || cp.Status == "pending" || cp.ExpiresAt.IsZero() {
		cp.DaysRemaining = 0
		cp.ExpiringSoon = false
		cp.Expired = false
		cp.CanPost = false
		cp.AlertMessage = ""
		return &cp
	}

	hoursLeft := cp.ExpiresAt.Sub(now).Hours()
	daysLeft := int(math.Ceil(hoursLeft / 24.0))
	cp.DaysRemaining = daysLeft

	if hoursLeft <= 0 {
		cp.Status = "expired"
		cp.Expired = true
		cp.ExpiringSoon = false
		cp.CanPost = false
		cp.AlertMessage = fmt.Sprintf(
			"Sua assinatura (%s) venceu em %s. Renove sua recorrência no Mercado Pago para reativar seu anúncio no Ubatuba Conecta.",
			cp.PlanName,
			cp.ExpiresAt.Format("02/01/2006"),
		)
		return &cp
	}

	cp.Expired = false
	cp.CanPost = cp.Status == "active"

	if cp.CanPost && daysLeft <= WarningThresholdDays {
		cp.ExpiringSoon = true
		if daysLeft <= 1 {
			cp.AlertMessage = fmt.Sprintf(
				"Atenção: falta apenas 1 dia para o vencimento da sua assinatura (%s — vence em %s). Verifique sua recorrência no Mercado Pago para não pausar seu anúncio!",
				cp.PlanName,
				cp.ExpiresAt.Format("02/01/2006"),
			)
		} else {
			cp.AlertMessage = fmt.Sprintf(
				"Atenção: faltam %d dias para o vencimento da sua assinatura (%s — vence em %s). Mantenha sua recorrência em dia no Mercado Pago para continuar divulgando!",
				daysLeft,
				cp.PlanName,
				cp.ExpiresAt.Format("02/01/2006"),
			)
		}
	} else {
		cp.ExpiringSoon = false
		cp.AlertMessage = ""
	}

	return &cp
}

func (s *Store) GetSubscription(userID string) *models.Subscription {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sub := s.data.Subscriptions[userID]
	return ComputeSubscriptionState(sub, time.Now())
}

func (s *Store) UpsertSubscription(sub *models.Subscription) (*models.Subscription, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sub.UpdatedAt = time.Now()
	computed := ComputeSubscriptionState(sub, time.Now())
	s.data.Subscriptions[sub.UserID] = computed
	if err := s.saveLocked(); err != nil {
		return nil, err
	}
	return computed, nil
}

func (s *Store) GetPartner(userID string) *models.PartnerProfile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if p, ok := s.data.Partners[userID]; ok {
		cp := *p
		return &cp
	}
	return nil
}

func (s *Store) UpsertPartner(profile *models.PartnerProfile) (*models.PartnerProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	if existing, ok := s.data.Partners[profile.UserID]; ok {
		profile.ID = existing.ID
		profile.CreatedAt = existing.CreatedAt
		profile.WhatsappClicks = existing.WhatsappClicks
	} else {
		if profile.ID == "" {
			profile.ID = fmt.Sprintf("partner-%d", now.UnixNano())
		}
		profile.CreatedAt = now
	}
	profile.UpdatedAt = now
	s.data.Partners[profile.UserID] = profile
	if err := s.saveLocked(); err != nil {
		return nil, err
	}
	cp := *profile
	return &cp, nil
}

func (s *Store) IncrementPartnerClicks(partnerID string) (*models.PartnerProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, p := range s.data.Partners {
		if p.ID == partnerID {
			p.WhatsappClicks++
			_ = s.saveLocked()
			cp := *p
			return &cp, nil
		}
	}
	return nil, fmt.Errorf("parceiro não encontrado")
}

// ListActivePublicPartners returns only partners whose subscription is currently active and not expired.
func (s *Store) ListActivePublicPartners() []*models.PartnerProfile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	now := time.Now()
	var result []*models.PartnerProfile
	for userID, p := range s.data.Partners {
		if !p.Published {
			continue
		}
		sub := ComputeSubscriptionState(s.data.Subscriptions[userID], now)
		if sub.CanPost && !sub.Expired {
			cp := *p
			result = append(result, &cp)
		}
	}
	return result
}

// GetAllSubscriptions returns a snapshot of all subscriptions for background expiration checking.
func (s *Store) GetAllSubscriptions() []*models.Subscription {
	s.mu.RLock()
	defer s.mu.RUnlock()
	now := time.Now()
	var list []*models.Subscription
	for _, sub := range s.data.Subscriptions {
		list = append(list, ComputeSubscriptionState(sub, now))
	}
	return list
}
