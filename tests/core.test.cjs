'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { scoreGuess, dayKey, pickIndex, shareGrid } = require('../js/core.js');

const row = guess => scoreGuess('crane', guess);

test('all letters in the right place', () => {
  assert.deepStrictEqual(scoreGuess('crane', 'crane'), [
    'correct',
    'correct',
    'correct',
    'correct',
    'correct',
  ]);
});

test('no letters in common', () => {
  assert.deepStrictEqual(scoreGuess('crane', 'doubt'), [
    'absent',
    'absent',
    'absent',
    'absent',
    'absent',
  ]);
});

test('letter present but in the wrong spot', () => {
  assert.deepStrictEqual(scoreGuess('crane', 'eagle'), [
    'absent', // e, the only e is already the green one at the end
    'present', // a
    'absent', // g
    'absent', // l
    'correct', // e at the end
  ]);
});

test('a repeated guess letter cannot borrow the answer tile that is already green', () => {
  // answer has one s, guess puts s in the wrong spot first and the right spot last
  assert.deepStrictEqual(scoreGuess('crees', 'sakis'), [
    'absent',
    'absent',
    'absent',
    'absent',
    'correct',
  ]);
});

test('a repeated guess letter is only marked present as often as the answer allows', () => {
  // answer crane has one a, guess has two
  const result = scoreGuess('crane', 'aahed');
  assert.deepStrictEqual(result, ['present', 'absent', 'absent', 'present', 'absent']);
});

test('an unknown fifth letter does not remove a used letter twice', () => {
  // answer has two e, guess has three
  assert.deepStrictEqual(scoreGuess('crees', 'eeeee'), [
    'absent',
    'absent',
    'correct',
    'correct',
    'absent',
  ]);
});

test('scoring is case insensitive', () => {
  assert.deepStrictEqual(scoreGuess('CRANE', 'Crane'), row('crane'));
});

test('every result has one entry per letter', () => {
  for (const guess of ['crane', 'eagle', 'sakis', 'aahed']) {
    assert.strictEqual(row(guess).length, 5);
  }
});

test('day key is a local calendar date', () => {
  assert.strictEqual(dayKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.strictEqual(dayKey(new Date(2026, 10, 8)), '2026-11-08');
});

test('daily pick is stable for a given day and pool', () => {
  const a = pickIndex('sharapa-2026-11-08', 1215);
  const b = pickIndex('sharapa-2026-11-08', 1215);
  assert.strictEqual(a, b);
  assert.ok(a >= 0 && a < 1215);
  assert.notStrictEqual(a, pickIndex('sharapa-2026-11-09', 1215));
});

test('share grid renders one row per guess', () => {
  const grid = shareGrid([
    ['absent', 'present', 'correct', 'absent', 'correct'],
    ['correct', 'correct', 'correct', 'correct', 'correct'],
  ]);
  assert.strictEqual(grid.split('\n').length, 2);
});
