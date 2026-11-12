import { CUT, START, dayLabel, fmt } from './modelo.js';

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value).replace(/[&<>"']/g, (char) => entities[char]);

export const ROUTES = {
  resumen: 'Resumen',
  seguimiento: 'Seguimiento',
  audiencia: 'Audiencia',
  publicaciones: 'Publicaciones',
  historias: 'Historias',
  validacion: 'Actualizar datos',
  proyecto: 'Proyecto',
};

const glyphs = {
  eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  profile: '<circle cx="12" cy="8" r="3"/><path d="M5 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M17 5a3 3 0 0 1 0 6m3 9v-2a4 4 0 0 0-2-3.5"/>',
  heart: '<path d="M12 20 4 12a5 5 0 1 1 8-6 5 5 0 1 1 8 6Z"/>',
  comment: '<path d="M4 4h16v12H9l-5 4Z"/><path d="M8 9h8m-8 3h5"/>',
  chart: '<path d="M3 20h18M5 16l5-6 4 3 5-7"/><path d="M16 6h3v3"/>',
  video: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m10 8 6 4-6 4Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5m10-5v5M3 10h18"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2 7m2-13v6h-6"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
};
export const icon = (name) => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${glyphs[name]}</svg>`;

export function heading(route, description, action = '') {
  return `<header class="view-heading"><div><h1>${ROUTES[route]}</h1><p>${description}</p></div>${action}</header>`;
}

export function tabs(label, options, selected) {
  return `<div class="tabs" role="group" aria-label="${label}">${options.map(([id, name]) =>
    `<button type="button" data-view="${id}" aria-pressed="${id === selected}">${name}</button>`).join('')}</div>`;
}

export function table(label, headers, rows, { className = '', footer = [] } = {}) {
  const renderRow = ([first, ...rest]) => `<tr><th scope="row">${first}</th>${rest.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
  return `<div class="scroll ${className}" tabindex="0" role="region" aria-label="${esc(label)}">
    <table aria-label="${esc(label)}">
      <thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(renderRow).join('')}</tbody>${footer.length ? `<tfoot>${renderRow(footer)}</tfoot>` : ''}
    </table>
  </div>`;
}

export function kpis(metrics, variant = 'five') {
  return `<div class="metrics metrics-${variant}">${metrics.map(([title, value, note, glyph], index) =>
    `<article class="kpi${index === 0 && variant === 'five' ? ' primary-kpi' : ''}">
      ${glyph ? `<span class="kpi-icon">${icon(glyph)}</span>` : ''}
      <span class="kpi-title">${title}</span><strong>${value}</strong><small>${note}</small>
    </article>`).join('')}</div>`;
}

export const dateSpan = (range) => range.start === range.end
  ? `${dayLabel(range.start)}/${range.start.slice(0, 4)}`
  : `${dayLabel(range.start)} – ${dayLabel(range.end)}/${range.end.slice(0, 4)}`;

export function dateFields(range, prefix = '') {
  return [['start', 'Desde'], ['end', 'Hasta']].map(([field, label]) =>
    `<label>${prefix ? prefix + label.toLowerCase() : label}<input type="date" name="${field}" value="${range[field]}" min="${START}" max="${CUT}" required></label>`).join('');
}

export function filterForm(range, scope, { extra = '', action = '', prefix = '' } = {}) {
  return `<form class="filters panel" data-filter="${scope}" aria-label="Filtrar resultados">
    ${dateFields(range, prefix)}${extra}
    <div class="filter-actions">
      <button type="submit" class="button primary">Aplicar</button>
      <button type="button" data-reset="${scope}" class="button secondary">Limpiar filtros</button>
      ${action}
    </div>
    <p class="filter-error" data-error role="alert" hidden></p>
  </form>`;
}

export function bars(rows) {
  return `<div class="bars">${rows.map(({ label, count, portion, color }) => `<div>
    <div class="bar-label"><span>${label}</span><strong>${count}</strong></div>
    <div class="bar-track" aria-hidden="true"><i style="--bar-width:${100 * portion}%;--bar-color:${color}"></i></div>
  </div>`).join('')}</div>`;
}

const chartNumber = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });

export function lineChart(series, range, { title = 'Así se movió tu cuenta', label = 'Visualizaciones por día', action = '' } = {}) {
  if (!series.length) return `<section class="panel chart-panel"><h2>${title}</h2><p>Sin datos para el período.</p></section>`;
  const top = Math.max(...series.map((day) => day.views), 1);
  const step = 10 ** Math.max(Math.floor(Math.log10(top / 3)), 0);
  const high = Math.ceil(top / (3 * step)) * 3 * step;
  const left = 53;
  const right = 684;
  const height = 174;
  const bottom = 196;
  const digits = series.length <= 62 ? 4 : 2.1;
  const points = series.map((day, index) => ({
    day, x: series.length === 1 ? (left + right) / 2 : left + (right - left) * index / (series.length - 1),
    y: bottom - day.views / high * height,
  }));
  const ticks = Array.from({ length: Math.min(series.length, 5) }, (_, index) =>
    Math.round(index * (series.length - 1) / Math.max(Math.min(series.length, 5) - 1, 1)));
  const coordinates = points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return `<section class="panel chart-panel">
    <div class="panel-heading"><div><h2>${title}</h2><p>${label}</p></div><span class="period">${dateSpan(range)}</span></div>
    <div class="chart-scroll" tabindex="0" role="region" aria-label="${label}. Usa las flechas en los puntos para consultar los valores.">
      <svg class="line-chart" viewBox="0 0 714 230" role="group" aria-label="${label}">
        ${Array.from({ length: 4 }, (_, index) => {
          const y = bottom - height * index / 3;
          return `<line class="guide" x1="${left}" x2="${right}" y1="${y}" y2="${y}"/>
            <text class="axis" x="${left - 12}" y="${y + 4}" text-anchor="end">${chartNumber.format(high * index / 3)}</text>`;
        }).join('')}
        ${ticks.map((index) => `<text class="axis" x="${points[index].x}" y="219" text-anchor="middle">${dayLabel(points[index].day.date)}</text>`).join('')}
        <polyline class="series-line" points="${coordinates}"/>
        ${points.map(({ x, y, day }, index) =>
          `<g class="chart-point" tabindex="${index === 0 ? 0 : -1}" role="img" aria-label="${dayLabel(day.date)}, ${fmt(day.views)}" data-chart-point>
            <circle class="point-target" cx="${x}" cy="${y}" r="9"/>
            <circle class="dot" cx="${x}" cy="${y}" r="${digits}"/>
            <g class="point-tip" transform="translate(${Math.min(Math.max(x - 58, 7), 590)},${Math.max(y - 38, 0)})" aria-hidden="true">
              <rect width="116" height="26" rx="6"/><text x="58" y="17" text-anchor="middle">${dayLabel(day.date)} · ${fmt(day.views)}</text>
            </g>
          </g>`).join('')}
      </svg>
    </div>${action ? `<div class="chart-footer">${action}</div>` : ''}
  </section>`;
}
