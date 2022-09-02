/*
 * __          ______  _____  _____  _      ______
 * \ \        / / __ \|  __ \|  __ \| |    |  ____|
 *  \ \  /\  / / |  | | |__) | |  | | |    | |__
 *   \ \/  \/ /| |  | |  _  /| |  | | |    |  __|
 *    \  /\  / | |__| | | \ \| |__| | |____| |____
 *     \/  \/   \____/|_|  \_\_____/|______|______|
 *
 */

'use strict';
//* <=====< test DB >=====>
const testDB = [
  'agama',
  'banty',
  'chert',
  'dewar',
  'emmys',
  'feens',
  'gouch',
  'homey',
  'idola',
  'jowed',
  'kisan',
  'lurex',
  'moony',
  'nikau',
  'oxbow',
  'poled',
  'query',
  'redox',
  'swack',
  'tased',
  'umiak',
  'verve',
  'woops',
  'xylan',
  'yanks',
  'zoril',
  'aabbb',
  'after',
  'react',
  'areal',
  'great',
  'treat',
  'waste',
  'react',
  'tears',
];
// console.log(testDB);
//* <=====< xxx end xxx >=====>

//* Sortred DB
//- Database Object
const wordleDB = {
  a: [],
  b: [],
  c: [],
  d: [],
  e: [],
  f: [],
  g: [],
  h: [],
  i: [],
  j: [],
  k: [],
  l: [],
  m: [],
  n: [],
  o: [],
  p: [],
  q: [],
  r: [],
  s: [],
  t: [],
  u: [],
  v: [],
  w: [],
  x: [],
  y: [],
  z: [],
};

//: -------------------------------------------------
//TODO:
//o create a funtion
// //- Sorting Algorithm
// function sortWordsInAlphabeticalOrder(list, object) {
//   const entries = Object.entries(object);
//   const keys = Object.keys(object);
//   const values = Object.values(object);

//   // return function () {
//   //. Safe -> short list
//   // const wordleDB = testDB.forEach(word => {

//   //> Unsafe -> long list
//   list.forEach(word => {
//     entries.forEach(entry => {
//       const [key, value] = entry;
//       if (word[0] === key) {
//         value.push(word);
//       }
//     });
//   });
//   // };
// }

// sortWordsInAlphabeticalOrder(wordsList, wordleDB);
//: -------------------------------------------------

//- Sorting Algorithm
const entries = Object.entries(wordleDB);
const keys = Object.keys(wordleDB);
const values = Object.values(wordleDB);

//. Safe -> short list
// const wordleDB = testDB.forEach(word => {

//> Unsafe -> long list
wordsList.forEach(word => {
  entries.forEach(entry => {
    const [key, value] = entry;
    if (word[0] === key) {
      value.push(word);
    }
  });
});

// console.log(wordleDB, entries, keys, values);
// console.log(Object.values(wordleDB).length);
// console.log(Object.values(wordleDB)[0][1]);

//* RNG funcion: generates number -> strings(index) in the array
//: Better random init generator (min, max)
function newRNG(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

//* This picks a random word for 'wordle' from database

let wordle;
let wordleArr;

function pickWordle() {
  const valuesLengthRNG = newRNG(0, values.length);
  const valuesWordsArr = values[valuesLengthRNG];
  const valuesArrayLengthRNG = newRNG(0, valuesWordsArr.length);
  wordle = valuesWordsArr[valuesArrayLengthRNG];
  wordleArr = wordle.split('');

  //> console logs
  console.log('letterNR: ', valuesLengthRNG, 'wordNR: ', valuesArrayLengthRNG);
  console.log('little help: ', valuesWordsArr);
  console.log(
    `this is the word you need to guess: [ ${wordle.toUpperCase()} ]`
  );
}
pickWordle();

//* Matching word in the database
const guessTest = 'hants';

String.prototype.isInDB = function () {
  const that = this.split('').join('');
  return values[keys.indexOf(that[0])].includes(that);
};

//* Count items in array
function countInArray(array, what) {
  return array.filter(item => item === what).length;
}

//* Variables
//-  DOM elements
//. game fields
const body = document.querySelector('body');
const rows = document.querySelector('.rows-container');
const row = rows.querySelector('.row'); //: r-1
const char = row.querySelector('.char'); //: c-1

//r |=================================|

//. keyboard fields
const keysKB = Array.from(document.querySelectorAll('.key'));

// keysKB.forEach(
//   key => key.classList.contains('k--q') && key.classList.add('char--green')
// );
// console.log(keysKB[0]);

// console.log(document.querySelector('.k--q').classList);

//: |=================================|
//- not sure with all of these
//~ row & char are not really needed too
const rowsAll = rows.querySelectorAll('.row');
// const rowsAllArr = [...rows.querySelectorAll('.row')];
const rowsAllArr = Array.from(rows.querySelectorAll('.row'));
// console.log(rowsAll);
const charAll = rows.querySelectorAll('.char');
const charAllArr = [...row.querySelectorAll('.char')];
// console.log(charAll, charAllArr);

//- Program elements
let guess;
let key;

//. char and row counts
let count = 0;
let currentRow = 0;

//>
const wordleTest = 'waste';
let testCount = 0;

const alphabet = `abcdefghijklmnopqrstuvwxyz`.split('');

//- prevent paste event
document.onpaste = e => e.preventDefault();

//* Keydown Event
document.addEventListener('keydown', keydown);

function keydown(e) {
  //- disabling keys

  //! take functions out of here!
  function disableKey(e) {
    // return ['Tab', 'Shift', 'Alt'].includes(e.key) ? e.preventDefault():  '';
    //: this should be better
    return ['Tab', 'Shift', 'Alt'].includes(e.key) && e.preventDefault();
  }
  disableKey(e);

  //- permitting keys + toUpperCase
  function isPermitted(e) {
    return /[a-zA-Z]+$/g.test(e.key) && e.key.length === 1
      ? e.key.toUpperCase()
      : '';
  }
  key = isPermitted(e);

  //- rows
  // [...rows.children].forEach((r, index) => {
  rowsAllArr.forEach((r, index, rowArr) => {
    //! js dataset test
    r.dataset.index = index;
    let rowIndex = r.dataset.index;
    // console.log(r.dataset);

    //- one row per event
    if (currentRow !== index) return;

    //- chars
    Array.from([...r.children]).forEach((c, i, charArr) => {
      //! js dataset test
      c.dataset.index = i;
      let fieldIndex = c.dataset.index;

      // [...r.children].forEach((c, i) => {
      // charAll.forEach((c, i) => {
      //- one char per event
      if (count !== i) return;

      //- input values
      if (c.maxLength !== c.value.length && key !== '') {
        (c.value = key), c.focus();
      }

      //- clearing field
      if (
        e.key === 'Backspace' &&
        c.dataset.char === charArr[4].dataset.char &&
        charArr[4].value !== ''
      ) {
        console.log('last letter');
        e.preventDefault();
        r.lastElementChild.value = '';
      } else if (e.key === 'Backspace' && c.dataset.char > 0) {
        c.previousElementSibling?.focus();
        count--;
      }

      //- animation on field change
      if (c.value !== '') c.classList.add('char-transition');
      if (c.value === '') c.classList.remove('char-transition');

      //- next row + game logic (on enter)
      //. if true
      if (
        e.key === 'Enter' &&
        c.value !== '' &&
        guess.toLowerCase().isInDB()
        // testDB.includes(guess.toLowerCase())
      ) {
        currentRow++;
        count = 0;

        // & <============< Game Logic >============>

        //. adding colors to right letters
        //: chars included in both wordle and guess
        const wordleArrFilterd = wordleArr.filter(w => guess.includes(w));

        wordleArr.forEach((w, wIndex) => {
          const g = guess[wIndex];

          if (w === g) {
            charArr[wIndex].classList.add('char--green'); //: input fields

            document.querySelector(`.k--${g}`).classList.remove('char--yellow');
            document.querySelector(`.k--${g}`).classList.add('char--green'); //: keyboad
            wordleArrFilterd.splice(wordleArrFilterd.indexOf(g), 1);
          } //-
          else if (wordleArrFilterd.includes(g)) {
            charArr[wIndex].classList.add('char--yellow'); //: input fields

            !document
              .querySelector(`.k--${g}`)
              .classList.contains('char--green') &&
              document.querySelector(`.k--${g}`).classList.add('char--yellow');
            wordleArrFilterd.splice(wordleArrFilterd.indexOf(g), 1);
          } //-
          else {
            document.querySelector(`.k--${g}`).classList.add('char--none');
          }
        });
        // & <==========< end of game logic >==========>

        //- animation
        //. if false
      } else if (
        e.key === 'Enter' &&
        c.value !== '' &&
        !guess.isInDB()
        // !guess.toLowerCase().isInDB()
      ) {
        //: done with a css trick -> look into offsetWidth
        r.classList.remove('row--false');
        r.offsetWidth; //> returns read-only property of layout-width of element
        r.classList.add('row--false');
      }

      //^! /// testing /// //
      //. result test:
      if (e.key === 'Enter') {
        console.log(
          `this is the input value: [ ${guess.toUpperCase() || 'no value'} ]`,
          guess.isInDB() || 'no value'
        );
      }
      //^! /// /// /// ///
    });

    //- sets a 'guess' word form characters
    guess = Array.from([...r.children]).reduce((acc, cur, i, arr) => {
      return acc + cur.value.toLowerCase();
    }, Array.from([...r.children][0]));
  });

  //- next char
  if (count !== 4 && key !== '') count++;
}

//: ==========================================================================

//* Click event

document.addEventListener('click', click);

function click(e) {
  const keyKB = e.target.classList[1]?.slice(3);
  const keydownEvent = new KeyboardEvent('keydown', {
    key: keyKB,
    event: keyKB,
  });
  const backspaceEvent = new KeyboardEvent('keydown', {
    key: 'Backspace',
    code: 'Backspace',
    cancelable: true,
    bubbles: true,
  });

  console.log(keyKB === 'Backspace' ? backspaceEvent : keydownEvent);

  document.dispatchEvent(keyKB === 'Backspace' ? backspaceEvent : keydownEvent);
}
