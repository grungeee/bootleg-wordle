# Program Overview

This document highlights the core pieces of the Bootleg Wordle codebase and shows how the game logic works under the hood.

## Selecting a Random Word
The game uses a simple random number generator to choose a word from the internal database. Each line of code contributes to that selection:

```javascript
function newRNG(min, max) {
  // return an integer between min and max (inclusive)
  return Math.floor(Math.random() * (max - min + 1) + min);
}

let wordle;    // the chosen secret word
let wordleArr; // secret word split into an array of characters

function pickWordle() {
  // 1. choose a random list of candidate words
  const valuesLengthRNG = newRNG(0, values.length - 1);
  const valuesWordsArr = values[valuesLengthRNG];
  // 2. pick a random word from that list
  const valuesArrayLengthRNG = newRNG(0, valuesWordsArr.length - 1);
  wordle = valuesWordsArr[valuesArrayLengthRNG];
  // 3. store the word as an array for later comparisons
  wordleArr = wordle.split('');
}
```

1. `newRNG` returns a uniformly random integer in the provided range.
2. `pickWordle` first selects a random sub‑array from the master `values` list, then chooses a random word within that sub‑array.
3. The chosen word is split into `wordleArr`, which is used to check player guesses one letter at a time.

## Evaluating Guesses
When a player submits a guess, the program reveals coloured feedback for each letter. Green indicates a correct letter in the correct spot, yellow denotes a correct letter in the wrong spot, and gray marks a letter that is not present. The snippet below shows the full process with comments explaining each step:

```javascript
if (e.key === 'Enter' && c.value !== '' && guess.isInDB()) {
  // move to the next row and reset the column counter
  currentRow++;
  count = -1;

  // track letters still to be matched so duplicates are handled correctly
  const wordleArrFiltered = wordleArr.filter(w => guess.includes(w));

  // compare each letter of the secret word to the corresponding guess letter
  wordleArr.forEach((w, wIndex) => {
    const g = guess[wIndex];

    setTimeout(() => {
      // flip the tile before revealing its colour
      charArr[wIndex].classList.add('char--rotate');

      if (w === g) {
        // letter and position both match: tile and keyboard go green
        charArr[wIndex].classList.add('char--green');
        wordleArrFiltered.splice(wordleArrFiltered.indexOf(g), 1);
        document
          .querySelector(`.k--${g}`)
          .classList.remove('char--yellow');
        document.querySelector(`.k--${g}`).classList.add('char--green');
      } else if (wordleArrFiltered.includes(g)) {
        // letter exists elsewhere in the word: tile turns yellow
        charArr[wIndex].classList.add('char--yellow');
        wordleArrFiltered.splice(wordleArrFiltered.indexOf(g), 1);
        !document
          .querySelector(`.k--${g}`)
          .classList.contains('char--green') &&
          document.querySelector(`.k--${g}`).classList.add('char--yellow');
      } else {
        // letter is not in the word: grey the keyboard key
        document.querySelector(`.k--${g}`).classList.add('char--none');
      }
    }, wIndex * 400); // stagger the animation for a flip effect
  });

  // after all letters are processed, determine if the game is won or lost
  if (wordle === guess)
    setTimeout(() => {
      logo.forEach(l => l.classList.add('char--green'));
      showEndModal(true); // player guessed correctly
    }, 2500);
  else if (currentRow === rowsAllArr.length)
    setTimeout(() => {
      showEndModal(false); // all guesses used up
    }, 2500);
}
```

Step-by-step summary:

1. Verify the Enter key was pressed, the input is non-empty, and the guess exists in the database.
2. Advance to the next row and prepare to evaluate the guess.
3. Compare each guess letter to the secret word, colouring tiles and keyboard keys appropriately.
4. After the comparison, show the win modal if the guess matches the secret word; otherwise, show the loss modal after the final row.

This logic provides the familiar Wordle-style feedback and determines when the game ends.
