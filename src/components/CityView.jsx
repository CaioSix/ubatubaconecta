import React, { useState } from 'react';
import CityStatusSection from './CityStatusSection';

const CITY_FILTERS = [
  { id: 'todos', label: 'Tudo' },
  { id: 'tempo', label: 'Tempo e praias' },
  { id: 'servicos', label: 'Serviços & Mobilidade' },
  { id: 'agenda', label: 'Notícias e agenda' },
  { id: 'trabalho', label: 'Empregos' },
  { id: 'turismo', label: 'Turismo' },
];

export default function CityView({
  weather,
  weatherLoading,
  weatherError,
  onRefreshWeather,
  onNavigate,
}) {
  const [activeFilter, setActiveFilter] = useState('todos');

  function shouldShow(category) {
    return activeFilter === 'todos' || activeFilter === category;
  }

  return (
    <section id="view-cidade" className="app-view active" aria-labelledby="cidade-titulo">
      <p className="eyebrow eyebrow-accent">Informação local e monitoramento</p>
      <h1 className="page-title" id="cidade-titulo">
        Tudo o que acontece em Ubatuba
      </h1>
      <p className="page-intro">
        Previsão do tempo e mar em tempo real, câmeras ao vivo das rodovias (DER-SP), praias,
        mobilidade, notícias e agenda. Informações de segurança e serviço mostram a fonte e o
        horário da última atualização.
      </p>

      {/* Painel Ao Vivo: Clima, Câmeras, Agenda e Emergência */}
      <CityStatusSection
        weather={weather}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        onRefreshWeather={onRefreshWeather}
        onNavigate={onNavigate}
      />

      {/* Previsão Completa de 7 Dias + Ondas */}
      {weather?.daily && (
        <section className="panel" aria-labelledby="forecast-7d-title">
          <div className="section-heading" style={{ marginTop: 0 }}>
            <div>
              <h2 id="forecast-7d-title">Previsão de 7 dias e Condição das Ondas</h2>
              <p>Dados meteorológicos e oceânicos atualizados via Open-Meteo para Ubatuba, SP.</p>
            </div>
            <span className="status-tag">Latitude -23.43 · Longitude -45.08</span>
          </div>

          <div className="forecast-7d-grid">
            {weather.daily.map((d, idx) => (
              <div key={d.date} className="forecast-7d-card">
                <span className="forecast-7d-date">
                  {idx === 0
                    ? 'Hoje'
                    : new Date(`${d.date}T12:00:00`).toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                </span>
                <strong className="forecast-7d-condition">{d.label}</strong>
                <div className="forecast-7d-temps">
                  <span className="temp-max">Máx: {d.tempMax}°C</span>
                  <span className="temp-min">Mín: {d.tempMin}°C</span>
                </div>
                <div className="forecast-7d-meta">
                  <span>💧 Chuva: {d.rainProb}%</span>
                  <span>☀️ UV máx: {d.uvMax}</span>
                  {d.waveMax !== null && <span>🌊 Ondas até {Number(d.waveMax).toFixed(1)}m</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Barra de filtros das editorias da cidade */}
      <div className="city-toolbar" role="group" aria-label="Filtrar informações">
        {CITY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="filter-button"
            aria-pressed={activeFilter === f.id}
            onClick={() => setActiveFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="city-grid">
        {shouldShow('tempo') && (
          <article className="city-card" data-category="tempo">
            <span className="status-tag">Previsão do tempo</span>
            <h2>Monitoramento Meteorológico Ativo</h2>
            <p>
              {weather?.current
                ? `Agora em Ubatuba: ${weather.current.temp}°C (${weather.current.conditionLabel}), umidade em ${weather.current.humidity}% e vento de ${weather.current.windSpeed} km/h (${weather.current.windDir}).`
                : 'Consulte no painel acima a temperatura atual, índice UV, vento e previsão para 7 dias.'}
            </p>
            <p className="source-line">
              Fonte em tempo real: Open-Meteo API & Widget Tempo.com (Meteored).
            </p>
          </article>
        )}

        {shouldShow('tempo') && (
          <article className="city-card" data-category="tempo">
            <span className="status-tag">Balneabilidade e Mar</span>
            <h2>Condição das praias</h2>
            <p>
              Confira o guia de praias de Norte a Sul com perfil de ondas, estrutura e indicação de
              balneabilidade. Ondas hoje: {weather?.marine?.waveHeight || '0.9'}m · Água:{' '}
              {weather?.marine?.waterTemp || '23'}°C.
            </p>
            <button
              className="button-secondary button-sm"
              type="button"
              onClick={() => onNavigate('praias')}
            >
              Abrir guia de praias
            </button>
            <p className="source-line">
              Referência: Boletins da CETESB e Open-Meteo Marine API.
            </p>
          </article>
        )}

        {shouldShow('servicos') && (
          <article className="city-card" data-category="servicos">
            <span className="status-tag">Mobilidade</span>
            <h2>Zona Azul, TPA e Pedágio Free Flow</h2>
            <p>
              Consulte áreas de estacionamento rotativo nas praias e no Centro, funcionamento da
              Taxa de Preservação Ambiental (TPA) e pagamento do pedágio sem cancela na Tamoios.
            </p>
            <button
              className="button-secondary button-sm"
              type="button"
              onClick={() => onNavigate('explorar')}
            >
              Ler guias de mobilidade
            </button>
            <p className="source-line">
              Informações oficiais da Prefeitura de Ubatuba, Eco Ubatuba e Concessionária Tamoios.
            </p>
          </article>
        )}

        {shouldShow('agenda') && (
          <article className="city-card" data-category="agenda">
            <span className="status-tag">Notícias</span>
            <h2>A cidade em pauta</h2>
            <p>
              Acompanhe comunicados da Defesa Civil (SMS 40199), condições das serras Oswaldo Cruz
              (SP-125) e Tamoios/Rio-Santos (BR-101) e novidades para moradores e turistas.
            </p>
            <p className="source-line">Atualização editorial com fonte identificada</p>
          </article>
        )}

        {shouldShow('agenda') && (
          <article className="city-card" data-category="agenda">
            <span className="status-tag">Agenda</span>
            <h2>O que vai acontecer</h2>
            <p>
              Feira de Artesanato na Avenida Iperoig, Circuito de Surf em Itamambuca e Praia Grande,
              além de passeios ecológicos no Parque Estadual da Serra do Mar.
            </p>
            <p className="source-line">Cada evento informa local e horário no painel da cidade</p>
          </article>
        )}

        {shouldShow('trabalho') && (
          <article className="city-card" data-category="trabalho">
            <span className="status-tag">Empregos</span>
            <h2>Oportunidades de trabalho</h2>
            <p>
              Encontre vagas divulgadas por empresas de Ubatuba. Cada anúncio fica disponível por
              até 7 dias após a publicação.
            </p>
            <button
              className="button-primary"
              type="button"
              onClick={() => onNavigate('vagas')}
            >
              Ver vagas de emprego
            </button>
            <p className="source-line">Vagas revisadas antes da publicação</p>
          </article>
        )}

        {shouldShow('turismo') && (
          <article className="city-card" data-category="turismo">
            <span className="status-tag">Turismo</span>
            <h2>Explore Ubatuba e monte seu Roteiro</h2>
            <p>
              Praias, ilhas (Ilha das Couves, Ilha Anchieta, Prumirim), trilhas (7 Praias),
              cachoeiras, passeios e roteiros personalizados para conhecer a cidade.
            </p>
            <button
              className="button-primary"
              type="button"
              onClick={() => onNavigate('praias')}
            >
              Explorar praias e ilhas
            </button>
            <p className="source-line">
              Informações de acesso, segurança e condições indicam fonte e data
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
