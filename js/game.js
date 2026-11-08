/* SHARAPA word game. Plain JavaScript, no framework, no build step. */
'use strict';

(function () {
  const { scoreGuess, dayKey, pickIndex, shareGrid, WORD_LENGTH, MAX_ROWS } = core;

  const ALLOWED_SET = new Set(ALLOWED);
  const STORAGE_KEY = 'sharapa.wordle.v1';
  const SPLASH_KEY = 'sharapa.wordle.splash';

  const boardEl = document.getElementById('board');
  const keyboardEl = document.getElementById('keyboard');
  const toastEl = document.getElementById('toast');
  const modeChip = document.getElementById('modeChip');
  const helpDialog = document.getElementById('dialog-help');
  const statsDialog = document.getElementById('dialog-stats');
  const resultDialog = document.getElementById('dialog-result');
  const statsSlots = document.querySelectorAll('[data-stats]');

  const reduceMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    mode: 'daily',
    answer: '',
    guesses: [], // [{ word, states }]
    current: '',
    status: 'playing',
    date: dayKey(),
  };

  const keyState = new Map(); // letter -> 'correct' | 'present' | 'absent'

  // ---------------------------------------------------------------- storage

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }

  function saveStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (err) {
      /* private mode, quota, whatever: the game still plays */
    }
  }

  function defaultStats() {
    return { played: 0, wins: 0, streak: 0, maxStreak: 0, dist: [0, 0, 0, 0, 0, 0], lastWin: '' };
  }

  let store = loadStore();
  store.stats = Object.assign(defaultStats(), store.stats || {});

  // ------------------------------------------------------------- game start

  function startDaily(restore) {
    state.mode = 'daily';
    state.date = dayKey();
    state.answer = ANSWERS[pickIndex('sharapa-' + state.date, ANSWERS.length)];
    state.guesses = [];
    state.current = '';
    state.status = 'playing';
    keyState.clear();

    if (restore && store.daily && store.daily.date === state.date) {
      for (const word of store.daily.guesses) {
        const states = scoreGuess(state.answer, word);
        state.guesses.push({ word, states });
        states.forEach((s, i) => recordKey(word[i], s));
      }
      if (state.guesses.length) {
        const last = state.guesses[state.guesses.length - 1];
        if (last.word === state.answer) state.status = 'won';
        else if (state.guesses.length === MAX_ROWS) state.status = 'lost';
      }
    }

    renderBoard(true);
    renderKeyboard();
    updateChip();
  }

  function startPractice() {
    let word = state.answer;
    while (word === state.answer) {
      word = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    }
    state.mode = 'practice';
    state.answer = word;
    state.guesses = [];
    state.current = '';
    state.status = 'playing';
    keyState.clear();
    renderBoard(true);
    renderKeyboard();
    updateChip();
  }

  function updateChip() {
    if (state.mode === 'practice') {
      modeChip.textContent = 'PRACTICE';
    } else {
      const d = new Date(state.date + 'T12:00:00');
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
      modeChip.textContent = 'DAILY \u00B7 ' + label;
    }
  }

  // ------------------------------------------------------------------ board

  function buildBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < MAX_ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.row = String(r);
      row.setAttribute('role', 'row');
      for (let c = 0; c < WORD_LENGTH; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.col = String(c);
        tile.setAttribute('role', 'gridcell');
        tile.setAttribute('aria-label', 'empty');
        row.appendChild(tile);
      }
      boardEl.appendChild(row);
    }
    boardEl.setAttribute('role', 'grid');
    boardEl.setAttribute('aria-label', 'Guess grid, 6 rows of 5 letters');
  }

  function rowEl(index) {
    return boardEl.children[index];
  }

  function renderBoard(instant) {
    for (let r = 0; r < MAX_ROWS; r++) {
      const row = rowEl(r);
      const guess = state.guesses[r];
      for (let c = 0; c < WORD_LENGTH; c++) {
        const tile = row.children[c];
        tile.classList.remove('flip-out', 'flip-in');
        if (guess) {
          tile.textContent = guess.word[c].toUpperCase();
          if (instant) tile.dataset.state = guess.states[c];
        } else if (r === state.guesses.length && state.status === 'playing') {
          tile.textContent = (state.current[c] || '').toUpperCase();
          delete tile.dataset.state;
        } else {
          tile.textContent = '';
          delete tile.dataset.state;
        }
        tile.setAttribute('aria-label', tile.textContent || 'empty');
      }
    }
  }

  function revealRow(row, states) {
    const tiles = Array.from(row.children);
    if (reduceMotion()) {
      tiles.forEach((tile, i) => (tile.dataset.state = states[i]));
      return Promise.resolve();
    }
    const step = 220;
    const gap = 150;
    tiles.forEach((tile, i) => {
      setTimeout(() => tile.classList.add('flip-out'), i * step);
      setTimeout(() => {
        tile.dataset.state = states[i];
        tile.classList.remove('flip-out');
        tile.classList.add('flip-in');
      }, i * step + gap);
      setTimeout(() => tile.classList.remove('flip-in'), i * step + gap + 260);
    });
    return new Promise(resolve => setTimeout(resolve, (WORD_LENGTH - 1) * step + gap + 300));
  }

  // --------------------------------------------------------------- keyboard

  const KEYS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['Enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Backspace'],
  ];

  function buildKeyboard() {
    keyboardEl.innerHTML = '';
    KEYS.forEach((row, index) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row' + (index === 1 ? ' kb-row--inset' : '');
      row.forEach(k => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'key';
        button.dataset.key = k;
        if (k === 'Enter') {
          button.textContent = 'ENTER';
          button.classList.add('key--wide');
          button.setAttribute('aria-label', 'Submit guess');
        } else if (k === 'Backspace') {
          button.textContent = '\u232B';
          button.classList.add('key--wide');
          button.setAttribute('aria-label', 'Delete letter');
        } else {
          button.textContent = k.toUpperCase();
          button.setAttribute('aria-label', 'Letter ' + k.toUpperCase());
        }
        rowEl.appendChild(button);
      });
      keyboardEl.appendChild(rowEl);
    });
  }

  function recordKey(letter, result) {
    const weight = { absent: 0, present: 1, correct: 2 };
    const prev = keyState.get(letter);
    if (!prev || weight[result] > weight[prev]) keyState.set(letter, result);
  }

  function renderKeyboard() {
    keyboardEl.querySelectorAll('.key').forEach(button => {
      const letter = button.dataset.key.toLowerCase();
      const result = keyState.get(letter);
      if (result) button.dataset.state = result;
      else delete button.dataset.state;
    });
  }

  // ------------------------------------------------------------------ toast

  let toastTimer = null;

  function toast(message, ms) {
    toastEl.textContent = message;
    toastEl.classList.add('toast--visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('toast--visible'), ms || 1600);
  }

  // ------------------------------------------------------------------ input

  let revealing = false;

  function addLetter(letter) {
    if (revealing || state.status !== 'playing') return;
    if (state.current.length >= WORD_LENGTH) return;
    state.current += letter;
    renderBoard();
  }

  function removeLetter() {
    if (revealing || state.status !== 'playing') return;
    state.current = state.current.slice(0, -1);
    renderBoard();
  }

  async function submit() {
    if (revealing || state.status !== 'playing') return;

    if (state.current.length < WORD_LENGTH) {
      toast('Not enough letters');
      shakeRow(rowEl(state.guesses.length));
      return;
    }
    if (!ALLOWED_SET.has(state.current)) {
      toast('Not in word list');
      shakeRow(rowEl(state.guesses.length));
      return;
    }

    const row = state.guesses.length;
    const word = state.current;
    const states = scoreGuess(state.answer, word);
    state.guesses.push({ word, states });
    state.current = '';

    if (state.mode === 'daily') {
      store.daily = { date: state.date, guesses: state.guesses.map(g => g.word) };
      saveStore(store);
    }

    states.forEach((s, i) => recordKey(word[i], s));
    renderKeyboard();

    revealing = true;
    try {
      await revealRow(rowEl(row), states);

      if (word === state.answer) {
        state.status = 'won';
        finish();
      } else if (state.guesses.length === MAX_ROWS) {
        state.status = 'lost';
        finish();
      } else {
        renderBoard();
      }
    } finally {
      revealing = false;
    }
  }

  function shakeRow(row) {
    if (!row || reduceMotion()) return;
    row.classList.remove('row--shake');
    void row.offsetWidth;
    row.classList.add('row--shake');
    setTimeout(() => row.classList.remove('row--shake'), 500);
  }

  function finish() {
    if (state.mode === 'daily') {
      updateStats(state.status === 'won', state.guesses.length);
    }
    renderStats();
    showResult();
  }

  function updateStats(won, tries) {
    const stats = store.stats;
    stats.played += 1;
    if (won) {
      stats.wins += 1;
      stats.dist[tries - 1] += 1;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const continues = stats.lastWin === dayKey(yesterday);
      stats.streak = continues ? stats.streak + 1 : 1;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      stats.lastWin = dayKey();
    } else {
      stats.streak = 0;
    }
    store.stats = stats;
    saveStore(store);
  }

  // ----------------------------------------------------------------- modals

  function showDialog(dialog) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function openHelp() {
    showDialog(helpDialog);
  }

  function openStats() {
    renderStats();
    showDialog(statsDialog);
  }

  function renderStats() {
    const stats = store.stats;
    const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    const max = Math.max(1, ...stats.dist);
    const rows = stats.dist
      .map((count, i) => {
        const width = Math.max(8, Math.round((count / max) * 100));
        const active = state.status === 'won' && state.guesses.length === i + 1;
        return (
          '<div class="dist-row">' +
          '<span class="dist-label">' + (i + 1) + '</span>' +
          '<span class="dist-bar' + (active ? ' dist-bar--active' : '') + '" style="width:' + width + '%">' + count + '</span>' +
          '</div>'
        );
      })
      .join('');

    const html =
      '<div class="stat-grid">' +
      '<div class="stat"><b>' + stats.played + '</b><span>PLAYED</span></div>' +
      '<div class="stat"><b>' + winRate + '%</b><span>WIN RATE</span></div>' +
      '<div class="stat"><b>' + stats.streak + '</b><span>STREAK</span></div>' +
      '<div class="stat"><b>' + stats.maxStreak + '</b><span>BEST</span></div>' +
      '</div>' +
      '<p class="section-label">GUESS DISTRIBUTION</p>' +
      '<div class="dist">' + rows + '</div>';

    statsSlots.forEach(slot => (slot.innerHTML = html));
  }

  function showResult() {
    const won = state.status === 'won';
    const title = document.getElementById('resultTitle');
    const sub = document.getElementById('resultWord');
    const shareBtn = document.getElementById('shareBtn');
    const againBtn = document.getElementById('againBtn');

    title.textContent = won ? 'YOU GOT IT' : 'OUT OF TRIES';
    if (won) {
      const n = state.guesses.length;
      sub.innerHTML = 'Solved in <b>' + n + '</b> ' + (n === 1 ? 'guess' : 'guesses') + '.';
    } else {
      sub.innerHTML = 'The word was <b>' + state.answer.toUpperCase() + '</b>.';
    }
    shareBtn.disabled = false;
    shareBtn.textContent = 'SHARE RESULT';
    againBtn.textContent = state.mode === 'daily' ? 'PLAY A PRACTICE WORD' : 'NEW PRACTICE WORD';
    showDialog(resultDialog);
  }

  async function share() {
    const grid = shareGrid(state.guesses.map(g => g.states));
    const tries = state.status === 'won' ? state.guesses.length : 'X';
    const when = state.mode === 'daily' ? state.date : 'practice';
    const text = 'SHARAPA ' + tries + '/6 (' + when + ')\n' + grid + '\n' + location.origin + '/play/';

    const copied = await copyText(text);
    if (copied) {
      toast('Copied to clipboard');
      document.getElementById('shareBtn').textContent = 'COPIED';
    } else {
      window.prompt('Copy your result:', text);
    }
  }

  /** Copy without ever blocking: textarea first, clipboard API second, then give up. */
  async function copyText(text) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (ok) return true;
    } catch (err) {
      /* try the async API below */
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await Promise.race([
          navigator.clipboard.writeText(text),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
        ]);
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  }

  // ----------------------------------------------------------------- events

  /** True for elements that handle Enter and Backspace themselves. */
  function isInteractive(el) {
    return (
      el instanceof Element &&
      !!el.closest('a, button, input, textarea, select, summary, [role="button"], [contenteditable="true"]')
    );
  }

  /** True for elements that consume typed letters (so the game does not eat them). */
  function isTextEntry(el) {
    return (
      el instanceof Element &&
      !!el.closest('input, textarea, select, [contenteditable="true"]')
    );
  }

  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (document.getElementById('splash')) return;
    if (document.querySelector('dialog[open]')) return;
    if (event.key === 'Enter') {
      // A focused link, button or form control keeps its native activation.
      if (isInteractive(event.target)) return;
      event.preventDefault();
      submit();
    } else if (event.key === 'Backspace') {
      if (isInteractive(event.target)) return;
      event.preventDefault();
      removeLetter();
    } else if (/^[a-zA-Z]$/.test(event.key)) {
      if (isTextEntry(event.target)) return;
      addLetter(event.key.toLowerCase());
    }
  });

  keyboardEl.addEventListener('click', event => {
    const button = event.target.closest('.key');
    if (!button) return;
    const key = button.dataset.key;
    if (key === 'Enter') submit();
    else if (key === 'Backspace') removeLetter();
    else addLetter(key.toLowerCase());
    // Pointer input should not leave a key focused, otherwise the next physical
    // Enter would activate that key instead of submitting the guess. Keyboard
    // and assistive-technology activation (event.detail === 0) keeps its focus.
    if (event.detail > 0) button.blur();
  });

  document.getElementById('helpBtn').addEventListener('click', openHelp);
  document.getElementById('statsBtn').addEventListener('click', openStats);
  document.getElementById('shareBtn').addEventListener('click', share);

  document.getElementById('againBtn').addEventListener('click', () => {
    closeDialog(resultDialog);
    startPractice();
  });

  document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => closeDialog(button.closest('dialog')));
  });

  // A hash link inside the result dialog should close the modal, then scroll.
  resultDialog.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) closeDialog(resultDialog);
  });

  [helpDialog, statsDialog, resultDialog].forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog(dialog); // click on backdrop
    });
  });

  // Daily rollover while the tab is open.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (state.mode === 'daily' && dayKey() !== state.date) startDaily(true);
  });

  // ----------------------------------------------------------------- splash

  function splash() {
    const el = document.getElementById('splash');
    if (!el || sessionStorage.getItem(SPLASH_KEY) || reduceMotion()) {
      if (el) el.remove();
      return;
    }
    sessionStorage.setItem(SPLASH_KEY, '1');
    const done = () => {
      el.classList.add('splash--out');
      setTimeout(() => el.remove(), 260);
    };
    const cap = setTimeout(done, 1400);
    el.addEventListener('animationend', event => {
      if (event.animationName !== 'splash-in') return;
      clearTimeout(cap);
      done();
    });
    document.addEventListener('keydown', done, { once: true });
    el.addEventListener('click', done, { once: true });
  }

  // ------------------------------------------------------------------- boot

  buildBoard();
  buildKeyboard();
  startDaily(true);
  splash();
  if (state.status !== 'playing') {
    renderStats();
    showResult();
  }

  // Exposed for the test suite and for curious visitors in devtools.
  window.sharapaGame = { state, scoreGuess };
})();
