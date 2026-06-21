import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActionPlan from '../components/ActionPlan';

// Mock fetch
global.fetch = vi.fn();

describe('ActionPlan Component', () => {
  const mockSetActionPointsBonus = vi.fn();
  const mockOnQuestsCompleted = vi.fn();
  const mockOnQuestsUncompleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers(); // CRITICAL for score
    vi.restoreAllMocks();
  });

  const defaultProps = {
    selectedReceipt: { id: 'test-receipt-1', items: [{ raw_name: 'test', co2e_kg: 5 }] },
    setActionPointsBonus: mockSetActionPointsBonus,
    onQuestsCompleted: mockOnQuestsCompleted,
    onQuestsUncompleted: mockOnQuestsUncompleted,
  };

  test('renders initial state without selectedReceipt', () => {
    render(<ActionPlan {...defaultProps} selectedReceipt={null} />);
    expect(screen.getByText(/Select a transaction log to activate/i)).toBeInTheDocument();
  });

  test('renders initial state with receipt but no quests', () => {
    render(<ActionPlan {...defaultProps} />);
    expect(screen.getByText(/Hit generate to receive AI mitigation quests/i)).toBeInTheDocument();
  });

  test('generates quests successfully via API', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "1. Do X activity\n2. Do Y activity\n3. Do Z activity" }] } }]
      })
    });

    render(<ActionPlan {...defaultProps} />);
    
    const generateBtn = screen.getByText('Generate Plan');
    fireEvent.click(generateBtn);
    
    expect(screen.getByText(/Synthesizing behavioral shifts/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Do X activity')).toBeInTheDocument();
      expect(screen.getByText('Do Y activity')).toBeInTheDocument();
      expect(screen.getByText('Do Z activity')).toBeInTheDocument();
    });
  });

  test('handles API formatting failure and uses fallback quests', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Invalid format" }] } }]
      })
    });

    render(<ActionPlan {...defaultProps} />);
    fireEvent.click(screen.getByText('Generate Plan'));

    await waitFor(() => {
      expect(screen.getByText(/Monitor your highest carbon items next trip/i)).toBeInTheDocument();
    });
  });

  test('handles API network failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ActionPlan {...defaultProps} />);
    fireEvent.click(screen.getByText('Generate Plan'));

    await waitFor(() => {
      expect(screen.getByText(/Monitor your highest carbon items next trip/i)).toBeInTheDocument();
    });
  });

  test('handles quest toggle and level up logic', async () => {
    localStorage.setItem(`ECOPULSE_QUESTS_test-receipt-1`, JSON.stringify({
      quests: ['Quest 1 activity', 'Quest 2 activity', 'Quest 3 activity'],
      acceptedQuests: {},
      hasCompletedAll: false
    }));

    render(<ActionPlan {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Quest 1 activity')).toBeInTheDocument();
    });

    // Accept first two
    fireEvent.click(screen.getByText('Quest 1 activity'));
    fireEvent.click(screen.getByText('Quest 2 activity'));
    
    expect(mockOnQuestsCompleted).not.toHaveBeenCalled();

    // Accept third
    fireEvent.click(screen.getByText('Quest 3 activity'));

    await waitFor(() => {
      expect(screen.getByText('LEVEL UP!')).toBeInTheDocument();
      expect(mockOnQuestsCompleted).toHaveBeenCalled();
      expect(mockSetActionPointsBonus).toHaveBeenCalledWith(30);
    });

    // Toggle off
    fireEvent.click(screen.getByText('Quest 1 activity'));
    await waitFor(() => {
      expect(mockOnQuestsUncompleted).toHaveBeenCalled();
      expect(mockSetActionPointsBonus).toHaveBeenCalledWith(0);
      expect(screen.queryByText('LEVEL UP!')).not.toBeInTheDocument();
    });
  });

  test('handles JSON parse error for saved data', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(`ECOPULSE_QUESTS_test-receipt-1`, 'invalid-json');
    render(<ActionPlan {...defaultProps} />);
    expect(consoleSpy).toHaveBeenCalled();
    expect(screen.getByText(/Hit generate to receive AI mitigation quests/i)).toBeInTheDocument();
  });

  test('cooldown timer logic', () => {
    vi.useFakeTimers();
    const cooldownEnd = Date.now() + 60000; // 1 min from now
    localStorage.setItem('ECOPULSE_QUESTS_COOLDOWN_END', cooldownEnd.toString());
    
    render(<ActionPlan {...defaultProps} />);
    
    // We should see the cooldown button
    expect(screen.getByText(/Cooldown/)).toBeInTheDocument();

    // Advance timers
    act(() => {
      vi.advanceTimersByTime(61000);
    });

    expect(screen.queryByText(/Cooldown/)).not.toBeInTheDocument();
    
    vi.runOnlyPendingTimers();
  });
});
