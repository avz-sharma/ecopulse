import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Categories from '../components/Categories';

describe('Categories Component', () => {
  test('renders zero stats when no receipts are provided', () => {
    render(<Categories myReceipts={[]} />);
    expect(screen.getByText(/Debug Info: 0 receipts loaded/i)).toBeInTheDocument();
    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getAllByText(/0.00 kg/i).length).toBeGreaterThan(0);
  });

  test('renders zero stats when myReceipts is undefined', () => {
    render(<Categories myReceipts={undefined} />);
    expect(screen.getByText(/Debug Info: 0 receipts loaded/i)).toBeInTheDocument();
  });

  test('calculates stats correctly with provided receipts', () => {
    const mockReceipts = [
      {
        items: [
          { category: "Rice/Grains", co2e_kg: 2.0 }, // tests category renaming
          { category: "Vegetables & Fruits", co2e_kg: 1.5 }, // tests category renaming
          { category: "Meat & Poultry", co2e_kg: 3.0 }, // tests category renaming
          { category: "Dairy", co2e_kg: 1.0 },
          { category: "Unknown Category", co2e_kg: 2.5 } // tests fallback to Other
        ]
      }
    ];

    render(<Categories myReceipts={mockReceipts} />);
    expect(screen.getByText(/Debug Info: 1 receipts loaded/i)).toBeInTheDocument();
    
    // Rice/Grains becomes Rice & Grains
    const riceRow = screen.getByText('Rice & Grains').closest('div');
    expect(riceRow).toHaveTextContent('2.00 kg');

    // Vegetables & Fruits becomes Vegetables
    const vegRow = screen.getByText('Vegetables').closest('div');
    expect(vegRow).toHaveTextContent('1.50 kg');

    // Meat & Poultry becomes Poultry
    const poultryRow = screen.getByText('Poultry').closest('div');
    expect(poultryRow).toHaveTextContent('3.00 kg');

    // Unknown Category becomes Other
    const otherRow = screen.getByText('Other').closest('div');
    expect(otherRow).toHaveTextContent('2.50 kg');
    
    // total emissions: 2.0 + 1.5 + 3.0 + 1.0 + 2.5 = 10.0
    expect(screen.getByText(/Total emissions summed: 10.00 kg/i)).toBeInTheDocument();
  });

  test('handles receipts with items missing category or co2e_kg safely', () => {
    const mockReceipts = [
      {
        items: [
          {}, // missing both
          { category: "Dairy" } // missing co2e_kg
        ]
      },
      {} // receipt missing items
    ];

    render(<Categories myReceipts={mockReceipts} />);
    expect(screen.getByText(/Total emissions summed: 0.00 kg/i)).toBeInTheDocument();
  });
});
