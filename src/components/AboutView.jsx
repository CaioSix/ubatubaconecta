import React from 'react';
import {
  Users,
  ShieldCheck,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Linkedin,
  Github,
  Instagram,
  Award,
  Code2,
  Waves,
  Building2,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  Cpu,
  Globe,
} from 'lucide-react';
import {
  DEVELOPER_CONTACTS,
  INSTAGRAM_URL,
  CONTACT_EMAIL,
} from '../data/ubatubaData';

export default function AboutView({ onNavigate }) {
  const pillars = [
    {
      icon: Waves,
      title: 'Informação em Tempo Real',
      description:
        'Integração direta com câmeras ao vivo nas rodovias (Rio-Santos e Oswaldo Cruz), dados meteorológicos e condições oceânicas para uma experiência segura.',
    },
    {
      icon: Building2,
      title: 'Fortalecimento do Comércio Local',
      description:
        'Vitrine digital acessível para pousadas, restaurantes, guias de turismo e prestadores de serviço de Ubatuba se conectarem diretamente com clientes.',
    },
    {
      icon: HeartHandshake,
      title: 'Impacto Social & Empregabilidade',
      description:
        'Mural de vagas 100% gratuito para aproximar moradores da região e estabelecimentos locais durante todo o ano, reduzindo a sazonalidade.',
    },
    {
      icon: ShieldCheck,
      title: 'Engenharia & Confiabilidade',
      description:
        'Plataforma construída com arquitetura moderna em nuvem, alta disponibilidade, segurança de dados e foco total em performance mobile e desktop.',
    },
  ];

  return (
    <div className="about-page">
      {/* Hero Quem Somos */}
      <section className="about-hero">
        <div className="container">
          <div className="about-hero-card">
            <span className="section-eyebrow">
              <Sparkles size={15} /> Quem Somos · Nossa História & Equipe
            </span>
            <h1 className="about-hero-title">
              Tecnologia feita em Ubatuba, por quem vive e ama o nosso litoral.
            </h1>
            <p className="about-hero-subtitle">
              O <strong>Ubatuba Conecta</strong> nasceu da união entre vivência local e engenharia de
              software de alto nível. Nosso propósito é centralizar informações confiáveis da cidade,
              apoiar o empreendedor caiçara e facilitar a jornada de moradores e visitantes em mais de
              100 praias.
            </p>

            <div className="about-stats-grid">
              <div className="about-stat-item">
                <strong>100+</strong>
                <span>Praias e ilhas mapeadas na região</span>
              </div>
              <div className="about-stat-item">
                <strong>24/7</strong>
                <span>Monitoramento de clima, maré e estradas</span>
              </div>
              <div className="about-stat-item">
                <strong>100% Local</strong>
                <span>Idealizado e desenvolvido em Ubatuba, SP</span>
              </div>
              <div className="about-stat-item">
                <strong>Gratuito</strong>
                <span>Para consulta turística e mural de empregos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares da Plataforma */}
      <section className="section-block">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">
                <Globe size={15} /> Nosso Propósito
              </span>
              <h2 className="section-title">Por que criamos o Ubatuba Conecta?</h2>
              <p className="section-subtitle">
                Mais do que um guia turístico, somos um ecossistema digital pensado para resolver dores
                reais de quem mora, trabalha ou visita a Capital do Surfe.
              </p>
            </div>
          </div>

          <div className="about-pillars-grid">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.title} className="about-pillar-card">
                  <div className="about-pillar-icon">
                    <Icon size={24} />
                  </div>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fundadores & Desenvolvedores */}
      <section className="section-block about-founders-section">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">
                <Users size={15} /> Idealizadores & Engenharia
              </span>
              <h2 className="section-title">Conheça quem está por trás do projeto</h2>
              <p className="section-subtitle">
                Profissionais de tecnologia de Ubatuba comprometidos com transparência, excelência
                técnica e desenvolvimento regional.
              </p>
            </div>
          </div>

          <div className="founders-grid">
            {DEVELOPER_CONTACTS.map((dev) => {
              const initials = dev.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('');

              return (
                <article key={dev.id || dev.name} className="founder-card">
                  <div className="founder-card-header">
                    <div className="founder-avatar" aria-hidden="true">
                      <span>{initials}</span>
                    </div>
                    <div className="founder-identity">
                      <div className="founder-badges">
                        <span className="founder-location-badge">
                          <MapPin size={13} /> {dev.location || 'Ubatuba, SP'}
                        </span>
                        <span className="founder-verified-badge">
                          <ShieldCheck size={13} /> Co-Fundador
                        </span>
                      </div>
                      <h3 className="founder-name">{dev.fullName || dev.name}</h3>
                      <p className="founder-role">{dev.role}</p>
                      <p className="founder-headline">{dev.headline}</p>
                    </div>
                  </div>

                  <p className="founder-bio">{dev.bio}</p>

                  {dev.highlights && dev.highlights.length > 0 && (
                    <div className="founder-section">
                      <h4 className="founder-section-title">
                        <Award size={16} /> Trajetória & Certificações em Destaque
                      </h4>
                      <ul className="founder-highlights-list">
                        {dev.highlights.map((item) => (
                          <li key={item}>
                            <CheckCircle2 size={15} className="founder-check-icon" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {dev.skills && dev.skills.length > 0 && (
                    <div className="founder-section">
                      <h4 className="founder-section-title">
                        <Cpu size={16} /> Especialidades & Tecnologias
                      </h4>
                      <div className="founder-skills-tags">
                        {dev.skills.map((skill) => (
                          <span key={skill} className="founder-skill-tag">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="founder-actions">
                    <a
                      href={dev.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary founder-btn"
                    >
                      <Phone size={16} /> WhatsApp: {dev.phone}
                    </a>

                    {dev.linkedin && (
                      <a
                        href={dev.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary founder-btn founder-btn-linkedin"
                      >
                        <Linkedin size={16} /> LinkedIn Profissional <ExternalLink size={13} />
                      </a>
                    )}

                    {dev.github && (
                      <a
                        href={dev.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline founder-btn"
                      >
                        <Github size={16} /> GitHub
                      </a>
                    )}

                    {dev.email && (
                      <a href={`mailto:${dev.email}`} className="btn btn-outline founder-btn">
                        <Mail size={16} /> {dev.email}
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Banner de Contato e Parcerias */}
      <section className="section-block">
        <div className="container">
          <div className="about-cta-banner">
            <div className="about-cta-content">
              <span className="section-eyebrow">
                <Code2 size={15} /> Fale Conosco
              </span>
              <h2>Quer ser parceiro, divulgar sua empresa ou tirar dúvidas?</h2>
              <p>
                Nossa equipe atende diretamente em Ubatuba. Entre em contato pelo WhatsApp dos
                responsáveis, envie um e-mail ou cadastre seu negócio diretamente na Área do Parceiro.
              </p>
              <div className="about-cta-buttons">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onNavigate && onNavigate('empresas')}
                >
                  <Building2 size={17} /> Conhecer Área do Parceiro
                </button>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  <Instagram size={17} /> @ubatubaconecta
                </a>
                <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-outline">
                  <Mail size={17} /> {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
