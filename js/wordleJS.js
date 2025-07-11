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
  const valuesLengthRNG = newRNG(0, values.length - 1);
  const valuesWordsArr = values[valuesLengthRNG];
  const valuesArrayLengthRNG = newRNG(0, valuesWordsArr.length - 1);
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
const logo = [...document.querySelectorAll('.logo')];

//- Program elements
let guess;
let guessArr;
let key;

//. char and row counts
let count = -1;
let currentRow = 0;
//> -----------------------------------------------------------------
//* Animation on game load
const header = document.querySelector('.header');
const modal = document.querySelector('.modal');

const closeModalButton = document.querySelector('.closeModalButton');

// o | need to add X to close the modal window

function addLogoScreen() {
  header.insertAdjacentHTML(
    'afterbegin',
    `
        <div class="logo-container">
          <div class="logo">W</div>
          <div class="logo">O</div>
          <div class="logo">R</div>
          <div class="logo">D</div>
          <div class="logo">L</div>
          <div class="logo">E</div>
        </div>
        <div class='overlay'></div>
`
  );
}
addLogoScreen();

const logoContainer = document.querySelector('.logo-container');
const logoLetters = [...document.querySelectorAll('.logo')];
const overlay = document.querySelector('.overlay');

function startupAnimations() {
  document.addEventListener('DOMContentLoaded', runAnimation);
  function runAnimation() {
    logoContainer.classList.remove('move-in-out');
    this.offsetWidth; //> returns read-only property of layout-width of element
    logoContainer.classList.add('move-in-out');

    logoLetters.reverse().forEach((l, i) => {
      setTimeout(() => {
        l.classList.remove('rotateX');
        l.offsetWidth;
        l.classList.add('rotateX');
      }, i * (25 * i));
    });
    setTimeout(() => {
      logoLetters.forEach((l, i) => {
        setTimeout(() => {
          l.classList.remove('rotateX-out');
          l.offsetWidth;
          l.classList.add('rotateX-out');
        }, i * (25 * i));
      });
    }, 2000);
  }

  logoContainer.addEventListener('animationend', removeLogoScreen);
  function removeLogoScreen() {
    setTimeout(() => {
      logoContainer.remove();
      overlay.remove();
      modal.classList.remove('hidden');
      // ! only after animation end initiate the game function
    }, 2000);
  }
}
startupAnimations();
//> -----------------------------------------------------------------
// document.addEventListener('click', function (e) {
//   console.log(e);
//   console.log(e.target.getBoundingClientRect());
// });

const wordleTest = 'waste';
const alphabet = `abcdefghijklmnopqrstuvwxyz`.split('');
//> -----------------------------------------------------------------
//- prevent paste event
document.onpaste = e => e.preventDefault();

//* Keydown Event

document.addEventListener('keydown', keydown);

//&  ////////////////// start //////////////////////////
// todo:
//o implement animation with delay, which reveals the matches one by one
//: |========================/ New Stuff /===========================|
//: |================================================================|
//* ===================== Keydown Event =====================

//* Keydown Callback
function keydown(e) {
  disableKey(e);
  key = isPermitted(e);
  nextChar();
  gameKeydown(e);
}

//- disabling keys
function disableKey(e) {
  return (
    ['Tab', 'Shift', 'Alt', 'Backspace'].includes(e.key) && e.preventDefault()
  );
}

//- permitting keys + toUpperCase
function isPermitted(e) {
  return /[a-zA-Z]+$/g.test(e.key) && e.key.length === 1
    ? e.key.toUpperCase()
    : '';
}

//- next char
function nextChar() {
  if (count !== 4 && key !== '') count++;
}

//*
function gameKeydown(e) {
  //- rows
  rowsAllArr.forEach((r, index, rowArr) => {
    //- one row per event
    if (currentRow !== index) return;

    //- chars
    Array.from([...r.children]).forEach((c, i, charArr) => {
      //- one char per event
      if (count !== i) return;

      //: --------------------------------------------------
      const lastChild = r.lastElementChild;

      //- input values
      if (c.maxLength !== c.value.length && key !== '') {
        c.value = key;
      }

      //- clearing field
      const firstChild = r.firstElementChild;
      if (e.key === 'Backspace' && firstChild === c) {
        count--;
        c.value = '';
      } else if (e.key === 'Backspace') {
        c.value = '';
        count--;
      }
      //: --------------------------------------------------

      //- animation on field change
      if (c.value !== '') c.classList.add('char--transition');
      if (c.value === '') c.classList.remove('char--transition');

      //> ---------------------------------------------------------
      //- next row + game logic (on enter)
      //. if true
      if (e.key === 'Enter' && c.value !== '' && guess.isInDB()) {
        currentRow++;
        count = -1;

        // & <============< Game Logic >============>

        //- adding colors to right letters
        //: chars included in both wordle and guess
        const wordleArrFiltered = wordleArr.filter(w => guess.includes(w));

        wordleArr.forEach((w, wIndex) => {
          const g = guess[wIndex];

          setTimeout(() => {
            //: reveal colors one by one
            //. reveal animation
            charArr[wIndex].classList.add('char--rotate'); //: rotate char inputs

            if (w === g) {
              //. input fields
              charArr[wIndex].classList.add('char--green');
              wordleArrFiltered.splice(wordleArrFiltered.indexOf(g), 1);

              //. keyboard
              document
                .querySelector(`.k--${g}`)
                .classList.remove('char--yellow');
              document.querySelector(`.k--${g}`).classList.add('char--green');
            } //-
            else if (wordleArrFiltered.includes(g)) {
              //. input fields
              charArr[wIndex].classList.add('char--yellow');
              wordleArrFiltered.splice(wordleArrFiltered.indexOf(g), 1);

              //. keyboard
              !document
                .querySelector(`.k--${g}`)
                .classList.contains('char--green') &&
                document
                  .querySelector(`.k--${g}`)
                  .classList.add('char--yellow');
            } else {
              document.querySelector(`.k--${g}`).classList.add('char--none');
            }
          }, wIndex * 500);
          if (wordle === guess)
            setTimeout(() => {
              logo.forEach(l => l.classList.add('char--green'));
            }, 2500);
        });

        // & <==========< end of game logic >==========>

        //- animation
        //. if false
      } else if (e.key === 'Enter' && c.value !== '' && !guess.isInDB()) {
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

      //& logs -----------
      // console.log(e, count, c.dataset.char);
      //^! /// /// /// ///
    });

    //- sets a 'guess' word form characters
    guess = Array.from([...r.children]).reduce((acc, cur, i, arr) => {
      return acc + cur.value.toLowerCase();
    }, Array.from([...r.children][0]));

    guessArr = guess?.split('');
  });
}

//* ===================== Click Event =====================
//todo:
//x make Backspace work again
//x fix bug that makes phone keyboard to popup on keypress
//o prevent bubbling at row elements (click targets rows instead of only keys)

document.addEventListener('click', click);

function click(e) {
  const keyKB = e.target.classList[1]?.slice(3);
  const keydownEvent = new KeyboardEvent('keydown', {
    key: keyKB,
    event: keyKB,
  });
  const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace' });

  // console.log(keyKB === 'Backspace' ? backspaceEvent : keydownEvent);

  document.dispatchEvent(keyKB === 'Backspace' ? backspaceEvent : keydownEvent);

  // - remove modal window
  e.target === closeModalButton && modal.classList.add('hidden');
}
//

//: ==========================================================================

//* Phone inner viewport

let timeoutId = null;
const documentHeight = () => {
  clearTimeout(timeoutId); // avoid execution of previous timeouts
  timeoutId = setTimeout(() => {
    const doc = document.documentElement;
    doc.style.setProperty('--doc-height', `${window.innerHeight}px`);
  }, 200);
};
window.addEventListener('resize', documentHeight);
documentHeight();

//: ==========================================================================
