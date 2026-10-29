import React, { useState } from 'react';
import { Sparkles, Search, ArrowRight, Waves, BedDouble, Compass, Wrench, Sun } from 'lucide-react';
import { BEACHES_DATA, STAY_LISTINGS } from '../data/ubatubaData';

const QUICK_PROMPTS = [
  {
    id: 'familia',
    label: 'Praias para família',
    prompt: 'Quais praias de Ubatuba são melhores para ir com crianças e família?',
    type: 'familia',
  },
  {
    id: 'surf',
    label: 'Praias para surfar',
    prompt: 'Quais praias de Ubatuba têm as melhores ondas para surfar?',
    type: 'surf',
  },
  {
    id: 'stay',
    label: 'Onde ficar',
    prompt: 'Sugira hospedagens e pousadas em Ubatuba para a minha viagem',
    type: 'stay',
  },
  {
    id: 'do',
    label: 'O que fazer hoje',
    prompt: 'O que dá para fazer hoje em Ubatuba com o clima atual?',
    type: 'do',
  },
  {
    id: 'routes',
    label: 'Roteiro de fim de semana',
    prompt: 'Monte um roteiro de 3 dias em Ubatuba (Norte, Centro e Sul)',
    type: 'routes',
  },
  {
    id: 'rf',
    label: 'Ar-condicionado (RF)',
    prompt: 'Preciso instalar, higienizar ou fazer manutenção de ar-condicionado em Ubatuba',
    type: 'rf',
  },
];

export default function HeroPlanner({ onNavigate, onScrollToTarget, weather, onAddToItinerary }) {
  const [query, setQuery] = useState('');
  const [assistantReply, setAssistantReply] = useState(null);

  function generateSmartResponse(text, presetType = '') {
    const q = text.toLowerCase();
    const tempStr = weather?.current ? `${weather.current.temp}°C (${weather.current.conditionLabel})` : 'clima agradável';
    const waveStr = weather?.marine ? `ondas em torno de ${weather.marine.waveHeight}m e água a ${weather.marine.waterTemp}°C` : 'boas condições de mar';

    if (presetType === 'rf' || q.includes('ar-condicionado') || q.includes('ar condicionado') || q.includes('climatiza') || q.includes('btu') || q.includes('higieniza')) {
      return {
        title: 'Climatização em Ubatuba — RF Ar Condicionado',
        text: 'A RF Ar Condicionado é a empresa parceira oficial da plataforma! Fazemos instalação (de 9.000 a 30.000 BTUs), manutenção com recarga de gás, higienização completa e visita técnica em toda Ubatuba.',
        recommendations: [
          { label: 'Instalação Split (a partir de R$ 790)', tag: 'Até 3x sem juros' },
          { label: 'Higienização Completa (R$ 150)', tag: 'Saúde e economia' },
          { label: 'Manutenção / Recarga de Gás (R$ 450)', tag: 'Atendimento rápido' },
        ],
        ctaLabel: 'Simular orçamento na RF Ar Condicionado',
        onCta: () => onScrollToTarget('rf-card'),
      };
    }

    if (presetType === 'familia' || q.includes('criança') || q.includes('família') || q.includes('familia') || q.includes('calma') || q.includes('mansa')) {
      const calmBeaches = BEACHES_DATA.filter((b) => b.tags.includes('familia')).slice(0, 4);
      return {
        title: 'Melhores praias para família e crianças em Ubatuba',
        text: `Agora em Ubatuba faz ${tempStr}. Para ir com crianças e curtir mar calmo tipo piscina, recomendamos estas praias com águas tranquilas e boa estrutura:`,
        beaches: calmBeaches,
        ctaLabel: 'Ver todas as praias para família',
        onCta: () => onNavigate('praias', { tag: 'familia' }),
      };
    }

    if (presetType === 'surf' || q.includes('surf') || q.includes('onda')) {
      const surfBeaches = BEACHES_DATA.filter((b) => b.tags.includes('surf'));
      return {
        title: 'Pico de Surf & Condição das Ondas em Ubatuba',
        text: `Condição atual do mar: ${waveStr}. Ubatuba é a Capital do Surf! Confira os picos mais indicados hoje:`,
        beaches: surfBeaches,
        ctaLabel: 'Explorar praias de surf',
        onCta: () => onNavigate('praias', { tag: 'surf' }),
      };
    }

    if (presetType === 'stay' || q.includes('hospeda') || q.includes('pousada') || q.includes('hotel') || q.includes('ficar') || q.includes('chalé')) {
      return {
        title: 'Onde ficar em Ubatuba',
        text: 'Se você busca praticidade à noite e restaurantes a pé, fique no Centro/Itaguá. Para contato com a natureza e praias paradisíacas, escolha o Norte (Itamambuca, Ubatumirim). Para estrutura familiar na areia, o Sul (Maranduba, Lázaro) é excelente.',
        stays: STAY_LISTINGS.slice(0, 3),
        ctaLabel: 'Ver todas as hospedagens e serviços',
        onCta: () => onNavigate('explorar'),
      };
    }

    if (presetType === 'routes' || q.includes('roteiro') || q.includes('fim de semana') || q.includes('dias')) {
      return {
        title: 'Sugestão de Roteiro de 3 Dias em Ubatuba',
        text: 'Criamos uma combinação clássica para aproveitar o melhor de Norte a Sul:',
        recommendations: [
          { label: 'Dia 1 · Norte Paradisíaco', tag: 'Ilha das Couves + Praia da Almada ou Prumirim (manhã cedo) e pôr do sol no Itaguá.' },
          { label: 'Dia 2 · Centro & Natureza', tag: 'Praia do Félix + Praia do Alto durante o dia e jantar na Orla do Itaguá / Perequê-Açú.' },
          { label: 'Dia 3 · Sul & Gruta que Chora', tag: 'Praia da Sununga + Lázaro ou travessia até a Praia do Cedro do Sul.' },
        ],
        ctaLabel: 'Escolher praias e montar Meu Roteiro',
        onCta: () => onNavigate('praias'),
      };
    }

    return {
      title: `Dica do Guia Digital para hoje (${tempStr})`,
      text: `${weather?.current?.beachTip || 'Aproveite as praias pela manhã e a gastronomia caiçara à tarde.'} No momento temos ${waveStr}. Que tal começar conhecendo as praias mais bem avaliadas ou os serviços locais?`,
      beaches: BEACHES_DATA.slice(0, 3),
      ctaLabel: 'Explorar guia completo de praias',
      onCta: () => onNavigate('praias'),
    };
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setAssistantReply(generateSmartResponse(query));
  }

  function handleChipClick(chip) {
    setQuery(chip.prompt);
    setAssistantReply(generateSmartResponse(chip.prompt, chip.type));
  }

  return (
    <div className="hero-wrapper">
      <div className="welcome-row">
        <div className="welcome-copy">
          <p className="eyebrow">Ubatuba · Litoral Norte de São Paulo</p>
          <h1 id="inicio-titulo">Encontre o melhor de Ubatuba em um só lugar</h1>
          <p>
            Guia de praias, previsão do tempo e ondas ao vivo, câmeras das estradas, hospedagens,
            vagas de emprego e serviços locais de confiança.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button-secondary"
              onClick={() => onNavigate('praias')}
            >
              Explorar Praias
            </button>
            <button
              type="button"
              className="button-outline-light"
              onClick={() => onScrollToTarget('rf-card')}
            >
              RF Ar Condicionado
            </button>
          </div>
        </div>
        <div className="welcome-image">
          <img
            src="https://ubatubaon.com.br/sites/default/files/20181228_112725_Easy-Resize.com%402x.jpg"
            onError={(e) => {
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1000&q=85';
            }}
            alt="Vista aérea das praias de Ubatuba"
            referrerPolicy="no-referrer"
          />
          <div className="welcome-image-badge">
            <span>UBATUBA COMO VOCÊ NUNCA VIU</span>
          </div>
        </div>
      </div>

      {/* Assistente de Viagem / Planejador inspirado no UbatubaOn */}
      <section className="planner-card" aria-label="Assistente digital de Ubatuba">
        <div className="planner-header">
          <div className="planner-agent-id">
            <span className="planner-avatar" aria-hidden="true">
              <Sparkles size={20} />
            </span>
            <div>
              <strong className="planner-name">Assistente Ubatuba Conecta</strong>
              <span className="planner-role">Guia de praias, clima, roteiros e serviços locais</span>
            </div>
          </div>
          <span className="planner-status">Online agora</span>
        </div>

        <p className="planner-greeting">
          Me conte como quer aproveitar Ubatuba ou o que você precisa hoje — eu indico praias,
          roteiros, hospedagens ou orçamento de climatização.
        </p>

        <form className="planner-form" onSubmit={handleSearchSubmit}>
          <div className="planner-input-wrap">
            <Search size={18} className="planner-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pergunte sobre praias para família, surf, hospedagem, roteiros ou ar-condicionado..."
              aria-label="Pergunte ao assistente de viagem"
            />
          </div>
          <button type="submit" className="button-primary planner-submit">
            Perguntar
          </button>
        </form>

        <div className="planner-chips" role="list" aria-label="Atalhos rápidos">
          {QUICK_PROMPTS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="planner-chip"
              onClick={() => handleChipClick(chip)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {assistantReply && (
          <div className="planner-response" role="region" aria-live="polite">
            <div className="planner-response-head">
              <h3>{assistantReply.title}</h3>
              <button
                type="button"
                className="button-quiet button-sm"
                onClick={() => setAssistantReply(null)}
              >
                Fechar
              </button>
            </div>
            <p>{assistantReply.text}</p>

            {assistantReply.beaches && (
              <div className="planner-mini-grid">
                {assistantReply.beaches.map((beach) => (
                  <div key={beach.id} className="planner-mini-card">
                    <div>
                      <strong>{beach.name}</strong>
                      <span>{beach.regionLabel} · ★ {beach.rating.toFixed(1)}</span>
                      <small>{beach.seaProfile}</small>
                    </div>
                    <button
                      type="button"
                      className="button-secondary button-sm"
                      onClick={() =>
                        onAddToItinerary({
                          id: beach.id,
                          title: beach.name,
                          category: `Praia · ${beach.region}`,
                          location: beach.regionLabel,
                        })
                      }
                    >
                      + Roteiro
                    </button>
                  </div>
                ))}
              </div>
            )}

            {assistantReply.stays && (
              <div className="planner-mini-grid">
                {assistantReply.stays.map((stay) => (
                  <div key={stay.id} className="planner-mini-card">
                    <div>
                      <strong>{stay.title}</strong>
                      <span>{stay.category} · {stay.location}</span>
                      <small>{stay.priceLabel}</small>
                    </div>
                    <button
                      type="button"
                      className="button-secondary button-sm"
                      onClick={() =>
                        onAddToItinerary({
                          id: stay.id,
                          title: stay.title,
                          category: stay.category,
                          location: stay.location,
                        })
                      }
                    >
                      + Roteiro
                    </button>
                  </div>
                ))}
              </div>
            )}

            {assistantReply.recommendations && (
              <div className="planner-mini-grid">
                {assistantReply.recommendations.map((rec, i) => (
                  <div key={i} className="planner-mini-card">
                    <div>
                      <strong>{rec.label}</strong>
                      <span>{rec.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {assistantReply.onCta && (
              <div className="planner-response-footer">
                <button
                  type="button"
                  className="button-primary"
                  onClick={assistantReply.onCta}
                >
                  {assistantReply.ctaLabel} <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
