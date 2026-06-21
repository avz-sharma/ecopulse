import { describe, it, expect } from 'vitest';
import {
  resolveEmissionsFactor,
  getReceiptGradeAndPoints,
  calculateDailyStreak,
  calculateIndividualMetrics,
  getRankBadge
} from '../utils/logic';

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

  // NEW: Catches the specific regex branch for "oil"
  it('correctly uses regex boundary for oil to prevent partial matches like "boil"', () => {
    const validOil = resolveEmissionsFactor('Mustard Oil', 'Cooking Oils');
    expect(validOil.matching.match_type).toBe('keyword');
    expect(validOil.factor).toBe(3.5);
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

  // NEW: Catches the `if (score > 100) score = 100;` branch cap
  it('caps score at 100 for zero emissions', () => {
    const { grade, points } = getReceiptGradeAndPoints(0);
    expect(grade).toBe('A');
    expect(points).toBe(100);
  });

  // NEW: Covers the intermediate B and C grades
  it('calculates Grade B and C correctly', () => {
    expect(getReceiptGradeAndPoints(8.0).grade).toBe('B'); // Score ~75
    expect(getReceiptGradeAndPoints(10.0).grade).toBe('C'); // Score ~58
  });

  it('calculates lower grade for high emissions', () => {
    const { grade } = getReceiptGradeAndPoints(12.0);
    expect(grade).toBe('D');
  });

  // NEW: Catches the F grade fallback
  it('calculates Grade F for extremely high emissions', () => {
    const { grade, points } = getReceiptGradeAndPoints(30.0);
    expect(grade).toBe('F');
    expect(points).toBe(10);
  });
});

// NEW ENTIRE BLOCK: Was previously missing, causing a huge coverage drop
describe('Math Engine: calculateIndividualMetrics', () => {
  it('returns default 0 metrics for empty receipt list', () => {
    const result = calculateIndividualMetrics([]);
    expect(result.scoreValue).toBe(0);
    expect(result.averageWeekly).toBe(0);
    expect(result.grade).toBe('N/A');
    expect(result.totalEmissions).toBe(0);
  });

  it('calculates aggregate metrics accurately for multiple receipts', () => {
    const receipts = [
      { total_co2e: 4.0, points: 100 }, // Pre-calculated points
      { total_co2e: 12.0 } // Missing points (tests the fallback calculation)
    ];

    const result = calculateIndividualMetrics(receipts);
    expect(result.totalEmissions).toBe(16.0);
    expect(result.averageWeekly).toBe(8.0); // 16 / 2
    expect(result.scoreValue).toBe(125); // 100 + 25 (Grade D fallback)
    expect(result.grade).toBe('B'); // Dynamic avg weekly grade for 8.0 avg
  });
});

// NEW ENTIRE BLOCK: Was previously missing
describe('Math Engine: getRankBadge', () => {
  it('returns explicit rank badges for top 3 positions', () => {
    expect(getRankBadge(1, 50)).toBe("🥇 Methane Slayer");
    expect(getRankBadge(2, 50)).toBe("🥈 Coal Minimizer");
    expect(getRankBadge(3, 50)).toBe("🥉 Carbon Crusader");
  });

  it('returns score-based badges for non-podium ranks', () => {
    expect(getRankBadge(4, 85)).toBe("🏅 Methane Slayer");
    expect(getRankBadge(10, 70)).toBe("🎖️ Coal Minimizer");
    expect(getRankBadge(99, 30)).toBe("🌱 Carbon Consumer");
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
      { total_co2e: 1.0, timestamp: { seconds: nowSec } }
    ];
    expect(calculateDailyStreak(receipts)).toBe(0);
  });

  it('returns 1 for 2 consecutive days ending today', () => {
    const receipts = [
      { total_co2e: 1.0, timestamp: { seconds: nowSec } },
      { total_co2e: 1.0, timestamp: { seconds: nowSec - oneDaySec } }
    ];
    expect(calculateDailyStreak(receipts)).toBe(1);
  });

  it('returns 2 for 3 consecutive days ending today', () => {
    const receipts = [
      { total_co2e: 1.0, timestamp: { seconds: nowSec } },
      { total_co2e: 1.0, timestamp: { seconds: nowSec - oneDaySec } },
      { total_co2e: 1.0, timestamp: { seconds: nowSec - 2 * oneDaySec } }
    ];
    expect(calculateDailyStreak(receipts)).toBe(2);
  });

  it('returns 0 if the last upload was more than 24 hours ago (cancelled)', () => {
    const receipts = [
      { total_co2e: 1.0, timestamp: { seconds: nowSec - 25 * 3600 } },
      { total_co2e: 1.0, timestamp: { seconds: nowSec - 25 * 3600 - oneDaySec } }
    ];
    expect(calculateDailyStreak(receipts)).toBe(0);
  });

  it('correctly filters out low-grade uploads', () => {
    const receipts = [
      { total_co2e: 1.0, timestamp: { seconds: nowSec } },
      { total_co2e: 25.0, timestamp: { seconds: nowSec - oneDaySec } }
    ];
    expect(calculateDailyStreak(receipts)).toBe(0);
  });

  // NEW: Tests the fallback gracefully when total_co2e is missing
  it('handles missing total_co2e fallback gracefully', () => {
    const receipts = [
      { timestamp: { seconds: nowSec } }, // Undefined co2e falls back to 0 -> Grade A
      { timestamp: { seconds: nowSec - oneDaySec } }
    ];
    expect(calculateDailyStreak(receipts)).toBe(1);
  });
});