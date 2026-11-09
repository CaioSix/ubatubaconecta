import React from 'react';
import {
  Sun,
  CloudSun,
  Compass,
  MapPin,
  Briefcase,
  Building2,
  Waves,
  Home,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { usePartnerAuth } from '../context/AuthContext';

export default function Header({
  activeView,
  onNavigate,
  weather,
  itineraryCount,
  onOpenItinerary,
}) {
  const { isSignedIn, partnerSession } = usePartnerAuth();
  const sub = partnerSession?.subscription;
  const hasExpirationAlert = Boolean(isSignedIn && (sub?.expiringSoon || sub?.expired));

  const navItems = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'praias', label: 'Praias', icon: Waves },
    { id: 'cidade', label: 'Ubatuba & Clima', icon: CloudSun },
    { id: 'vagas', label: 'Vagas', icon: Briefcase },
    { id: 'quem-somos', label: 'Quem Somos', icon: Users },
  ];

  return (
    <header className="app-header">
      <div className="topbar">
        <a
          className="brand"
          href="#inicio"
          aria-label="Ubatuba Conecta, início"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('inicio');
          }}
        >
          <img
            className="brand-mark"
            src="Imagens/logo_ubatuba_conecta_transparente.png"
            alt="Logo Ubatuba Conecta"
          />
          <div className="brand-text">
            <strong>Ubatuba Conecta</strong>
            <span>Guia, Clima & Parceiros Locais</span>
          </div>
        </a>

        <nav className="desktop-nav" aria-label="Navegação principal">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-button"
              aria-current={activeView === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="weather-pill"
            onClick={() => onNavigate('cidade')}
            title="Ver previsão do tempo e mar em tempo real"
          >
            {weather?.current ? (
              <>
                <Sun size={16} className="weather-pill-icon" />
                <span>{weather.current.temp}°C</span>
                <span className="weather-pill-divider">·</span>
                <span className="weather-pill-wave">🌊 {weather.marine?.waveHeight || '0.9'}m</span>
              </>
            ) : (
              <>
                <MapPin size={15} />
                <span>Ubatuba, SP</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="itinerary-trigger"
            onClick={onOpenItinerary}
            aria-label={`Meu Roteiro com ${itineraryCount} itens`}
          >
            <Compass size={16} />
            <span>Meu Roteiro</span>
            {itineraryCount > 0 && <strong className="itinerary-count">{itineraryCount}</strong>}
          </button>

          <button
            type="button"
            className={`itinerary-trigger partner-auth-pill ${
              hasExpirationAlert ? 'has-warning' : ''
            }`}
            aria-current={activeView === 'empresas' ? 'page' : undefined}
            onClick={() => onNavigate('empresas')}
            title={
              hasExpirationAlert
                ? sub.alertMessage
                : 'Acessar Área do Parceiro e divulgar sua empresa'
            }
          >
            {hasExpirationAlert ? <AlertTriangle size={16} /> : <Building2 size={16} />}
            <span>Área do Parceiro</span>
            {sub?.expiringSoon && (
              <strong className="partner-exp-badge">{sub.daysRemaining}d</strong>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
