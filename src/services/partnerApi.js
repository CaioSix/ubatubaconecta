import { BUSINESS_PLANS } from '../data/ubatubaData';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const FALLBACK_STORAGE_KEY = 'ubatuba-conecta-partner-fallback-v1';

function getFallbackStore() {
  try {
    const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { subscriptions: {}, partners: {} };
  } catch {
    return { subscriptions: {}, partners: {} };
  }
}

function saveFallbackStore(store) {
  try {
    window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
}

function computeLocalSubscription(sub) {
  const warningThresholdDays = 3;
  if (!sub || sub.status === 'none' || sub.status === 'pending' || !sub.expiresAt) {
    return {
      status: sub?.status || 'none',
      planId: sub?.planId || '',
      planName: sub?.planName || '',
      price: sub?.price || 0,
      warningThresholdDays,
      daysRemaining: 0,
      expiringSoon: false,
      expired: false,
      canPost: false,
      alertMessage: '',
    };
  }

  const now = new Date();
  const exp = new Date(sub.expiresAt);
  const hoursLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60);
  const daysRemaining = Math.ceil(hoursLeft / 24);
  const expFormatted = exp.toLocaleDateString('pt-BR');

  if (hoursLeft <= 0) {
    return {
      ...sub,
      status: 'expired',
      warningThresholdDays,
      daysRemaining,
      expiringSoon: false,
      expired: true,
      canPost: false,
      alertMessage: `Sua assinatura (${sub.planName}) venceu em ${expFormatted}. Renove sua recorrência no Mercado Pago para reativar seu anúncio no Ubatuba Conecta.`,
    };
  }

  const canPost = sub.status === 'active';
  const expiringSoon = canPost && daysRemaining <= warningThresholdDays;
  const alertMessage = expiringSoon
    ? daysRemaining <= 1
      ? `Atenção: falta apenas 1 dia para o vencimento da sua assinatura (${sub.planName} — vence em ${expFormatted}). Verifique sua recorrência no Mercado Pago para não pausar seu anúncio!`
      : `Atenção: faltam ${daysRemaining} dias para o vencimento da sua assinatura (${sub.planName} — vence em ${expFormatted}). Mantenha sua recorrência em dia no Mercado Pago para continuar divulgando!`
    : '';

  return {
    ...sub,
    warningThresholdDays,
    daysRemaining,
    expiringSoon,
    expired: false,
    canPost,
    alertMessage,
  };
}

async function buildAuthHeaders(user, getToken) {
  const headers = {
    'X-Clerk-User-Id': user?.id || '',
    'X-Clerk-User-Email': user?.email || '',
    'X-Clerk-User-Name': user?.name || '',
  };
  if (typeof getToken === 'function') {
    try {
      const token = await getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore token errors in dev mode
    }
  }
  return headers;
}

export async function fetchPartnerSession(user, getToken) {
  if (!user?.id) return null;
  const headers = await buildAuthHeaders(user, getToken);

  try {
    const res = await fetch(`${API_BASE}/api/me/partner`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback if Go server is not reachable
  }

  const store = getFallbackStore();
  const sub = computeLocalSubscription(store.subscriptions[user.id]);
  const partner = store.partners[user.id] || null;
  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    subscription: sub,
    partner,
    plans: Object.values(BUSINESS_PLANS),
  };
}

export async function createMercadoPagoCheckout(user, getToken, planId) {
  const headers = {
    ...(await buildAuthHeaders(user, getToken)),
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(`${API_BASE}/api/payments/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ planId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const plan = BUSINESS_PLANS[planId] || BUSINESS_PLANS.mensal;
  const store = getFallbackStore();
  const sub = {
    id: `mp_sandbox_${Date.now()}`,
    userId: user.id,
    planId: plan.id,
    planName: plan.nome,
    price: plan.preco,
    status: 'pending',
  };
  store.subscriptions[user.id] = sub;
  saveFallbackStore(store);

  return {
    checkout: {
      subscriptionId: sub.id,
      checkoutUrl: `#empresas`,
      sandboxMode: true,
      message:
        'Modo de demonstração local: confirme o pagamento recorrente do Mercado Pago abaixo para liberar sua área de publicação.',
    },
    subscription: computeLocalSubscription(sub),
  };
}

export async function confirmMercadoPagoPayment(user, getToken, planId, mercadoPagoId = '') {
  const headers = {
    ...(await buildAuthHeaders(user, getToken)),
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(`${API_BASE}/api/payments/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ planId, mercadoPagoId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const plan = BUSINESS_PLANS[planId] || BUSINESS_PLANS.mensal;
  const days = plan.id === 'semanal' ? 7 : plan.id === 'anual' ? 365 : 30;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const store = getFallbackStore();
  const sub = {
    id: `sub_${user.id}`,
    userId: user.id,
    planId: plan.id,
    planName: plan.nome,
    price: plan.preco,
    status: 'active',
    mercadoPagoId: mercadoPagoId || `mp_approved_${Date.now()}`,
    startedAt: now.toISOString(),
    expiresAt,
  };
  store.subscriptions[user.id] = sub;
  saveFallbackStore(store);

  return {
    message:
      'Pagamento recorrente confirmado com sucesso! Seu acesso para publicar e atualizar seu negócio está liberado.',
    subscription: computeLocalSubscription(sub),
  };
}

export async function simulateSubscriptionExpiration(user, getToken, daysLeft) {
  const headers = {
    ...(await buildAuthHeaders(user, getToken)),
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(`${API_BASE}/api/me/simulate-expiration`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ daysLeft }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const store = getFallbackStore();
  const existing = store.subscriptions[user.id] || {
    id: `sub_${user.id}`,
    userId: user.id,
    planId: 'mensal',
    planName: 'Mensal Recorrente',
    price: 49.99,
    startedAt: new Date().toISOString(),
  };

  if (daysLeft <= 0) {
    existing.status = 'expired';
    existing.expiresAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  } else {
    existing.status = 'active';
    existing.expiresAt = new Date(
      Date.now() + (daysLeft * 24 - 1) * 60 * 60 * 1000
    ).toISOString();
  }

  store.subscriptions[user.id] = existing;
  saveFallbackStore(store);
  return {
    subscription: computeLocalSubscription(existing),
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadPartnerFiles(user, getToken, files) {
  const headers = await buildAuthHeaders(user, getToken);
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append('images', file);
  });

  try {
    const res = await fetch(`${API_BASE}/api/partner/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      return data.urls || [];
    }
  } catch {
    // fallback to DataURL if Go backend is unreachable
  }

  return Promise.all(Array.from(files).map(fileToDataUrl));
}

export async function savePartnerProfile(user, getToken, payload) {
  const headers = {
    ...(await buildAuthHeaders(user, getToken)),
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(`${API_BASE}/api/partner/profile`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível salvar o cadastro do parceiro.');
    }
    return data;
  } catch (err) {
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
  }

  const digits = (payload.telefone || '').replace(/\D/g, '');
  const whatsappNorm = digits.length <= 11 ? `55${digits}` : digits;
  const store = getFallbackStore();
  const profile = {
    id: store.partners[user.id]?.id || `partner_${Date.now()}`,
    userId: user.id,
    userEmail: user.email,
    responsavelNome: payload.responsavelNome,
    telefone: payload.telefone,
    whatsappNorm,
    empresaNome: payload.empresaNome,
    ramo: payload.ramo,
    regiao: payload.regiao || 'Centro',
    endereco: payload.endereco,
    descricao: payload.descricao,
    logoUrl: payload.logoUrl || '',
    imagens: payload.imagens || [],
    published: true,
    whatsappClicks: store.partners[user.id]?.whatsappClicks || 0,
    updatedAt: new Date().toISOString(),
  };
  store.partners[user.id] = profile;
  saveFallbackStore(store);

  return {
    message: 'Sua empresa parceira foi publicada com sucesso na vitrine do Ubatuba Conecta!',
    partner: profile,
  };
}

export async function fetchPublicPartners() {
  try {
    const res = await fetch(`${API_BASE}/api/partners/public`);
    if (res.ok) {
      const data = await res.json();
      return data.partners || [];
    }
  } catch {
    // fallback
  }

  const store = getFallbackStore();
  return Object.values(store.partners).filter((p) => {
    const sub = computeLocalSubscription(store.subscriptions[p.userId]);
    return p.published && sub.canPost && !sub.expired;
  });
}

export async function recordPartnerWhatsappClick(partnerId) {
  try {
    await fetch(`${API_BASE}/api/partners/${partnerId}/click`, { method: 'POST' });
  } catch {
    // ignore
  }
}
