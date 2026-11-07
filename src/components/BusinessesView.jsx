import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Upload,
  Building2,
  Phone,
  UserCheck,
  Sparkles,
  ExternalLink,
  Clock,
  Trash2,
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

export default function BusinessesView({ onPartnersUpdated }) {
  const {
    isSignedIn,
    user,
    getToken,
    openLoginModal,
    logout,
    partnerSession,
    refreshPartnerSession,
  } = usePartnerAuth();

  const [selectedPlanId, setSelectedPlanId] = useState('mensal');
  const [checkoutData, setCheckoutData] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState('');
  const [needsSubscriptionNotice, setNeedsSubscriptionNotice] = useState('');

  // Dados do Parceiro e do Negócio (Passo 2 sempre liberado para preenchimento)
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

  const plansSectionRef = useRef(null);
  const paymentSectionRef = useRef(null);
  const formSectionRef = useRef(null);
  const successMessageRef = useRef(null);

  const sub = partnerSession?.subscription || null;
  const existingProfile = partnerSession?.partner || partnerSession?.partnerProfile || null;
  const canPost = Boolean(sub?.canPost);

  // Preenche o formulário quando os dados do parceiro vêm junto com o login
  useEffect(() => {
    if (existingProfile) {
      setResponsavelNome((prev) => prev || existingProfile.responsavelNome || user?.name || '');
      setTelefone((prev) => prev || existingProfile.telefone || '');
      setEmpresaNome((prev) => prev || existingProfile.empresaNome || '');
      setRamo((prev) => prev || existingProfile.ramo || '');
      setRegiao((prev) => prev || existingProfile.regiao || 'Centro');
      setEndereco((prev) => prev || existingProfile.endereco || '');
      setDescricao((prev) => prev || existingProfile.descricao || '');
      setLogoUrl((prev) => prev || existingProfile.logoUrl || '');
      setImagens((prev) =>
        prev.length > 0
          ? prev
          : Array.isArray(existingProfile.imagens)
          ? existingProfile.imagens
          : []
      );
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

  async function handleSelectPlan(planId) {
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
      setPaymentFeedback(err?.message || 'Erro ao iniciar assinatura.');
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
      setNeedsSubscriptionNotice('');

      // Se o empreendedor já preencheu o Passo 2 antes de pagar, publica automaticamente!
      const numWhats = normalizarWhatsapp(telefone);
      if (responsavelNome.trim() && empresaNome.trim() && numWhats && imagens.length > 0) {
        await savePartnerProfile(user, getToken, {
          responsavelNome: responsavelNome.trim(),
          telefone: telefone.trim(),
          empresaNome: empresaNome.trim(),
          ramo: ramo || 'Comércio Local',
          regiao,
          endereco: endereco.trim(),
          descricao: descricao.trim(),
          logoUrl,
          imagens,
        });
        await refreshPartnerSession();
        if (onPartnersUpdated) onPartnersUpdated();
        setProfileFeedback('Empresa publicada com sucesso.');
        setTimeout(() => {
          successMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      } else {
        if (onPartnersUpdated) onPartnersUpdated();
        setPaymentFeedback(
          'Assinatura confirmada! Agora clique em "Publicar meu negócio no site ou aplicativo" no formulário abaixo.'
        );
        setTimeout(() => {
          formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
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
      setProfileError(err?.message || 'Falha ao carregar imagens.');
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
      setProfileError(err?.message || 'Falha ao carregar logo.');
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

    const numWhats = normalizarWhatsapp(telefone);
    if (!numWhats) {
      setProfileError('Informe um telefone/WhatsApp válido com DDD (ex: 12 99999-9999).');
      return;
    }

    if (imagens.length === 0) {
      setProfileError('Envie pelo menos 1 imagem do seu negócio para exibir no site.');
      return;
    }

    // Se o empreendedor ainda não pagou a assinatura, direciona para a aba/seção de assinatura (Passo 1) para escolher o plano
    if (!canPost) {
      setNeedsSubscriptionNotice(
        'Os dados da sua empresa estão prontos! Escolha seu plano de assinatura abaixo para concluir a publicação.'
      );
      plansSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!isSignedIn) {
        openLoginModal();
      }
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
      setProfileFeedback('Empresa publicada com sucesso.');
      setTimeout(() => {
        successMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err) {
      setProfileError(err?.message || 'Não foi possível salvar os dados da empresa.');
    } finally {
      setSavingProfile(false);
    }
  }

  const selectedPlan = BUSINESS_PLANS[selectedPlanId] || BUSINESS_PLANS.mensal;

  return (
    <section id="view-empresas" className="app-view active" aria-labelledby="empresas-titulo">
      <p className="eyebrow eyebrow-accent">Área do Parceiro</p>
      <h1 className="page-title" id="empresas-titulo">
        Seja um Parceiro do Ubatuba Conecta
      </h1>
      <p className="page-intro">
        Cadastre seu nome, telefone, empresa e envie fotos do seu negócio para divulgar no site e
        receber clientes diretamente pelo WhatsApp.
      </p>

      {/* Banner de Aviso de Vencimento em 3 Dias (ou Assinatura Vencida) */}
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
                'Renove sua assinatura para manter sua empresa visível no site.'}
            </p>
          </div>
          <button
            type="button"
            className="button-primary button-sm"
            onClick={() => handleSelectPlan(sub.planId || 'mensal')}
          >
            Renovar Assinatura
          </button>
        </div>
      )}

      {/* Barra de Conta do Parceiro */}
      <div className="partner-auth-bar">
        <div className="partner-auth-info">
          <div className="partner-auth-avatar">
            <UserCheck size={20} />
          </div>
          <div>
            {isSignedIn ? (
              <>
                <strong>Olá, {user?.name || user?.fullName || user?.email}</strong>
                <span className="partner-auth-sub">
                  {user?.email} · Assinatura:{' '}
                  <b className={`sub-status-pill status-${sub?.status || 'none'}`}>
                    {sub?.status === 'active'
                      ? `Ativa (${sub.daysRemaining} dias restantes)`
                      : sub?.status === 'expired'
                      ? 'Vencida'
                      : sub?.status === 'pending'
                      ? 'Aguardando pagamento'
                      : 'Sem plano ativo'}
                  </b>
                </span>
              </>
            ) : (
              <>
                <strong>Acesse sua conta de parceiro</strong>
                <span className="partner-auth-sub">
                  Entre ou crie sua conta para gerenciar sua assinatura e publicar sua empresa.
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
              Entrar / Criar Conta
            </button>
          )}
        </div>
      </div>

      {/* Passo 1: Escolha do Plano de Assinatura */}
      <div
        className="section-heading"
        style={{ marginTop: '28px' }}
        ref={plansSectionRef}
        id="planos-assinatura"
      >
        <div>
          <p className="eyebrow eyebrow-accent">Passo 1 · Planos de Assinatura</p>
          <h2>Escolha seu plano</h2>
          <p>
            Escolha o plano ideal para divulgar sua empresa. Você recebe um aviso automático quando
            faltarem <strong>3 dias</strong> para o vencimento.
          </p>
        </div>
      </div>

      {needsSubscriptionNotice && !canPost && (
        <div className="partner-expiration-banner is-warning" role="status">
          <div className="partner-expiration-icon">
            <Sparkles size={22} />
          </div>
          <div className="partner-expiration-copy">
            <strong>Falta apenas escolher seu plano de assinatura!</strong>
            <p>{needsSubscriptionNotice}</p>
          </div>
        </div>
      )}

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
                onClick={() => handleSelectPlan(plan.id)}
              >
                {plan.nome}
              </button>
            </article>
          );
        })}
      </div>

      {/* Box de Confirmação de Assinatura */}
      {(checkoutData || (isSignedIn && !canPost)) && (
        <section
          className="panel mp-checkout-panel"
          ref={paymentSectionRef}
          aria-labelledby="mp-checkout-title"
        >
          <div className="mp-checkout-header">
            <div>
              <span className="mp-badge">Pagamento da Assinatura</span>
              <h2 id="mp-checkout-title">
                {selectedPlan.nome} — {formatCurrency.format(selectedPlan.preco)} /{' '}
                {selectedPlan.periodo}
              </h2>
              <p>
                Confirme o pagamento da assinatura para publicar sua empresa no site Ubatuba
                Conecta.
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
                  <ExternalLink size={16} /> Pagar no Mercado Pago
                </a>
              )}

            <button
              type="button"
              className="button-secondary"
              disabled={paymentBusy}
              onClick={() => handleConfirmSubscription(selectedPlan.id)}
            >
              <CheckCircle2 size={16} />{' '}
              {paymentBusy ? 'Processando...' : `Confirmar pagamento (${selectedPlan.nome})`}
            </button>
          </div>

          {paymentFeedback && (
            <div className="confirmation" role="status">
              {paymentFeedback}
            </div>
          )}
        </section>
      )}

      {/* Passo 2: Cadastro do Parceiro (Sempre liberado para o empreendedor preencher) */}
      <section
        className="panel partner-form-panel"
        ref={formSectionRef}
        aria-labelledby="cadastro-parceiro-titulo"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-accent">Passo 2 · Dados do Negócio e Fotos</p>
            <h2 id="cadastro-parceiro-titulo">Cadastrar e Publicar Minha Empresa</h2>
            <p>
              Preencha seu nome, telefone, nome da empresa e envie as imagens que você quer que
              apareçam no site.
            </p>
          </div>
          {canPost && (
            <span className="status-tag tag-unlocked">
              <CheckCircle2 size={14} /> Assinatura Ativa
            </span>
          )}
        </div>

        <form onSubmit={handleSavePartnerSubmit} className="partner-business-form">
          <fieldset disabled={savingProfile} className="clean-fieldset">
            <div className="form-grid">
              <div>
                <label htmlFor="responsavelNome">
                  <UserCheck size={15} /> Seu nome completo
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
                  Os clientes entrarão em contato diretamente por este WhatsApp.
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
                  Descrição do que sua empresa oferece
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
                        ? 'Carregando imagens...'
                        : 'Clique para enviar fotos do seu negócio'}
                    </label>
                    <p className="helper-text">
                      Envie fotos da fachada, ambiente, pratos, quartos ou serviços ({imagens.length}/6
                      selecionadas).
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
                      <div key={`${url.slice(0, 24)}-${idx}`} className="photo-preview partner-photo-item">
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
              <div
                className="confirmation"
                role="status"
                ref={successMessageRef}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontWeight: 800,
                  fontSize: '16px',
                  color: '#166534',
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                }}
              >
                <CheckCircle2 size={20} /> {profileFeedback}
              </div>
            )}

            <div className="button-row button-row-spaced">
              <button type="submit" className="button-primary" disabled={savingProfile}>
                <Sparkles size={16} />{' '}
                {savingProfile
                  ? 'Publicando...'
                  : 'Publicar meu negócio no site ou aplicativo'}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </section>
  );
}
