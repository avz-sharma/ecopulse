import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Uploader, { PRESETS } from '../components/Uploader';

describe('Uploader Component', () => {
  const mockExecute = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- 1. HAPPY PATH: Default State ---
  it('renders correctly with default state', () => {
    render(
      <Uploader executeCarbonPipeline={mockExecute} isProcessing={false} errorMessage="" />
    );
    expect(screen.getByText('Receipt Upload Suite')).toBeInTheDocument();
    expect(screen.getByText('Instant Upload Demo')).toBeInTheDocument();
  });

  // --- 2. STATE BRANCH: Loading (Demo Mode) ---
  it('renders loading/processing state when isProcessing is true in demo mode', () => {
    render(
      <Uploader executeCarbonPipeline={mockExecute} isProcessing={true} errorMessage="" />
    );
    expect(screen.getByText('Running OCR Extract Agents...')).toBeInTheDocument();
  });

  // --- 3. STATE BRANCH: Loading (Paste Mode) ---
  it('renders loading/processing state when isProcessing is true in paste mode', () => {
    render(
      <Uploader executeCarbonPipeline={mockExecute} isProcessing={true} errorMessage="" />
    );
    fireEvent.click(screen.getByRole('button', { name: /Switch to paste receipt text mode/i }));
    expect(screen.getByText('Processing with LLM...')).toBeInTheDocument();
  });

  // --- 4. USER INTERACTION: Preset Click ---
  it('triggers executeCarbonPipeline when preset upload buttons are clicked', () => {
    render(
      <Uploader executeCarbonPipeline={mockExecute} isProcessing={false} errorMessage="" />
    );
    const blinkitButton = screen.getByRole('button', { name: /Upload Blinkit demo invoice/i });
    fireEvent.click(blinkitButton);
    expect(mockExecute).toHaveBeenCalledWith('', PRESETS.blinkit_01);
  });

  // --- 5. USER INTERACTION: Text Paste & Submit ---
  it('submits typed text when submit button is clicked in paste mode', () => {
    render(
      <Uploader executeCarbonPipeline={mockExecute} isProcessing={false} errorMessage="" />
    );
    fireEvent.click(screen.getByRole('button', { name: /Switch to paste receipt text mode/i }));
    const textarea = screen.getByPlaceholderText(/Paste Swiggy, Zepto or Blinkit receipt/i);
    fireEvent.change(textarea, { target: { value: 'Test receipt raw text content' } });

    const submitButton = screen.getByRole('button', { name: /Submit receipt text to the Gemini carbon extraction pipeline/i });
    fireEvent.click(submitButton);
    expect(mockExecute).toHaveBeenCalledWith('Test receipt raw text content', null);
  });

  // --- 6. PROP BRANCH: Error Messages ---
  it('renders error messages when provided', () => {
    render(
      <Uploader executeCarbonPipeline={mockExecute} isProcessing={false} errorMessage="Custom API Error occurred" />
    );
    expect(screen.getByText(/Custom API Error occurred/i)).toBeInTheDocument();
  });

  // --- 7. NEW: EDGE CASE / VALIDATION ---
  it('prevents submission if textarea is empty or only whitespace', () => {
    render(
      <Uploader executeCarbonPipeline={mockExecute} isProcessing={false} errorMessage="" />
    );
    fireEvent.click(screen.getByRole('button', { name: /Switch to paste receipt text mode/i }));
    const textarea = screen.getByPlaceholderText(/Paste Swiggy, Zepto or Blinkit receipt/i);

    // Simulate empty/whitespace entry
    fireEvent.change(textarea, { target: { value: '   ' } });
    const submitButton = screen.getByRole('button', { name: /Submit receipt text to the Gemini carbon extraction pipeline/i });

    fireEvent.click(submitButton);

    // The pipeline should NOT fire for empty text
    expect(mockExecute).not.toHaveBeenCalled();
  });

  // --- 8. NEW: DEFENSIVE UI STATE ---
  it('disables buttons and inputs when isProcessing is true', () => {
    render(
      <Uploader executeCarbonPipeline={mockExecute} isProcessing={true} errorMessage="" />
    );

    // Preset buttons should be disabled during processing
    const blinkitButton = screen.getByRole('button', { name: /Upload Blinkit demo invoice/i });
    expect(blinkitButton).toBeDisabled();

    // Paste mode inputs should be disabled
    fireEvent.click(screen.getByRole('button', { name: /Switch to paste receipt text mode/i }));
    const textarea = screen.getByPlaceholderText(/Paste Swiggy, Zepto or Blinkit receipt/i);
    expect(textarea).toBeDisabled();

    // Verifying processing state defenses via structural accessibility checks
    const activeSubmitBtn = screen.getByRole('button', { 
      name: /Processing with LLM/i 
    });
    expect(activeSubmitBtn).toBeDisabled();
  });
});