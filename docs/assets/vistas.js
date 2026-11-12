import {
  CUT, NETWORKS, REPORT_CASES, audienceFor, breakdownFor, dateLabel, dayLabel, fmt,
  heatFor, interactions, monthlyFor, pct, profileFor, rangeFor, sampleReport, signed,
  validateReport, viewersFor, weekdayLabel,
} from './modelo.js';
import { bars, dateSpan, esc, filterForm, heading, icon, kpis, lineChart, table, tabs } from './graficos.js';

const colors = ['var(--accent)', 'var(--teal)', 'var(--rose)', 'var(--gold)'];
const mediaLabels = { likes: 'Me gusta', comments: 'Comentarios', shares: 'Compartidos', saves: 'Guardados' };
const detailButton = (post) => `<button type="button" class="text-link" data-detail="${esc(post.id)}">Ver ficha</button>`;
const updateLink = `<a href="#validacion" class="button primary">${icon('refresh')} Actualizar datos</a>`;
const dailyLink = `<a href="#seguimiento" class="text-link" data-daily>Explorar por día ${icon('arrow')}</a>`;

function interactionPanel(current, instagram) {
  const parts = Object.entries(mediaLabels).slice(0, instagram ? 4 : 3);
  const rows = parts.map(([key, label], index) => ({
    label, count: fmt(current[key]), portion: current.interactions ? current[key] / current.interactions : 0, color: colors[index],
  }));
  return `<section class="panel interaction-panel">
    <div class="panel-heading"><div><h2>Cada interacción cuenta</h2><p>Desglose del período</p></div></div>
    <div class="interaction-total"><strong>${fmt(current.interactions)}</strong><span>Interacciones totales</span></div>
    ${bars(rows)}
  </section>`;
}

function contentOfPeriod(posts) {
  const top = [...posts].sort((a, b) => b.views - a.views).slice(0, 3);
  return `<section class="panel">
    <div class="panel-heading"><div><h2>Contenido del período</h2><p>Los tres videos publicados en el rango con más visualizaciones al corte</p></div>
    <a href="#publicaciones" class="text-link">Ver publicaciones ${icon('arrow')}</a></div>
    ${top.length ? table('Contenido del período', ['Publicación', 'Fecha', 'Visualizaciones', 'Me gusta', 'Comentarios', 'Compartidos', ''],
      top.map((post) => [esc(post.title), dayLabel(post.date), fmt(post.views), fmt(post.likes), fmt(post.comments), fmt(post.shares), detailButton(post)]))
      : '<p class="empty">No se publicaron videos en este período.</p>'}
  </section>`;
}

function profilePanel(network) {
  const profile = profileFor(network);
  const entries = network === 'instagram'
    ? [['Seguidores', profile.followers], ['Seguidos', profile.following], ['Publicaciones', profile.publications]]
    : [['Seguidores', profile.followers], ['Seguidos', profile.following], ['Me gusta en videos', profile.likes], ['Videos', profile.publications]];
  return `<section class="panel"><div class="panel-heading"><div><h2>Foto del perfil</h2><p>Acumulado al ${dateLabel(CUT)}</p></div></div>
    ${kpis(entries.map(([label, value]) => [label, fmt(value), '']), entries.length === 3 ? 'three' : 'four')}</section>`;
}

export function summaryPage(network, range) {
  const period = rangeFor(network, range.start, range.end);
  const { current: t, series } = period;
  const instagram = network === 'instagram';
  const views = [instagram ? 'Vistas' : 'Visualizaciones', fmt(t.views), 'En el período', 'eye'];
  const engagement = ['Interacciones', fmt(t.interactions), instagram ? 'Me gusta, comentarios, compartidos y guardados' : 'Me gusta, comentarios y compartidos', 'heart'];
  const net = ['Seguidores netos', signed(t.net), 'Ganados menos perdidos', 'people'];
  const metrics = instagram
    ? [views, ['Cuentas alcanzadas', fmt(t.reach), 'Cuentas únicas', 'profile'], engagement, ['Cuentas que interactuaron', fmt(t.engaged), 'Cuentas únicas', 'people'], net]
    : [views, ['Visitas al perfil', fmt(t.profileViews), 'En el período', 'profile'], engagement, net,
      ['Engagement', pct(t.engagement), 'Interacciones / visualizaciones', 'chart']];
  return heading('resumen', 'Rendimiento de la cuenta en el período seleccionado.', updateLink)
    + filterForm(range, 'account', { action: dailyLink })
    + kpis(metrics)
    + `<div class="overview-grid">${lineChart(series, range, {
      label: instagram ? 'Vistas por día' : 'Visualizaciones por día',
      action: '<a class="text-link" href="#seguimiento" data-daily>Ver detalle por día ↗</a>',
    })}${interactionPanel(t, instagram)}</div>`
    + (instagram ? '' : contentOfPeriod(period.posts))
    + profilePanel(network);
}

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const reactions = [['likes', 'Me gusta'], ['comments', 'Comentarios'], ['shares', 'Compartidos']];
const followersMetric = ['followers', 'Seguidores al cierre'];
const netMetric = ['net', 'Seguidores netos', signed];
const publicationsMetric = ['publications', 'Publicaciones públicas (UTC)'];
const viewsMetric = ['views', 'Vistas'];
const profileMetric = ['profileViews', 'Visitas al perfil'];
const interactionsMetric = ['interactions', 'Interacciones'];
const engagementMetric = ['engagement', 'Engagement', pct];
const tiktokMonthly = [followersMetric, netMetric, publicationsMetric, profileMetric, ...reactions, interactionsMetric, viewsMetric, engagementMetric];
const tiktokDaily = [['followers', 'Seguidores'], netMetric, publicationsMetric, viewsMetric, profileMetric, ...reactions, interactionsMetric, engagementMetric];
const instagramMetrics = [
  viewsMetric, ['reach', 'Cuentas alcanzadas'], ['engaged', 'Cuentas que interactuaron'], interactionsMetric,
  ...reactions, ['saves', 'Guardados'], ['gained', 'Seguidores ganados'], ['lost', 'Seguidores perdidos'], netMetric,
  ['replies', 'Respuestas a historias'], ['reposts', 'Republicaciones'], ['profileLinks', 'Toques en botones del perfil'],
];
const campaigns = { 1: 'Métodos en casa', 3: 'Mes del espresso', 6: 'Temporada fría', 8: 'Orígenes de la cosecha' };

function monthlyPage(network) {
  const periods = monthlyFor(network);
  const metrics = network === 'instagram' ? instagramMetrics : tiktokMonthly;
  const headingRow = ['Indicador', ...periods.map((period, index) => {
    const month = months[index];
    if (!period.series.length) return month;
    const end = period.series.at(-1).date;
    return `<button class="text-link" type="button" data-month="${period.start},${end}">${month}</button>${period.partial ? '<small class="partial">Parcial</small>' : ''}`;
  })];
  const rows = [
    ['Campañas', ...periods.map((period, index) => period.series.length ? campaigns[index] ?? '—' : '—')],
    ['Destacado', ...periods.map((period) => {
      const top = [...period.posts].sort((a, b) => b.views - a.views)[0];
      return top ? esc(top.title) : '—';
    })],
    ...metrics.map(([metric, label, format = fmt]) => [
      label, ...periods.map((period) => period.series.length && !(period.partial && metric === 'followers') ? format(period.current[metric]) : '—'),
    ]),
  ];
  return `<section class="panel">
    <div class="panel-heading"><div><h2>${NETWORKS[network].name} · 2026</h2><p>Selecciona un mes para ver sus días. El corte de la demo es el ${dateLabel(CUT)}.</p></div></div>
    ${table('Seguimiento mensual', headingRow, rows, { className: 'monthly-grid' })}
  </section>`;
}

function dailyPage(network, range) {
  const { current, series } = rangeFor(network, range.start, range.end);
  const instagram = network === 'instagram';
  const metrics = instagram ? [...instagramMetrics, engagementMetric] : tiktokDaily;
  const top = instagram
    ? [['views', 'Vistas', 'Actividad del período'], ['reach', 'Cuentas alcanzadas', 'Únicas del período'],
      ['interactions', 'Interacciones', 'Actividad del período'], ['net', 'Seguidores netos', 'Ganados menos perdidos', signed]]
    : [['views', 'Visualizaciones', 'Actividad del período'], ['interactions', 'Interacciones', 'Actividad del período'],
      ['net', 'Seguidores netos', 'Ganados menos perdidos', signed], ['engagement', 'Engagement', 'Interacciones / visualizaciones', pct]];
  const dailyValue = (day, key) => key === 'interactions' ? interactions(day) : key === 'engagement' ? interactions(day) / day.views : day[key];
  const rows = series.map((day) => [
    `<time datetime="${day.date}">${dayLabel(day.date)}/${day.date.slice(0, 4)}</time>`, ...metrics.map(([key, , format = fmt]) => format(dailyValue(day, key))),
  ]);
  const footer = ['Total / cierre', ...metrics.map(([key, , format = fmt]) => format(current[key]))];
  return filterForm(range, 'account')
    + `<h2 class="section-title">Resumen del período · ${dateSpan(range)}</h2>`
    + kpis(top.map(([key, label, note, format = fmt]) => [label, format(current[key]), note]), 'four')
    + lineChart(series, range, { title: 'La campaña, día a día', label: instagram ? 'Vistas por día' : 'Visualizaciones por día' })
    + `<section class="panel"><div class="panel-heading"><div><h2>Detalle por día</h2>
      <p>Los totales del período aparecen al pie de la tabla.${instagram ? ' Las cuentas únicas se deduplican en el total.' : ''}</p></div></div>
      ${table('Seguimiento diario', ['Fecha', ...metrics.map(([, label]) => label)], rows, { className: 'daily-grid', footer })}</section>`;
}

function breakdownPage(range) {
  const period = rangeFor('instagram', range.start, range.end);
  return filterForm(range, 'account') + `<div class="audience-grid">${breakdownFor(period).map(({ title, rows }) => `<section class="panel">
    <div class="panel-heading"><div><h2>${title}</h2><p>Distribución de ejemplo · ${dateSpan(range)}</p></div></div>
    ${table(title, ['Segmento', 'Vistas', 'Alcance', 'Interacciones'], rows.map(({ label, values }) => [label, ...values.map(fmt)]))}
  </section>`).join('')}</div>`;
}

export function followupPage(network, range, view) {
  const options = [['monthly', 'Por mes'], ['daily', 'Por día']];
  if (network === 'instagram') options.push(['breakdown', 'Desgloses']);
  const body = view === 'monthly' ? monthlyPage(network) : view === 'daily' ? dailyPage(network, range) : breakdownPage(range);
  return heading('seguimiento', 'Compara indicadores en el año o explora el detalle de un período.')
    + tabs('Vistas de seguimiento', options, view) + body;
}

function distributionPanel(group, donut) {
  const { title, total, rows } = group;
  const colors = ['var(--accent)', 'var(--teal)', 'var(--rose)', 'var(--gold)', 'var(--slate)'];
  let angle = 0;
  const stops = rows.map(({ share }, index) => {
    const start = angle;
    angle = index === rows.length - 1 ? 100 : angle + share * 100;
    return `${colors[index]} ${start}% ${angle}%`;
  }).join(', ');
  const chart = donut
    ? `<div class="donut" aria-hidden="true" style="--stops:${stops}"><div><strong>${fmt(total)}</strong><span>Seguidores</span></div></div>`
    : '';
  const entries = rows.map(({ label, value, share }, index) => [
    `<span class="distribution-name"><i style="--swatch:${colors[index]}" aria-hidden="true"></i>${esc(label)}</span>`,
    fmt(value), `<span class="distribution-share">${pct(share)}<i aria-hidden="true" style="--bar-width:${share * 100}%;--bar-color:${colors[index]}"></i></span>`,
  ]);
  return `<section class="panel distribution"><div class="panel-heading"><div><h2>${title}</h2><p>${fmt(total)} cuentas en la muestra</p></div></div>
    ${chart}${table(title, ['Grupo', 'Cuentas', 'Participación'], entries)}</section>`;
}

function viewerPanel(range) {
  const rows = viewersFor(range.start, range.end);
  const days = rangeFor('tiktok', range.start, range.end).series.length;
  return filterForm(range, 'account') + `<section class="panel"><div class="panel-heading"><div><h2>Espectadores por día</h2>
    <p>${rows.length} de ${days} días con datos. Una cuenta puede aparecer en varios días.</p></div></div>
    ${rows.length ? table('Espectadores por día', ['Fecha', 'Total', 'Nuevos', 'Recurrentes'], [...rows].reverse().map((row) =>
      [dateLabel(row.date), fmt(row.total), fmt(row.fresh), fmt(row.recurring)])) : '<p class="empty">Sin datos para el período.</p>'}</section>`;
}

const hourLabel = (hour) => String(hour).padStart(2, '0') + ':00';
function heatmapPanel(network, range) {
  const days = heatFor(network, range.start, range.end);
  const hourHeaders = Array.from({ length: 24 }, (_, index) => hourLabel(index));
  const max = Math.max(1, ...days.flatMap(({ hours }) => hours));
  const rows = days.map(({ date, hours }) => [
    `<time datetime="${date}">${weekdayLabel(date)} ${dayLabel(date)}</time>`,
    ...hours.map((value, hour) => {
      const level = value == null ? 'nd' : value === 0 ? 0 : Math.ceil(value / max * 5);
      const text = value == null ? 'Sin dato' : `${fmt(value)} seguidores activos`;
      const label = `${dayLabel(date)} · ${hourLabel(hour)} · ${text}`;
      return `<span class="heat-cell heat-${level}" title="${label}"><span class="sr-only">${label}</span></span>`;
    }),
  ]);
  const legend = Array.from({ length: 5 }, (_, index) => `<i class="heat-cell heat-${index + 1}"></i>`).join('');
  return filterForm(range, 'hours') + `<section class="panel">
    <div class="panel-heading"><div><h2>Cuándo están activos tus seguidores</h2><p>Seguidores activos por hora local · Bogotá, UTC−5</p></div></div>
    <div class="heat-legend"><span>Menor actividad</span><span aria-hidden="true" class="heat-scale">${legend}</span><span>Mayor actividad</span>
      <span><i class="heat-cell heat-0"></i> 0</span><span><i class="heat-cell heat-nd"></i> Sin dato</span></div>
    ${table('Actividad horaria', ['Fecha', ...hourHeaders], rows, { className: 'heatmap' })}
  </section>`;
}

export function audiencePage(network, accountRange, hourRange, view) {
  const instagram = network === 'instagram';
  const options = [['followers', 'Seguidores'], instagram ? ['engaged', 'Interacción'] : ['viewers', 'Espectadores'], ['hours', 'Actividad horaria']];
  let body;
  if (view === 'viewers') body = viewerPanel(accountRange);
  else if (view === 'hours') body = heatmapPanel(network, hourRange);
  else {
    const label = view === 'engaged' ? 'Cuentas que interactuaron' : 'Composición de seguidores';
    body = `<h2 class="section-title">${label}</h2><p class="section-note">Muestra ficticia con corte al ${dateLabel(CUT)}</p>
      <div class="audience-grid">${audienceFor(network, view).map((group) =>
        distributionPanel(group, !instagram && group.title === 'Género')).join('')}</div>`;
  }
  return heading('audiencia', 'Conoce la composición de la audiencia y sus horarios de actividad.') + tabs('Vistas de audiencia', options, view) + body;
}

export function validationPage(network, scenario, reviewed) {
  const report = sampleReport(network, scenario);
  const result = reviewed ? validateReport(report) : null;
  const step = reviewed ? 3 : 2;
  const steps = ['Seleccionar informe', 'Revisar', 'Resultado'].map((label, index) =>
    `<li${index + 1 === step ? ' aria-current="step"' : ''}><span>${index + 1}</span>${label}</li>`).join('');
  const options = Object.entries(REPORT_CASES).map(([id, label]) => `<option value="${id}"${id === scenario ? ' selected' : ''}>${label}</option>`).join('');
  const status = result ? `<section class="panel result"><div class="panel-heading"><div><h2>Resultado</h2>
    <p class="status ${result.ready ? 'ok' : 'error'}">${result.ready ? 'Reporte listo para importar' : 'Reporte bloqueado'}</p></div></div>
    ${table('Controles de validación', ['Control', 'Resultado', 'Detalle'], result.checks.map((check) =>
      [check.name, check.ok ? 'Correcto' : 'Revisar', esc(check.detail)]))}</section>` : '';
  return heading('validacion', 'Prueba los controles de un reporte CSV con muestras ficticias.')
    + `<ol class="steps" aria-label="Progreso de la validación">${steps}</ol>
    <section class="panel"><div class="panel-heading"><div><h2>Informe de ${NETWORKS[network].name}</h2><p>Totales declarados · ${fmt(report.declared.views)} vistas y ${fmt(report.declared.interactions)} interacciones.</p></div></div>
      <div class="sample-controls"><label>Muestra<select id="scenario">${options}</select></label>
      <button class="button primary" type="button" data-validate>Validar muestra</button></div>
      <pre aria-label="Vista previa del archivo CSV">${esc(report.csv)}</pre>
    </section>${status}`;
}

export function projectPage() {
  return heading('proyecto', 'Demostración de Analítica social · Burger King Colombia')
    + `<section class="panel project-notes"><h2>El proyecto original</h2>
      <p>Aplicación de seguimiento de TikTok e Instagram que integra APIs y reportes nativos para consultar actividad de cuenta, publicaciones y audiencia.</p>
      <h2>Mi contribución</h2>
      <p>Desarrollé la aplicación local con Python y SQLite e integré las fuentes con controles de fechas, duplicados y totales.</p>
      <h2>La demostración</h2>
      <p>Radar Social recrea sus vistas con la identidad de Brújula Café, una cuenta ficticia. Sus publicaciones, ilustraciones y métricas se generan para el portafolio.</p>
    </section>`;
}
