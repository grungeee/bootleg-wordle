'use strickt';
//* Tests for the wordle app
const wordle1 = 'renos'.split('');
const guess1 = 'rotno'.split('');

console.log('wordle: ', wordle1);
console.log('guess: ', guess1);
console.log(guess1.join(''));

const include = guess1.forEach((letter, i) => {
  console.log(
    wordle1[i].toUpperCase(),

    wordle1[i] === guess1[i]
      ? '[ ✅ ]'
      : wordle1.includes(letter) &&
        guess1.findIndex(char => char === letter) === i
      ? '[ 🟨 ]'
  : '[ 🟥 ]',
    // wordle1.includes(letter) ? '[ ✅ ]' : '[ ❌ ]',
    letter.toUpperCase()
  );
  //:
  // console.log(guess1.filter((letter, _, arr) => letter === guess1[i]));
  //>
  // console.log(guess1.filter(letter => letter === guess1[i]).length);
  //:
  // guess1.find(l => console.log(l );)
  //:
  console.log(
    guess1.findIndex(char => char === letter),
    guess1[guess1.findIndex(char => char === letter)],
    i === guess1.findIndex(char => char === letter)
  );

  const doesInclude = guess1.some(letter => wordle1.includes(letter));
});

console.log('countInArray(guess1, o) :>> ', countInArray(guess1, 'o'));
function countInArray(array, what) {
  return array.filter(item => item === what).length;
}
