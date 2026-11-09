const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const NEWS_CACHE_KEY = 'ubatuba-conecta-live-news-v2';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de cache no navegador
export const NEWS_MAX_AGE_DAYS = 5; // Notícias com mais de 5 dias somem automaticamente
const NEWS_MAX_AGE_MS = NEWS_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const MAX_NEWS_ITEMS = 6;

function sanitizeNewsText(text = '') {
  return String(text || '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/<[a-zA-Z][^>]*$/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function filterAndLimitNews(items = []) {
  const now = Date.now();
  return items
    .filter((item) => {
      const ts = new Date(item.publishedAt).getTime();
      if (!Number.isFinite(ts)) return false;
      // Remove automaticamente notícias mais antigas que 5 dias para não sobrecarregar o site
      return now - ts <= NEWS_MAX_AGE_MS;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, MAX_NEWS_ITEMS)
    .map((item) => {
      const pubMs = new Date(item.publishedAt).getTime();
      const ageHours = Math.max(0, Math.floor((now - pubMs) / (1000 * 60 * 60)));
      const remainingDays = Math.max(
        1,
        Math.ceil((NEWS_MAX_AGE_MS - (now - pubMs)) / (1000 * 60 * 60 * 24))
      );
      let timeAgoLabel = 'Hoje';
      if (ageHours < 1) {
        timeAgoLabel = 'Agora mesmo';
      } else if (ageHours < 24) {
        timeAgoLabel = `Há ${ageHours}h`;
      } else {
        const days = Math.floor(ageHours / 24);
        timeAgoLabel = days === 1 ? 'Ontem' : `Há ${days} dias`;
      }

      let cleanTitle = sanitizeNewsText(item.title);
      const dashIdx = cleanTitle.lastIndexOf(' - ');
      if (dashIdx > 15) {
        cleanTitle = cleanTitle.slice(0, dashIdx).trim();
      }

      let cleanSummary = sanitizeNewsText(item.summary);
      if (
        !cleanSummary ||
        cleanSummary.toLowerCase() === cleanTitle.toLowerCase() ||
        cleanSummary.toLowerCase().startsWith(cleanTitle.toLowerCase().slice(0, 25))
      ) {
        cleanSummary = '';
      }

      return {
        ...item,
        title: cleanTitle || item.title,
        summary: cleanSummary,
        timeAgoLabel,
        expiresInDays: remainingDays,
      };
    });
}

export async function fetchUbatubaNews({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    try {
      const raw = window.sessionStorage.getItem(NEWS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.fetchedAt && Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
          const valid = filterAndLimitNews(parsed.items || []);
          if (valid.length > 0) {
            return valid;
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/news`);
    if (res.ok) {
      const data = await res.json();
      const valid = filterAndLimitNews(data.items || []);
      try {
        window.sessionStorage.setItem(
          NEWS_CACHE_KEY,
          JSON.stringify({ fetchedAt: Date.now(), items: valid })
        );
      } catch {
        // ignore quota errors
      }
      return valid;
    }
  } catch {
    // ignore network errors
  }

  return [];
}
