/* Optional, consent-based visitor statistics. No fingerprinting or ad use. */
'use strict';
(() => {
  const API = 'https://api.sharapa.io/api/v1/analytics';
  const CONSENT_KEY = 'sharapa.analytics.consent.v1';
  const SESSION_KEY = 'sharapa.analytics.session.v1';
  const notice = document.getElementById('privacyNotice');
  const stateLine = document.getElementById('visitState');
  const page = location.pathname === '/play/' ? 'play'
    : location.pathname.startsWith('/world') ? 'world'
    : location.pathname.startsWith('/scores') ? 'scores'
    : location.pathname.startsWith('/privacy') ? 'privacy' : 'home';
  let consent = 'unset';
  let sessionId = '';
  let timer = 0;
  let pendingSeconds = 0;
  let active = false;
  // One page_view per page load, even if the visitor withdraws and re-consents.
  let announced = false;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // A short filtered crumb crunch, synthesised so the page ships no audio file.
  function playBite() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    let ctx;
    try { ctx = new Ctor(); } catch (_) { return; }
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(rate * 0.26), rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const t = i / rate;
      const crackle = Math.random() * 2 - 1;
      const thump = Math.sin(2 * Math.PI * 190 * t) * 0.6;
      const envelope = Math.exp(-t * 15) * Math.min(1, t * 900);
      data[i] = (crackle * 0.65 + thump) * envelope * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1700;
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.value = 0.85;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    source.onended = () => {
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    };
  }

  function renderState() {
    if (!stateLine) return;
    stateLine.textContent = consent === 'allow'
      ? 'Visit statistics are on. You can switch them off here at any time.'
      : consent === 'essential'
        ? 'Visit statistics are off. Only essential functions run.'
        : 'No choice saved yet. Visit statistics stay off until you allow them.';
  }

  function makeId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function payload(event, extra = {}) {
    return { consent: true, session_id: sessionId, page, event, ...extra };
  }

  function send(event, extra = {}, beacon = false) {
    if (consent !== 'allow' || !sessionId) return;
    const body = JSON.stringify(payload(event, extra));
    if (beacon && navigator.sendBeacon) {
      try {
        if (navigator.sendBeacon(API, new Blob([body], { type: 'text/plain' }))) return;
      } catch (_) { /* fall through to a keepalive request */ }
    }
    fetch(API, {
      method: 'POST', mode: 'cors', credentials: 'omit', keepalive: beacon,
      headers: { 'Content-Type': 'text/plain' }, body,
    }).catch(() => {});
  }

  function flush(beacon = false) {
    if (!pendingSeconds || consent !== 'allow') return;
    const seconds = Math.min(30, pendingSeconds);
    pendingSeconds -= seconds;
    send('duration', { seconds }, beacon);
  }

  function start() {
    if (active || consent !== 'allow') return;
    active = true;
    try { sessionId = sessionStorage.getItem(SESSION_KEY) || ''; } catch (_) { /* tab-only ID is optional */ }
    if (!sessionId) {
      sessionId = makeId();
      try { sessionStorage.setItem(SESSION_KEY, sessionId); } catch (_) { /* memory-only this page */ }
    }
    if (!announced) {
      announced = true;
      send('page_view');
    }
    timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      pendingSeconds += 1;
      if (pendingSeconds >= 15) flush();
    }, 1000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide, { once: true });
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') flush(true);
  }

  function onPageHide() {
    flush(true);
  }

  function stop(clearId) {
    if (timer) window.clearInterval(timer);
    timer = 0;
    active = false;
    pendingSeconds = 0;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    if (clearId) {
      sessionId = '';
      try { sessionStorage.removeItem(SESSION_KEY); } catch (_) { /* optional */ }
    }
  }

  function choose(value) {
    if (value !== 'allow' && value !== 'essential') return;
    consent = value;
    try { localStorage.setItem(CONSENT_KEY, value); } catch (_) { /* choice lasts for this page */ }
    if (notice) notice.hidden = true;
    if (value === 'allow') start();
    else stop(true);
    renderState();
  }

  function openSettings() {
    const controls = document.querySelectorAll('[data-privacy-choice]');
    if (!controls.length) {
      location.assign('/privacy/#visit-data');
      return;
    }
    const block = document.getElementById('visit-data') || controls[0];
    if (block.scrollIntoView) block.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    controls[0].focus({ preventScroll: true });
  }

  // One big cookie: crunch, take a bite, then close the notice as essential-only.
  document.querySelectorAll('[data-privacy-cookie]').forEach(button => {
    button.addEventListener('click', () => {
      playBite();
      const body = button.querySelector('.cookie-body');
      if (body) body.setAttribute('mask', 'url(#cookieBiteMask)');
      button.classList.add('is-bitten');
      window.setTimeout(() => {
        if (body) body.removeAttribute('mask');
        button.classList.remove('is-bitten');
        choose('essential');
      }, prefersReducedMotion() ? 140 : 420);
    });
  });
  document.querySelectorAll('[data-privacy-choice]').forEach(button => {
    button.addEventListener('click', () => choose(button.dataset.privacyChoice));
  });
  document.querySelectorAll('[data-privacy-settings]').forEach(button => {
    button.addEventListener('click', openSettings);
  });
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-track]') : null;
    if (target) send('explore', { feature: target.dataset.track }, true);
  });

  try {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved === 'allow' || saved === 'essential') consent = saved;
  } catch (_) { /* show a fresh choice if storage is unavailable */ }
  if (notice) notice.hidden = consent !== 'unset';
  if (consent === 'allow') start();
  renderState();

  window.sharapaAnalytics = {
    track(feature) {
      if (typeof feature === 'string') send('explore', { feature }, true);
    },
    openSettings,
    consent: () => consent,
  };
})();
