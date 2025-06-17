const newRNG = require('../js/rng');

describe('newRNG', () => {
  test('returns numbers within the specified range', () => {
    for (let i = 0; i < 100; i++) {
      const val = newRNG(1, 5);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(5);
    }
  });
});
