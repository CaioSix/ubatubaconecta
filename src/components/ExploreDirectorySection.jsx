import React, { useState } from 'react';
import { Check, MapPin, BookOpen, X, ArrowRight, Building2 } from 'lucide-react';
import { STAY_LISTINGS, SERVICES_LISTINGS, LOCAL_ARTICLES } from '../data/ubatubaData';

const STAY_TYPES = ['Todos', 'Hotel', 'Pousada', 'Chalé', 'Casa'];
const SERVICE_CATEGORIES = [
  'Todos',
  'Climatização & Manutenção',
  'Restaurantes',
  'Água e Gás (úteis)',
  'Agências de Turismo',
];

export default function ExploreDirectorySection({
  itineraryItems = [],
  onToggleItinerary,
  onNavigate,
  onScrollToTarget,
}) {
  const [staySearch, setStaySearch] = useState('');
  const [stayCategory, setStayCategory] = useState('Todos');
  const [stayRegion, setStayRegion] = useState('Todas');

  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategory, setServiceCategory] = useState('Todos');

  const [activeArticle, setActiveArticle] = useState(null);

  const filteredStays = STAY_LISTINGS.filter((item) => {
    const matchType = stayCategory === 'Todos' || item.category === stayCategory;
    const matchRegion = stayRegion === 'Todas' || item.region === stayRegion;
    const matchSearch =
      !staySearch.trim() ||
      item.title.toLowerCase().includes(staySearch.toLowerCase()) ||
      item.location.toLowerCase().includes(staySearch.toLowerCase());
    return matchType && matchRegion && matchSearch;
  });

  const filteredServices = SERVICES_LISTINGS.filter((item) => {
    const matchCat = serviceCategory === 'Todos' || item.category === serviceCategory;
    const matchSearch =
      !serviceSearch.trim() ||
      item.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(serviceSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  function isAdded(id) {
    return itineraryItems.some((i) => i.id === id);
  }

  return (
    <div className="explore-directory-wrapper">
      {/* Seção 1: Onde Ficar em Ubatuba */}
      <section className="directory-block" aria-labelledby="stay-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-accent">Hospedagem no Litoral</p>
            <h2 id="stay-heading">Onde ficar em Ubatuba</h2>
            <p>Hotéis, pousadas, chalés e casas de temporada por região.</p>
          </div>
          <button
            type="button"
            className="button-quiet button-sm"
            onClick={() => onNavigate('empresas')}
          >
            Anunciar hospedagem
          </button>
        </div>

        <div className="directory-filters">
          <input
            type="search"
            value={staySearch}
            onChange={(e) => setStaySearch(e.target.value)}
            placeholder="Buscar hospedagem ou praia..."
            aria-label="Buscar hospedagem"
          />
          <select
            value={stayRegion}
            onChange={(e) => setStayRegion(e.target.value)}
            aria-label="Filtrar hospedagem por região"
          >
            <option value="Todas">Todas as regiões</option>
            <option value="Norte">Norte de Ubatuba</option>
            <option value="Centro">Centro / Itaguá</option>
            <option value="Sul">Sul de Ubatuba</option>
          </select>
          <div className="chip-group">
            {STAY_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip-button ${stayCategory === t ? 'active' : ''}`}
                onClick={() => setStayCategory(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="listing-cards-grid">
          {filteredStays.map((stay) => {
            const added = isAdded(stay.id);
            return (
              <article key={stay.id} className="uo-card">
                <div className="uo-card-media">
                  <img
                    src={stay.image}
                    alt={stay.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = stay.fallbackImage;
                    }}
                  />
                  <span className="uo-card-badge">{stay.badge}</span>
                </div>
                <div className="uo-card-body">
                  <div className="uo-card-topline">
                    <span className="status-tag">{stay.category}</span>
                    <button
                      type="button"
                      className={`chip-button ${added ? 'active' : ''}`}
                      onClick={() =>
                        onToggleItinerary({
                          id: stay.id,
                          title: stay.title,
                          category: `Hospedagem · ${stay.category}`,
                          location: stay.location,
                        })
                      }
                    >
                      {added ? (
                        <>
                          <Check size={13} /> No Roteiro
                        </>
                      ) : (
                        '+ Roteiro'
                      )}
                    </button>
                  </div>
                  <h3>{stay.title}</h3>
                  <p className="uo-card-location">
                    <MapPin size={14} /> {stay.location}
                  </p>
                  <ul className="uo-card-highlights">
                    {stay.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                  <div className="uo-card-footer">
                    <strong>{stay.priceLabel}</strong>
                    <button
                      type="button"
                      className="button-secondary button-sm"
                      onClick={() =>
                        onToggleItinerary({
                          id: stay.id,
                          title: stay.title,
                          category: `Hospedagem · ${stay.category}`,
                          location: stay.location,
                        })
                      }
                    >
                      {added ? 'Salvo no roteiro' : 'Salvar opção'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Seção 2: O que Fazer e Serviços Locais */}
      <section className="directory-block" aria-labelledby="services-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-accent">Passeios, Gastronomia e Utilidades</p>
            <h2 id="services-heading">O que fazer e Serviços em Ubatuba</h2>
            <p>Empresas parceiras, passeios de barco, restaurantes e serviços essenciais.</p>
          </div>
        </div>

        <div className="directory-filters">
          <input
            type="search"
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder="Buscar serviço, passeio ou restaurante..."
            aria-label="Buscar serviço"
          />
          <div className="chip-group">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip-button ${serviceCategory === cat ? 'active' : ''}`}
                onClick={() => setServiceCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="listing-cards-grid">
          {filteredServices.map((srv) => {
            const added = isAdded(srv.id);
            return (
              <article
                key={srv.id}
                className={`uo-card ${srv.isPartnerFeatured ? 'uo-card-featured' : ''}`}
              >
                <div className="uo-card-media">
                  <img
                    src={srv.image}
                    alt={srv.title}
                    loading="lazy"
                    onError={(e) => {
                      if (srv.fallbackImage) e.currentTarget.src = srv.fallbackImage;
                    }}
                  />
                  <span className="uo-card-badge">{srv.badge}</span>
                </div>
                <div className="uo-card-body">
                  <div className="uo-card-topline">
                    <span className="status-tag">{srv.category}</span>
                    <button
                      type="button"
                      className={`chip-button ${added ? 'active' : ''}`}
                      onClick={() =>
                        onToggleItinerary({
                          id: srv.id,
                          title: srv.title,
                          category: srv.category,
                          location: srv.location,
                        })
                      }
                    >
                      {added ? '✓ No Roteiro' : '+ Roteiro'}
                    </button>
                  </div>
                  <h3>{srv.title}</h3>
                  <p className="uo-card-location">
                    <MapPin size={14} /> {srv.location}
                  </p>
                  <p className="uo-card-desc">{srv.description}</p>
                  <div className="uo-card-footer">
                    {srv.scrollTarget ? (
                      <button
                        type="button"
                        className="button-primary button-sm"
                        onClick={() => onScrollToTarget(srv.scrollTarget)}
                      >
                        {srv.actionLabel}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button-secondary button-sm"
                        onClick={() =>
                          onToggleItinerary({
                            id: srv.id,
                            title: srv.title,
                            category: srv.category,
                            location: srv.location,
                          })
                        }
                      >
                        {added ? 'Salvo no Roteiro' : 'Adicionar ao Roteiro'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Seção 3: Saiba mais sobre Ubatuba (Guia Local: Trilha 7 Praias, Zona Azul, Free Flow, TPA) */}
      <section className="directory-block" aria-labelledby="articles-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-accent">Dicas e Regras Oficiais</p>
            <h2 id="articles-heading">Saiba mais sobre Ubatuba</h2>
            <p>
              Informações úteis sobre Zona Azul, Taxa Ambiental (TPA), Pedágio Free Flow Tamoios e
              roteiros de trilhas.
            </p>
          </div>
        </div>

        <div className="articles-grid">
          {LOCAL_ARTICLES.map((art) => (
            <article key={art.id} className="article-card" onClick={() => setActiveArticle(art)}>
              <div className="article-card-media">
                <img
                  src={art.image}
                  alt={art.title}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = art.fallbackImage;
                  }}
                />
                <span className="article-category-badge">{art.category}</span>
              </div>
              <div className="article-card-body">
                <h3>{art.title}</h3>
                <p>{art.excerpt}</p>
                <span className="article-read-more">
                  <BookOpen size={15} /> Ler guia completo <ArrowRight size={14} />
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Chamada para Anunciantes inspirada no UbatubaOn + Ubatuba Conecta */}
      <section className="business-cta-banner" aria-label="Divulgue sua empresa em Ubatuba">
        <div>
          <p className="eyebrow">Vitrine Comercial de Ubatuba</p>
          <h2>Sua empresa atende turistas ou moradores de Ubatuba?</h2>
          <p>
            Divulgue seu negócio no <strong>Ubatuba Conecta</strong> e receba clientes diretamente
            pelo WhatsApp com planos a partir de R$ 19,99.
          </p>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button-secondary"
            onClick={() => onNavigate('empresas')}
          >
            <Building2 size={16} /> Cadastrar estabelecimento
          </button>
          <button
            type="button"
            className="button-outline-light"
            onClick={() => onNavigate('vagas')}
          >
            Divulgar vaga de emprego grátis
          </button>
        </div>
      </section>

      {/* Modal de Leitura do Artigo / Guia */}
      {activeArticle && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveArticle(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-article-title"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-media">
              <img
                src={activeArticle.image}
                onError={(e) => {
                  e.currentTarget.src = activeArticle.fallbackImage;
                }}
                alt={activeArticle.title}
              />
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveArticle(null)}
                aria-label="Fechar artigo"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-tags-row">
                <span className="status-tag">{activeArticle.category}</span>
                <span className="status-tag">Atualizado: {activeArticle.updatedAt}</span>
              </div>
              <h2 id="modal-article-title">{activeArticle.title}</h2>
              {activeArticle.fullText.map((paragraph, index) => (
                <p key={index} className="modal-description">
                  {paragraph}
                </p>
              ))}
              <p className="source-line">Fonte: {activeArticle.source}</p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => setActiveArticle(null)}
                >
                  Entendi, voltar ao guia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
