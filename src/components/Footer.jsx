import React, { useMemo } from 'react';
import { APP_STORE_LINKS, INSTAGRAM_URL, CONTACT_EMAIL } from '../data/ubatubaData';

export default function Footer({ onNavigate }) {
  const mobilePlatform = useMemo(() => {
    if (typeof navigator === 'undefined') return '';
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    return '';
  }, []);

  const hasAndroidUrl = Boolean(APP_STORE_LINKS.android);
  const hasIosUrl = Boolean(APP_STORE_LINKS.ios);
  const hasActiveMobileApp = Boolean(mobilePlatform && APP_STORE_LINKS[mobilePlatform]);

  const hideAndroid = hasActiveMobileApp && mobilePlatform === 'ios';
  const hideIos = hasActiveMobileApp && mobilePlatform === 'android';

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-sections">
          <section className="footer-section" aria-labelledby="download-titulo">
            <p className="eyebrow">Ubatuba no seu celular</p>
            <h2 id="download-titulo">Baixe o aplicativo</h2>
            <p id="download-status">
              {hasActiveMobileApp
                ? 'Toque abaixo para abrir a loja do seu celular.'
                : 'Os aplicativos ainda não estão publicados nas lojas.'}
            </p>
            <div className="download-actions">
              {!hideAndroid && (
                <a
                  className={`store-link ${
                    mobilePlatform === 'android' ? 'recommended' : ''
                  }`}
                  id="downloadAndroid"
                  href={hasAndroidUrl ? APP_STORE_LINKS.android : '#'}
                  aria-disabled={!hasAndroidUrl ? 'true' : undefined}
                  tabIndex={!hasAndroidUrl ? -1 : undefined}
                  aria-label={
                    hasAndroidUrl ? 'Baixar o Ubatuba Conecta na Google Play' : undefined
                  }
                  onClick={(e) => {
                    if (!hasAndroidUrl) e.preventDefault();
                  }}
                >
                  <span className="store-symbol" aria-hidden="true">
                    ▶
                  </span>
                  <span>
                    Google Play
                    <small>{hasAndroidUrl ? 'Baixar aplicativo' : 'Android · em breve'}</small>
                  </span>
                </a>
              )}

              {!hideIos && (
                <a
                  className={`store-link ${mobilePlatform === 'ios' ? 'recommended' : ''}`}
                  id="downloadIOS"
                  href={hasIosUrl ? APP_STORE_LINKS.ios : '#'}
                  aria-disabled={!hasIosUrl ? 'true' : undefined}
                  tabIndex={!hasIosUrl ? -1 : undefined}
                  aria-label={hasIosUrl ? 'Baixar o Ubatuba Conecta na App Store' : undefined}
                  onClick={(e) => {
                    if (!hasIosUrl) e.preventDefault();
                  }}
                >
                  <span className="store-symbol" aria-hidden="true">
                    A
                  </span>
                  <span>
                    App Store
                    <small>{hasIosUrl ? 'Baixar aplicativo' : 'iPhone · em breve'}</small>
                  </span>
                </a>
              )}

              <a
                className="store-link instagram-link"
                id="instagramLink"
                href={INSTAGRAM_URL || '#'}
                target={INSTAGRAM_URL ? '_blank' : undefined}
                rel={INSTAGRAM_URL ? 'noopener noreferrer' : undefined}
                aria-disabled={!INSTAGRAM_URL ? 'true' : undefined}
                tabIndex={!INSTAGRAM_URL ? -1 : undefined}
                aria-label="Acompanhe o Ubatuba Conecta no Instagram"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5"></rect>
                  <circle cx="12" cy="12" r="4"></circle>
                  <circle cx="17.5" cy="6.5" r=".8" fill="currentColor"></circle>
                </svg>
                <span>
                  Instagram
                  <small id="instagramStatus">
                    {INSTAGRAM_URL ? 'Acompanhe as novidades' : 'Perfil em breve'}
                  </small>
                </span>
              </a>
            </div>
          </section>

          <section className="footer-section" aria-labelledby="footer-nav-titulo">
            <p className="eyebrow">Acesso Rápido</p>
            <h2 id="footer-nav-titulo">Explorar Ubatuba Conecta</h2>
            <div className="footer-quick-links">
              <button type="button" onClick={() => onNavigate('inicio')}>
                Início & Assistente
              </button>
              <button type="button" onClick={() => onNavigate('praias')}>
                Guia de Praias & Ilhas
              </button>
              <button type="button" onClick={() => onNavigate('cidade')}>
                Previsão do Tempo & Câmeras
              </button>
              <button type="button" onClick={() => onNavigate('explorar')}>
                Onde Ficar & O que Fazer
              </button>
              <button type="button" onClick={() => onNavigate('vagas')}>
                Vagas de Emprego
              </button>
              <button type="button" onClick={() => onNavigate('empresas')}>
                Anunciar Empresa
              </button>
            </div>
          </section>

          <section className="footer-section" aria-labelledby="contato-titulo">
            <p className="eyebrow">Fale com a gente</p>
            <h2 id="contato-titulo">Sugestões, dúvidas ou reclamações?</h2>
            <p>Envie uma mensagem para o Ubatuba Conecta.</p>
            <a
              className="footer-email"
              href={`mailto:${CONTACT_EMAIL}?subject=Contato%20-%20Ubatuba%20Conecta`}
            >
              <span aria-hidden="true">✉</span> Enviar e-mail
            </a>
            <p className="footer-address">{CONTACT_EMAIL}</p>
          </section>
        </div>
        <p className="footer-bottom">
          © {new Date().getFullYear()} Ubatuba Conecta · Guia Local, Clima Ao Vivo, Praias e
          Negócios · Ubatuba, SP
        </p>
      </div>
    </footer>
  );
}
