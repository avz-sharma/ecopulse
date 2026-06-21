import { describe, it, expect } from 'vitest';
import { resolveEmissionsFactor, getReceiptGradeAndPoints, calculateDailyStreak } from '../utils/logic';

describe('Math Engine: resolveEmissionsFactor', () => {
  it('returns the exact match factor for Amul Butter 500g', () => {
    const result = resolveEmissionsFactor('Amul Butter 500g', 'Dairy');
    expect(result.factor).toBe(11.5);
    expect(result.status).toBe('mapped');
    expect(result.matching.match_type).toBe('exact');
  });

  it('matches product type correctly (e.g. potato to vegetables)', () => {
    const result = resolveEmissionsFactor('Farm fresh potato', 'Vegetables');
    expect(result.factor).toBe(0.5);
    expect(result.category).toBe('Vegetables');
    expect(result.matching.match_type).toBe('keyword');
  });

  it('falls back to category average if no specific product matches', () => {
    const result = resolveEmissionsFactor('Unknown exotic item', 'Fruits');
    expect(result.factor).toBe(0.7);
    expect(result.category).toBe('Fruits');
    expect(result.status).toBe('estimate_applied');
    expect(result.matching.match_type).toBe('category_average');
  });

  it('uses generic fallback penalty for completely unmapped items without category', () => {
    const result = resolveEmissionsFactor('Random Item', '');
    expect(result.factor).toBe(2.0);
    expect(result.status).toBe('unmapped_penalty');
    expect(result.matching.match_type).toBe('fallback');
  });
});

describe('Math Engine: getReceiptGradeAndPoints', () => {
  it('calculates Grade A and 100 points for very low emissions (e.g. 1.0 kg)', () => {
    const { grade, points } = getReceiptGradeAndPoints(1.0);
    expect(grade).toBe('A');
    expect(points).toBe(100);
  });

  it('calculates lower grade for high emissions', () => {
    const { grade } = getReceiptGradeAndPoints(12.0);
    // 100 - (12 - 5) * 8.5 = 100 - 7 * 8.5 = 100 - 59.5 = 40.5
    // Score 40.5 >= 35, so grade D
    expect(grade).toBe('D');
  });
});

describe('Math Engine: calculateDailyStreak', () => {
  const oneDaySec = 24 * 60 * 60;
  const nowSec = Math.floor(Date.now() / 1000);

  it('returns 0 for no receipts', () => {
    expect(calculateDailyStreak([])).toBe(0);
    expect(calculateDailyStreak(null)).toBe(0);
  });

  it('returns 0 for a single receipt uploaded today (needs consecutive 2 days to start)', () => {
    const receipts = [
      { total_co2e: 1.0, timestamp: { seconds: nowSec } } // Day 0 (today)
    ];
    expect(calculateDailyStreak(receipts)).toBe(0);
  });

  it('returns 1 for 2 consecutive days ending today', () => {
    const receipts = [
      { total_co2e: 1.0, timestamp: { seconds: nowSec } }, // Today
      { total_co2e: 1.0, timestamp: { seconds: nowSec - oneDaySec } } // Yesterday
    ];
    expect(calculateDailyStreak(receipts)).toBe(1);
  });

  it('returns 2 for 3 consecutive days ending today', () => {
    const receipts = [
      { total_co2e: 1.0, timestamp: { seconds: nowSec } }, // Today
      { total_co2e: 1.0, timestamp: { seconds: nowSec - oneDaySec } }, // Yesterday
      { total_co2e: 1.0, timestamp: { seconds: nowSec - 2 * oneDaySec } } // Day before yesterday
    ];
    expect(calculateDailyStreak(receipts)).toBe(2);
  });

  it('returns 0 if the last upload was more than 24 hours ago (cancelled)', () => {
    const receipts = [
      { total_co2e: 1.0, timestamp: { seconds: nowSec - 25 * 3600 } }, // 25 hours ago
      { total_co2e: 1.0, timestamp: { seconds: nowSec - 25 * 3600 - oneDaySec } } // day before that
    ];
    expect(calculateDailyStreak(receipts)).toBe(0);
  });

  it('correctly filters out low-grade uploads', () => {
    const receipts = [
      { total_co2e: 1.0, timestamp: { seconds: nowSec } }, // Today (Grade A)
      { total_co2e: 25.0, timestamp: { seconds: nowSec - oneDaySec } } // Yesterday (Grade F) - does not qualify
    ];
    expect(calculateDailyStreak(receipts)).toBe(0);
  });
});
