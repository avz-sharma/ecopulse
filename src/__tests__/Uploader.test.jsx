import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Uploader, { PRESETS } from '../components/Uploader';

describe('Uploader Component', () => {
  it('renders correctly with default state', () => {
    render(
      <Uploader 
        executeCarbonPipeline={vi.fn()} 
        isProcessing={false} 
        errorMessage="" 
      />
    );
    expect(screen.getByText('Receipt Upload Suite')).toBeInTheDocument();
    expect(screen.getByText('Instant Upload Demo')).toBeInTheDocument();
  });

  it('renders loading/processing state when isProcessing is true in demo mode', () => {
    render(
      <Uploader 
        executeCarbonPipeline={vi.fn()} 
        isProcessing={true} 
        errorMessage="" 
      />
    );
    // Loading indicator for demo mode should be visible
    expect(screen.getByText('Running OCR Extract Agents...')).toBeInTheDocument();
  });

  it('renders loading/processing state when isProcessing is true in paste mode', () => {
    render(
      <Uploader 
        executeCarbonPipeline={vi.fn()} 
        isProcessing={true} 
        errorMessage="" 
      />
    );

    // Switch to paste mode
    const pasteTabButton = screen.getByText('Paste Invoice Text');
    fireEvent.click(pasteTabButton);

    // Submit button should show loading state
    expect(screen.getByText('Processing with LLM...')).toBeInTheDocument();
  });

  it('triggers executeCarbonPipeline when preset upload buttons are clicked', () => {
    const mockExecute = vi.fn();
    render(
      <Uploader 
        executeCarbonPipeline={mockExecute} 
        isProcessing={false} 
        errorMessage="" 
      />
    );

    const blinkitButton = screen.getByText('Blinkit Upload');
    fireEvent.click(blinkitButton);
    expect(mockExecute).toHaveBeenCalledWith('', PRESETS.blinkit_01);
  });

  it('submits typed text when submit button is clicked in paste mode', () => {
    const mockExecute = vi.fn();
    render(
      <Uploader 
        executeCarbonPipeline={mockExecute} 
        isProcessing={false} 
        errorMessage="" 
      />
    );

    // Switch to paste tab
    const pasteTabButton = screen.getByText('Paste Invoice Text');
    fireEvent.click(pasteTabButton);

    // Type text in the textarea
    const textarea = screen.getByPlaceholderText(/Paste Swiggy, Zepto or Blinkit receipt/i);
    fireEvent.change(textarea, { target: { value: 'Test receipt raw text content' } });

    // Submit the form
    const submitButton = screen.getByText('Submit to Gemini Pipeline');
    fireEvent.click(submitButton);

    expect(mockExecute).toHaveBeenCalledWith('Test receipt raw text content', null);
  });

  it('renders error messages when provided', () => {
    render(
      <Uploader 
        executeCarbonPipeline={vi.fn()} 
        isProcessing={false} 
        errorMessage="Custom API Error occurred" 
      />
    );
    expect(screen.getByText(/Custom API Error occurred/i)).toBeInTheDocument();
  });
});
