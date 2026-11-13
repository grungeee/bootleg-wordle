/* Optional, consent-based visitor statistics. No fingerprinting or ad use. */
'use strict';
(() => {
  const API = 'https://api.sharapa.io/api/v1/analytics';
  const CONSENT_KEY = 'sharapa.analytics.consent.v1';
  const SESSION_KEY = 'sharapa.analytics.session.v1';
  const notice = document.getElementById('privacyNotice');
  const page = location.pathname === '/play/' ? 'play'
    : location.pathname.startsWith('/world') ? 'world'
    : location.pathname.startsWith('/scores') ? 'scores'
    : location.pathname.startsWith('/privacy') ? 'privacy' : 'home';
  let consent = 'unset';
  let sessionId = '';
  let timer = 0;
  let pendingSeconds = 0;
  let active = false;

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
    send('page_view');
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
  }

  function openSettings() {
    stop(true);
    consent = 'unset';
    try { localStorage.removeItem(CONSENT_KEY); } catch (_) { /* optional */ }
    if (notice) {
      notice.hidden = false;
      const allow = notice.querySelector('[data-privacy-choice="allow"]');
      if (allow) allow.focus();
    }
  }

  if (notice) {
    notice.querySelectorAll('[data-privacy-choice]').forEach(button => {
      button.addEventListener('click', () => choose(button.dataset.privacyChoice));
    });
  }
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

  window.sharapaAnalytics = {
    track(feature) {
      if (typeof feature === 'string') send('explore', { feature }, true);
    },
    openSettings,
    consent: () => consent,
  };
})();
