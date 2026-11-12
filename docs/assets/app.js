import {
  CUT, DEFAULT_RANGE, HOUR_RANGE, NETWORKS, START, postsCsv, rangeFor, selectMedia, shift, stories, validRange,
} from './modelo.js';
import { ROUTES, icon } from './graficos.js';
import { audiencePage, followupPage, projectPage, summaryPage, validationPage } from './vistas.js';
import { contentPage, detailPage } from './contenido.js';

const view = document.querySelector('#view');
const main = document.querySelector('#contenido');
const networkSelect = document.querySelector('#network');
const nav = document.querySelector('.nav');
const dialog = document.querySelector('#post-dialog');
const announcement = document.querySelector('#announcement');
const mediaDefaults = (metric = 'views') => ({
  start: shift(CUT, -59), end: CUT, view: 'cards', query: '', format: '', metric, page: 1,
});
const initialAccount = () => ({
  account: { ...DEFAULT_RANGE }, hours: { ...HOUR_RANGE }, seguimiento: 'monthly', audiencia: 'followers',
  publicaciones: mediaDefaults(), historias: mediaDefaults('reach'), scenario: 'valid', reviewed: false,
});
const accounts = Object.fromEntries(Object.keys(NETWORKS).map((key) => [key, initialAccount()]));
let network = networkSelect.value;
let dialogTrigger;

function currentRoute() {
  const route = location.hash.slice(1);
  return Object.hasOwn(ROUTES, route) && (route !== 'historias' || network === 'instagram') ? route : 'resumen';
}

function availableMedia(route, filter) {
  const items = route === 'historias'
    ? stories.filter((story) => filter.start <= story.date && story.date <= filter.end)
    : rangeFor(network, filter.start, filter.end).posts;
  return selectMedia(items, filter.format, filter.query);
}

function markNavigation(route) {
  for (const link of nav.querySelectorAll('[data-route]')) {
    link.hidden = link.dataset.route === 'historias' && network !== 'instagram';
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.querySelector('#breadcrumb-platform').textContent = NETWORKS[network].name;
  document.querySelector('#breadcrumb-view').textContent = ROUTES[route];
  document.title = `${ROUTES[route]} · Radar Social`;
}

const renderers = {
  resumen: ({ account }) => summaryPage(network, account),
  seguimiento: ({ account, seguimiento }) => followupPage(network, account, seguimiento),
  audiencia: ({ account, hours, audiencia }) => audiencePage(network, account, hours, audiencia),
  publicaciones: ({ publicaciones }) => contentPage({ network, state: publicaciones, items: availableMedia('publicaciones', publicaciones) }),
  historias: ({ historias }) => contentPage({ network, state: historias, items: availableMedia('historias', historias), isStory: true }),
  validacion: ({ scenario, reviewed }) => validationPage(network, scenario, reviewed),
  proyecto: projectPage,
};

function render(focusSelector) {
  const route = currentRoute();
  markNavigation(route);
  view.innerHTML = renderers[route](accounts[network]);
  if (focusSelector) (view.querySelector(focusSelector) ?? main).focus({ preventScroll: true });
}

function showRoute(route) {
  if (location.hash === '#' + route) render();
  else location.hash = route;
}

function download() {
  const csv = postsCsv(availableMedia('publicaciones', accounts[network].publicaciones));
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `radar-social-${network}-${CUT}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announcement.textContent = 'Se descargó el listado filtrado.';
}

function showDetail(trigger, route) {
  const isStory = route === 'historias';
  const items = isStory ? stories : rangeFor(network, START, CUT).posts;
  const item = items.find(({ id }) => id === trigger.dataset.detail);
  if (!item) return;
  dialogTrigger = trigger;
  document.querySelector('#dialog-title').textContent = item.title;
  document.querySelector('#dialog-content').innerHTML = detailPage(item, network, isStory);
  dialog.showModal();
  dialog.scrollTop = 0;
}

function resetFilters(scope, state) {
  if (scope === 'account' || scope === 'hours') {
    state[scope] = { ...(scope === 'hours' ? HOUR_RANGE : DEFAULT_RANGE) };
  } else {
    const defaults = mediaDefaults(scope === 'historias' ? 'reach' : 'views');
    state[scope] = { ...defaults, view: state[scope].view };
  }
  render('[data-reset]');
  announcement.textContent = 'Se restablecieron los filtros.';
}

view.addEventListener('click', (event) => {
  const control = event.target.closest('button, a');
  if (!control) return;
  const route = currentRoute();
  const state = accounts[network];
  const action = control.dataset;

  if ('daily' in action) {
    event.preventDefault();
    state.seguimiento = 'daily';
    showRoute('seguimiento');
  } else if (action.month) {
    const [start, end] = action.month.split(',');
    state.account = { start, end };
    state.seguimiento = 'daily';
    render('[data-view="daily"]');
  } else if (action.view) {
    if (route === 'seguimiento' || route === 'audiencia') state[route] = action.view;
    else state[route] = { ...state[route], view: action.view, page: 1 };
    render('[data-view][aria-pressed="true"]');
  } else if (action.reset) {
    resetFilters(action.reset, state);
  } else if (action.page) {
    state[route].page = Number(action.page);
    render('[data-page]:not([disabled])');
    view.querySelector('.section-note')?.scrollIntoView({ block: 'nearest' });
  } else if (action.detail) {
    showDetail(control, route);
  } else if ('export' in action) {
    download();
  } else if ('validate' in action) {
    state.reviewed = true;
    render('[data-validate]');
    announcement.textContent = view.querySelector('.status').textContent;
    view.querySelector('.result').scrollIntoView({ block: 'nearest' });
  }
});

view.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-filter]');
  if (!form) return;
  event.preventDefault();
  const state = accounts[network];
  const scope = form.dataset.filter;
  const values = new FormData(form);
  const start = values.get('start');
  const end = values.get('end');
  const max = scope === 'hours' ? 31 : undefined;
  if (!validRange(start, end, max)) {
    const error = form.querySelector('[data-error]');
    error.textContent = start > end ? 'Selecciona una fecha final igual o posterior a la inicial.' : 'Selecciona un período de hasta 31 días.';
    error.hidden = false;
    return;
  }

  if (scope === 'account' || scope === 'hours') {
    state[scope] = { start, end };
  } else {
    const filter = state[scope];
    state[scope] = { ...filter, start, end, query: values.get('query').trim(), format: values.get('format') ?? '',
      metric: values.get('metric') ?? filter.metric, page: 1 };
  }
  render('button[type="submit"]');
  announcement.textContent = 'Se aplicaron los filtros.';
});

view.addEventListener('change', (event) => {
  if (event.target.id !== 'scenario') return;
  const state = accounts[network];
  state.scenario = event.target.value;
  state.reviewed = false;
  render('#scenario');
});

view.addEventListener('keydown', (event) => {
  const point = event.target.closest('[data-chart-point]');
  if (!point || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const points = Array.from(point.parentElement.querySelectorAll('[data-chart-point]'));
  const current = points.indexOf(point);
  const targets = {
    ArrowLeft: Math.max(current - 1, 0), ArrowRight: Math.min(current + 1, points.length - 1), Home: 0, End: points.length - 1,
  };
  point.setAttribute('tabindex', '-1');
  const next = points[targets[event.key]];
  next.setAttribute('tabindex', '0');
  next.focus();
});

networkSelect.addEventListener('change', () => {
  network = networkSelect.value;
  if (location.hash === '#historias' && network === 'tiktok') showRoute('resumen');
  else render();
  announcement.textContent = 'Plataforma ' + NETWORKS[network].name + '.';
});
nav.addEventListener('click', (event) => {
  const link = event.target.closest('[data-route]');
  if (link?.hash === location.hash) main.focus({ preventScroll: true });
});
window.addEventListener('hashchange', () => {
  render();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
document.querySelector('.skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  main.focus();
});
dialog.addEventListener('close', () => {
  if (dialogTrigger?.isConnected) dialogTrigger.focus({ preventScroll: true });
});

if (['localhost', '127.0.0.1'].includes(location.hostname)) document.querySelector('#portfolio-return').hidden = false;
for (const link of nav.querySelectorAll('[data-icon]')) link.insertAdjacentHTML('afterbegin', icon(link.dataset.icon));
if (location.hash === '#historias') networkSelect.value = network = 'instagram';
render();
