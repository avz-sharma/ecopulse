import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  // Enforce a pristine real-time environment before every test execution
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock Canvas methods to prevent issues in jsdom environment
HTMLCanvasElement.prototype.getContext = () => ({
  fillStyle: '',
  fillRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  strokeStyle: '',
  lineWidth: 0,
  strokeRect: () => {},
  fillText: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  createLinearGradient: () => ({
    addColorStop: () => {},
  }),
});
HTMLCanvasElement.prototype.toDataURL = () => '';

// Mock clipboard API
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
    },
    writable: true,
  });
}

// Mock window.open
if (typeof window !== 'undefined') {
  window.open = vi.fn();
}

// Centralized Firebase Mocks
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(() => ({ type: 'collection' })),
  doc: vi.fn(() => ({ type: 'document' })),
  onSnapshot: vi.fn(() => vi.fn()),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  arrayUnion: vi.fn()
}));
