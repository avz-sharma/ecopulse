import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
