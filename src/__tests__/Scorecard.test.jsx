import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  const fakeReceiptsList = [fakeReceipt];
  const mockSetKeySavedMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correct carbon footprint numbers and receipt details from props', async () => {
    // Intercept/mock network call for the AI insights
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Equivalent to driving a small electric vehicle.' }]
            }
          }
        ]
      })
    });

    render(
      <Scorecard
        userNickname="CarbonWarrior"
        myCalculatedStats={fakeStats}
        userRankData={fakeRank}
        selectedReceipt={fakeReceipt}
        myReceipts={fakeReceiptsList}
      />
    );

    // Assert receipt merchant name is rendered
    expect(screen.getByText('Zepto Mock Merchant')).toBeInTheDocument();

    // Assert carbon footprint number (total_co2e) is rendered
    expect(screen.getByText('4.82')).toBeInTheDocument();

    // Assert compliance curve percentage is rendered
    expect(screen.getByText('78%')).toBeInTheDocument();

    // Assert grade B benchmark is rendered
    expect(screen.getByText('Grade B benchmark')).toBeInTheDocument();

    // Assert rank is rendered
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('Standings: 80%')).toBeInTheDocument();

    // Wait for the mocked API emotional insight to render
    await waitFor(() => {
      expect(screen.getByText('"Equivalent to driving a small electric vehicle."')).toBeInTheDocument();
    });
  });

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

    // It should render Base Grid when no receipt is selected
    expect(screen.getByText('Base Grid')).toBeInTheDocument();
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });
});
