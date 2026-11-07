import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const WARNING_THRESHOLD_DAYS = 3;
const KV_STORE_KEY = 'ubatuba_conecta_store_v1';
const TMP_STORE_PATH = path.join(os.tmpdir(), 'ubatuba-store.json');

const NEWS_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 dias: notícias mais antigas somem sozinhas
const MAX_NEWS_ITEMS = 6;
let memoryNewsCache = { fetchedAt: 0, items: [] };

function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssXml(xmlText, defaultSource) {
  const items = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  const now = Date.now();

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const pubDateMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const descMatch = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);

    let title = decodeHtmlEntities(titleMatch ? titleMatch[1] : '');
    const link = decodeHtmlEntities(linkMatch ? linkMatch[1] : '');
    const rawDate = pubDateMatch ? decodeHtmlEntities(pubDateMatch[1]) : '';
    let source = decodeHtmlEntities(sourceMatch ? sourceMatch[1] : defaultSource);

    if (!title || !link) continue;

    // Se o título vier no formato "Manchete - Fonte", separa a fonte
    const dashIdx = title.lastIndexOf(' - ');
    if (dashIdx > 20 && (!sourceMatch || source === defaultSource)) {
      source = title.slice(dashIdx + 3).trim();
      title = title.slice(0, dashIdx).trim();
    }

    const pubTime = rawDate ? new Date(rawDate).getTime() : now;
    if (!Number.isFinite(pubTime)) continue;

    // Ignora notícias com mais de 5 dias para não acumular nem sobrecarregar o site
    if (now - pubTime > NEWS_MAX_AGE_MS) continue;

    let summary = decodeHtmlEntities(descMatch ? descMatch[1] : '');
    if (summary === title || summary.startsWith(title.slice(0, 30))) {
      summary = '';
    }
    if (summary.length > 180) {
      summary = `${summary.slice(0, 177).trim()}...`;
    }

    items.push({
      id: `news-${Buffer.from(link).toString('base64').slice(0, 16)}`,
      title,
      url: link,
      source: source || defaultSource,
      summary,
      publishedAt: new Date(pubTime).toISOString(),
    });
  }

  return items;
}

async function getDynamicUbatubaNews() {
  const now = Date.now();
  // Mantém em memória por 15 minutos e sempre limpa itens vencidos (> 5 dias)
  if (memoryNewsCache.items.length > 0 && now - memoryNewsCache.fetchedAt < 15 * 60 * 1000) {
    return memoryNewsCache.items.filter(
      (i) => now - new Date(i.publishedAt).getTime() <= NEWS_MAX_AGE_MS
    );
  }

  const feeds = [
    {
      url: 'https://news.google.com/rss/search?q=Ubatuba+SP+when:5d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
      source: 'Notícias de Ubatuba',
    },
    {
      url: 'https://www.ubatuba.sp.gov.br/feed/',
      source: 'Prefeitura de Ubatuba',
    },
  ];

  const collected = [];
  await Promise.allSettled(
    feeds.map(async (f) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      try {
        const res = await fetch(f.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'UbatubaConectaBot/1.0 (+https://ubatubaconecta.com.br)' },
        });
        if (res.ok) {
          const xml = await res.text();
          collected.push(...parseRssXml(xml, f.source));
        }
      } finally {
        clearTimeout(timer);
      }
    })
  );

  // Remove duplicados por título semelhante e limita às 6 mais recentes (<= 5 dias)
  const seenTitles = new Set();
  const deduped = collected
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item) => {
      const key = item.title.toLowerCase().slice(0, 45);
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .slice(0, MAX_NEWS_ITEMS);

  memoryNewsCache = {
    fetchedAt: now,
    items: deduped,
  };

  return deduped;
}

const AVAILABLE_PLANS = [
  {
    id: 'semanal',
    nome: 'Plano Semanal',
    periodo: '7 dias',
    duracaoDias: 7,
    avisoDias: 3,
    preco: 19.99,
    descricao: 'Para divulgação rápida por uma semana ou ações promocionais de fim de semana.',
    recommended: false,
    frequenciaTipo: 'days',
    frequenciaVal: 7,
  },
  {
    id: 'mensal',
    nome: 'Plano Mensal',
    periodo: '30 dias',
    duracaoDias: 30,
    avisoDias: 3,
    preco: 49.99,
    descricao: 'Destaque contínuo durante o mês inteiro para turistas e moradores.',
    recommended: true,
    frequenciaTipo: 'months',
    frequenciaVal: 1,
  },
  {
    id: 'anual',
    nome: 'Plano Anual',
    periodo: '365 dias',
    duracaoDias: 365,
    avisoDias: 3,
    preco: 399.99,
    descricao: 'Presença garantida o ano todo, incluindo feriados e alta temporada de verão.',
    recommended: false,
    frequenciaTipo: 'months',
    frequenciaVal: 12,
  },
];

function findPlan(id) {
  return AVAILABLE_PLANS.find((p) => p.id === id) || null;
}

// In-memory cache + /tmp + optional Vercel KV (Upstash Redis) persistence
let memoryStore = null;

async function loadStore() {
  const kvUrl = (process.env.KV_REST_API_URL || '').trim().replace(/\/$/, '');
  const kvToken = (process.env.KV_REST_API_TOKEN || '').trim();

  if (kvUrl && kvToken) {
    try {
      const resp = await fetch(`${kvUrl}/get/${KV_STORE_KEY}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          memoryStore = {
            subscriptions: parsed.subscriptions || {},
            partners: parsed.partners || {},
          };
          return memoryStore;
        }
      }
    } catch {
      // Fallback to /tmp or memory
    }
  }

  if (memoryStore) return memoryStore;

  try {
    if (fs.existsSync(TMP_STORE_PATH)) {
      const raw = fs.readFileSync(TMP_STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      memoryStore = {
        subscriptions: parsed.subscriptions || {},
        partners: parsed.partners || {},
      };
      return memoryStore;
    }
  } catch {
    // ignore
  }

  memoryStore = { subscriptions: {}, partners: {} };
  return memoryStore;
}

async function saveStore(store) {
  memoryStore = store;
  const raw = JSON.stringify(store, null, 2);

  try {
    fs.writeFileSync(TMP_STORE_PATH, raw, 'utf8');
  } catch {
    // ignore /tmp errors
  }

  const kvUrl = (process.env.KV_REST_API_URL || '').trim().replace(/\/$/, '');
  const kvToken = (process.env.KV_REST_API_TOKEN || '').trim();
  if (kvUrl && kvToken) {
    try {
      await fetch(`${kvUrl}/set/${KV_STORE_KEY}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` },
        body: raw,
      });
    } catch {
      // ignore KV errors
    }
  }
}

function computeSubscriptionState(sub) {
  if (!sub || sub.status === 'none' || sub.status === 'pending' || !sub.expiresAt) {
    return {
      id: sub?.id || '',
      userId: sub?.userId || '',
      planId: sub?.planId || '',
      planName: sub?.planName || '',
      price: sub?.price || 0,
      status: sub?.status || 'none',
      mercadoPagoId: sub?.mercadoPagoId || '',
      checkoutUrl: sub?.checkoutUrl || '',
      warningThresholdDays: WARNING_THRESHOLD_DAYS,
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
      warningThresholdDays: WARNING_THRESHOLD_DAYS,
      daysRemaining,
      expiringSoon: false,
      expired: true,
      canPost: false,
      alertMessage: `Sua assinatura (${sub.planName}) venceu em ${expFormatted}. Renove sua recorrência no Mercado Pago para reativar seu anúncio no Ubatuba Conecta.`,
    };
  }

  const canPost = sub.status === 'active';
  const expiringSoon = canPost && daysRemaining <= WARNING_THRESHOLD_DAYS;
  const alertMessage = expiringSoon
    ? daysRemaining <= 1
      ? `Atenção: falta apenas 1 dia para o vencimento da sua assinatura (${sub.planName} — vence em ${expFormatted}). Verifique sua recorrência no Mercado Pago para não pausar seu anúncio!`
      : `Atenção: faltam ${daysRemaining} dias para o vencimento da sua assinatura (${sub.planName} — vence em ${expFormatted}). Mantenha sua recorrência em dia no Mercado Pago para continuar divulgando!`
    : '';

  return {
    ...sub,
    warningThresholdDays: WARNING_THRESHOLD_DAYS,
    daysRemaining,
    expiringSoon,
    expired: false,
    canPost,
    alertMessage,
  };
}

function extractUser(req) {
  const authHeader = (req.headers.authorization || '').trim();
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (claims.sub) {
          return {
            id: claims.sub,
            email: claims.email || req.headers['x-clerk-user-email'] || '',
            name: claims.name || req.headers['x-clerk-user-name'] || '',
          };
        }
      } catch {
        // fallback to headers
      }
    }
  }

  const userId = (req.headers['x-clerk-user-id'] || '').trim();
  if (userId) {
    return {
      id: userId,
      email: (req.headers['x-clerk-user-email'] || '').trim(),
      name: (req.headers['x-clerk-user-name'] || '').trim(),
    };
  }
  return null;
}

async function syncClerkMetadata(userId, sub) {
  const secretKey = (process.env.CLERK_SECRET_KEY || '').trim();
  if (!secretKey || !userId || userId.startsWith('dev_')) return;

  try {
    await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          partnerSubscriptionStatus: sub.status,
          partnerPlanId: sub.planId,
          partnerPlanName: sub.planName,
          partnerExpiresAt: sub.expiresAt || '',
          partnerDaysRemaining: sub.daysRemaining,
          partnerExpiringSoon: sub.expiringSoon,
          partnerExpired: sub.expired,
          partnerCanPost: sub.canPost,
          partnerAlertMessage: sub.alertMessage || '',
        },
      }),
    });
  } catch {
    // ignore clerk sync errors
  }
}

function normalizeWhatsapp(raw) {
  let digits = String(raw || '').replace(/\D+/g, '');
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  if (digits.length === 12 || digits.length === 13) {
    return digits;
  }
  return '';
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Clerk-User-Id, X-Clerk-User-Email, X-Clerk-User-Name'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const rewrittenPath = urlObj.searchParams.get('__path');
  const pathname = rewrittenPath
    ? `/api/${rewrittenPath.replace(/^\/+/, '')}`
    : urlObj.pathname;

  const store = await loadStore();

  // 1. GET /api/health
  if (req.method === 'GET' && pathname === '/api/health') {
    return res.status(200).json({
      status: 'ok',
      service: 'ubatuba-conecta-vercel-serverless-api',
    });
  }

  // 1.5 GET /api/news (Notícias dinâmicas de Ubatuba com expiração automática em 5 dias)
  if (req.method === 'GET' && pathname === '/api/news') {
    const items = await getDynamicUbatubaNews();
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({
      items,
      maxAgeDays: 5,
      updatedAt: new Date().toISOString(),
    });
  }

  // 2. GET /api/me/partner
  if (req.method === 'GET' && pathname === '/api/me/partner') {
    const user = extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    const sub = computeSubscriptionState(store.subscriptions[user.id]);
    const partner = store.partners[user.id] || null;
    await syncClerkMetadata(user.id, sub);

    return res.status(200).json({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      subscription: sub,
      partner,
      plans: AVAILABLE_PLANS,
    });
  }

  // 3. POST /api/payments/checkout
  if (req.method === 'POST' && pathname === '/api/payments/checkout') {
    const user = extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    const body = await parseJsonBody(req);
    const plan = findPlan(body.planId);
    if (!plan) {
      return res.status(400).json({ error: 'Plano inválido. Escolha semanal, mensal ou anual.' });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${req.headers.host}`;
    const accessToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();
    let checkoutResult;

    if (!accessToken) {
      const subId = `mp_sandbox_${Date.now()}`;
      checkoutResult = {
        subscriptionId: subId,
        checkoutUrl: `${baseUrl}/?mp_sandbox=1&plan=${plan.id}&sub_id=${subId}#empresas`,
        sandboxMode: true,
        message:
          'Modo de teste ativo (MERCADO_PAGO_ACCESS_TOKEN não configurado). Confirme o pagamento simulado abaixo para liberar a postagem imediatamente.',
      };
    } else {
      const mpPayload = {
        reason: `Ubatuba Conecta — Parceiro (${plan.nome})`,
        external_reference: `${user.id}|${plan.id}`,
        payer_email: user.email || 'parceiro@ubatubaconecta.com.br',
        auto_recurring: {
          frequency: plan.frequenciaVal,
          frequency_type: plan.frequenciaTipo,
          transaction_amount: plan.preco,
          currency_id: 'BRL',
        },
        back_url: process.env.FRONTEND_URL || baseUrl,
        status: 'pending',
      };

      const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mpPayload),
      });

      if (!mpRes.ok) {
        const errText = await mpRes.text();
        return res.status(502).json({ error: `Erro no Mercado Pago: ${errText}` });
      }
      const mpData = await mpRes.json();
      checkoutResult = {
        subscriptionId: mpData.id,
        checkoutUrl: mpData.init_point,
        sandboxMode: false,
        message:
          'Assinatura recorrente criada no Mercado Pago. Conclua o pagamento para liberar sua vitrine de parceiro.',
      };
    }

    const currentSub = computeSubscriptionState(store.subscriptions[user.id]);
    let updatedSub = currentSub;
    if (currentSub.status !== 'active' || currentSub.expired) {
      const rawSub = {
        id: checkoutResult.subscriptionId,
        userId: user.id,
        planId: plan.id,
        planName: plan.nome,
        price: plan.preco,
        status: 'pending',
        mercadoPagoId: checkoutResult.subscriptionId,
        checkoutUrl: checkoutResult.checkoutUrl,
        updatedAt: new Date().toISOString(),
      };
      store.subscriptions[user.id] = rawSub;
      await saveStore(store);
      updatedSub = computeSubscriptionState(rawSub);
    }

    return res.status(200).json({
      checkout: checkoutResult,
      subscription: updatedSub,
    });
  }

  // 4. POST /api/payments/confirm
  if (req.method === 'POST' && pathname === '/api/payments/confirm') {
    const user = extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    const body = await parseJsonBody(req);
    const existing = store.subscriptions[user.id];
    const planId = body.planId || existing?.planId || 'mensal';
    const plan = findPlan(planId);
    if (!plan) {
      return res.status(400).json({ error: 'Plano não encontrado.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.duracaoDias * 24 * 60 * 60 * 1000).toISOString();

    const rawSub = {
      id: `sub_${user.id}`,
      userId: user.id,
      planId: plan.id,
      planName: plan.nome,
      price: plan.preco,
      status: 'active',
      mercadoPagoId: body.mercadoPagoId || `mp_approved_${Date.now()}`,
      startedAt: now.toISOString(),
      expiresAt,
      updatedAt: now.toISOString(),
    };

    store.subscriptions[user.id] = rawSub;
    await saveStore(store);
    const computed = computeSubscriptionState(rawSub);
    await syncClerkMetadata(user.id, computed);

    return res.status(200).json({
      message:
        'Pagamento recorrente confirmado com sucesso! Seu acesso para publicar e atualizar seu negócio está liberado.',
      subscription: computed,
    });
  }

  // 5. POST /api/webhooks/mercadopago
  if (req.method === 'POST' && pathname === '/api/webhooks/mercadopago') {
    const body = await parseJsonBody(req);
    const extRef = body.external_reference || '';
    const approved = body.status === 'approved' || body.status === 'authorized';

    if (approved && extRef.includes('|')) {
      const [userId, planId] = extRef.split('|');
      const plan = findPlan(planId);
      if (plan && userId) {
        const now = new Date();
        const rawSub = {
          id: `sub_${userId}`,
          userId,
          planId: plan.id,
          planName: plan.nome,
          price: plan.preco,
          status: 'active',
          mercadoPagoId: body.data?.id || body.id || `mp_${Date.now()}`,
          startedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + plan.duracaoDias * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: now.toISOString(),
        };
        store.subscriptions[userId] = rawSub;
        await saveStore(store);
        await syncClerkMetadata(userId, computeSubscriptionState(rawSub));
      }
    }
    return res.status(200).json({ received: true });
  }

  // 6. POST /api/me/simulate-expiration
  if (req.method === 'POST' && pathname === '/api/me/simulate-expiration') {
    const user = extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    const body = await parseJsonBody(req);
    const daysLeft = Number(body.daysLeft ?? 3);
    const plan = findPlan('mensal');
    const existing = store.subscriptions[user.id] || {
      id: `sub_${user.id}`,
      userId: user.id,
      planId: plan.id,
      planName: plan.nome,
      price: plan.preco,
      startedAt: new Date().toISOString(),
    };

    if (daysLeft <= 0) {
      existing.status = 'expired';
      existing.expiresAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    } else {
      existing.status = 'active';
      existing.expiresAt = new Date(Date.now() + (daysLeft * 24 - 1) * 60 * 60 * 1000).toISOString();
    }
    existing.updatedAt = new Date().toISOString();

    store.subscriptions[user.id] = existing;
    await saveStore(store);
    const computed = computeSubscriptionState(existing);
    await syncClerkMetadata(user.id, computed);

    return res.status(200).json({ subscription: computed });
  }

  // 6.5 POST /api/partner/upload (Supports Vercel Blob 1GB free storage if BLOB_READ_WRITE_TOKEN is set, or compressed DataURL)
  if (req.method === 'POST' && pathname === '/api/partner/upload') {
    const user = extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    const sub = computeSubscriptionState(store.subscriptions[user.id]);
    if (!sub.canPost) {
      return res.status(403).json({
        error: 'Sua assinatura precisa estar ativa (paga) no Mercado Pago para enviar imagens.',
      });
    }

    const body = await parseJsonBody(req);
    const dataUrls = Array.isArray(body.images) ? body.images.slice(0, 6) : [];
    if (dataUrls.length === 0) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }

    const blobToken = (process.env.BLOB_READ_WRITE_TOKEN || '').trim();
    if (!blobToken) {
      // Sem Vercel Blob ativo, devolve as imagens já comprimidas (DataURL)
      return res.status(200).json({ urls: dataUrls });
    }

    const uploadedUrls = [];
    for (let i = 0; i < dataUrls.length; i++) {
      const item = String(dataUrls[i] || '');
      const match = item.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) {
        uploadedUrls.push(item);
        continue;
      }
      const mimeType = match[1];
      const ext = mimeType.split('/')[1] || 'jpg';
      const buffer = Buffer.from(match[2], 'base64');
      const filename = `partners/${user.id}/img_${Date.now()}_${i}.${ext}`;

      try {
        const blobRes = await fetch(`https://blob.vercel-storage.com/${filename}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${blobToken}`,
            'x-api-version': '7',
            'x-content-type': mimeType,
          },
          body: buffer,
        });
        if (blobRes.ok) {
          const blobData = await blobRes.json();
          uploadedUrls.push(blobData.url || item);
        } else {
          uploadedUrls.push(item);
        }
      } catch {
        uploadedUrls.push(item);
      }
    }

    return res.status(200).json({ urls: uploadedUrls });
  }

  // 7. POST / PUT /api/partner/profile
  if ((req.method === 'POST' || req.method === 'PUT') && pathname === '/api/partner/profile') {
    const user = extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    const sub = computeSubscriptionState(store.subscriptions[user.id]);
    if (!sub.canPost) {
      return res.status(403).json({
        error:
          'Pagamento pendente ou assinatura vencida. Ative sua recorrência no Mercado Pago para publicar seu negócio.',
      });
    }

    const body = await parseJsonBody(req);
    const responsavelNome = String(body.responsavelNome || '').trim();
    const empresaNome = String(body.empresaNome || '').trim();
    const telefone = String(body.telefone || '').trim();
    const whatsappNorm = normalizeWhatsapp(telefone);
    const imagens = Array.isArray(body.imagens) ? body.imagens : [];

    if (!responsavelNome || !empresaNome || !telefone) {
      return res.status(400).json({
        error: 'Preencha seu nome, telefone/WhatsApp e o nome da empresa.',
      });
    }
    if (!whatsappNorm) {
      return res.status(400).json({
        error: 'Informe um telefone/WhatsApp válido com DDD (ex: 12 99999-9999).',
      });
    }
    if (imagens.length === 0) {
      return res.status(400).json({
        error: 'Suba pelo menos 1 imagem referente ao seu negócio para aparecer na vitrine.',
      });
    }

    const existing = store.partners[user.id];
    const nowIso = new Date().toISOString();
    const profile = {
      id: existing?.id || `partner-${Date.now()}`,
      userId: user.id,
      userEmail: user.email,
      responsavelNome,
      telefone,
      whatsappNorm,
      empresaNome,
      ramo: String(body.ramo || '').trim() || 'Comércio & Serviços',
      regiao: String(body.regiao || '').trim() || 'Centro',
      endereco: String(body.endereco || '').trim(),
      descricao: String(body.descricao || '').trim(),
      logoUrl: String(body.logoUrl || '').trim(),
      imagens,
      published: true,
      whatsappClicks: existing?.whatsappClicks || 0,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    store.partners[user.id] = profile;
    await saveStore(store);

    return res.status(200).json({
      message: 'Sua empresa parceira foi publicada com sucesso na vitrine do Ubatuba Conecta!',
      partner: profile,
    });
  }

  // 8. GET /api/partners/public
  if (req.method === 'GET' && pathname === '/api/partners/public') {
    const activePartners = Object.values(store.partners).filter((p) => {
      if (!p.published) return false;
      const sub = computeSubscriptionState(store.subscriptions[p.userId]);
      return sub.canPost && !sub.expired;
    });
    return res.status(200).json({ partners: activePartners });
  }

  // 9. POST /api/partners/:id/click
  const clickMatch = pathname.match(/^\/api\/partners\/([^/]+)\/click$/);
  if (req.method === 'POST' && clickMatch) {
    const partnerId = clickMatch[1];
    const entry = Object.values(store.partners).find((p) => p.id === partnerId);
    if (!entry) {
      return res.status(404).json({ error: 'Parceiro não encontrado' });
    }
    entry.whatsappClicks = (entry.whatsappClicks || 0) + 1;
    await saveStore(store);
    return res.status(200).json({ partner: entry });
  }

  return res.status(404).json({ error: `Rota não encontrada: ${pathname}` });
}
