import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(true),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInAnonymously: vi.fn().mockResolvedValue({}),
  signInWithCustomToken: vi.fn(),
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb({ uid: 'mock-user-id' });
    return vi.fn();
  }),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
}));

// Mock the child components to avoid deep rendering issues in App tests
vi.mock('../components/Scorecard', () => ({
  default: () => <div data-testid="scorecard-mock">Scorecard</div>
}));
vi.mock('../components/Uploader', () => ({
  default: ({ errorMessage }) => (
    <div data-testid="uploader-mock">
      Uploader
      {errorMessage && <div data-testid="error-message">{errorMessage}</div>}
    </div>
  )
}));
vi.mock('../components/ActionPlan', () => ({
  default: () => <div data-testid="actionplan-mock">ActionPlan</div>
}));
vi.mock('../components/Categories', () => ({
  default: () => <div data-testid="categories-mock">Categories</div>
}));
vi.mock('../components/Leaderboard', () => ({
  default: () => <div data-testid="leaderboard-mock">Leaderboard</div>,
  updateSquadAggregatedEmissions: vi.fn()
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders loading state before auth resolves', async () => {
    let resolveAuth;
    const authPromise = new Promise((resolve) => { resolveAuth = resolve; });
    
    const { onAuthStateChanged } = await import('firebase/auth');
    vi.mocked(onAuthStateChanged).mockImplementationOnce((auth, callback) => {
      authPromise.then(() => callback({ uid: '123' }));
      return vi.fn(); 
    });

    render(<App />);
    
    // 1. Assert Loading state exists
    expect(screen.getByText(/Syncing with EcoPulse/i)).toBeInTheDocument();
    
    // 2. Resolve the auth promise
    await act(async () => {
      resolveAuth();
    });
    
    // 3. Assert Main UI loads
    await waitFor(() => {
      expect(screen.queryByText(/Syncing with EcoPulse/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Global Score/i)).toBeInTheDocument();
    });
  });

  test('handles auth error gracefully', async () => {
    const { signInAnonymously } = await import('firebase/auth');
    signInAnonymously.mockRejectedValueOnce(new Error('Auth failed'));
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(/Secure authentication initialization failed/i);
    });
  });
});
