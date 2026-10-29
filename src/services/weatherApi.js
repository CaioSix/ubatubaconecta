import { UBATUBA_COORDS } from '../data/ubatubaData';

const WMO_DESCRIPTIONS = {
  0: { label: 'Céu limpo e ensolarado', icon: 'sun', beachTip: 'Excelente para praia e passeios de barco. Use protetor solar!' },
  1: { label: 'Predominantemente ensolarado', icon: 'sun', beachTip: 'Ótimo dia para curtir as praias e ilhas de Ubatuba.' },
  2: { label: 'Sol entre nuvens', icon: 'cloud-sun', beachTip: 'Clima agradável para praia, trilhas e passeios ao ar livre.' },
  3: { label: 'Nublado', icon: 'cloud', beachTip: 'Bom para caminhadas na orla, gastronomia e trilhas leves.' },
  45: { label: 'Neblina costeira', icon: 'cloud', beachTip: 'Atenção redobrada nas serras (Oswaldo Cruz e Tamoios).' },
  48: { label: 'Neblina úmida', icon: 'cloud', beachTip: 'Visibilidade reduzida na serra; mar geralmente calmo.' },
  51: { label: 'Garoa leve', icon: 'cloud-drizzle', beachTip: 'Chuvisco passageiro típico da Mata Atlântica.' },
  53: { label: 'Garoa moderada', icon: 'cloud-drizzle', beachTip: 'Bom momento para conhecer cafés, aquário e restaurantes locais.' },
  55: { label: 'Garoa intensa', icon: 'cloud-rain', beachTip: 'Evite trilhas escorregadias e cachoeiras.' },
  61: { label: 'Chuva fraca', icon: 'cloud-rain', beachTip: 'Pancadas leves; acompanhe a evolução antes de passeios de barco.' },
  63: { label: 'Chuva moderada', icon: 'cloud-rain', beachTip: 'Evite cachoeiras (risco de cabeça d’água) e trilhas longas.' },
  65: { label: 'Chuva forte', icon: 'cloud-lightning', beachTip: 'Atenção aos alertas da Defesa Civil (SMS 40199).' },
  80: { label: 'Pancadas de chuva de verão', icon: 'cloud-sun-rain', beachTip: 'Típico de Ubatuba: sol pela manhã e pancadas rápidas à tarde.' },
  81: { label: 'Pancadas moderadas', icon: 'cloud-rain', beachTip: 'Fique atento à mudança rápida de vento no mar.' },
  82: { label: 'Pancadas fortes', icon: 'cloud-lightning', beachTip: 'Procure abrigo seguro e evite áreas abertas ou mar agitado.' },
  95: { label: 'Tempestade com trovoadas', icon: 'cloud-lightning', beachTip: 'Saia da água e da faixa de areia imediatamente.' },
  96: { label: 'Tempestade severa', icon: 'cloud-lightning', beachTip: 'Permaneça em local abrigado e acompanhe a Defesa Civil.' },
};

export function getWeatherInfo(code) {
  return (
    WMO_DESCRIPTIONS[code] || {
      label: 'Tempo variável no litoral',
      icon: 'cloud-sun',
      beachTip: 'Confira as condições locais na praia escolhida.',
    }
  );
}

export function degreesToCompass(deg) {
  if (deg === null || deg === undefined || Number.isNaN(Number(deg))) return 'SE';
  const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  const ix = Math.round(((Number(deg) % 360) / 45)) % 8;
  return dirs[ix];
}

export async function fetchUbatubaWeatherAndMarine() {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${UBATUBA_COORDS.latitude}&longitude=${UBATUBA_COORDS.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset` +
    `&timezone=America%2FSao_Paulo`;

  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${UBATUBA_COORDS.marineLatitude}&longitude=${UBATUBA_COORDS.marineLongitude}` +
    `&current=wave_height,wave_direction,wave_period,sea_surface_temperature` +
    `&daily=wave_height_max,wave_period_max` +
    `&timezone=America%2FSao_Paulo`;

  const [weatherRes, marineRes] = await Promise.allSettled([
    fetch(weatherUrl).then((r) => {
      if (!r.ok) throw new Error('Falha ao buscar clima');
      return r.json();
    }),
    fetch(marineUrl).then((r) => {
      if (!r.ok) throw new Error('Falha ao buscar dados marinhos');
      return r.json();
    }),
  ]);

  const weatherData = weatherRes.status === 'fulfilled' ? weatherRes.value : null;
  const marineData = marineRes.status === 'fulfilled' ? marineRes.value : null;

  if (!weatherData || !weatherData.current) {
    throw new Error('Dados meteorológicos indisponíveis no momento');
  }

  const currentInfo = getWeatherInfo(weatherData.current.weather_code);
  const dailyForecast = (weatherData.daily?.time || []).slice(0, 7).map((dateStr, idx) => {
    const code = weatherData.daily.weather_code?.[idx] ?? 2;
    const info = getWeatherInfo(code);
    return {
      date: dateStr,
      tempMax: Math.round(weatherData.daily.temperature_2m_max?.[idx] ?? 27),
      tempMin: Math.round(weatherData.daily.temperature_2m_min?.[idx] ?? 20),
      rainProb: weatherData.daily.precipitation_probability_max?.[idx] ?? 20,
      uvMax: weatherData.daily.uv_index_max?.[idx] ?? 7,
      waveMax: marineData?.daily?.wave_height_max?.[idx] ?? null,
      code,
      label: info.label,
      icon: info.icon,
    };
  });

  return {
    updatedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    current: {
      temp: Math.round(weatherData.current.temperature_2m),
      feelsLike: Math.round(weatherData.current.apparent_temperature),
      humidity: Math.round(weatherData.current.relative_humidity_2m),
      precipitation: weatherData.current.precipitation,
      windSpeed: Math.round(weatherData.current.wind_speed_10m),
      windDir: degreesToCompass(weatherData.current.wind_direction_10m),
      uvIndex: Number(weatherData.current.uv_index ?? 0).toFixed(1),
      weatherCode: weatherData.current.weather_code,
      conditionLabel: currentInfo.label,
      icon: currentInfo.icon,
      beachTip: currentInfo.beachTip,
    },
    marine: marineData?.current
      ? {
          waveHeight: Number(marineData.current.wave_height ?? 0.8).toFixed(1),
          wavePeriod: Math.round(marineData.current.wave_period ?? 7),
          waveDir: degreesToCompass(marineData.current.wave_direction),
          waterTemp: Math.round(marineData.current.sea_surface_temperature ?? 23),
        }
      : {
          waveHeight: '0.9',
          wavePeriod: 7,
          waveDir: 'SE',
          waterTemp: 23,
        },
    daily: dailyForecast,
  };
}
