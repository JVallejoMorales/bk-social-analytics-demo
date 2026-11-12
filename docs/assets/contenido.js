import { CUT, NETWORKS, PRIOR_CUT, dateLabel, dayLabel, fmt, interactions, pct, signed } from './modelo.js';
import { esc, filterForm, heading, icon, kpis, table, tabs } from './graficos.js';

const motifs = {
  cup: '<path d="M29 35h53v15a23 23 0 0 1-23 23h-7a23 23 0 0 1-23-23Z"/><path d="M82 41h8a8 8 0 0 1 0 16H80M27 82h60M46 27c8-7-2-8 6-15m12 15c8-7-2-8 6-15"/>',
  leaf: '<path d="M31 75C30 43 52 23 87 23c0 33-16 53-46 51m-15 9 48-47m-33 34-2-19m14 8 19-1"/>',
  bag: '<path d="M42 22h35l11 16-5 43H37l-6-43Zm-11 16h57M42 22v16m35-16v16M44 54h32v15H44z"/>',
  brew: '<path d="M40 22h40l-7 25 13 25c2 5-1 9-6 9H40c-5 0-8-4-6-9l13-25Zm7 25h26M37 68h46M53 29h14"/>',
  beans: '<ellipse cx="49" cy="52" rx="15" ry="28" transform="rotate(-29 49 52)"/><path d="M37 29c-6 16 18 26 23 48"/><ellipse cx="79" cy="56" rx="13" ry="22" transform="rotate(25 79 56)"/><path d="M89 37c3 15-14 22-18 38"/>',
  glass: '<path d="M40 34h42l-7 47H47Zm21-2 9-14h13M43 54h36M53 45l9-3 4 10-10 3zm11 18 8-3 4 8-9 4z"/>',
};
const storyFormat = ['Video', 'Imagen'];
const baseMetrics = {
  views: ['Vistas', (post) => post.views],
  reach: ['Alcance estimado', (post) => post.reach],
  interactions: ['Interacciones', interactions],
  saves: ['Guardados', (post) => post.saves],
  shares: ['Compartidos', (post) => post.shares],
  comments: ['Comentarios', (post) => post.comments],
  likes: ['Me gusta', (post) => post.likes],
  follows: ['Seguidores desde la publicación', (post) => post.follows],
  profileViews: ['Visitas al perfil', (post) => post.profileViews],
  skip: ['Omisión de Reels', (post) => post.skip, pct],
};
const ratioFields = ['saves', 'shares', 'interactions', 'follows', 'profileViews', 'comments'];
const postMetrics = {
  ...baseMetrics,
  ...Object.fromEntries(ratioFields.map((key) => {
    const [label, valueOf] = baseMetrics[key];
    return [key + 'Ratio', [label + ' / alcance', (post) => {
      const value = valueOf(post);
      return value == null || !post.reach ? null : value / post.reach;
    }, pct]];
  })),
};
const storyMetrics = {
  reach: baseMetrics.reach, replies: ['Respuestas', (story) => story.comments], shares: baseMetrics.shares,
  forwards: ['Adelante', (story) => story.forwards], backwards: ['Atrás', (story) => story.backwards],
  exits: ['Salidas', (story) => story.exits],
};
const option = (value, label, selected) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
const openLabel = (network, isStory) => isStory ? 'Ver historia' : network === 'tiktok' ? 'Ficha avanzada' : 'Ver detalles';
const open = (post, label, classes = 'text-link') =>
  `<button type="button" class="${classes}" data-detail="${post.id}" aria-label="${label}: ${esc(post.title)}">${label}</button>`;
const paginationSize = 12;

function artwork(post, tiktok) {
  return `<div class="artwork tone-${post.tone}" aria-hidden="true">
    <svg class="motif" viewBox="0 0 120 100" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${motifs[post.motif]}</svg>
    ${tiktok ? '<span class="play"><svg viewBox="0 0 24 24"><path d="m9 6 10 6-10 6Z" fill="currentColor"/></svg></span>' : ''}
  </div>`;
}

function mediaCard(post, network, isStory) {
  const tiktok = network === 'tiktok';
  const columns = tiktok
    ? [['Visualizaciones', post.views], ['Me gusta', post.likes], ['Comentarios', post.comments], ['Compartidos', post.shares]]
    : isStory
      ? [['Vistas', post.views], ['Alcance', post.reach], ['Interacciones', interactions(post)]]
      : [['Me gusta', post.likes], ['Comentarios', post.comments], ['Compartidos', post.shares], ...(post.format === 'Reel' ? [['Vistas', post.views]] : [])];
  return `<article class="media-card">
    <div class="media-cover">${artwork(post, tiktok)}<span>${esc(post.format)}</span></div>
    <div class="media-info"><div class="media-meta"><time datetime="${post.date}">${dateLabel(post.date)}</time><span>${post.id}</span></div>
      <h2>${esc(post.title)}</h2>
      <dl class="media-metrics">${columns.map(([label, value]) => `<div><dt>${label}</dt><dd>${fmt(value)}</dd></div>`).join('')}</dl>
      ${open(post, openLabel(network, isStory), 'button secondary detail-link')}
    </div>
  </article>`;
}

function catalogTable(posts) {
  return `<section class="panel">
    <div class="panel-heading"><div><h2>Tabla de publicaciones</h2><p>Contadores al ${dateLabel(CUT)}</p></div></div>
    ${table('Publicaciones de TikTok', ['Publicación', 'Fecha', 'Visualizaciones', 'Me gusta', 'Comentarios', 'Compartidos', ''],
      posts.map((post) => [esc(post.title), dateLabel(post.date), fmt(post.views), fmt(post.likes), fmt(post.comments), fmt(post.shares),
        open(post, 'Ficha avanzada')]), { className: 'media-grid-table' })}
  </section>`;
}

function ranking(items, metrics, key, isStory, offset) {
  const [label, valueOf, format = fmt] = metrics[key];
  const common = isStory ? ['reach', 'replies', 'shares', 'forwards', 'backwards', 'exits'] : ['views', 'reach', 'interactions', 'saves', 'shares'];
  const columns = [...new Set([key, ...common])];
  const display = (item, column) => {
    const [, valueOf, format = fmt] = metrics[column];
    const output = format(valueOf(item));
    return column === key ? `<strong class="selected-metric">${output}</strong>` : output;
  };
  return `<section class="panel"><div class="panel-heading"><div><h2>Ranking por ${label.toLowerCase()}</h2>
    ${items.some((post) => valueOf(post) == null) ? '<p>Las piezas sin valor para esta métrica aparecen al final.</p>' : ''}</div></div>
    ${table('Comparativo', ['Posición', isStory ? 'Historia' : 'Publicación', 'Fecha', 'Formato', ...columns.map((column) => metrics[column][0]), ''],
      items.map((item, index) => [valueOf(item) == null ? '—' : fmt(offset + index + 1), esc(item.title), dayLabel(item.date), esc(item.format),
        ...columns.map((column) => display(item, column)), open(item, isStory ? 'Ver historia' : 'Ver detalles')]), { className: 'media-grid-table' })}
  </section>`;
}

export function contentPage({ network, state, items, isStory = false }) {
  const tiktok = network === 'tiktok';
  const route = isStory ? 'historias' : 'publicaciones';
  const compare = state.view === 'compare';
  const metrics = isStory ? storyMetrics : postMetrics;
  const formats = isStory ? storyFormat : NETWORKS[network].formats;
  const options = [['cards', 'Tarjetas'], tiktok ? ['table', 'Tabla'] : ['compare', 'Comparativos']];
  const exportButton = !isStory ? `<button class="button secondary" type="button" data-export${items.length ? '' : ' disabled'}>${icon('download')} Descargar CSV</button>` : '';
  const filters = filterForm(state, route, {
    prefix: 'Publicadas ',
    extra: `<label class="search-label">Buscar por título o ID<input type="search" name="query" value="${esc(state.query)}" maxlength="60" placeholder="Título o ID"></label>
      ${formats.length > 1 ? `<label>Formato<select name="format">${option('', 'Todos', state.format)}${formats.map((value) => option(value, value, state.format)).join('')}</select></label>` : ''}
      ${compare ? `<label class="metric-select">Ordenar por<select name="metric">${Object.entries(metrics).map(([id, [label]]) => option(id, label, state.metric)).join('')}</select></label>` : ''}`,
  });
  const pagination = Math.max(1, Math.ceil(items.length / paginationSize));
  const page = Math.min(state.page, pagination);
  const offset = (page - 1) * paginationSize;
  let sorted = items;
  if (compare) {
    const [, valueOf] = metrics[state.metric];
    sorted = [...items].sort((a, b) => (valueOf(b) ?? -1) - (valueOf(a) ?? -1));
  }
  const visible = sorted.slice(offset, offset + paginationSize);
  let body;
  if (!visible.length) body = '<section class="panel"><p class="empty">No hay resultados para los filtros seleccionados.</p></section>';
  else if (compare) body = ranking(visible, metrics, state.metric, isStory, offset);
  else if (state.view === 'table') body = catalogTable(visible);
  else body = `<div class="media-grid ${tiktok ? 'video-grid' : 'portrait-grid'}">${visible.map((post) => mediaCard(post, network, isStory)).join('')}</div>`;
  const count = `<p class="section-note">${fmt(items.length)} ${items.length === 1 ? 'resultado' : 'resultados'} · Corte del ${dateLabel(CUT)}</p>`;
  const pages = pagination > 1 ? `<nav class="pagination" aria-label="Páginas de resultados">
    <button class="button secondary" type="button" data-page="${page - 1}"${page === 1 ? ' disabled' : ''}>Anterior</button>
    <span>Página ${page} de ${pagination}</span>
    <button class="button secondary" type="button" data-page="${page + 1}"${page === pagination ? ' disabled' : ''}>Siguiente</button>
  </nav>` : '';
  return heading(route, isStory ? 'Consulta el rendimiento y la navegación de las historias.' : 'Explora los contenidos y sus estadísticas acumuladas.', exportButton)
    + tabs('Vista del catálogo', options, state.view) + filters + count + body + pages;
}

function videoDetails(post) {
  const seconds = Math.round(post.duration * 0.43 * 10) / 10;
  const hours = Math.round(post.views * seconds / 360) / 10;
  const retention = Math.round(post.duration * 0.17);
  const completion = 0.14 + post.day % 13 / 100;
  const sources = [['Para ti', 0.72], ['Perfil personal', 0.11], ['Búsqueda', 0.09], ['Siguiendo', 0.05], ['Otras', 0.03]];
  return `<section class="detail-section"><h3>Ficha avanzada</h3>
    ${kpis([['Visualizaciones', fmt(post.views), 'Al corte'], ['Tiempo total de reproducción', fmt(hours) + ' h', 'Tiempo acumulado'],
      ['Tiempo promedio', fmt(seconds) + ' s', 'Por reproducción'], ['Video completo', pct(completion), 'De las reproducciones']], 'four')}</section>
    <div class="audience-grid detail-section"><section class="panel">
      <h3>Retención</h3><p>Momento de abandono señalado <strong>${retention} s</strong></p><p>Duración del video ${post.duration} s.</p>
    </section><section class="panel"><h3>Fuentes de tráfico</h3>
      ${table('Fuentes de tráfico', ['Fuente', 'Participación'], sources.map(([label, share]) => [label, pct(share)]))}
    </section></div>`;
}

function instagramDetails(post) {
  const keys = ['views', 'likes', 'comments', 'saves', 'shares'];
  const snapshot = kpis([['Vistas', fmt(post.views), 'Al corte', 'eye'], ['Alcance estimado', fmt(post.reach), 'Cuentas únicas', 'people'],
    ['Interacciones', fmt(interactions(post)), 'Acumuladas', 'heart'], ['Guardados', fmt(post.saves), 'Acumulados', 'chart'],
    ['Compartidos', fmt(post.shares), 'Acumulados', 'video']]);
  const rows = keys.map((key) => [baseMetrics[key][0], fmt(post.previous?.[key]), fmt(post[key]), signed(post.previous ? post[key] - post.previous[key] : null)]);
  return `<section class="detail-section"><h3>Rendimiento de la publicación</h3>${snapshot}</section>
    <section class="panel detail-section"><div class="panel-heading"><div><h3>Evolución entre capturas</h3><p>
      ${post.previous ? 'Captura anterior del ' + dateLabel(PRIOR_CUT) + ' y actual del ' + dateLabel(CUT) + '.' : 'La publicación se creó después de la captura anterior.'}
    </p></div></div>${table('Evolución entre capturas', ['Indicador', 'Captura anterior', 'Última captura', 'Diferencia'], rows)}</section>`;
}

function storyDetails(story) {
  const actions = [['Me gusta', story.likes], ['Respuestas', story.comments], ['Compartidos', story.shares]];
  const moves = [['Adelante', story.forwards], ['Atrás', story.backwards], ['Siguiente historia', story.next], ['Salidas', story.exits]];
  return `<section class="detail-section"><h3>Rendimiento de la historia</h3>
    ${kpis([['Vistas', fmt(story.views), 'Acumuladas'], ['Alcance estimado', fmt(story.reach), 'Cuentas únicas'],
      ['Interacciones', fmt(interactions(story)), 'Acumuladas']], 'three')}</section>
    <div class="audience-grid detail-section">
      ${[['Interacciones', actions], ['Navegación', moves]].map(([label, rows]) => `<section class="panel"><h3>${label}</h3>
      ${table(label, ['Acción', 'Total'], rows.map(([name, value]) => [name, fmt(value)]))}</section>`).join('')}
    </div>`;
}

export function detailPage(post, network, isStory) {
  const body = isStory ? storyDetails(post) : network === 'tiktok' ? videoDetails(post) : instagramDetails(post);
  return `<div class="detail-meta">
    ${artwork(post, network === 'tiktok')}
    <div><p>${esc(post.format)} · ${post.id}</p><p>Publicado el ${dateLabel(post.date)}</p><p>Métricas al ${dateLabel(CUT)}</p></div>
  </div>${body}`;
}
