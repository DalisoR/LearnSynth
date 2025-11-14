import {
  calculateNextReview,
  initializeSRS,
} from '../../services/srs/sm2';

describe('SM-2 Algorithm', () => {
  describe('initializeSRS', () => {
    it('should initialize with default values', () => {
      const srs = initializeSRS();

      expect(srs.easeFactor).toBe(2.5);
      expect(srs.interval).toBe(1);
      expect(srs.repetitions).toBe(0);
    });
  });

  describe('calculateNextReview', () => {
    it('should calculate next review for perfect recall (quality 5)', () => {
      const initial = {
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
      };

      const result = calculateNextReview(initial, 5);

      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBeGreaterThan(2.5);
    });

    it('should calculate next review for good recall (quality 4)', () => {
      const initial = {
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
      };

      const result = calculateNextReview(initial, 4);

      expect(result.repetitions).toBe(2);
      expect(result.interval).toBe(6);
    });

    it('should reset repetitions for poor recall (quality 2)', () => {
      const initial = {
        easeFactor: 2.5,
        interval: 6,
        repetitions: 2,
      };

      const result = calculateNextReview(initial, 2);

      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it('should not allow quality below 0', () => {
      const initial = initializeSRS();

      expect(() => calculateNextReview(initial, -1)).toThrow('Quality must be between 0 and 5');
    });

    it('should not allow quality above 5', () => {
      const initial = initializeSRS();

      expect(() => calculateNextReview(initial, 6)).toThrow('Quality must be between 0 and 5');
    });

    it('should maintain minimum ease factor of 1.3', () => {
      const initial = {
        easeFactor: 1.5,
        interval: 1,
        repetitions: 0,
      };

      const result = calculateNextReview(initial, 1);

      expect(result.easeFactor).toBe(1.3);
    });
  });
});
