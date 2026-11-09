import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import Header from './components/Header';
import HeroPlanner from './components/HeroPlanner';
import CityStatusSection from './components/CityStatusSection';
import BeachesSection from './components/BeachesSection';
import ExploreDirectorySection from './components/ExploreDirectorySection';
import CityView from './components/CityView';
import JobsView from './components/JobsView';
import BusinessesView from './components/BusinessesView';
import AboutView from './components/AboutView';
import ItineraryModal from './components/ItineraryModal';
import Footer from './components/Footer';
import MobileNav from './components/MobileNav';
import { fetchUbatubaWeatherAndMarine } from './services/weatherApi';
import { fetchPublicPartners } from './services/partnerApi';
import { fetchUbatubaNews } from './services/newsApi';
import { usePartnerAuth } from './context/AuthContext';

const ITINERARY_STORAGE_KEY = 'ubatuba-conecta-roteiro-v1';

export default function App() {
  const [activeView, setActiveView] = useState('inicio');
  const [beachInitialTag, setBeachInitialTag] = useState('todos');

  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');

  const [liveNews, setLiveNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const [publicPartners, setPublicPartners] = useState([]);
  const { isSignedIn, partnerSession } = usePartnerAuth();
  const sub = partnerSession?.subscription;

  const [itineraryItems, setItineraryItems] = useState(() => {
    try {
      const saved = window.localStorage.getItem(ITINERARY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError('');
    try {
      const data = await fetchUbatubaWeatherAndMarine();
      setWeather(data);
    } catch (err) {
      setWeatherError(err?.message || 'Não foi possível atualizar o clima agora.');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const loadPublicPartners = useCallback(async () => {
    try {
      const list = await fetchPublicPartners();
      setPublicPartners(Array.isArray(list) ? list : []);
    } catch {
      setPublicPartners([]);
    }
  }, []);

  const loadNews = useCallback(async (forceRefresh = false) => {
    setNewsLoading(true);
    try {
      const items = await fetchUbatubaNews({ forceRefresh });
      setLiveNews(items);
    } catch {
      setLiveNews([]);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
    loadPublicPartners();
    loadNews();
  }, [loadWeather, loadPublicPartners, loadNews]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ITINERARY_STORAGE_KEY, JSON.stringify(itineraryItems));
    } catch {
      // ignore storage errors
    }
  }, [itineraryItems]);

  function handleNavigate(viewName, options = {}) {
    if (options.tag) {
      setBeachInitialTag(options.tag);
    } else if (viewName === 'praias') {
      setBeachInitialTag('todos');
    }
    setActiveView(viewName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleScrollToTarget(elementId) {
    if (activeView !== 'inicio') {
      setActiveView('inicio');
      setTimeout(() => {
        document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleToggleItinerary(item) {
    setItineraryItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      }
      return [...prev, { ...item, note: '' }];
    });
  }

  function handleAddToItinerary(item) {
    setItineraryItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, { ...item, note: '' }];
    });
    setItineraryModalOpen(true);
  }

  function handleRemoveItineraryItem(id) {
    setItineraryItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleUpdateItineraryNote(id, note) {
    setItineraryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note } : item))
    );
  }

  return (
    <div className="app-shell">
      <Header
        activeView={activeView}
        onNavigate={handleNavigate}
        weather={weather}
        itineraryCount={itineraryItems.length}
        onOpenItinerary={() => setItineraryModalOpen(true)}
      />

      {/* Alerta Global de Vencimento em <= 3 Dias vinculado ao Login do Parceiro */}
      {isSignedIn && sub && (sub.expiringSoon || sub.expired) && activeView !== 'empresas' && (
        <div className="global-expiration-bar" role="alert">
          <div className="global-expiration-inner">
            <AlertTriangle size={18} />
            <span>
              {sub.alertMessage ||
                `Atenção parceiro: sua assinatura vence em ${sub.daysRemaining} dia(s).`}
            </span>
            <button
              type="button"
              className="button-secondary button-sm"
              onClick={() => handleNavigate('empresas')}
            >
              Ver assinatura / Renovar
            </button>
          </div>
        </div>
      )}

      <main>
        {activeView === 'inicio' && (
          <section id="view-inicio" className="app-view active" aria-labelledby="inicio-titulo">
            <HeroPlanner
              onNavigate={handleNavigate}
              onScrollToTarget={handleScrollToTarget}
              weather={weather}
              onAddToItinerary={handleAddToItinerary}
            />

            <div className="section-heading">
              <div>
                <h2>O que você precisa hoje?</h2>
                <p>Acesso rápido às praias, clima ao vivo, parceiros locais e informações úteis.</p>
              </div>
            </div>

            <div className="shortcut-grid">
              <button
                type="button"
                className="shortcut"
                onClick={() => handleNavigate('empresas')}
              >
                <span className="shortcut-icon" aria-hidden="true">
                  ★
                </span>
                <strong>
                  Seja um Parceiro
                  <br />
                  <small style={{ fontWeight: 600, opacity: 0.85 }}>(Divulgue sua Empresa)</small>
                </strong>
              </button>
              <button
                type="button"
                className="shortcut"
                onClick={() => handleNavigate('praias')}
              >
                <span className="shortcut-icon" aria-hidden="true">
                  🌊
                </span>
                <strong>Praias, Ilhas e Cachoeiras</strong>
              </button>
              <button
                type="button"
                className="shortcut"
                onClick={() => handleNavigate('cidade')}
              >
                <span className="shortcut-icon" aria-hidden="true">
                  ☀️
                </span>
                <strong>Previsão do Tempo e Câmeras</strong>
              </button>
              <button
                type="button"
                className="shortcut"
                onClick={() => handleNavigate('vagas')}
              >
                <span className="shortcut-icon" aria-hidden="true">
                  ↗
                </span>
                <strong>Vagas de Emprego</strong>
              </button>
            </div>

            {/* Painel Situação Atual em Ubatuba (Clima, Ondas, Câmeras, Notícias Dinâmicas, Emergência) */}
            <CityStatusSection
              weather={weather}
              weatherLoading={weatherLoading}
              weatherError={weatherError}
              onRefreshWeather={() => {
                loadWeather();
                loadNews(true);
              }}
              liveNews={liveNews}
              newsLoading={newsLoading}
              onNavigate={handleNavigate}
            />

            {/* Guia de Praias em Destaque */}
            <BeachesSection
              isCompact={true}
              onViewAllBeaches={() => handleNavigate('praias')}
              itineraryItems={itineraryItems}
              onToggleItinerary={handleToggleItinerary}
              weather={weather}
            />

            {/* Parceiros em Destaque e Artigos / Guia Local */}
            <ExploreDirectorySection
              itineraryItems={itineraryItems}
              onToggleItinerary={handleToggleItinerary}
              onNavigate={handleNavigate}
              publicPartners={publicPartners}
            />
          </section>
        )}

        {activeView === 'praias' && (
          <section id="view-praias" className="app-view active" aria-labelledby="praias-heading">
            <BeachesSection
              isCompact={false}
              initialTag={beachInitialTag}
              itineraryItems={itineraryItems}
              onToggleItinerary={handleToggleItinerary}
              weather={weather}
            />
          </section>
        )}

        {activeView === 'cidade' && (
          <CityView
            weather={weather}
            weatherLoading={weatherLoading}
            weatherError={weatherError}
            onRefreshWeather={() => {
              loadWeather();
              loadNews(true);
            }}
            liveNews={liveNews}
            newsLoading={newsLoading}
            onNavigate={handleNavigate}
          />
        )}

        {activeView === 'vagas' && <JobsView />}

        {activeView === 'empresas' && (
          <BusinessesView
            publicPartners={publicPartners}
            onPartnersUpdated={loadPublicPartners}
          />
        )}

        {activeView === 'quem-somos' && (
          <section id="view-quem-somos" className="app-view active" aria-label="Quem Somos">
            <AboutView onNavigate={handleNavigate} />
          </section>
        )}
      </main>

      <ItineraryModal
        isOpen={itineraryModalOpen}
        onClose={() => setItineraryModalOpen(false)}
        items={itineraryItems}
        onRemoveItem={handleRemoveItineraryItem}
        onUpdateNote={handleUpdateItineraryNote}
        onClearAll={() => setItineraryItems([])}
        onExploreBeaches={() => handleNavigate('praias')}
      />

      <Footer onNavigate={handleNavigate} />

      <MobileNav activeView={activeView} onNavigate={handleNavigate} />
    </div>
  );
}
