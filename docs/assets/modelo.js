export const NETWORKS = {
  tiktok: { name: 'TikTok', formats: ['Video'], count: 76, startFollowers: 3540, seed: 1 },
  instagram: { name: 'Instagram', formats: ['Reel', 'Carrusel', 'Imagen'], count: 69, startFollowers: 5280, seed: 2 },
};
export const REPORT_CASES = {
  valid: 'Reporte correcto',
  duplicate: 'Fecha duplicada',
  missing: 'Día faltante',
  mismatch: 'Total inconsistente',
};
export const START = '2026-01-01';
export const CUT = '2026-09-27';
const DAY = 86400000;
const AUDIENCE = 18000;
const instant = (day) => Date.parse(day + 'T00:00:00Z');
const iso = (time) => new Date(time).toISOString().slice(0, 10);
export const shift = (date, offset) => iso(instant(date) + offset * DAY);
export const DEFAULT_RANGE = { start: shift(CUT, -29), end: CUT };
export const HOUR_RANGE = { start: shift(CUT, -6), end: CUT };
export const PRIOR_CUT = shift(CUT, -7);
const dates = Array.from({ length: (instant(CUT) - instant(START)) / DAY + 1 }, (_, index) => shift(START, index));

const numeric = new Intl.NumberFormat('es-CO');
const percentage = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 2 });
const longDate = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' });
const weekday = new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' });
export const fmt = (value) => value == null ? '—' : numeric.format(value);
export const pct = (value) => value == null ? '—' : percentage.format(value);
export const dayLabel = (date) => date.slice(8, 10) + '/' + date.slice(5, 7);
export const dateLabel = (date) => longDate.format(new Date(instant(date)));
export const weekdayLabel = (date) => weekday.format(new Date(instant(date)));
export const signed = (value) => value == null ? '—' : (value > 0 ? '+' : '') + fmt(value);
export const interactions = (item) => item.likes + item.comments + item.shares + (item.saves ?? 0);

const topics = [
  'La primera taza del día', 'V60 en tres pasos', 'Pan de naranja y café', 'Del grano a la taza',
  'Cómo ajustar la molienda', 'Un espresso en cámara lenta', 'Degustación del mes', 'Café y música de fondo',
  'Tres aromas de la cosecha', 'Latte en una tarde de lluvia', 'La ruta del cacao', 'Turno de la mañana',
  'Aeropress para llevar', 'Un minuto con el tostador', 'Hielo, limón y café', 'Textura de la leche',
  'Molienda para prensa francesa', 'Un origen para compartir', 'La mesa junto a la ventana', 'Qué hay en la barra',
  'Detrás de la nueva bolsa', 'Una receta de cold brew', 'El color del tueste', 'Prueba de métodos',
  'Capuchino en casa', 'De vuelta a lo simple',
];
const motifs = ['cup', 'leaf', 'bag', 'brew', 'beans', 'glass'];
const cycle = { tiktok: ['Video'], instagram: ['Reel', 'Carrusel', 'Reel', 'Imagen', 'Carrusel', 'Reel'] };
const signal = (index, salt) => ((index * 941 + salt * 1229 + index * index * 53) % 997) / 997;
const counters = () => ({ views: 0, likes: 0, comments: 0, shares: 0, saves: 0 });

function buildNetwork(key, network) {
  const instagram = key === 'instagram';
  const posts = Array.from({ length: network.count }, (_, index) => {
    const day = 1 + Math.floor((index + 1) * (dates.length - 4) / (network.count + 1));
    const topicIndex = index + (instagram ? 4 : 0);
    const part = Math.floor(topicIndex / topics.length);
    return {
      id: `${instagram ? 'IG' : 'TT'}-${String(index + 1).padStart(3, '0')}`,
      title: topics[topicIndex % topics.length] + (part ? ` · parte ${part + 1}` : ''),
      date: dates[day], format: cycle[key][index % cycle[key].length],
      motif: motifs[(index + network.seed) % motifs.length], tone: (index + 2 * network.seed) % 6,
      day, weight: (2250 + signal(index, network.seed) * 7200) * (instagram ? 0.75 : 1),
      ...counters(), previous: dates[day] <= PRIOR_CUT ? counters() : null,
    };
  });

  let followers = network.startFollowers;
  const daily = dates.map((date, index) => {
    const baseline = 690 + Math.round(index * 5 + signal(index, network.seed + 10) * 650);
    const counts = { views: baseline, likes: Math.floor(baseline * 0.041), comments: 4, shares: 5, saves: instagram ? 8 : 0 };
    let publications = 0;
    for (const post of posts) {
      const age = index - post.day;
      if (age < 0) continue;
      if (age === 0) publications += 1;
      const activity = age < 3 ? [0.85, 0.65, 0.34][age] : 0.23 * Math.exp(-age / 6) + 0.008;
      const views = Math.round(post.weight * activity * (0.84 + signal(index + post.day, network.seed) * 0.36));
      const changes = {
        views,
        likes: Math.floor(views * (0.037 + signal(post.day, 8) * 0.04)),
        comments: Math.floor(views * 0.005),
        shares: Math.floor(views * 0.008),
        saves: instagram ? Math.floor(views * 0.011) : 0,
      };
      for (const [metric, count] of Object.entries(changes)) {
        post[metric] += count;
        counts[metric] += count;
        if (date <= PRIOR_CUT) post.previous[metric] += count;
      }
    }
    const reach = Math.min(AUDIENCE, Math.floor(counts.views * (0.6 + signal(index, 6) * 0.15)));
    const engaged = Math.min(reach, Math.floor(interactions(counts) * 0.79));
    const gained = Math.round(counts.views / 510 + signal(index, 7) * 15);
    const lost = 5 + (index % 9 === 0 ? 15 : 0);
    followers += gained - lost;
    return {
      date, ...counts, followers, gained, lost, net: gained - lost, reach, engaged, publications,
      offset: (index * 1697 + network.seed * 109) % AUDIENCE,
      profileViews: Math.floor(counts.views * 0.039),
      profileLinks: Math.floor(counts.views * 0.003),
      replies: instagram ? Math.floor(counts.comments * 0.17) : 0,
      reposts: instagram ? Math.floor(counts.shares * 0.14) : 0,
    };
  });
  return { daily, posts: posts.map(enrichPost) };
}

function enrichPost(post) {
  const reach = Math.round(post.views * (0.59 + signal(post.day, 8) * 0.24));
  return {
    ...post, reach,
    duration: post.format === 'Video' || post.format === 'Reel' ? 16 + post.day % 32 : null,
    profileViews: post.format === 'Reel' ? null : Math.floor(reach * 0.036),
    follows: post.format === 'Reel' ? null : Math.floor(reach * 0.009),
    skip: post.format === 'Reel' ? 0.24 + signal(post.day, 9) * 0.37 : null,
  };
}

const data = Object.fromEntries(Object.entries(NETWORKS).map(([key, network]) => [key, buildNetwork(key, network)]));

export function validRange(start, end, maxDays = dates.length) {
  if (!dates.includes(start) || !dates.includes(end) || start > end) return false;
  return (instant(end) - instant(start)) / DAY + 1 <= maxDays;
}

function uniqueAccounts(series, metric) {
  const seen = new Uint8Array(AUDIENCE);
  let count = 0;
  for (const day of series) {
    for (let index = 0; index < day[metric]; index += 1) {
      const person = (day.offset + index) % AUDIENCE;
      if (!seen[person]) {
        seen[person] = 1;
        count += 1;
      }
    }
  }
  return count;
}

const sumKeys = ['views', 'likes', 'comments', 'shares', 'saves', 'profileViews', 'gained', 'lost', 'profileLinks', 'replies', 'reposts', 'publications'];

export function rangeFor(key, start, end) {
  const series = data[key].daily.filter(({ date }) => start <= date && date <= end);
  const posts = data[key].posts.filter(({ date }) => start <= date && date <= end);
  const total = Object.fromEntries(sumKeys.map((field) => [field, series.reduce((sum, day) => sum + day[field], 0)]));
  const current = {
    ...total, reach: uniqueAccounts(series, 'reach'), engaged: uniqueAccounts(series, 'engaged'),
    interactions: interactions(total), followers: series.at(-1)?.followers ?? null, net: total.gained - total.lost,
    engagement: total.views ? interactions(total) / total.views : null,
  };
  return { series, posts, current, start, end };
}

export function profileFor(key) {
  const { daily, posts } = data[key];
  return {
    followers: daily.at(-1).followers,
    following: key === 'tiktok' ? 126 : 178,
    likes: posts.reduce((sum, post) => sum + post.likes, 0),
    publications: posts.length,
  };
}

export function monthlyFor(key) {
  return Array.from({ length: 12 }, (_, index) => {
    const start = `2026-${String(index + 1).padStart(2, '0')}-01`;
    const end = iso(Date.UTC(2026, index + 1, 0));
    const period = rangeFor(key, start, end);
    return { ...period, partial: period.series.length > 0 && period.series.at(-1).date !== end };
  });
}

function allocate(total, weights) {
  let remaining = total;
  return weights.map((weight, index) => {
    const value = index === weights.length - 1 ? remaining : Math.floor(total * weight);
    remaining -= value;
    return value;
  });
}

const demographics = {
  Género: [['Mujeres', 'Hombres', 'Sin especificar'], [0.57, 0.39, 0.04]],
  Edades: [['18–24', '25–34', '35–44', '45–54', '55 y más'], [0.31, 0.39, 0.19, 0.08, 0.03]],
  Países: [['Colombia', 'México', 'Perú', 'Chile', 'Otros'], [0.69, 0.11, 0.08, 0.07, 0.05]],
  Ciudades: [['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Otras'], [0.39, 0.22, 0.16, 0.1, 0.13]],
};

export function audienceFor(key, kind) {
  const total = kind === 'engaged' ? rangeFor(key, DEFAULT_RANGE.start, CUT).current.engaged : profileFor(key).followers;
  const dimensions = key === 'tiktok' ? ['Género', 'Países'] : Object.keys(demographics);
  return dimensions.map((dimension) => {
    const [labels, weights] = demographics[dimension];
    const mix = kind === 'engaged' ? [...weights.slice(1), weights[0]] : weights;
    const counts = allocate(total, mix);
    return { title: dimension, total, rows: labels.map((label, index) => ({ label, value: counts[index], share: counts[index] / total })) };
  });
}

export function viewersFor(start, end) {
  return rangeFor('tiktok', start, end).series.flatMap(({ date, reach }) => {
    const index = dates.indexOf(date);
    if (index % 23 === 3) return [];
    const fresh = Math.floor(reach * (0.53 + signal(index, 2) * 0.29));
    return [{ date, total: reach, fresh, recurring: reach - fresh }];
  });
}

export function heatFor(key, start, end) {
  return data[key].daily.filter(({ date }) => start <= date && date <= end).map(({ date, followers }) => {
    const day = dates.indexOf(date);
    return {
      date,
      hours: Array.from({ length: 24 }, (_, hour) => {
        if ((day * 7 + hour * 3) % 137 === 0) return null;
        if ((day + hour * 11) % 181 === 0) return 0;
        const lunch = 0.52 * Math.exp(-((hour - 12) ** 2) / 13);
        const evening = 0.91 * Math.exp(-((hour - 20) ** 2) / 18);
        return Math.round(followers * (0.025 + lunch * 0.19 + evening * 0.19 + signal(day + hour, 4) * 0.025));
      }),
    };
  });
}

export function breakdownFor(period) {
  const { current, posts } = period;
  const names = NETWORKS.instagram.formats;
  const counts = names.map((format) => posts.filter((post) => post.format === format).length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const weights = total ? counts.map((count) => count / total) : [0.56, 0.29, 0.15];
  return [
    { title: 'Resultados por formato', rows: breakdownRows(current, names, weights) },
    { title: 'Seguidores y no seguidores', rows: breakdownRows(current, ['Seguidores', 'No seguidores'], [0.39, 0.61]) },
  ];
}

function breakdownRows(current, labels, weights) {
  const totals = ['views', 'reach', 'interactions'].map((metric) => allocate(current[metric], weights));
  return labels.map((label, index) => ({ label, values: totals.map((metric) => metric[index]) }));
}

export const stories = Array.from({ length: 27 }, (_, index) => {
  const date = shift(CUT, -Math.floor((26 - index) * 2.1));
  const views = 900 + Math.round(signal(index, 4) * 3850);
  return {
    id: `HS-${String(index + 1).padStart(3, '0')}`, date, title: topics[index % topics.length],
    format: index % 3 === 0 ? 'Video' : 'Imagen', motif: motifs[index % motifs.length], tone: index % 6,
    views, reach: Math.floor(views * 0.83), likes: Math.floor(views * 0.038), comments: Math.floor(views * 0.005),
    shares: Math.floor(views * 0.009), saves: 0,
    forwards: Math.floor(views * 0.42), backwards: Math.floor(views * 0.052),
    exits: Math.floor(views * 0.081), next: Math.floor(views * 0.063),
  };
});

export function selectMedia(items, format, query) {
  const clean = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const needle = clean(query.trim());
  return items.filter((item) => (!format || item.format === format) && clean(`${item.title} ${item.id}`).includes(needle))
    .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));
}

export function postsCsv(posts) {
  const quote = (value) => '"' + String(value).replaceAll('"', '""') + '"';
  const headers = ['ID', 'Título', 'Formato', 'Fecha de publicación', 'Fecha de corte', 'Visualizaciones', 'Me gusta', 'Comentarios', 'Compartidos', 'Interacciones'];
  const rows = posts.map((post) => [
    post.id, post.title, post.format, post.date, CUT, post.views, post.likes, post.comments, post.shares, interactions(post),
  ]);
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(quote).join(';')).join('\r\n') + '\r\n';
}

const HEADER = 'fecha;visualizaciones;interacciones';

export function sampleReport(key, scenario) {
  const days = data[key].daily.slice(-7);
  const declared = { views: 0, interactions: 0 };
  let rows = days.map((day) => {
    declared.views += day.views;
    declared.interactions += interactions(day);
    return `${day.date};${day.views};${interactions(day)}`;
  });
  if (scenario === 'duplicate') rows = [...rows.slice(0, 3), rows[2], ...rows.slice(3)];
  if (scenario === 'missing') rows = rows.filter((_, index) => index !== 3);
  if (scenario === 'mismatch') declared.views += 1500;
  return { csv: [HEADER, ...rows].join('\n'), expected: days.map(({ date }) => date), declared };
}

export function validateReport({ csv, expected, declared }) {
  const [header, ...lines] = csv.trim().replace(/^\uFEFF/, '').split(/\r?\n/);
  const rows = lines.map((line) => line.split(';'));
  const columnsOK = header === HEADER && rows.length > 0 && rows.every(([date, views, actions, ...rest]) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) && !rest.length && [views, actions].every((value) =>
      /^\d+$/.test(value) && Number.isSafeInteger(Number(value))));
  const seen = new Set();
  const duplicates = new Set();
  for (const [date] of rows) {
    if (seen.has(date)) duplicates.add(date);
    seen.add(date);
  }
  const missing = expected.filter((date) => !seen.has(date));
  const outside = [...seen].filter((date) => !expected.includes(date));
  const actual = columnsOK ? rows.reduce((sum, [, views, actions]) => ({
    views: sum.views + Number(views), interactions: sum.interactions + Number(actions),
  }), { views: 0, interactions: 0 }) : null;
  const checks = [
    { name: 'Columnas y valores', ok: columnsOK, detail: columnsOK ? 'Encabezado y valores numéricos válidos.' : 'Se esperan tres columnas y conteos enteros no negativos.' },
    { name: 'Cobertura del período', ok: !missing.length && !outside.length, detail: missing.length || outside.length
      ? [missing.length ? `Faltan ${missing.join(', ')}.` : '', outside.length ? `Fuera de rango ${outside.join(', ')}.` : ''].filter(Boolean).join(' ')
      : 'Los siete días del período están presentes.' },
    { name: 'Fechas únicas', ok: !duplicates.size, detail: duplicates.size ? `Fechas repetidas ${[...duplicates].join(', ')}.` : 'Una fila por fecha.' },
    { name: 'Conciliación de totales', ok: Boolean(actual && actual.views === declared.views && actual.interactions === declared.interactions),
      detail: actual ? `Vistas calculadas ${fmt(actual.views)} de ${fmt(declared.views)} declaradas. Interacciones calculadas ${fmt(actual.interactions)} de ${fmt(declared.interactions)} declaradas.` : 'Corrige el formato para calcular los totales.' },
  ];
  return { checks, ready: checks.every(({ ok }) => ok), rows: rows.length, actual };
}
