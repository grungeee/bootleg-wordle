/* Pure game logic, shared by the page and the test suite.
 * No DOM access in here on purpose.
 */
'use strict';

const WORD_LENGTH = 5;
const MAX_ROWS = 6;

/**
 * Score one guess against the answer.
 * Returns an array of 'correct' | 'present' | 'absent', one per letter.
 * Two passes: exact matches first, then remaining letters left to right,
 * so a repeated letter can never borrow a tile that is already green.
 */
function scoreGuess(answer, guess) {
  const a = String(answer).toLowerCase().split('');
  const g = String(guess).toLowerCase().split('');
  const result = new Array(a.length).fill('absent');
  const pool = a.slice();

  for (let i = 0; i < g.length; i++) {
    if (g[i] === pool[i]) {
      result[i] = 'correct';
      pool[i] = null;
    }
  }

  for (let i = 0; i < g.length; i++) {
    if (result[i] === 'correct') continue;
    const hit = pool.indexOf(g[i]);
    if (hit !== -1) {
      result[i] = 'present';
      pool[hit] = null;
    }
  }

  return result;
}

/** Local calendar day as YYYY-MM-DD, so the daily word rolls over at local midnight. */
function dayKey(date) {
  const d = date || new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Small stable string hash (FNV-1a style) used to turn a date into an index. */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pick from a pool for a given key. */
function pickIndex(key, poolLength) {
  return hashString(key) % poolLength;
}

/** Emoji grid for sharing, one row per submitted guess. */
function shareGrid(rows, solved) {
  const map = { correct: '\u{1F7E9}', present: '\u{1F7E8}', absent: '\u2B1B' };
  return rows.map(row => row.map(state => map[state] || '\u2B1B').join('')).join('\n');
}

const core = { scoreGuess, dayKey, hashString, pickIndex, shareGrid, WORD_LENGTH, MAX_ROWS };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = core;
}
