/* Player account and public score table. No dependencies. */
'use strict';
(() => {
  const API = 'https://api.sharapa.io/api/v1';
  const SIGNED_IN_KEY = 'sharapa.account.signedIn.v1';
  const accountStatus = document.getElementById('accountStatus');
  const leaderboardStatus = document.getElementById('leaderboardStatus');
  const authForms = document.getElementById('authForms');
  const accountPanel = document.getElementById('accountPanel');
  const rows = document.getElementById('leaderboardRows');
  const publicToggle = document.getElementById('publicToggle');
  const periodSelect = document.getElementById('periodSelect');

  function setStatus(element, text, state) {
    if (!element) return;
    element.textContent = text;
    if (state) element.dataset.state = state;
    else delete element.dataset.state;
  }

  async function request(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) };
    const response = await fetch(API + path, {
      mode: 'cors',
      credentials: 'include',
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
    let body = null;
    if (response.status !== 204) {
      try { body = await response.json(); } catch (_) { body = null; }
    }
    if (!response.ok) throw new Error((body && body.detail) || `Score service returned ${response.status}.`);
    return body;
  }

  function showAccount(user) {
    authForms.hidden = true;
    accountPanel.hidden = false;
    document.getElementById('accountUsername').textContent = '@' + user.username;
    document.getElementById('accountEmail').textContent = user.email;
    publicToggle.checked = Boolean(user.leaderboard_public);
    try { localStorage.setItem(SIGNED_IN_KEY, '1'); } catch (_) { /* score sync marker is optional */ }
  }

  function showSignedOut() {
    authForms.hidden = false;
    accountPanel.hidden = true;
    try { localStorage.removeItem(SIGNED_IN_KEY); } catch (_) { /* optional */ }
  }

  async function loadAccount() {
    try {
      const result = await request('/me');
      showAccount(result.user);
      setStatus(accountStatus, 'Signed in. Your username is private until you opt in.', 'ok');
    } catch (error) {
      showSignedOut();
      if (error.message === 'Failed to fetch' || error instanceof TypeError) {
        setStatus(accountStatus, 'The score service is not reachable yet. You can still play without an account.', 'error');
      } else if (!error.message.includes('401')) {
        setStatus(accountStatus, error.message, 'error');
      } else {
        setStatus(accountStatus, 'Create an account or sign in. No confirmation email is sent.', '');
      }
    }
  }

  async function loadLeaderboard() {
    const days = Number(periodSelect.value);
    setStatus(leaderboardStatus, 'Loading scores...', '');
    try {
      const result = await request(`/scores?days=${encodeURIComponent(days)}&limit=50`);
      rows.replaceChildren();
      if (!result.scores.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.textContent = 'No public scores yet. Be the first to opt in.';
        tr.append(td);
        rows.append(tr);
      } else {
        result.scores.forEach((score, index) => {
          const tr = document.createElement('tr');
          [String(index + 1), score.username, String(score.points), String(score.wins),
            score.average_guesses == null ? 'N/A' : Number(score.average_guesses).toFixed(2)]
            .forEach(value => {
              const td = document.createElement('td');
              td.textContent = value;
              tr.append(td);
            });
          rows.append(tr);
        });
      }
      setStatus(leaderboardStatus, `Updated for the last ${days} days.`, 'ok');
    } catch (error) {
      rows.replaceChildren();
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'Score service unavailable. The game still works locally.';
      tr.append(td);
      rows.append(tr);
      setStatus(leaderboardStatus, 'Could not load the leaderboard.', 'error');
    }
  }

  async function submitForm(form, endpoint, transform) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(accountStatus, 'Working...', '');
    try {
      const data = transform(new FormData(form));
      const result = await request(endpoint, { method: 'POST', body: JSON.stringify(data) });
      showAccount(result.user);
      setStatus(accountStatus, endpoint.endsWith('register')
        ? 'Account created. No confirmation email was sent.'
        : 'You are signed in.', 'ok');
      form.reset();
      await loadLeaderboard();
    } catch (error) {
      setStatus(accountStatus, error instanceof TypeError
        ? 'The score service is not reachable yet. Your game remains available.'
        : error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }

  document.getElementById('registerForm').addEventListener('submit', event => {
    event.preventDefault();
    submitForm(event.currentTarget, '/register', data => ({
      email: String(data.get('email') || ''),
      username: String(data.get('username') || ''),
      password: String(data.get('password') || ''),
      leaderboard_public: data.get('leaderboard_public') === 'on',
    }));
  });

  document.getElementById('loginForm').addEventListener('submit', event => {
    event.preventDefault();
    submitForm(event.currentTarget, '/login', data => ({
      login: String(data.get('login') || ''),
      password: String(data.get('password') || ''),
    }));
  });

  document.getElementById('saveVisibility').addEventListener('click', async () => {
    const button = document.getElementById('saveVisibility');
    button.disabled = true;
    try {
      const result = await request('/account/leaderboard', {
        method: 'POST', body: JSON.stringify({ leaderboard_public: publicToggle.checked }),
      });
      showAccount(result.user);
      setStatus(accountStatus, result.user.leaderboard_public
        ? 'Your username and scores can now appear publicly.'
        : 'Your leaderboard profile is private.', 'ok');
      await loadLeaderboard();
    } catch (error) {
      setStatus(accountStatus, error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
      await request('/logout', { method: 'POST' });
      showSignedOut();
      setStatus(accountStatus, 'Signed out.', 'ok');
    } catch (error) {
      setStatus(accountStatus, error.message, 'error');
    }
  });

  document.getElementById('deleteForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!window.confirm('Delete your account, sessions and saved scores? This cannot be undone.')) return;
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await request('/account/delete', {
        method: 'POST', body: JSON.stringify({ password: String(new FormData(form).get('password') || '') }),
      });
      showSignedOut();
      form.reset();
      setStatus(accountStatus, 'Account and scores deleted.', 'ok');
      await loadLeaderboard();
    } catch (error) {
      setStatus(accountStatus, error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  periodSelect.addEventListener('change', loadLeaderboard);
  loadAccount();
  loadLeaderboard();
})();
