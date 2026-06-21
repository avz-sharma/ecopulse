import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Scorecard from '../components/Scorecard';

describe('Scorecard Component', () => {
  const fakeReceipt = {
    id: 'rec_123',
    merchant: 'Zepto Mock Merchant',
    total_co2e: 4.82,
    timestamp: { seconds: 1782132300 },
    items: [
      { raw_name: 'Amul Butter 500g', quantity: 1, co2e_kg: 5.75, category: 'Dairy' }
    ]
  };

  const fakeStats = {
    scoreValue: 82,
    complianceScore: 78,
    grade: 'B',
    averageWeekly: 4.5
  };

  const fakeRank = {
    rank: 3,
    total: 15,
    percentile: 80
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- 1. THE HAPPY PATH ---
  it('renders correct carbon footprint numbers and receipt details from props', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: 'Equivalent to driving a small electric vehicle.' }] } }
        ]
      })
    });

    render(
      <Scorecard
        userNickname="CarbonWarrior"
        myCalculatedStats={fakeStats}
        userRankData={fakeRank}
        selectedReceipt={fakeReceipt}
        myReceipts={[fakeReceipt]}
      />
    );

    expect(screen.getByText('Zepto Mock Merchant')).toBeInTheDocument();
    expect(screen.getByText('4.82')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('Grade B benchmark')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('Standings: 80%')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('"Equivalent to driving a small electric vehicle."')).toBeInTheDocument();
    });
  });

  // --- 2. THE EMPTY/NULL STATE ---
  it('handles empty receipt values gracefully without crashing', () => {
    render(
      <Scorecard
        userNickname="CarbonWarrior"
        myCalculatedStats={fakeStats}
        userRankData={fakeRank}
        selectedReceipt={null}
        myReceipts={[]}
      />
    );

    expect(screen.getByText('Base Grid')).toBeInTheDocument();
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  // --- 3. API FAILURE: HTTP ERROR (New) ---
  it('handles AI insight API HTTP failure gracefully without crashing', async () => {
    // Simulating a 500 Internal Server Error from the Gemini endpoint
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    render(
      <Scorecard
        userNickname="CarbonWarrior"
        myCalculatedStats={fakeStats}
        userRankData={fakeRank}
        selectedReceipt={fakeReceipt}
        myReceipts={[fakeReceipt]}
      />
    );

    // The component should still render the core data even if the AI insight fails
    expect(screen.getByText('Zepto Mock Merchant')).toBeInTheDocument();
    expect(screen.getByText('4.82')).toBeInTheDocument();
  });

  // --- 4. API FAILURE: NETWORK REJECTION (New) ---
  it('handles AI insight network rejection gracefully', async () => {
    // Simulating a total network failure (e.g., user is offline)
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    render(
      <Scorecard
        userNickname="CarbonWarrior"
        myCalculatedStats={fakeStats}
        userRankData={fakeRank}
        selectedReceipt={fakeReceipt}
        myReceipts={[fakeReceipt]}
      />
    );

    // Core UI must survive the rejected promise
    expect(screen.getByText('Zepto Mock Merchant')).toBeInTheDocument();
  });

  // --- 5. PARTIAL PROPS FALLBACK (New) ---
  it('handles missing rank data safely with default fallbacks', () => {
    render(
      <Scorecard
        userNickname="CarbonWarrior"
        myCalculatedStats={fakeStats}
        userRankData={null} // Forcing the missing prop branch
        selectedReceipt={fakeReceipt}
        myReceipts={[fakeReceipt]}
      />
    );

    // Component shouldn't crash, should render merchant
    expect(screen.getByText('Zepto Mock Merchant')).toBeInTheDocument();
  });

  // --- 6. CONDITIONAL LOGIC CHECK: GRADE A (New) ---
  it('renders Grade A benchmark and styling correctly', () => {
    const topTierStats = { ...fakeStats, grade: 'A', complianceScore: 95 };

    render(
      <Scorecard
        userNickname="EcoHero"
        myCalculatedStats={topTierStats}
        userRankData={fakeRank}
        selectedReceipt={fakeReceipt}
        myReceipts={[fakeReceipt]}
      />
    );

    expect(screen.getByText('Grade A benchmark')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  // --- 7. STRUCTURAL ANOMALIES: ZERO STATS ---
  it('renders fallback formatting when user statistics yield zero values', () => {
    const zeroedStats = {
      scoreValue: 0,
      complianceScore: 0,
      grade: 'F',
      averageWeekly: 0,
      totalEmissions: 0
    };

    render(
      <Scorecard
        userNickname="EcoWarrior"
        myCalculatedStats={zeroedStats}
        userRankData={null}
        selectedReceipt={null}
        myReceipts={[]}
      />
    );

    // Assert that zero states do not divide-by-zero or break styling layouts
    expect(screen.getByText('0.00')).toBeInTheDocument();
    expect(screen.getByText(/Grade F/i || /F/i)).toBeInTheDocument();
  });
});