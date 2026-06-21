import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Leaderboard, { updateSquadAggregatedEmissions } from '../components/Leaderboard';
import { collection, doc, onSnapshot, getDoc, getDocs, updateDoc } from 'firebase/firestore';


describe('Leaderboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
    window.isSecureContext = true;
  });

  const defaultProps = {
    currentUser: { squadId: 'squad-1' },
    currentUserStats: { weeklyEmissions: 10 },
    activeUserId: 'user-1',
    db: {},
    appId: 'test-app',
    auth: { currentUser: { uid: 'user-1' } }
  };

  test('renders individual leaderboard initially and switches to squad', async () => {
    onSnapshot.mockImplementation((ref, callback) => {
      if (ref.type === 'collection') {
        callback({
          docs: [
            { id: 'user-1', data: () => ({ displayName: 'User 1', weeklyEmissions: 5 }) },
            { id: 'user-2', data: () => ({ displayName: 'User 2', weeklyEmissions: 10 }) }
          ]
        });
      } else if (ref.type === 'document') {
        callback({
          exists: () => true,
          id: 'squad-1',
          data: () => ({ name: 'Test Squad', members: [], averageEmissions: 7 })
        });
      }
      return vi.fn();
    });

    render(<Leaderboard {...defaultProps} />);

    expect(screen.getByText('Individual')).toBeInTheDocument();
    expect(screen.getByText('User 1')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Squads'));
    
    await waitFor(() => {
      expect(screen.getByText(/Test Squad/i)).toBeInTheDocument();
    });
  });

  test('handles empty leaderboard state', () => {
    onSnapshot.mockImplementation((ref, callback) => {
      if (ref.type === 'collection') {
        callback({ docs: [] });
      } else {
        callback({ exists: () => false });
      }
      return vi.fn();
    });

    render(<Leaderboard {...defaultProps} />);
    expect(screen.getByText('Leaderboard is currently empty.')).toBeInTheDocument();
  });

  test('handles network or permission-denied error from Firestore gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    onSnapshot.mockImplementation((ref, callback, errorCallback) => {
      if (errorCallback) {
        errorCallback(new Error('permission-denied'));
      }
      return vi.fn();
    });

    render(<Leaderboard {...defaultProps} />);
    
    // The component catches the error and leaves leaderboardData as default empty array
    expect(consoleSpy).toHaveBeenCalledWith("Firestore listener error:", expect.any(Error));
    expect(screen.getByText('Leaderboard is currently empty.')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  test('displays mySquad details and allows copying link', async () => {
    onSnapshot.mockImplementation((ref, callback) => {
      if (ref.type === 'collection') {
        callback({ docs: [] });
      } else {
        callback({
          exists: () => true,
          id: 'squad-1',
          data: () => ({ name: 'My Squad', members: ['user-1'], inviteCode: 'ABCDEF' })
        });
      }
      return vi.fn();
    });

    render(<Leaderboard {...defaultProps} />);
    fireEvent.click(screen.getByText('Squads'));

    await waitFor(() => {
      expect(screen.getByText(/My Squad/i)).toBeInTheDocument();
    });

    const copyBtn = screen.getByText('Copy Link');
    window.alert = vi.fn();
    fireEvent.click(copyBtn);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('code=ABCDEF'));
      expect(window.alert).toHaveBeenCalledWith('Invite link copied to clipboard!');
    });
  });
  
  test('handles squad onboarding UI when no squad exists', async () => {
    onSnapshot.mockImplementation((ref, callback) => {
      if (ref.type === 'collection') {
        callback({ docs: [] });
      } else {
        callback({ exists: () => false });
      }
      return vi.fn();
    });
    const props = { ...defaultProps, currentUser: null };
    render(<Leaderboard {...props} />);
    fireEvent.click(screen.getByText('Squads'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('ENTER NEW SQUAD NAME...')).toBeInTheDocument();
    });
  });

  test('updateSquadAggregatedEmissions calculates average correctly', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ members: ['user-1', 'user-2'] })
    });
    
    const mockUsers = [
      { id: 'user-1', data: () => ({ weeklyEmissions: 10 }) },
      { id: 'user-2', data: () => ({ weeklyEmissions: 20 }) },
      { id: 'user-3', data: () => ({ weeklyEmissions: 30 }) }
    ];

    getDocs.mockResolvedValueOnce(mockUsers);

    await updateSquadAggregatedEmissions('squad-1', {}, 'test-app');

    expect(updateDoc).toHaveBeenCalledWith({ type: 'document' }, { averageEmissions: 15 });
  });

  test('updateSquadAggregatedEmissions handles missing squad or members', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    await updateSquadAggregatedEmissions('squad-1', {}, 'test-app');
    expect(updateDoc).not.toHaveBeenCalled();

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ members: [] })
    });
    await updateSquadAggregatedEmissions('squad-2', {}, 'test-app');
    expect(updateDoc).not.toHaveBeenCalled();
  });
  
  test('displays mySquad details and allows copying link fallback', async () => {
    onSnapshot.mockImplementation((ref, callback) => {
      if (ref.type === 'collection') {
        callback({ docs: [] });
      } else {
        callback({
          exists: () => true,
          id: 'squad-1',
          data: () => ({ name: 'My Squad', members: ['user-1'], inviteCode: 'ABCDEF' })
        });
      }
      return vi.fn();
    });

    Object.assign(navigator, {
      clipboard: undefined
    });

    render(<Leaderboard {...defaultProps} />);
    fireEvent.click(screen.getByText('Squads'));

    await waitFor(() => {
      expect(screen.getByText(/My Squad/i)).toBeInTheDocument();
    });

    const copyBtn = screen.getByText('Copy Link');
    window.alert = vi.fn();
    
    document.execCommand = vi.fn().mockImplementation(() => true);
    fireEvent.click(copyBtn);
    
    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      expect(window.alert).toHaveBeenCalledWith('Invite link copied to clipboard!');
    });
  });
});
