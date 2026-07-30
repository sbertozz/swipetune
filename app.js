/* SwipeTune — static mobile-first PWA.
   Spotify OAuth uses Authorization Code with PKCE: no client secret is ever in this app. */

const APP_VERSION = '1.0.0';
const CONFIG_KEY = 'swipetune:spotify-client-id';
const SESSION_KEY = 'swipetune:session';
const VERIFIER_KEY = 'swipetune:pkce-verifier';
const API = 'https://api.spotify.com/v1';
const ACCOUNTS = 'https://accounts.spotify.com';
const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public'
].join(' ');

const app = document.querySelector('#app');
const audio = document.querySelector('#preview-audio');
const toastNode = document.querySelector('#toast');

const state = {
  view: 'welcome',
  clientId: localStorage.getItem(CONFIG_KEY) || '',
  token: null,
  refreshToken: null,
  expiresAt: 0,
  playlist: [],
  playlistInfo: { name: '', image: '', id: '' },
  index: 0,
  approved: [],
  rejected: [],
  audioUnlocked: false,
  playingId: null,
  transitioning: false,
  dragging: false,
  creating: false,
  createdPlaylistUrl: '',
  error: '',
  isDemo: false
};

const demoTracks = [
  { id: 'demo-1', uri: '', name: 'Sera in cuffia', artists: 'Demo Artist', album: 'Prova SwipeTune', image: '', url: '', isrc: '', previewUrl: 'assets/demo-preview.wav', previewSource: 'demo', previewResolved: true },
  { id: 'demo-2', uri: '', name: 'Un altro brano', artists: 'Demo Artist', album: 'Prova SwipeTune', image: '', url: '', isrc: '', previewUrl: 'assets/demo-preview.wav', previewSource: 'demo', previewResolved: true },
  { id: 'demo-3', uri: '', name: 'Solo uno swipe', artists: 'Demo Artist', album: 'Prova SwipeTune', image: '', url: '', isrc: '', previewUrl: 'assets/demo-preview.wav', previewSource: 'demo', previewResolved: true },
  { id: 'demo-4', uri: '', name: 'Ultima carta', artists: 'Demo Artist', album: 'Prova SwipeTune', image: '', url: '', isrc: '', previewUrl: 'assets/demo-preview.wav', previewSource: 'demo', previewResolved: true }
];

function redirectUri() {
  return `${window.location.origin}${window.location.pathname}`;
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function escapeAttr(value = '') {
  return escapeHTML(value);
}

function icon(name) {
  const icons = {
    spotify: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.6c4.8-1.45 10.05-.9 14.05 1M5.8 11.3c4.15-1.1 8.75-.62 12.13.98M6.8 14.75c3.24-.77 6.74-.4 9.43.85"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.45 5.45 0 0 0-7.7 0L12 6l-1.1-1.1a5.45 5.45 0 0 0-7.7 7.7l1.1 1.1L12 21l7.7-7.3 1.1-1.1a5.45 5.45 0 0 0 0-7.7Z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.3 4.3L19 7.2"/></svg>',
    external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>',
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18.5a2.5 2.5 0 1 1-2.5-2.5c.95 0 1.79.52 2.22 1.3V6l10-2v11.5a2.5 2.5 0 1 1-2.5-2.5c.95 0 1.79.52 2.22 1.3V4"/></svg>',
    wave: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v3m4-7v8m4-12v16m4-12v8m4-4v3"/></svg>'
  };
  return icons[name] || '';
}

function header() {
  const action = state.view === 'swipe' || state.view === 'import'
    ? '<button class="header-action" data-action="restart">Nuova lista</button>'
    : state.view === 'results'
      ? '<button class="header-action" data-action="restart">Ricomincia</button>'
      : '';
  return `<header class="app-header">
    <a class="wordmark" href="./" aria-label="SwipeTune home">
      <span class="wordmark-mark">${icon('wave')}</span><span>SwipeTune</span>
    </a>${action}
  </header>`;
}

function render() {
  let screen = '';
  if (state.view === 'welcome') screen = welcomeScreen();
  if (state.view === 'import') screen = importScreen();
  if (state.view === 'loading') screen = loadingScreen();
  if (state.view === 'swipe') screen = swipeScreen();
  if (state.view === 'results') screen = resultsScreen();
  app.innerHTML = `${header()}${screen}`;
  bindGlobalActions();
  if (state.view === 'import') bindImport();
  if (state.view === 'swipe') bindSwipe();
  if (state.view === 'results') bindResults();
}

function welcomeScreen() {
  return `<section class="screen welcome">
    <p class="eyebrow">Lista in, decisioni out</p>
    <h1 class="hero-title">La tua musica.<br/><em>Il tuo gusto.</em></h1>
    <p class="hero-copy">Carica l’elenco dei brani, ascolta un clip, scorri a sinistra o destra e salva solo le canzoni che vuoi tenere.</p>
    <div class="hero-visual" aria-hidden="true">
      <div class="mini-card"><div class="mini-lines"><i></i><i></i><i></i></div><strong>Non fa per me</strong><span>swipe a sinistra</span></div>
      <div class="mini-card"><span class="mini-note"></span><strong>Questa sì</strong><span>swipe a destra</span></div>
    </div>
    <div class="cta-stack">
      <button class="primary full" data-action="import">Carica un file CSV ${icon('download')}</button>
      <button class="text-button" data-action="demo">Prova prima l’interfaccia</button>
    </div>
    <p class="privacy-note"><b>Nessun Premium necessario:</b> funziona senza login Spotify. Le anteprime brevi vengono cercate per ISRC nel catalogo Deezer; i brani approvati si esportano in CSV.</p>
  </section>`;
}

function importScreen() {
  const error = state.error ? `<div class="error-box">${escapeHTML(state.error)}</div>` : '';
  return `<section class="screen import-screen">
    <p class="eyebrow">Niente login, niente Premium</p>
    <h1 class="section-title">Carica la tua<br/>lista di brani.</h1>
    <p class="section-copy">Scegli un CSV con almeno le colonne <b>titolo</b> e <b>artista</b>. Va bene sia il separatore punto e virgola sia la virgola.</p>
    <div class="import-panel">
      ${error}
      <input id="csv-file" type="file" accept=".csv,text/csv" hidden />
      <button class="primary full" data-action="choose-csv">Scegli file CSV ${icon('download')}</button>
      <p class="field-help">Esempio: <b>titolo;artista</b><br/>Marracash;Brano di esempio</p>
      <button class="outline full" data-action="sample-csv">Scarica un CSV di esempio</button>
      <div class="preview-rule">${icon('wave')}<span>Se il CSV contiene ISRC o Spotify Track Id, SwipeTune identifica il brano esatto e cerca il suo clip breve. Se manca il clip, puoi comunque approvarlo o scartarlo.</span></div>
    </div>
    <p class="demo-link">Vuoi vedere prima lo swipe? <button data-action="demo">Apri una mini demo</button></p>
  </section>`;
}

function loadingScreen() {
  return `<section class="screen loader"><div><div class="spinner"></div><b>${escapeHTML(state.loadingTitle || 'Sto preparando le carte')}</b><span>${escapeHTML(state.loadingSubtitle || 'Un momento…')}</span></div></section>`;
}

function previewStatus(track) {
  if (track.previewResolving || !track.previewResolved) return { cls: 'loading', text: 'Cerco il clip' };
  if (track.previewUrl) return { cls: '', text: track.previewSource === 'demo' ? 'Audio demo' : 'Clip 30 sec' };
  return { cls: 'none', text: 'Clip non trovato' };
}

function swipeScreen() {
  const track = state.playlist[state.index];
  if (!track) {
    state.view = 'results';
    setTimeout(render, 0);
    return '';
  }
  const status = previewStatus(track);
  const percentage = Math.round((state.index / state.playlist.length) * 100);
  const isPlaying = state.playingId === track.id && !audio.paused;
  const cover = track.image
    ? `<img src="${escapeAttr(track.image)}" alt="Copertina di ${escapeAttr(track.album || track.name)}" />`
    : `<span class="art-fallback" aria-hidden="true">♫</span>`;
  const spotify = track.url
    ? `<a class="header-action" href="${escapeAttr(track.url)}" target="_blank" rel="noopener">Apri in Spotify ${icon('external')}</a>`
    : '<span></span>';
  const sourceText = track.previewUrl
    ? (track.previewSource === 'spotify' ? 'Clip Spotify · 30 sec' : track.previewSource === 'deezer' ? 'Clip 30 sec · Deezer' : track.previewSource === 'demo' ? 'Audio di test' : 'Clip 30 sec · catalogo Apple')
    : 'Nessun clip: puoi comunque decidere';
  return `<section class="screen swipe-screen">
    <div class="progress-row"><div class="progress-track"><div class="progress-fill" style="width:${percentage}%"></div></div><span class="progress-text">${state.index + 1} / ${state.playlist.length}</span></div>
    <div class="playlist-chip"><strong>${escapeHTML(state.playlistInfo.name)}</strong>${spotify}</div>
    <div class="deck">
      <div class="deck-shadow two"></div><div class="deck-shadow"></div>
      <article class="card" id="swipe-card" aria-label="${escapeAttr(track.name)} — ${escapeAttr(track.artists)}">
        <span class="swipe-label skip">NOPE</span><span class="swipe-label keep">SÌ!</span>
        <div class="card-media">
          ${cover}<div class="art-overlay"></div>
          <div class="card-top"><span>${track.explicit ? '<span class="explicit">E</span>' : ''}</span><span class="preview-badge ${status.cls}"><i></i>${status.text}</span></div>
          ${track.previewUrl ? `<button class="play-overlay" data-action="toggle-audio" aria-label="${isPlaying ? 'Metti in pausa' : 'Ascolta il clip'}"><span class="play-center ${isPlaying ? 'pause' : ''}">${isPlaying ? icon('pause') : icon('play')}</span></button>` : ''}
        </div>
        <div class="card-copy">
          <h1 class="card-title">${escapeHTML(track.name)}</h1>
          <p class="card-artist">${escapeHTML(track.artists)}</p>
          <div class="now-playing"><span class="equalizer ${isPlaying ? 'active' : ''}"><b></b><b></b><b></b></span><span id="player-source">${sourceText}</span><span class="preview-progress"><i id="audio-fill"></i></span><span class="audio-time" id="audio-time">0:00</span></div>
        </div>
      </article>
    </div>
    <div class="action-row">
      <button class="round-btn skip" data-action="reject" aria-label="Scarta brano">${icon('close')}</button>
      <button class="round-btn play ${isPlaying ? 'pause' : ''}" data-action="toggle-audio" aria-label="${isPlaying ? 'Pausa' : 'Ascolta clip'}">${isPlaying ? icon('pause') : icon('play')}</button>
      <button class="round-btn keep" data-action="approve" aria-label="Approva brano">${icon('heart')}</button>
    </div>
    <p class="swipe-hint">Sinistra per scartare · destra per tenere</p>
  </section>`;
}

function listMarkup(tracks) {
  if (!tracks.length) return '<div class="empty">Nessun brano in questa lista.</div>';
  return tracks.map(track => `<div class="list-track">${track.image ? `<img src="${escapeAttr(track.image)}" alt="" />` : '<span class="list-art">♫</span>'}<div><strong>${escapeHTML(track.name)}</strong><span>${escapeHTML(track.artists)}</span></div></div>`).join('');
}

function resultsScreen() {
  const approvedCount = state.approved.length;
  return `<section class="screen results">
    <div class="result-orb">${icon('check')}</div>
    <h1 class="results-heading">Scelta fatta.</h1>
    <p class="results-copy">Hai finito <b>${escapeHTML(state.playlistInfo.name)}</b>. Ecco cosa hai deciso di tenere.</p>
    <div class="result-stats"><div class="stat"><b>${approvedCount}</b><span>approvati</span></div><div class="stat skip-stat"><b>${state.rejected.length}</b><span>scartati</span></div></div>
    <details class="result-list" ${approvedCount ? 'open' : ''}><summary>Brani approvati (${approvedCount})</summary><div class="track-list">${listMarkup(state.approved)}</div></details>
    <details class="result-list"><summary>Brani scartati (${state.rejected.length})</summary><div class="track-list">${listMarkup(state.rejected)}</div></details>
    <div class="result-actions"><button class="primary full" data-action="download-approved" ${approvedCount ? '' : 'disabled'}>Scarica gli approvati in CSV ${icon('download')}</button><button class="outline full" data-action="download-csv">Esporta tutte le decisioni ${icon('download')}</button><button class="text-button" data-action="restart">Inizia un’altra selezione</button></div>
  </section>`;
}

function bindGlobalActions() {
  document.querySelectorAll('[data-action]').forEach(node => {
    const action = node.dataset.action;
    if (['choose-csv', 'approve', 'reject', 'toggle-audio', 'download-csv', 'download-approved'].includes(action)) return;
    node.addEventListener('click', () => handleAction(action));
  });
}

function bindImport() {
  const input = document.querySelector('#csv-file');
  document.querySelector('[data-action="choose-csv"]')?.addEventListener('click', () => input?.click());
  input?.addEventListener('change', () => loadCsvFile(input.files?.[0]));
}

function bindResults() {
  document.querySelector('[data-action="download-approved"]')?.addEventListener('click', () => downloadCsv(false));
  document.querySelector('[data-action="download-csv"]')?.addEventListener('click', () => downloadCsv(true));
}

function bindSwipe() {
  document.querySelector('[data-action="approve"]')?.addEventListener('click', () => decide('approve'));
  document.querySelector('[data-action="reject"]')?.addEventListener('click', () => decide('reject'));
  document.querySelectorAll('[data-action="toggle-audio"]').forEach(button => button.addEventListener('click', toggleAudio));
  const card = document.querySelector('#swipe-card');
  if (!card) return;
  let startX = 0;
  let currentX = 0;
  let active = false;
  const reset = () => {
    card.classList.remove('dragging', 'drag-left', 'drag-right');
    card.style.transform = '';
    active = false;
    state.dragging = false;
  };
  const move = (x) => {
    if (!active) return;
    currentX = x - startX;
    const rotation = Math.max(-13, Math.min(13, currentX / 18));
    card.style.transform = `translateX(${currentX}px) rotate(${rotation}deg)`;
    card.classList.toggle('drag-left', currentX < -28);
    card.classList.toggle('drag-right', currentX > 28);
  };
  card.addEventListener('pointerdown', event => {
    if (event.target.closest('button, a')) return;
    active = true; state.dragging = true; startX = event.clientX; currentX = 0;
    card.classList.add('dragging');
    card.setPointerCapture?.(event.pointerId);
  });
  card.addEventListener('pointermove', event => move(event.clientX));
  card.addEventListener('pointerup', () => {
    if (!active) return;
    if (Math.abs(currentX) > 92) decide(currentX > 0 ? 'approve' : 'reject');
    else reset();
  });
  card.addEventListener('pointercancel', reset);
}

function handleAction(action) {
  if (action === 'import') { state.view = 'import'; state.error = ''; render(); }
  if (action === 'demo') startDemo();
  if (action === 'restart') restart();
  if (action === 'sample-csv') downloadSampleCsv();
}

function restart() {
  stopAudio();
  state.view = 'import';
  state.error = '';
  state.createdPlaylistUrl = '';
  render();
}

function startDemo() {
  stopAudio();
  state.playlist = demoTracks.map(track => ({ ...track }));
  state.playlistInfo = { name: 'Mini demo', image: '', id: '' };
  state.index = 0; state.approved = []; state.rejected = []; state.isDemo = true; state.createdPlaylistUrl = '';
  state.view = 'swipe';
  render();
  showToast('Audio demo: prova uno swipe o tocca play.');
}

function openSettings() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <h2 id="settings-title">Collega Spotify</h2>
    <p>Inserisci il <b>Client ID</b> di una tua app Spotify già esistente. È pubblico: con PKCE qui non viene mai usato un Client Secret.</p>
    <p class="error-box">Se nel dashboard Spotify non vedi o non puoi cliccare “Create app”, non è un errore tuo: Spotify ha momentaneamente sospeso nuove integrazioni. Puoi provare la demo oppure usare un Client ID creato in passato.</p>
    <label for="client-id">Spotify Client ID</label>
    <input id="client-id" autocapitalize="off" autocomplete="off" spellcheck="false" value="${escapeAttr(state.clientId)}" placeholder="es. 1234abcd…" />
    <p>Nel dashboard Spotify, aggiungi esattamente questa Redirect URI:</p><code>${escapeHTML(redirectUri())}</code>
    <div class="modal-actions"><button class="outline" data-modal="cancel">Annulla</button><button class="primary" data-modal="save">Salva e collega</button></div>
  </div>`;
  document.body.append(modal);
  modal.querySelector('[data-modal="cancel"]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
  modal.querySelector('[data-modal="save"]').addEventListener('click', () => {
    const id = modal.querySelector('#client-id').value.trim();
    if (!id) { showToast('Incolla prima il Client ID.'); return; }
    state.clientId = id; localStorage.setItem(CONFIG_KEY, id); modal.remove(); initiateOAuth();
  });
  setTimeout(() => modal.querySelector('#client-id').focus(), 50);
}

function connectSpotify() {
  if (state.token && state.expiresAt > Date.now()) { state.view = 'import'; render(); return; }
  if (!state.clientId) { openSettings(); return; }
  initiateOAuth();
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length = 64) {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, x => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[x % 66]).join('');
}

async function initiateOAuth() {
  if (!window.crypto?.subtle) { showToast('Per il login apri l’app da un sito HTTPS.'); return; }
  const verifier = randomString();
  const challenge = await sha256(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const params = new URLSearchParams({
    client_id: state.clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES
  });
  window.location.assign(`${ACCOUNTS}/authorize?${params.toString()}`);
}

async function exchangeCode(code) {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier || !state.clientId) throw new Error('Sessione di accesso non valida. Riprova a collegare Spotify.');
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), client_id: state.clientId, code_verifier: verifier });
  const response = await fetch(`${ACCOUNTS}/api/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Spotify non ha completato l’accesso.');
  setTokens(data);
  sessionStorage.removeItem(VERIFIER_KEY);
}

function setTokens(data) {
  state.token = data.access_token;
  state.refreshToken = data.refresh_token || state.refreshToken;
  state.expiresAt = Date.now() + ((data.expires_in || 3600) * 1000) - 30_000;
  saveSession();
}

function serializableTrack(track) {
  const { previewPromise, previewResolving, ...plainTrack } = track;
  return plainTrack;
}

function saveSession() {
  const serializable = {
    token: state.token, refreshToken: state.refreshToken, expiresAt: state.expiresAt,
    playlist: state.playlist.map(serializableTrack), playlistInfo: state.playlistInfo, index: state.index,
    approved: state.approved.map(serializableTrack), rejected: state.rejected.map(serializableTrack), isDemo: state.isDemo
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializable));
}

function restoreSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (!session) return;
    Object.assign(state, session);
  } catch (_) { sessionStorage.removeItem(SESSION_KEY); }
}

async function currentToken() {
  if (state.token && Date.now() < state.expiresAt) return state.token;
  if (!state.refreshToken || !state.clientId) throw new Error('La sessione Spotify è scaduta. Collega di nuovo Spotify.');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: state.refreshToken, client_id: state.clientId });
  const response = await fetch(`${ACCOUNTS}/api/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok) throw new Error('La sessione Spotify è scaduta. Collega di nuovo Spotify.');
  setTokens(data);
  return state.token;
}

async function spotifyFetch(path, options = {}) {
  const token = await currentToken();
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403 && path.includes('/items')) {
      throw new Error('Con le regole Spotify per le app personali posso leggere i brani solo di playlist che possiedi o a cui collabori. Rendi la playlist collaborativa oppure copiala nel tuo account.');
    }
    throw new Error(data.error?.message || data.error_description || `Spotify ha risposto con errore ${response.status}.`);
  }
  return data;
}

function playlistIdFrom(value) {
  const trimmed = value.trim();
  const uri = trimmed.match(/^spotify:playlist:([A-Za-z0-9]+)$/i);
  if (uri) return uri[1];
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/playlist\/([A-Za-z0-9]+)/i);
    if (match) return match[1];
  } catch (_) { /* invalid URL */ }
  return '';
}

async function loadCsvFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { state.error = 'Il CSV è troppo grande. Prova con un file sotto i 5 MB.'; render(); return; }
  state.error = ''; state.view = 'loading'; state.loadingTitle = 'Leggo il CSV'; state.loadingSubtitle = 'Preparo la tua lista di brani…'; render();
  try {
    const text = await file.text();
    const tracks = tracksFromCsv(text);
    if (!tracks.length) throw new Error('Non ho trovato brani. Il CSV deve avere almeno le colonne “titolo” e “artista”.');
    state.playlist = tracks;
    state.playlistInfo = { name: file.name.replace(/\.csv$/i, '') || 'La mia lista', image: '', id: '' };
    state.index = 0; state.approved = []; state.rejected = []; state.isDemo = false; state.createdPlaylistUrl = '';
    state.loadingTitle = 'Cerco i clip'; state.loadingSubtitle = 'Preparo le prime carte per l’ascolto…'; render();
    await prefetchPreviews(0, 3);
    state.view = 'swipe'; saveSession(); render();
  } catch (error) {
    state.error = error.message || 'Non riesco a leggere questo CSV.';
    state.view = 'import'; render();
  }
}

function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const firstLine = clean.split('\n').find(line => line.trim()) || '';
  const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i]; const next = clean[i + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(field.trim()); field = ''; }
    else if (char === '\n' && !quoted) { row.push(field.trim()); if (row.some(value => value)) rows.push(row); row = []; field = ''; }
    else field += char;
  }
  row.push(field.trim()); if (row.some(value => value)) rows.push(row);
  return rows;
}

function normalizedHeader(value = '') {
  return normalizeText(value).replace(/ /g, '');
}

function tracksFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizedHeader);
  const findColumn = aliases => headers.findIndex(header => aliases.includes(header));
  let titleIndex = findColumn(['titolo', 'title', 'track', 'trackname', 'brano', 'song', 'name']);
  let artistIndex = findColumn(['artista', 'artist', 'artists', 'artistname', 'autore']);
  const albumIndex = findColumn(['album', 'albumname']);
  const urlIndex = findColumn(['url', 'link', 'spotifyurl', 'spotifylink']);
  const spotifyIdIndex = findColumn(['spotifytrackid', 'trackid', 'spotifyid']);
  const isrcIndex = findColumn(['isrc']);
  let dataRows = rows.slice(1);
  if (titleIndex === -1 && artistIndex === -1) { titleIndex = 0; artistIndex = 1; dataRows = rows; }
  if (titleIndex === -1 || artistIndex === -1) throw new Error('Non trovo le colonne “titolo” e “artista”. Scarica il CSV di esempio e usa quello come modello.');
  const stamp = Date.now();
  return dataRows.map((row, index) => {
    const name = (row[titleIndex] || '').trim(); const artists = (row[artistIndex] || '').trim();
    if (!name || !artists) return null;
    const suppliedUrl = (urlIndex >= 0 ? row[urlIndex] : '').trim();
    const spotifyTrackId = (spotifyIdIndex >= 0 ? row[spotifyIdIndex] : '').trim();
    const isrc = (isrcIndex >= 0 ? row[isrcIndex] : '').trim().toUpperCase();
    const spotifySearch = `https://open.spotify.com/search/${encodeURIComponent(`${name} ${artists}`)}`;
    const exactSpotifyUrl = /^[A-Za-z0-9]{22}$/.test(spotifyTrackId) ? `https://open.spotify.com/track/${spotifyTrackId}` : '';
    return { id: `csv-${stamp}-${index}`, uri: exactSpotifyUrl ? `spotify:track:${spotifyTrackId}` : '', name, artists, album: albumIndex >= 0 ? (row[albumIndex] || '').trim() : '', image: '', url: suppliedUrl || exactSpotifyUrl || spotifySearch, isrc, explicit: false, previewUrl: '', previewSource: '', previewResolved: false };
  }).filter(Boolean);
}

function downloadSampleCsv() {
  const content = '\ufefftitolo;artista;album\nSupereroi;Mahmood;Ghettolimpo\nItalodisco;The Kolors;Italodisco\nFlowers;Miley Cyrus;Endless Summer Vacation\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = 'swipetune-esempio.csv'; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

async function fetchPlaylistInfo(id) {
  const data = await spotifyFetch(`/playlists/${encodeURIComponent(id)}?fields=id,name,images,owner(display_name)`);
  return { id: data.id, name: data.name || 'Playlist senza nome', image: data.images?.[0]?.url || '', owner: data.owner?.display_name || '' };
}

async function fetchPlaylistTracks(id) {
  let next = `/playlists/${encodeURIComponent(id)}/items?limit=100&additional_types=track`;
  const tracks = [];
  while (next) {
    const data = await spotifyFetch(next.startsWith('http') ? next.replace(API, '') : next);
    for (const entry of data.items || []) {
      const raw = entry.item || entry.track || entry;
      if (!raw || raw.type !== 'track' || raw.is_local || !raw.id) continue;
      tracks.push({
        id: raw.id,
        uri: raw.uri || `spotify:track:${raw.id}`,
        name: raw.name || 'Brano senza titolo',
        artists: (raw.artists || []).map(artist => artist.name).join(', ') || 'Artista sconosciuto',
        album: raw.album?.name || '',
        image: raw.album?.images?.[0]?.url || '',
        url: raw.external_urls?.spotify || `https://open.spotify.com/track/${raw.id}`,
        isrc: raw.external_ids?.isrc || '',
        explicit: Boolean(raw.explicit),
        previewUrl: raw.preview_url || '',
        previewSource: raw.preview_url ? 'spotify' : '',
        previewResolved: Boolean(raw.preview_url)
      });
    }
    next = data.next || '';
  }
  return tracks;
}

function normalizeText(value = '') {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function deezerJsonp(endpoint) {
  return new Promise((resolve, reject) => {
    const callback = `swipetune_deezer_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    let settled = false;
    const cleanUp = () => {
      clearTimeout(timeout);
      script.remove();
      try { delete window[callback]; } catch (_) { window[callback] = undefined; }
    };
    const finish = (error, data) => {
      if (settled) return;
      settled = true; cleanUp();
      if (error) reject(error); else resolve(data);
    };
    const timeout = setTimeout(() => finish(new Error('Timeout Deezer')), 8000);
    window[callback] = payload => finish(null, payload);
    script.onerror = () => finish(new Error('Deezer non raggiungibile'));
    script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}output=jsonp&callback=${encodeURIComponent(callback)}`;
    document.head.append(script);
  });
}

function tokenSimilarity(left, right) {
  const a = new Set(normalizeText(left).split(' ').filter(Boolean));
  const b = new Set(normalizeText(right).split(' ').filter(Boolean));
  if (!a.size || !b.size) return 0;
  let common = 0; a.forEach(token => { if (b.has(token)) common += 1; });
  return common / Math.max(a.size, b.size);
}

function bestDeezerSearchMatch(track, results = []) {
  const wantedTitle = normalizeText(track.name);
  const wantedArtist = normalizeText(track.artists.split(',')[0]);
  return results.map(item => {
    const title = normalizeText(item.title || item.title_short);
    const artist = normalizeText(item.artist?.name || '');
    const titleScore = title === wantedTitle ? 1 : tokenSimilarity(title, wantedTitle);
    const artistScore = artist === wantedArtist ? 1 : tokenSimilarity(artist, wantedArtist);
    return { item, score: (titleScore * 0.72) + (artistScore * 0.28), titleScore, artistScore };
  }).filter(match => match.item.preview && match.titleScore >= .7 && match.artistScore >= .5)
    .sort((a, b) => b.score - a.score)[0]?.item || null;
}

function bestAppleSearchMatch(track, results = []) {
  const wantedTitle = normalizeText(track.name);
  const wantedArtist = normalizeText(track.artists.split(',')[0]);
  return results.map(item => {
    const title = normalizeText(item.trackName);
    const artist = normalizeText(item.artistName);
    const titleScore = title === wantedTitle ? 1 : tokenSimilarity(title, wantedTitle);
    const artistScore = artist === wantedArtist ? 1 : tokenSimilarity(artist, wantedArtist);
    return { item, score: (titleScore * .72) + (artistScore * .28), titleScore, artistScore };
  }).filter(match => match.item.previewUrl && match.titleScore >= .7 && match.artistScore >= .5)
    .sort((a, b) => b.score - a.score)[0]?.item || null;
}

function applyDeezerPreview(track, item) {
  if (!item?.preview) return false;
  track.previewUrl = item.preview;
  track.previewSource = 'deezer';
  if (!track.image) track.image = item.album?.cover_xl || item.album?.cover_big || item.album?.cover_medium || '';
  return true;
}

function applyApplePreview(track, item) {
  if (!item?.previewUrl) return false;
  track.previewUrl = item.previewUrl;
  track.previewSource = 'apple';
  if (!track.image && item.artworkUrl100) track.image = item.artworkUrl100.replace(/100x100(?:bb)?/i, '600x600bb');
  return true;
}

async function resolvePreview(track) {
  if (track.previewResolved) return track.previewUrl;
  if (track.previewPromise) return track.previewPromise;
  track.previewResolving = true;
  track.previewPromise = (async () => {
    try {
      // The supplied CSV has ISRCs. Deezer resolves an ISRC to the precise recording,
      // rather than guessing from title/artist as the previous version did.
      if (track.isrc) {
        try {
          const deezerTrack = await deezerJsonp(`https://api.deezer.com/track/isrc:${encodeURIComponent(track.isrc)}`);
          if (deezerTrack?.isrc?.toUpperCase() === track.isrc && applyDeezerPreview(track, deezerTrack)) return track.previewUrl;
        } catch (_) { /* continue with the next source */ }
        try {
          const apple = await fetch(`https://itunes.apple.com/lookup?isrc=${encodeURIComponent(track.isrc)}&country=IT&entity=song`);
          if (apple.ok) {
            const data = await apple.json();
            const exact = (data.results || []).find(item => item.previewUrl && (item.isrc || '').toUpperCase() === track.isrc);
            if (applyApplePreview(track, exact)) return track.previewUrl;
          }
        } catch (_) { /* fall through to strict title/artist lookup */ }
      }

      // Only for files without IDs: use a conservative match. Never play a random first result.
      try {
        const query = `track:\"${track.name}\" artist:\"${track.artists.split(',')[0]}\"`;
        const search = await deezerJsonp(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`);
        if (applyDeezerPreview(track, bestDeezerSearchMatch(track, search?.data))) return track.previewUrl;
      } catch (_) { /* try Apple below */ }
      try {
        const term = `${track.name} ${track.artists.split(',')[0]}`;
        const search = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=IT&media=music&entity=song&limit=10`);
        if (search.ok) {
          const data = await search.json();
          if (applyApplePreview(track, bestAppleSearchMatch(track, data.results))) return track.previewUrl;
        }
      } catch (_) { /* no preview is an acceptable outcome */ }
    } finally {
      track.previewResolving = false;
      track.previewResolved = true;
      delete track.previewPromise;
      saveSession();
      if (state.view === 'swipe' && state.playlist[state.index]?.id === track.id && !state.dragging && !state.transitioning) render();
    }
    return track.previewUrl;
  })();
  return track.previewPromise;
}

async function prefetchPreviews(from, amount) {
  const slice = state.playlist.slice(from, from + amount);
  await Promise.all(slice.map(resolvePreview));
}

function stopAudio() {
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  state.playingId = null;
}

async function toggleAudio() {
  const track = state.playlist[state.index];
  if (!track) return;
  if (!track.previewResolved) {
    showToast('Sto ancora cercando il clip…');
    resolvePreview(track).then(() => { if (state.view === 'swipe' && state.index < state.playlist.length) render(); });
    return;
  }
  if (!track.previewUrl) {
    showToast('Per questo brano non ho trovato un clip di ascolto.');
    return;
  }
  if (state.playingId === track.id && !audio.paused) {
    audio.pause();
    return;
  }
  await playPreview(track);
}

async function playPreview(track) {
  if (!track?.previewUrl) return;
  try {
    const existing = audio.dataset.trackId === track.id && audio.src;
    if (!existing) {
      audio.pause();
      audio.src = track.previewUrl;
      audio.dataset.trackId = track.id;
      audio.currentTime = 0;
    }
    state.playingId = track.id;
    const playPromise = audio.play();
    if (playPromise) await playPromise;
    state.audioUnlocked = true;
    updateAudioUI();
  } catch (_) {
    state.playingId = null;
    updateAudioUI();
    showToast('iPhone ha bloccato l’audio: tocca di nuovo Play.');
  }
}

function updateAudioUI() {
  const track = state.playlist[state.index];
  const current = state.playingId === track?.id && !audio.paused;
  const cardButton = document.querySelector('.play-overlay');
  const roundButton = document.querySelector('.round-btn.play');
  if (cardButton) {
    cardButton.setAttribute('aria-label', current ? 'Metti in pausa' : 'Ascolta il clip');
    cardButton.innerHTML = `<span class="play-center ${current ? 'pause' : ''}">${current ? icon('pause') : icon('play')}</span>`;
  }
  if (roundButton) {
    roundButton.classList.toggle('pause', current);
    roundButton.setAttribute('aria-label', current ? 'Pausa' : 'Ascolta clip');
    roundButton.innerHTML = current ? icon('pause') : icon('play');
  }
  document.querySelector('.equalizer')?.classList.toggle('active', current);
}

function updateTimeUI() {
  const activeTrack = state.playlist[state.index];
  if (state.playingId !== activeTrack?.id) return;
  const duration = Math.min(Number.isFinite(audio.duration) ? audio.duration : 30, 30);
  const percentage = duration ? Math.min(100, (audio.currentTime / duration) * 100) : 0;
  const fill = document.querySelector('#audio-fill');
  const time = document.querySelector('#audio-time');
  if (fill) fill.style.width = `${percentage}%`;
  if (time) time.textContent = `0:${String(Math.floor(audio.currentTime)).padStart(2, '0')}`;
}

function decide(decision) {
  if (state.transitioning) return;
  const track = state.playlist[state.index];
  if (!track) return;
  state.transitioning = true;
  if (decision === 'approve') state.approved.push(track); else state.rejected.push(track);
  const card = document.querySelector('#swipe-card');
  const next = state.playlist[state.index + 1];

  // A swipe/click is a user gesture, so iOS can start the already-preloaded next clip here.
  if (state.audioUnlocked && next?.previewUrl) playPreview(next);
  else if (!next?.previewUrl) stopAudio();

  if (card) card.classList.add(decision === 'approve' ? 'out-right' : 'out-left');
  prefetchPreviews(state.index + 1, 3);
  setTimeout(() => {
    state.index += 1;
    state.transitioning = false;
    if (state.index >= state.playlist.length) {
      stopAudio(); state.view = 'results';
    }
    saveSession(); render();
  }, 230);
}

async function createApprovedPlaylist() {
  if (state.isDemo) { showToast('La demo non contiene brani Spotify da salvare.'); return; }
  if (!state.approved.length || state.creating) return;
  state.creating = true; render();
  try {
    const title = `SwipeTune — ${state.playlistInfo.name}`.slice(0, 100);
    const playlist = await spotifyFetch('/me/playlists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: title, description: 'Brani scelti con SwipeTune', public: false })
    });
    const uris = state.approved.map(track => track.uri).filter(Boolean);
    for (let i = 0; i < uris.length; i += 100) {
      await spotifyFetch(`/playlists/${encodeURIComponent(playlist.id)}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uris: uris.slice(i, i + 100) })
      });
    }
    state.createdPlaylistUrl = playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`;
    showToast('Playlist privata creata su Spotify.');
  } catch (error) {
    showToast(error.message || 'Non riesco a creare la playlist.');
  } finally {
    state.creating = false; render();
  }
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(includeRejected = true) {
  const rows = [['decisione', 'titolo', 'artista', 'album', 'ricerca Spotify']];
  state.approved.forEach(track => rows.push(['approvato', track.name, track.artists, track.album, track.url]));
  if (includeRejected) state.rejected.forEach(track => rows.push(['scartato', track.name, track.artists, track.album, track.url]));
  const csv = '\ufeff' + rows.map(row => row.map(csvEscape).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = includeRejected ? 'swipetune-tutte-le-decisioni.csv' : 'swipetune-approvati.csv'; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

let toastTimer;
function showToast(message) {
  toastNode.textContent = message;
  toastNode.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastNode.classList.remove('show'), 3100);
}

audio.addEventListener('play', updateAudioUI);
audio.addEventListener('pause', updateAudioUI);
audio.addEventListener('timeupdate', () => {
  if (audio.currentTime >= 30) audio.pause();
  updateTimeUI();
});
audio.addEventListener('ended', () => { updateAudioUI(); updateTimeUI(); });
audio.addEventListener('error', () => {
  if (state.playingId === state.playlist[state.index]?.id) { state.playingId = null; updateAudioUI(); }
});

document.addEventListener('keydown', event => {
  if (state.view !== 'swipe' || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (event.key === 'ArrowLeft') decide('reject');
  if (event.key === 'ArrowRight') decide('approve');
  if (event.key === ' ') { event.preventDefault(); toggleAudio(); }
});

function boot() {
  // This no-Premium edition starts from a CSV and never needs Spotify OAuth.
  restoreSession();
  state.view = 'welcome';
  render();
}

if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

boot();
