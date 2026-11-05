package models

import "time"

type Plan struct {
	ID             string  `json:"id"`
	Nome           string  `json:"nome"`
	Periodo        string  `json:"periodo"`
	DuracaoDias    int     `json:"duracaoDias"`
	AvisoDias      int     `json:"avisoDias"`
	Preco          float64 `json:"preco"`
	Descricao      string  `json:"descricao"`
	Recommended    bool    `json:"recommended"`
	FrequenciaTipo string  `json:"frequenciaTipo"` // days, months
	FrequenciaVal  int     `json:"frequenciaVal"`
}

type Subscription struct {
	ID                   string    `json:"id"`
	UserID               string    `json:"userId"`
	PlanID               string    `json:"planId"`
	PlanName             string    `json:"planName"`
	Price                float64   `json:"price"`
	Status               string    `json:"status"` // "none", "pending", "active", "expired", "cancelled"
	MercadoPagoID        string    `json:"mercadoPagoId,omitempty"`
	CheckoutURL          string    `json:"checkoutUrl,omitempty"`
	StartedAt            time.Time `json:"startedAt,omitempty"`
	ExpiresAt            time.Time `json:"expiresAt,omitempty"`
	DaysRemaining        int       `json:"daysRemaining"`
	WarningThresholdDays int       `json:"warningThresholdDays"`
	ExpiringSoon         bool      `json:"expiringSoon"`
	Expired              bool      `json:"expired"`
	CanPost              bool      `json:"canPost"`
	AlertMessage         string    `json:"alertMessage,omitempty"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type PartnerProfile struct {
	ID              string    `json:"id"`
	UserID          string    `json:"userId"`
	UserEmail       string    `json:"userEmail"`
	ResponsavelNome string    `json:"responsavelNome"`
	Telefone        string    `json:"telefone"`
	WhatsappNorm    string    `json:"whatsappNorm"`
	EmpresaNome     string    `json:"empresaNome"`
	Ramo            string    `json:"ramo"`
	Regiao          string    `json:"regiao"`
	Endereco        string    `json:"endereco"`
	Descricao       string    `json:"descricao"`
	LogoURL         string    `json:"logoUrl,omitempty"`
	Imagens         []string  `json:"imagens"`
	Published       bool      `json:"published"`
	WhatsappClicks  int       `json:"whatsappClicks"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type UserSessionResponse struct {
	UserID       string          `json:"userId"`
	UserEmail    string          `json:"userEmail"`
	UserName     string          `json:"userName"`
	Subscription *Subscription   `json:"subscription"`
	Partner      *PartnerProfile `json:"partner,omitempty"`
	Plans        []Plan          `json:"plans"`
}

var AvailablePlans = []Plan{
	{
		ID:             "semanal",
		Nome:           "Semanal",
		Periodo:        "7 dias",
		DuracaoDias:    7,
		AvisoDias:      3,
		Preco:          19.99,
		Descricao:      "Para divulgação rápida por uma semana ou ações promocionais de fim de semana.",
		Recommended:    false,
		FrequenciaTipo: "days",
		FrequenciaVal:  7,
	},
	{
		ID:             "mensal",
		Nome:           "Mensal Recorrente",
		Periodo:        "30 dias",
		DuracaoDias:    30,
		AvisoDias:      3,
		Preco:          49.99,
		Descricao:      "Assinatura mensal com renovação recorrente e destaque contínuo para turistas e moradores.",
		Recommended:    true,
		FrequenciaTipo: "months",
		FrequenciaVal:  1,
	},
	{
		ID:             "anual",
		Nome:           "Anual Recorrente",
		Periodo:        "365 dias",
		DuracaoDias:    365,
		AvisoDias:      3,
		Preco:          399.99,
		Descricao:      "Presença garantida o ano todo, incluindo feriados e alta temporada de verão.",
		Recommended:    false,
		FrequenciaTipo: "months",
		FrequenciaVal:  12,
	},
}

func FindPlan(id string) *Plan {
	for _, p := range AvailablePlans {
		if p.ID == id {
			cp := p
			return &cp
		}
	}
	return nil
}
