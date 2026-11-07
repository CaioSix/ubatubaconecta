import React, { useState } from 'react';
import { MapPin, BookOpen, X, ArrowRight, MessageCircle, Sparkles } from 'lucide-react';
import { LOCAL_ARTICLES } from '../data/ubatubaData';
import { recordPartnerWhatsappClick } from '../services/partnerApi';

function normalizarWhatsapp(valor) {
  let numero = (valor || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return /^55\d{10,11}$/.test(numero) ? numero : '';
}

export default function ExploreDirectorySection({
  onNavigate,
  publicPartners = [],
}) {
  const [activeArticle, setActiveArticle] = useState(null);

  function handlePartnerWhatsApp(partner) {
    const num = normalizarWhatsapp(partner.telefone);
    if (!num) return;
    recordPartnerWhatsappClick(partner.id);
    const msg = encodeURIComponent(
      `Olá ${partner.responsavelNome || partner.empresaNome}! Vi sua empresa no Ubatuba Conecta e gostaria de mais informações.`
    );
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="explore-directory-wrapper">
      {/* Seção de Parceiros Oficiais Cadastrados pelos Usuários (exibida somente quando há parceiros ativos) */}
      {publicPartners.length > 0 && (
        <section className="directory-block" aria-labelledby="partners-showcase-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow-accent">Parceiros Ubatuba Conecta</p>
              <h2 id="partners-showcase-heading">Empresas Parceiras em Destaque</h2>
              <p>Negócios locais verificados com atendimento direto pelo WhatsApp.</p>
            </div>
            <button
              type="button"
              className="button-primary button-sm"
              onClick={() => onNavigate('empresas')}
            >
              <Sparkles size={15} /> Seja um Parceiro
            </button>
          </div>

          <div className="listing-cards-grid">
            {publicPartners.map((partner) => {
              const coverImg =
                partner.imagens?.[0] ||
                partner.logoUrl ||
                '/Imagens/logo_ubatuba_conecta_transparente.png';
              return (
                <article key={partner.id} className="uo-card uo-card-featured">
                  <div className="uo-card-media">
                    <img
                      src={coverImg}
                      alt={partner.empresaNome}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = '/Imagens/logo_ubatuba_conecta_transparente.png';
                      }}
                    />
                    <span className="uo-card-badge">Parceiro Oficial</span>
                  </div>
                  <div className="uo-card-body">
                    <div className="uo-card-topline">
                      <span className="status-tag">{partner.ramo || 'Comércio & Serviços'}</span>
                      <span className="partner-region-tag">{partner.regiao || 'Ubatuba'}</span>
                    </div>
                    <h3>{partner.empresaNome}</h3>
                    {partner.endereco && (
                      <p className="uo-card-location">
                        <MapPin size={14} /> {partner.endereco}
                      </p>
                    )}
                    {partner.descricao && <p className="uo-card-desc">{partner.descricao}</p>}
                    {partner.imagens?.length > 1 && (
                      <div className="partner-card-thumbs">
                        {partner.imagens.slice(0, 4).map((imgUrl, idx) => (
                          <img
                            key={`${partner.id}-img-${idx}`}
                            src={imgUrl}
                            alt={`${partner.empresaNome} foto ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                    <div className="uo-card-footer">
                      <small className="partner-owner-label">
                        Resp.: {partner.responsavelNome}
                      </small>
                      <button
                        type="button"
                        className="button-primary button-sm"
                        onClick={() => handlePartnerWhatsApp(partner)}
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Saiba mais sobre Ubatuba (Guia Local: Trilha 7 Praias, Zona Azul, Free Flow, TPA) */}
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
