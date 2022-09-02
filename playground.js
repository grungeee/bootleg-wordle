'use strickt';

// // var str = "How can mirrors be real if our eyes aren't real";

// // console.log(`--- TEST ---`);
// // const toJadenCase = function (prototype) {
// //   //...
// //   str = prototype;
// //   for (i = 0; i < prototype.length; i++)
// //     if (prototype[i] === prototype[i].lowerCase) {
// //       return console.log("lower");
// //     } else if (prototype[i] === prototype[i].uppercase) {
// //       return console.log("upper");
// //     }
// // };

// // toJadenCase(str);

// // //* I think temps.push(array1[i], array[2])

// // const temps1 = [-6, 17, 12, 12, 14];
// // const temps2 = [-7, 18, 3, 3, 4, 6];
// // //* Combining both arrays
// // function arrayAdder(arr) {
// //   // sum = 0
// //   const temporar = [];
// //   const tempsSum = [];
// //   for (let i = 0; i < arr.length; i++) {
// //     temporar.push(arr);
// //     tempsSum.push(temporar[i]);
// //   }

// //   return console.log(arr, tempsSum);
// // }

// // arrayAdder(temps1, temps2);

// // const temps2 = [-7, 18, 3, 3, 4, 6];

// // const temps1 = [3, -2, -6, -1, "error", 9, 13, 17, 15, 14, 9, 5];
// // // const temps = [3, -2, -6, -1, "error", 9, 13, 17, 15, 14, 9, 5];

// // function calcTempAmplitudeNew(t1, t2) {
// //   const temps = t1.concat(t2);

// //   let max = temps[0];
// //   let min = temps[0];
// //   for (let i = 0; i < temps.length; i++) {
// //     const curTemp = temps[i];
// //     if (typeof curTemp != "number") continue;
// //     if (curTemp > max) max = curTemp;
// //     if (curTemp < min) min = curTemp;
// //   }
// //   return console.log(`The tempertaure amplitude is: ${max - min}ºC`);
// // }

// // // calcTempAmplitude(temperatures);
// // calcTempAmplitudeNew(temps1, temps2);
// //* I want to concatinate n arrays, basically withot defining n ammount of parameters
// // const temps1 = [-6, 17, 12, 12, 14];
// // const temps2 = [-7, 18, 3, 3, 4, 6];
// // function arraySum() {
// //   let temps = [];
// //   let temporar = [];
// //   for (let i = 0; i < arguments.length; i++) {
// //     //  let temps = [];
// //     // let temporar = [];
// //     // temps = arguments[0].concat(arguments[1]);
// //     temps = temporar.concat(arguments[i]);
// //   }
// //   return console.log(temps);
// // }
// // arraySum(temps1, temps2);

// // console.log(`--- TEST concatinate ---`);
// // console.log(temps1.indexOf(temps1[]));
// //*
// // function arraySum(arr) {
// //   let i = 0;
// //   const temps = [];

// //   while (temps < arraySum[i]) {
// //     temps.concat(arraySum[i]);
// //   }
// // return console.log(temps);
// // }

// // arraySum(temps1, temps2);
// // function arraySum(arr) {
// // let sum = arr[arraySum[1]].concat(arr[arraySum[0]]);
// // return sum;
// // console.log(arr);
// // }
// // arraySum(temps1, temps2);
// // console.log(arraySum(temps1, temps2));
// // console.log(typeof arraySum(temps1, temps2));
// // console.log(temps1, temps2);

// // ? Reverse string function
// // const str = "apple";

// // function reverse(str) {
// //   let ctr = "";
// //   for (i = str.length; i !== 0; i--) {
// //     ctr += str[i - 1];
// //   }
// //   return ctr;
// // }
// // console.log(reverse(str));

// // const str = "apple";

// // function reverse(str) {
// //   let reversed = "";
// //   for (let character of str) {
// //     //> This basically means we put "character" in front of reversed
// //     reversed = character + reversed;
// //   }
// //   return reversed;
// // }

// // console.log(reverse(str));
// // //? Stupid little funcion to add things into an array multiple times
// // function runMultiplyer(multiplyWhat, multiplyBy) {
// //   let result = [];
// //   for (let i = 0; i < multiplyBy; i++) {
// //     result += multiplyWhat;
// //   }
// //   return console.log(result);
// // }
// // runMultiplyer(5, 3);
// const cc = '5132571359235';

// //> [for of loop] won't work, as if retrieving idexis of repeating values will cause to show the index of first accurance of a said vlue
// // function maskify(cc) {
// //   for (i of cc) {
// //     console.log(cc.indexOf(i));
// //   }
// // }

// //. solution with [for in loop] - never done by me before >.<
// //: revorked to make it log the whole stirng in one raw
// // function maskify(cc) {
// //   let str = '';
// //   for (i in cc) {
// //     Number(i) === cc.length - 1 ||
// //     Number(i) === cc.length - 2 ||
// //     Number(i) === cc.length - 3 ||
// //     Number(i) === cc.length - 4
// //       ? (str += cc[i])
// //       : (str += '#');
// //   }
// //   return console.log(str);
// // }

// // //. Working solution
// // function maskify(cc) {
// //   let str = '';
// //   for (let i = 0; i < cc.length; i++) {
// //     i === cc.length - 1 ||
// //     i === cc.length - 2 ||
// //     i === cc.length - 3 ||
// //     i === cc.length - 4
// //       ? (str += cc[i])
// //       : (str += '#');
// //   }
// //   return console.log(str);
// // }
// // //& TESTING THE FUNCION
// // maskify('Skippy');
// // maskify(cc);

// // console.log('--- TEST ---');
// // const test = 'ABCDEF';
// // for (i in test) {
// //   console.log(typeof i, i);
// // }

// // //- To Jaden Smith Case:
// // const str = "How can mirrors be real if our eyes aren't real";
// // //. My Solution
// // String.prototype.toJadenCase = function () {
// //   const arr = this.toLowerCase().split(' ');
// //   let converted = [];
// //   for (const word of arr) {
// //     // converted.push(word.replace(word[0], word[0].toUpperCase()));
// //     converted.push(word[0].toUpperCase() + word.slice(1));
// //   }
// //   return converted.join(' ');
// // };

// // //. Alternative solution from CodeWars
// // String.prototype.toJadenCase = function () {
// //   return this.replace(/(^|\s)[a-z]/g, function (x) {
// //     return x.toUpperCase();
// //   });
// // };
// // console.log(str.toJadenCase());

// //& ////////////////////////////////////////////////////////
// //* Udemy Transcript Converter

// function udemyConverter(str) {
//   console.log(
//     str
//       .replaceAll('\n', ' ')
//       .replaceAll('?', '? ')
//       .replaceAll('!', '! ')
//       .replaceAll('.', '. ')
//       .replaceAll(',', ', ')
//       .replaceAll('  ', ' ')
//   );
// }

// udemyConverter(`
// //! /// INSERT HERE ///
// encapsulation basically means

// to keep some properties and methods private inside the class

// so that they are not accessible from outside of the class.

// Then the rest of the methods are basically exposed

// as a public interface, which we can also call API.

// So this is essential to do in anything

// more than a toy application.

// Now, there are two big reasons why we need encapsulation

// and data privacy.

// So first it is to prevent code

// from outside of a class to accidentally manipulate

// or data inside the class.

// //--/< >/--//
// he second reason is

// that when we expose only a small interface

// so a small API consisting only of a few public methods

// then we can change all the other internal methods

// with more confidence.

// Because in this case, we can be sure

// that external code does not rely on these private methods.

// And so therefore our code will not break

// when we do internal changes.

// So that's what encapsulation

// and data privacy are and the reasons for it.
// //! ///////////////////
// `);
// //& ////////////////////////////////////////////////////////

// //* Fun Introduction 🛸
// let me = {
//   name: 'Nikita Sharapa',
//   job: '-',
//   dob: new Date('1999, 08, 18'),
//   country: 'Austria',
//   url: '',
//   languages: ['English', 'German', 'Ukrainian', 'Russian'],
//   learningNewSklills: true,
//   hobbies: ['DIY', 'Leaning', 'Skiing'],
// };
// console.log(me);

//^! All is uncommented

// //* FizzBuzz

// for (let i = 1; i <= 100; i++) {
//   if (i % 3 === 0 && i % 5 === 0) {
//     console.log(i, 'fizzbuzz');
//   } else if (i % 3 === 0) {
//     console.log(i, 'fizz');
//   } else if (i % 5 === 0) {
//     console.log(i, 'buzz');
//   }
// }

// function highAndLow(numbers) {
//   console.log(numbers.split(' '));
//   let max = 0;
//   let min = 0;

//   numbers.split(' ').forEach(n => {
//     n = Number(n);
//     n > max ? (max = n) : max;
//     n < min ? (min = n) : min;
//     //. need an array -> 1 is max 2 is min
//   });
//   return max + ' ' + min;
// }
// const chai = '8 3 -5 42 -1 0 0 -9 4 7 4 -4';
// console.log(highAndLow(chai));

//* Tests for the wordle app
const wordle1 = 'fluff'.split('');
const guess1 = 'hello'.split('');

console.log('wordle: ', wordle1);
console.log('guess: ', guess1);

const include = guess1.forEach((letter, i) => {
  console.log(
    wordle1[i],
    wordle1.includes(letter) ? '[ ✅ ]' : '[ ❌ ]',
    letter
  );
  //:
  // console.log(guess1.filter((letter, _, arr) => letter === guess1[i]));
  //>
  // console.log(guess1.filter(letter => letter === guess1[i]).length);
  //:
  // guess1.find(l => console.log(l );)
  //:
  console.log(guess1.findIndex(char => char === letter));

  const doesInclude = guess1.some(letter => wordle1.includes(letter));
});
