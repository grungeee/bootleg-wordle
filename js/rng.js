function newRNG(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

if (typeof module !== 'undefined') {
  module.exports = newRNG;
}
