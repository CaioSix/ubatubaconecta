import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  CloudSun,
  CloudRain,
  Wind,
  Droplets,
  Waves,
  Thermometer,
  Calendar,
  PhoneCall,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import LiveTrafficCamera from './LiveTrafficCamera';
import { EMERGENCY_PHONES, UPCOMING_EVENTS, METEORED_WIDGET } from '../data/ubatubaData';

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatShortDay(dateStr, idx) {
  if (idx === 0) return 'Hoje';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12);
    return `${WEEKDAYS_PT[d.getDay()]} ${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

export default function CityStatusSection({
  weather,
  weatherLoading,
  weatherError,
  onRefreshWeather,
  onNavigate,
}) {
  const [showMeteoredWidget, setShowMeteoredWidget] = useState(false);
  const widgetContainerRef = useRef(null);

  useEffect(() => {
    if (!showMeteoredWidget || !widgetContainerRef.current) return;
    const existingScript = document.querySelector(`script[src="${METEORED_WIDGET.loaderUrl}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = METEORED_WIDGET.loaderUrl;
      script.async = true;
      document.body.appendChild(script);
    }
  }, [showMeteoredWidget]);

  return (
    <section className="city-status-section" aria-labelledby="city-status-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow eyebrow-accent">Monitoramento em Tempo Real</p>
          <h2 id="city-status-heading">Situação atual em Ubatuba</h2>
          <p>Previsão do tempo e mar ao vivo (Open-Meteo), câmeras das estradas, eventos e emergências.</p>
        </div>
        <button
          type="button"
          className="button-quiet button-sm"
          onClick={onRefreshWeather}
          disabled={weatherLoading}
        >
          <RefreshCw size={14} className={weatherLoading ? 'spin' : ''} /> Atualizar dados
        </button>
      </div>

      <div className="status-grid">
        {/* Card 1: Previsão do Tempo & Condição do Mar (API Open-Meteo + Widget Meteored) */}
        <article className="status-card status-card-weather">
          <div className="status-card-head">
            <div>
              <span className="status-tag">Clima & Mar Ao Vivo</span>
              <h3>Previsão do Tempo</h3>
            </div>
            {weather?.updatedAt && (
              <span className="traffic-stamp">Atualizado às {weather.updatedAt}</span>
            )}
          </div>

          {weatherLoading && !weather ? (
            <div className="weather-loading">Carregando dados meteorológicos de Ubatuba...</div>
          ) : weatherError && !weather ? (
            <div className="weather-error">
              <p>{weatherError}</p>
              <button type="button" className="button-secondary button-sm" onClick={onRefreshWeather}>
                Tentar novamente
              </button>
            </div>
          ) : weather ? (
            <>
              <div className="weather-main-box">
                <div className="weather-temp-big">
                  <strong>{weather.current.temp}°C</strong>
                  <span>Sensação {weather.current.feelsLike}°C</span>
                </div>
                <div className="weather-condition-summary">
                  <strong>{weather.current.conditionLabel}</strong>
                  <p>{weather.current.beachTip}</p>
                </div>
              </div>

              <div className="weather-metrics-grid">
                <div className="weather-metric">
                  <span><Droplets size={14} /> Umidade</span>
                  <strong>{weather.current.humidity}%</strong>
                </div>
                <div className="weather-metric">
                  <span><Wind size={14} /> Vento</span>
                  <strong>{weather.current.windSpeed} km/h ({weather.current.windDir})</strong>
                </div>
                <div className="weather-metric">
                  <span><Sun size={14} /> Índice UV</span>
                  <strong>{weather.current.uvIndex}</strong>
                </div>
                <div className="weather-metric">
                  <span><Waves size={14} /> Ondas / Água</span>
                  <strong>{weather.marine.waveHeight}m · {weather.marine.waterTemp}°C</strong>
                </div>
              </div>

              {weather.daily && weather.daily.length > 0 && (
                <div className="weather-forecast-strip" aria-label="Previsão para os próximos dias">
                  {weather.daily.slice(0, 5).map((day, idx) => (
                    <div key={day.date} className="forecast-day-item">
                      <span className="forecast-day-name">{formatShortDay(day.date, idx)}</span>
                      <strong className="forecast-day-temps">
                        {day.tempMax}° <small>{day.tempMin}°</small>
                      </strong>
                      <span className="forecast-day-rain">💧 {day.rainProb}%</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {showMeteoredWidget && (
            <div className="meteored-widget-box" ref={widgetContainerRef}>
              <div id={METEORED_WIDGET.widgetId} className="meteored-frame-host" />
            </div>
          )}

          <div className="status-card-footer">
            <button
              type="button"
              className="button-quiet button-sm"
              onClick={() => setShowMeteoredWidget((v) => !v)}
            >
              {showMeteoredWidget ? 'Ocultar widget Tempo.com' : 'Ver widget Tempo.com (Meteored)'}
            </button>
            <span className="api-credit">API: Open-Meteo & Marine</span>
          </div>
        </article>

        {/* Card 2: Trânsito e Câmeras Ao Vivo */}
        <LiveTrafficCamera />

        {/* Card 3: Próximos Eventos e Agenda */}
        <article className="status-card status-card-events">
          <div className="status-card-head">
            <div>
              <span className="status-tag">Agenda Cultural</span>
              <h3>Próximos Eventos</h3>
            </div>
            <Calendar size={18} className="muted-icon" />
          </div>

          <ul className="events-mini-list">
            {UPCOMING_EVENTS.map((evt) => (
              <li key={evt.id} className="event-mini-item">
                <span className="event-mini-badge">{evt.category}</span>
                <strong>{evt.title}</strong>
                <span>{evt.date}</span>
                <small>📍 {evt.location}</small>
              </li>
            ))}
          </ul>

          <div className="status-card-footer">
            <button
              type="button"
              className="button-secondary button-sm"
              onClick={() => onNavigate('cidade')}
            >
              Ver agenda e notícias de Ubatuba
            </button>
          </div>
        </article>

        {/* Card 4: Emergência e Telefones Úteis */}
        <article className="status-card status-card-phones">
          <div className="status-card-head">
            <div>
              <span className="status-tag status-tag-alert">Utilidade Pública</span>
              <h3>Emergência e Apoio</h3>
            </div>
            <PhoneCall size={18} className="muted-icon" />
          </div>

          <ul className="emergency-list">
            {EMERGENCY_PHONES.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="emergency-link">
                  <div>
                    <span className="emergency-label">{item.label}</span>
                    <small className="emergency-badge">{item.badge}</small>
                  </div>
                  <strong className="emergency-number">{item.number}</strong>
                </a>
              </li>
            ))}
          </ul>
          <p className="source-line">Toque no número para ligar imediatamente do seu celular.</p>
        </article>
      </div>
    </section>
  );
}
