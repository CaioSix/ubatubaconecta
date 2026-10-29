import React, { useState, useMemo } from 'react';
import { Star, MapPin, Waves, Compass, Search, X, Check, ExternalLink } from 'lucide-react';
import { BEACHES_DATA } from '../data/ubatubaData';

const PROFILE_FILTERS = [
  { id: 'todos', label: 'Todos os perfis' },
  { id: 'familia', label: 'Família & Crianças' },
  { id: 'surf', label: 'Surf & Ondas' },
  { id: 'natureza', label: 'Natureza & Preservadas' },
  { id: 'ilha-cachoeira', label: 'Ilhas & Cachoeiras' },
  { id: 'estrutura', label: 'Quiosques & Estrutura' },
];

export default function BeachesSection({
  isCompact = false,
  initialTag = 'todos',
  onViewAllBeaches,
  itineraryItems = [],
  onToggleItinerary,
  weather,
}) {
  const [regionFilter, setRegionFilter] = useState('Todas');
  const [profileFilter, setProfileFilter] = useState(initialTag || 'todos');
  const [sortBy, setSortBy] = useState('rating');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBeach, setSelectedBeach] = useState(null);

  const filteredBeaches = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = BEACHES_DATA.filter((beach) => {
      const matchRegion = regionFilter === 'Todas' || beach.region === regionFilter;
      const matchProfile = profileFilter === 'todos' || beach.tags.includes(profileFilter);
      const matchSearch =
        !q ||
        beach.name.toLowerCase().includes(q) ||
        beach.regionLabel.toLowerCase().includes(q) ||
        beach.shortDesc.toLowerCase().includes(q);
      return matchRegion && matchProfile && matchSearch;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'alpha') return a.name.localeCompare(b.name, 'pt-BR');
      if (sortBy === 'position') return a.positionOrder - b.positionOrder;
      if (sortBy === 'visits') return a.visitsRank - b.visitsRank;
      return b.rating - a.rating;
    });
  }, [regionFilter, profileFilter, sortBy, searchTerm]);

  const displayedBeaches = isCompact ? filteredBeaches.slice(0, 8) : filteredBeaches;

  function isAdded(id) {
    return itineraryItems.some((item) => item.id === id);
  }

  return (
    <section className="beaches-section" aria-labelledby="praias-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow eyebrow-accent">Mais de 100 praias, ilhas e cachoeiras</p>
          <h2 id="praias-heading">Praias de Ubatuba</h2>
          <p>
            Explore de Norte a Sul: condições do mar, balneabilidade, estrutura e adicione suas
            favoritas ao seu roteiro de viagem.
          </p>
        </div>

        <div className="beaches-sort-wrap">
          <label htmlFor="beach-sort-select" className="sr-only">
            Ordenar praias por
          </label>
          <select
            id="beach-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="rating">Ordenar: Melhores Avaliações</option>
            <option value="alpha">Ordenar: Ordem Alfabética</option>
            <option value="position">Ordenar: Norte a Sul</option>
            <option value="visits">Ordenar: Mais Visitadas</option>
          </select>
        </div>
      </div>

      {/* Filtros de região, perfil e busca */}
      <div className="beaches-controls">
        <div className="region-tabs" role="group" aria-label="Filtrar por região de Ubatuba">
          {['Todas', 'Norte', 'Centro', 'Sul'].map((reg) => (
            <button
              key={reg}
              type="button"
              className="filter-button"
              aria-pressed={regionFilter === reg}
              onClick={() => setRegionFilter(reg)}
            >
              {reg === 'Todas' ? 'Todas as regiões' : `Região ${reg}`}
            </button>
          ))}
        </div>

        {!isCompact && (
          <div className="beaches-extra-filters">
            <div className="profile-chips">
              {PROFILE_FILTERS.map((pf) => (
                <button
                  key={pf.id}
                  type="button"
                  className={`chip-button ${profileFilter === pf.id ? 'active' : ''}`}
                  onClick={() => setProfileFilter(pf.id)}
                >
                  {pf.label}
                </button>
              ))}
            </div>
            <div className="beach-search-box">
              <Search size={16} />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar praia, ilha ou região..."
                aria-label="Buscar praia pelo nome"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid de Praias estilo UbatubaOn */}
      <div className="beaches-grid">
        {displayedBeaches.map((beach) => {
          const added = isAdded(beach.id);
          return (
            <article key={beach.id} className="beach-card">
              <div
                className="beach-card-media"
                onClick={() => setSelectedBeach(beach)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedBeach(beach);
                }}
              >
                <img
                  src={beach.image}
                  alt={beach.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = beach.fallbackImage;
                  }}
                />
                <div className="beach-card-badges">
                  <span className="beach-rating-badge">
                    <Star size={12} fill="currentColor" /> {beach.rating.toFixed(1)}
                  </span>
                  <span className="beach-balneabilidade-badge">{beach.balneabilidade}</span>
                </div>
                <div className="beach-card-overlay">
                  <span className="beach-region-pill">{beach.regionLabel}</span>
                  <h3>{beach.name}</h3>
                  <p className="beach-sea-profile">{beach.seaProfile}</p>
                </div>
              </div>

              <div className="beach-card-body">
                <p>{beach.shortDesc}</p>
                <div className="beach-card-actions">
                  <button
                    type="button"
                    className="button-quiet button-sm"
                    onClick={() => setSelectedBeach(beach)}
                  >
                    Ver guia da praia
                  </button>
                  <button
                    type="button"
                    className={added ? 'button-secondary button-sm' : 'button-primary button-sm'}
                    onClick={() =>
                      onToggleItinerary({
                        id: beach.id,
                        title: beach.name,
                        category: `Praia · ${beach.region}`,
                        location: beach.regionLabel,
                      })
                    }
                  >
                    {added ? (
                      <>
                        <Check size={14} /> No Roteiro
                      </>
                    ) : (
                      '+ Roteiro'
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {isCompact && onViewAllBeaches && (
        <div className="section-more-row">
          <button type="button" className="button-primary" onClick={onViewAllBeaches}>
            Ver todas as praias, ilhas e filtros ({BEACHES_DATA.length} destinos)
          </button>
        </div>
      )}

      {/* Modal de Detalhes da Praia */}
      {selectedBeach && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedBeach(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-beach-title"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-media">
              <img
                src={selectedBeach.image}
                onError={(e) => {
                  e.currentTarget.src = selectedBeach.fallbackImage;
                }}
                alt={selectedBeach.name}
              />
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedBeach(null)}
                aria-label="Fechar detalhes da praia"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-tags-row">
                <span className="status-tag">{selectedBeach.regionLabel}</span>
                <span className="status-tag">★ {selectedBeach.rating.toFixed(1)}</span>
                <span className="status-tag">Balneabilidade: {selectedBeach.balneabilidade} (CETESB)</span>
              </div>
              <h2 id="modal-beach-title">{selectedBeach.name}</h2>
              <p className="modal-subtitle">{selectedBeach.seaProfile}</p>
              <p className="modal-description">{selectedBeach.details}</p>

              <div className="modal-info-grid">
                <div className="modal-info-box">
                  <strong>Estrutura local</strong>
                  <p>{selectedBeach.infrastructure}</p>
                </div>
                <div className="modal-info-box">
                  <strong>Como chegar / Acesso</strong>
                  <p>{selectedBeach.access}</p>
                </div>
                {weather?.marine && (
                  <div className="modal-info-box">
                    <strong>Condição marítima hoje em Ubatuba</strong>
                    <p>
                      Ondas médias de {weather.marine.waveHeight}m ({weather.marine.waveDir}), período de{' '}
                      {weather.marine.wavePeriod}s e temperatura da água em {weather.marine.waterTemp}°C.
                    </p>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-primary"
                  onClick={() =>
                    onToggleItinerary({
                      id: selectedBeach.id,
                      title: selectedBeach.name,
                      category: `Praia · ${selectedBeach.region}`,
                      location: selectedBeach.regionLabel,
                    })
                  }
                >
                  {isAdded(selectedBeach.id) ? 'Remover do Meu Roteiro' : 'Adicionar ao Meu Roteiro'}
                </button>
                <a
                  className="button-secondary"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${selectedBeach.name} Ubatuba SP`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir no Google Maps <ExternalLink size={15} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
