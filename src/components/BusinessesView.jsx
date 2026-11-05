import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Upload,
  Building2,
  Phone,
  UserCheck,
  Sparkles,
  ExternalLink,
  Clock,
  Lock,
  Trash2,
  MessageCircle,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { BUSINESS_PLANS } from '../data/ubatubaData';
import { usePartnerAuth } from '../context/AuthContext';
import {
  createMercadoPagoCheckout,
  confirmMercadoPagoPayment,
  simulateSubscriptionExpiration,
  uploadPartnerFiles,
  savePartnerProfile,
  recordPartnerWhatsappClick,
} from '../services/partnerApi';

const formatCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const BUSINESS_BRANCHES = [
  'Hospedagem (Hotel / Pousada / Chalé)',
  'Restaurante / Gastronomia / Quiosque',
  'Turismo, Passeios de Barco e Escuna',
  'Comércio Local',
  'Beleza e Bem-estar',
  'Saúde e Clínicas',
  'Automotivo',
  'Construção e Reformas',
  'Serviços Profissionais',
  'Outro',
];

function normalizarWhatsapp(valor) {
  let numero = (valor || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return /^55\d{10,11}$/.test(numero) ? numero : '';
}

export default function BusinessesView({ publicPartners = [], onPartnersUpdated }) {
  const {
    isSignedIn,
    user,
    getToken,
    openLoginModal,
    logout,
    partnerSession,
    sessionLoading,
    refreshPartnerSession,
  } = usePartnerAuth();

  const [selectedPlanId, setSelectedPlanId] = useState('mensal');
  const [checkoutData, setCheckoutData] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState('');

  // Dados do Parceiro e do Negócio
  const [responsavelNome, setResponsavelNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [ramo, setRamo] = useState('');
  const [regiao, setRegiao] = useState('Centro');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [imagens, setImagens] = useState([]);

  const [uploadingImages, setUploadingImages] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState('');
  const [profileError, setProfileError] = useState('');

  const formSectionRef = useRef(null);
  const paymentSectionRef = useRef(null);

  const sub = partnerSession?.subscription || null;
  const existingProfile = partnerSession?.partner || partnerSession?.partnerProfile || null;
  const canPost = Boolean(sub?.canPost);

  // Preenche o formulário quando os dados do parceiro vêm junto com o login
  useEffect(() => {
    if (existingProfile) {
      setResponsavelNome(existingProfile.responsavelNome || user?.name || user?.fullName || '');
      setTelefone(existingProfile.telefone || '');
      setEmpresaNome(existingProfile.empresaNome || '');
      setRamo(existingProfile.ramo || '');
      setRegiao(existingProfile.regiao || 'Centro');
      setEndereco(existingProfile.endereco || '');
      setDescricao(existingProfile.descricao || '');
      setLogoUrl(existingProfile.logoUrl || '');
      setImagens(Array.isArray(existingProfile.imagens) ? existingProfile.imagens : []);
    } else if (user) {
      setResponsavelNome((prev) => prev || user.name || user.fullName || '');
    }
    if (sub?.planId && BUSINESS_PLANS[sub.planId]) {
      setSelectedPlanId(sub.planId);
    }
  }, [existingProfile, user, sub?.planId]);

  // Verifica retorno automático do Mercado Pago via query string (?mp_status=approved&plan=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get('mp_status');
    const mpPlan = params.get('plan');
    if (mpStatus === 'approved' && isSignedIn && user) {
      handleConfirmSubscription(mpPlan || selectedPlanId);
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user]);

  async function handleStartMercadoPagoCheckout(planId) {
    setSelectedPlanId(planId);
    setPaymentFeedback('');
    if (!isSignedIn) {
      openLoginModal();
      return;
    }
    setPaymentBusy(true);
    try {
      const res = await createMercadoPagoCheckout(user, getToken, planId);
      setCheckoutData(res?.checkout || res);
      await refreshPartnerSession();
      setTimeout(() => {
        paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (err) {
      setPaymentFeedback(err?.message || 'Erro ao iniciar assinatura com Mercado Pago.');
    } finally {
      setPaymentBusy(false);
    }
  }

  async function handleConfirmSubscription(planIdToConfirm = selectedPlanId) {
    if (!isSignedIn) {
      openLoginModal();
      return;
    }
    setPaymentBusy(true);
    setPaymentFeedback('');
    try {
      await confirmMercadoPagoPayment(
        user,
        getToken,
        planIdToConfirm,
        checkoutData?.subscriptionId || checkoutData?.preapprovalId || `mp_sub_${Date.now()}`
      );
      await refreshPartnerSession();
      if (onPartnersUpdated) onPartnersUpdated();
      setPaymentFeedback(
        'Pagamento recorrente Mercado Pago confirmado! Seu acesso para cadastrar e publicar sua empresa está liberado.'
      );
      setTimeout(() => {
        formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (err) {
      setPaymentFeedback(err?.message || 'Não foi possível confirmar o pagamento.');
    } finally {
      setPaymentBusy(false);
    }
  }

  async function handleSimulateDays(days) {
    if (!isSignedIn) return;
    setPaymentBusy(true);
    try {
      await simulateSubscriptionExpiration(user, getToken, days);
      await refreshPartnerSession();
      if (onPartnersUpdated) onPartnersUpdated();
    } finally {
      setPaymentBusy(false);
    }
  }

  async function handleUploadBusinessImages(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (imagens.length + files.length > 6) {
      setProfileError('Você pode enviar no máximo 6 imagens do seu negócio.');
      return;
    }
    setProfileError('');
    setUploadingImages(true);
    try {
      const uploadedUrls = await uploadPartnerFiles(user, getToken, files);
      setImagens((prev) => [...prev, ...uploadedUrls].slice(0, 6));
    } catch (err) {
      setProfileError(err?.message || 'Falha ao enviar imagens.');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  }

  async function handleUploadLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileError('');
    setUploadingImages(true);
    try {
      const uploadedUrls = await uploadPartnerFiles(user, getToken, [file]);
      if (uploadedUrls[0]) {
        setLogoUrl(uploadedUrls[0]);
      }
    } catch (err) {
      setProfileError(err?.message || 'Falha ao enviar logo.');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  }

  function handleRemoveImage(idxToRemove) {
    setImagens((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  }

  async function handleSavePartnerSubmit(e) {
    e.preventDefault();
    setProfileError('');
    setProfileFeedback('');

    if (!canPost) {
      setProfileError(
        'Sua assinatura recorrente no Mercado Pago precisa estar ativa para publicar seu negócio.'
      );
      return;
    }

    const numWhats = normalizarWhatsapp(telefone);
    if (!numWhats) {
      setProfileError('Informe um telefone/WhatsApp válido com DDD (ex: 12 99999-9999).');
      return;
    }

    if (imagens.length === 0) {
      setProfileError('Envie pelo menos 1 imagem do seu negócio para exibir no site.');
      return;
    }

    setSavingProfile(true);
    try {
      await savePartnerProfile(user, getToken, {
        responsavelNome: responsavelNome.trim(),
        telefone: telefone.trim(),
        empresaNome: empresaNome.trim(),
        ramo,
        regiao,
        endereco: endereco.trim(),
        descricao: descricao.trim(),
        logoUrl,
        imagens,
      });
      await refreshPartnerSession();
      if (onPartnersUpdated) onPartnersUpdated();
      setProfileFeedback(
        'Parabéns! Os dados e imagens da sua empresa foram publicados na vitrine do Ubatuba Conecta.'
      );
    } catch (err) {
      setProfileError(err?.message || 'Não foi possível salvar os dados da empresa.');
    } finally {
      setSavingProfile(false);
    }
  }

  function handlePartnerWhatsAppClick(partner) {
    const num = normalizarWhatsapp(partner.telefone);
    if (!num) return;
    recordPartnerWhatsappClick(partner.id);
    const msg = encodeURIComponent(
      `Olá ${partner.responsavelNome || partner.empresaNome}! Vi sua empresa no Ubatuba Conecta e gostaria de saber mais.`
    );
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank', 'noopener,noreferrer');
  }

  const selectedPlan = BUSINESS_PLANS[selectedPlanId] || BUSINESS_PLANS.mensal;

  return (
    <section id="view-empresas" className="app-view active" aria-labelledby="empresas-titulo">
      <p className="eyebrow eyebrow-accent">Área do Parceiro · Clerk + Mercado Pago + Go API</p>
      <h1 className="page-title" id="empresas-titulo">
        Seja Parceiro do Ubatuba Conecta
      </h1>
      <p className="page-intro">
        Cadastre seu nome, telefone, empresa e envie fotos do seu negócio para aparecer em destaque
        no site. A liberação de postagem é automática após o pagamento da recorrência via{' '}
        <strong>Mercado Pago</strong>, e suas informações de assinatura acompanham seu login.
      </p>

      {/* Banner de Aviso de Vencimento em 3 Dias (ou Assinatura Vencida) vinculado ao Login */}
      {isSignedIn && sub && (sub.expiringSoon || sub.expired) && (
        <div
          className={`partner-expiration-banner ${sub.expired ? 'is-expired' : 'is-warning'}`}
          role="alert"
        >
          <div className="partner-expiration-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="partner-expiration-copy">
            <strong>
              {sub.expired
                ? 'Assinatura Vencida — Seu anúncio está pausado'
                : `Aviso de Vencimento: Faltam ${sub.daysRemaining} dia(s) para sua assinatura vencer!`}
            </strong>
            <p>
              {sub.alertMessage ||
                'Renove sua recorrência no Mercado Pago para manter sua empresa visível no site.'}
            </p>
          </div>
          <button
            type="button"
            className="button-primary button-sm"
            onClick={() => handleStartMercadoPagoCheckout(sub.planId || 'mensal')}
          >
            Renovar no Mercado Pago
          </button>
        </div>
      )}

      {/* Barra de Status do Login (Clerk) + Simulador de Vencimento de 3 Dias */}
      <div className="partner-auth-bar">
        <div className="partner-auth-info">
          <div className="partner-auth-avatar">
            <UserCheck size={20} />
          </div>
          <div>
            {isSignedIn ? (
              <>
                <strong>Logado como: {user?.name || user?.fullName || user?.email}</strong>
                <span className="partner-auth-sub">
                  {user?.email} · Status da assinatura:{' '}
                  <b className={`sub-status-pill status-${sub?.status || 'none'}`}>
                    {sub?.status === 'active'
                      ? `Ativa (${sub.daysRemaining} dias restantes)`
                      : sub?.status === 'expired'
                      ? 'Vencida'
                      : sub?.status === 'pending'
                      ? 'Aguardando pagamento'
                      : 'Sem assinatura ativa'}
                  </b>
                </span>
              </>
            ) : (
              <>
                <strong>Faça login para se tornar parceiro ou gerenciar sua empresa</strong>
                <span className="partner-auth-sub">
                  Autenticação integrada com Clerk — seus dados de assinatura e aviso de 3 dias
                  carregam junto com seu login.
                </span>
              </>
            )}
          </div>
        </div>

        <div className="partner-auth-actions">
          {isSignedIn ? (
            <>
              <div className="sim-buttons-group" title="Testar aviso de vencimento no login">
                <button
                  type="button"
                  className="button-quiet button-sm"
                  disabled={paymentBusy}
                  onClick={() => handleSimulateDays(3)}
                >
                  <Clock size={14} /> Simular 3 dias p/ vencer
                </button>
                <button
                  type="button"
                  className="button-quiet button-sm"
                  disabled={paymentBusy}
                  onClick={() => handleSimulateDays(0)}
                >
                  Simular vencido
                </button>
                <button
                  type="button"
                  className="button-quiet button-sm"
                  disabled={paymentBusy}
                  onClick={() => handleSimulateDays(30)}
                >
                  <RefreshCw size={14} /> 30 dias ativos
                </button>
              </div>
              <button type="button" className="button-quiet button-sm" onClick={logout}>
                Sair da conta
              </button>
            </>
          ) : (
            <button type="button" className="button-primary" onClick={openLoginModal}>
              Entrar / Criar Conta (Clerk)
            </button>
          )}
        </div>
      </div>

      {/* Passo 1: Escolha do Plano de Recorrência Mercado Pago */}
      <div className="section-heading" style={{ marginTop: '28px' }}>
        <div>
          <p className="eyebrow eyebrow-accent">Passo 1 · Assinatura Recorrente</p>
          <h2>Escolha seu plano no Mercado Pago</h2>
          <p>
            Assim que o pagamento da recorrência é confirmado, o formulário de postagem da sua
            empresa é liberado automaticamente. Avisamos você no login quando faltarem{' '}
            <strong>3 dias</strong> para o vencimento.
          </p>
        </div>
      </div>

      <div className="plan-grid plan-grid-spaced">
        {Object.values(BUSINESS_PLANS).map((plan) => {
          const isCurrentPlan = sub?.planId === plan.id && sub?.status === 'active';
          return (
            <article
              key={plan.id}
              className={`plan-card ${plan.recommended ? 'recommended' : ''} ${
                selectedPlanId === plan.id ? 'selected-card' : ''
              }`}
            >
              <h2>{plan.nome}</h2>
              <p>{plan.descricao}</p>
              <span className="plan-price">{formatCurrency.format(plan.preco)}</span>
              <p>
                Ciclo recorrente de <strong>{plan.periodo}</strong> · Aviso automático faltando{' '}
                <strong>{plan.avisoDias} dias</strong>.
              </p>
              <button
                type="button"
                className={isCurrentPlan ? 'button-secondary' : 'button-primary'}
                disabled={paymentBusy}
                onClick={() => handleStartMercadoPagoCheckout(plan.id)}
              >
                <CreditCard size={16} />{' '}
                {isCurrentPlan
                  ? 'Plano Ativo · Renovar Ciclo'
                  : `Assinar ${plan.nome} com Mercado Pago`}
              </button>
            </article>
          );
        })}
      </div>

      {/* Box de Checkout / Confirmação Mercado Pago */}
      {(checkoutData || (isSignedIn && !canPost)) && (
        <section
          className="panel mp-checkout-panel"
          ref={paymentSectionRef}
          aria-labelledby="mp-checkout-title"
        >
          <div className="mp-checkout-header">
            <div>
              <span className="mp-badge">Mercado Pago · Assinatura Recorrente</span>
              <h2 id="mp-checkout-title">
                { selectedPlan.nome } — { formatCurrency.format(selectedPlan.preco) } / { selectedPlan.periodo }
              </h2>
              <p>
                Realize o pagamento da assinatura recorrente para liberar imediatamente o cadastro e
                publicação da sua empresa no Ubatuba Conecta.
              </p>
            </div>
          </div>

          <div className="mp-checkout-actions">
            {(checkoutData?.checkoutUrl || checkoutData?.initPoint) &&
              !checkoutData?.sandboxMode && (
                <a
                  href={checkoutData.checkoutUrl || checkoutData.initPoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-primary"
                >
                  <ExternalLink size={16} /> Pagar no Ambiente Seguro Mercado Pago
                </a>
              )}

            <button
              type="button"
              className="button-secondary"
              disabled={paymentBusy}
              onClick={() => handleConfirmSubscription(selectedPlan.id)}
            >
              <CheckCircle2 size={16} />{' '}
              {paymentBusy
                ? 'Processando confirmação...'
                : 'Confirmar Pagamento da Recorrência (Liberar Postagem Agora)'}
            </button>
          </div>

          {paymentFeedback && (
            <div className="confirmation" role="status">
              {paymentFeedback}
            </div>
          )}
        </section>
      )}

      {/* Passo 2: Cadastro do Parceiro (Nome, Telefone, Empresa e Upload de Imagens) */}
      <section
        className={`panel partner-form-panel ${!canPost ? 'is-locked' : ''}`}
        ref={formSectionRef}
        aria-labelledby="cadastro-parceiro-titulo"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-accent">Passo 2 · Dados do Negócio e Fotos</p>
            <h2 id="cadastro-parceiro-titulo">Cadastrar e Publicar Minha Empresa</h2>
            <p>
              Preencha seu nome, telefone, nome da empresa e envie as imagens que você quer que
              apareçam na vitrine do site.
            </p>
          </div>
          <span className={`status-tag ${canPost ? 'tag-unlocked' : 'tag-locked'}`}>
            {canPost ? (
              <>
                <CheckCircle2 size={14} /> Acesso Liberado para Postar
              </>
            ) : (
              <>
                <Lock size={14} /> Bloqueado até pagamento da recorrência
              </>
            )}
          </span>
        </div>

        {!canPost && (
          <div className="partner-locked-overlay-banner">
            <Lock size={20} />
            <div>
              <strong>Acesso de postagem vinculado ao pagamento da recorrência</strong>
              <p>
                {!isSignedIn
                  ? 'Faça login com sua conta Clerk e ative um plano no Mercado Pago acima para liberar a postagem.'
                  : 'Escolha um plano acima e confirme o pagamento da recorrência no Mercado Pago para liberar a publicação.'}
              </p>
            </div>
            {!isSignedIn ? (
              <button type="button" className="button-primary button-sm" onClick={openLoginModal}>
                Fazer Login
              </button>
            ) : (
              <button
                type="button"
                className="button-secondary button-sm"
                disabled={paymentBusy}
                onClick={() => handleConfirmSubscription(selectedPlanId)}
              >
                Liberar Postagem (Confirmar Recorrência)
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSavePartnerSubmit} className="partner-business-form">
          <fieldset disabled={!canPost || savingProfile || sessionLoading} className="clean-fieldset">
            <div className="form-grid">
              <div>
                <label htmlFor="responsavelNome">
                  <UserCheck size={15} /> Seu nome completo (Parceiro)
                </label>
                <input
                  id="responsavelNome"
                  name="responsavelNome"
                  required
                  placeholder="Ex.: João Silva"
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="parceiroTelefone">
                  <Phone size={15} /> Telefone / WhatsApp comercial
                </label>
                <input
                  id="parceiroTelefone"
                  name="telefone"
                  type="tel"
                  required
                  placeholder="(12) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
                <p className="helper-text">
                  Os clientes do site entrarão em contato diretamente por este WhatsApp.
                </p>
              </div>

              <div>
                <label htmlFor="empresaNome">
                  <Building2 size={15} /> Nome da empresa / negócio
                </label>
                <input
                  id="empresaNome"
                  name="empresaNome"
                  required
                  placeholder="Ex.: Pousada & Restaurante Mar Virado"
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="empresaRamo">Categoria / Ramo de atuação</label>
                <select
                  id="empresaRamo"
                  name="ramo"
                  required
                  value={ramo}
                  onChange={(e) => setRamo(e.target.value)}
                >
                  <option value="">Selecione a categoria</option>
                  {BUSINESS_BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="empresaRegiao">Região em Ubatuba</label>
                <select
                  id="empresaRegiao"
                  name="regiao"
                  value={regiao}
                  onChange={(e) => setRegiao(e.target.value)}
                >
                  <option value="Centro">Centro / Itaguá / Praia Grande</option>
                  <option value="Norte">Norte de Ubatuba</option>
                  <option value="Sul">Sul de Ubatuba</option>
                </select>
              </div>

              <div>
                <label htmlFor="empresaEndereco">Endereço / Praia de referência</label>
                <input
                  id="empresaEndereco"
                  name="endereco"
                  required
                  placeholder="Ex.: Av. Leovigildo Dias Vieira, 450 - Itaguá"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>

              <div className="field-full">
                <label htmlFor="empresaDescricao">
                  Descrição do que sua empresa oferece (aparece no card do site)
                </label>
                <textarea
                  id="empresaDescricao"
                  name="descricao"
                  rows={3}
                  required
                  placeholder="Conte os diferenciais do seu negócio, horários de atendimento, pratos, passeios ou serviços..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              {/* Upload de Logo Opcional */}
              <div className="field-full">
                <span className="field-label">Logo da empresa (Opcional)</span>
                <div className="photo-picker">
                  <div>
                    <label htmlFor="uploadLogoParceiro" className="upload-trigger-label">
                      <Upload size={16} /> Selecionar logo da empresa
                    </label>
                    <input
                      id="uploadLogoParceiro"
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                    />
                    {logoUrl && (
                      <div className="logo-preview">
                        <img src={logoUrl} alt="Logo da empresa" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload de Imagens do Negócio */}
              <div className="field-full">
                <span className="field-label">
                  Imagens do seu negócio que vão aparecer no site (até 6 fotos)
                </span>
                <div className="photo-picker">
                  <div>
                    <label htmlFor="uploadFotosParceiro" className="upload-trigger-label">
                      <Upload size={16} />{' '}
                      {uploadingImages
                        ? 'Enviando imagens para o servidor Go...'
                        : 'Clique para enviar fotos do seu negócio'}
                    </label>
                    <p className="helper-text">
                      Envie fotos da fachada, ambiente, pratos, quartos ou serviços ({imagens.length}/6
                      enviadas).
                    </p>
                    <input
                      id="uploadFotosParceiro"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleUploadBusinessImages}
                    />
                  </div>
                </div>

                {imagens.length > 0 && (
                  <div className="photo-list" aria-live="polite">
                    {imagens.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="photo-preview partner-photo-item">
                        <img src={url} alt={`Foto do negócio ${idx + 1}`} />
                        <button
                          type="button"
                          className="photo-remove-btn"
                          onClick={() => handleRemoveImage(idx)}
                          title="Remover imagem"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {profileError && (
              <div className="partner-alert-error" role="alert">
                <AlertTriangle size={16} /> {profileError}
              </div>
            )}

            {profileFeedback && (
              <div className="confirmation" role="status">
                <CheckCircle2 size={18} /> {profileFeedback}
              </div>
            )}

            <div className="button-row button-row-spaced">
              <button type="submit" className="button-primary" disabled={!canPost || savingProfile}>
                <Sparkles size={16} />{' '}
                {savingProfile
                  ? 'Publicando no Ubatuba Conecta...'
                  : existingProfile
                  ? 'Atualizar Dados e Imagens no Site'
                  : 'Publicar Meu Negócio no Site'}
              </button>
            </div>
          </fieldset>
        </form>
      </section>

      {/* Vitrine Pública de Parceiros Ativos */}
      <section className="panel" aria-labelledby="vitrine-parceiros-titulo">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-accent">Vitrine Ao Vivo</p>
            <h2 id="vitrine-parceiros-titulo">Parceiros Ativos no Ubatuba Conecta</h2>
            <p>
              Empresas com assinatura recorrente em dia aparecem automaticamente aqui e na página
              inicial.
            </p>
          </div>
          <span className="status-tag">{publicPartners.length} parceiro(s) ativo(s)</span>
        </div>

        {publicPartners.length === 0 ? (
          <p className="helper-text">
            Ainda não há parceiros publicados. Seja o primeiro a cadastrar sua empresa acima!
          </p>
        ) : (
          <div className="listing-cards-grid">
            {publicPartners.map((partner) => {
              const cover =
                partner.imagens?.[0] ||
                partner.logoUrl ||
                '/Imagens/logo_ubatuba_conecta_transparente.png';
              return (
                <article key={partner.id} className="uo-card uo-card-featured">
                  <div className="uo-card-media">
                    <img src={cover} alt={partner.empresaNome} loading="lazy" />
                    <span className="uo-card-badge">Parceiro Oficial</span>
                  </div>
                  <div className="uo-card-body">
                    <div className="uo-card-topline">
                      <span className="status-tag">{partner.ramo}</span>
                      <span className="partner-region-tag">{partner.regiao}</span>
                    </div>
                    <h3>{partner.empresaNome}</h3>
                    {partner.endereco && (
                      <p className="uo-card-location">
                        <MapPin size={14} /> {partner.endereco}
                      </p>
                    )}
                    <p className="uo-card-desc">{partner.descricao}</p>
                    {partner.imagens?.length > 1 && (
                      <div className="partner-card-thumbs">
                        {partner.imagens.map((img, i) => (
                          <img
                            key={`${partner.id}-thumb-${i}`}
                            src={img}
                            alt={`${partner.empresaNome} ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                    <div className="uo-card-footer">
                      <small className="partner-owner-label">
                        Por: {partner.responsavelNome}
                      </small>
                      <button
                        type="button"
                        className="button-primary button-sm"
                        onClick={() => handlePartnerWhatsAppClick(partner)}
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
