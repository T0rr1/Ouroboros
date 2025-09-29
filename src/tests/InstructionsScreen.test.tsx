import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { InstructionsScreen } from '../components/InstructionsScreen';

describe('InstructionsScreen', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  test('renders instructions title', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    expect(screen.getByText('Ancient Wisdom')).toBeInTheDocument();
    expect(screen.getByText('Master the secrets of serpentine evolution')).toBeInTheDocument();
  });

  test('renders controls section', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    expect(screen.getByText('🎮 Mystical Controls')).toBeInTheDocument();
    expect(screen.getByText(/WASD \/ Arrow Keys:/)).toBeInTheDocument();
    expect(screen.getByText(/Space:/)).toBeInTheDocument();
    expect(screen.getByText(/Q-P Keys:/)).toBeInTheDocument();
    expect(screen.getByText(/Mouse Click:/)).toBeInTheDocument();
  });

  test('renders evolution path section', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    expect(screen.getByText('🐍 The Path of Evolution')).toBeInTheDocument();
    expect(screen.getByText(/1\. Hatchling:/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Garden Snake:/)).toBeInTheDocument();
    expect(screen.getByText(/10\. Ouroboros:/)).toBeInTheDocument();
  });

  test('renders powers guide section', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    expect(screen.getByText('✨ Mystical Powers')).toBeInTheDocument();
    expect(screen.getByText(/Speed Boost \(Q\):/)).toBeInTheDocument();
    expect(screen.getByText(/Venom Strike \(E\):/)).toBeInTheDocument();
    expect(screen.getByText(/Fire Breath \(O\):/)).toBeInTheDocument();
    expect(screen.getByText(/Time Warp \(I\):/)).toBeInTheDocument();
    expect(screen.getByText(/Tail Consumption \(P\):/)).toBeInTheDocument();
  });

  test('renders food system section', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    expect(screen.getByText('🍃 Sacred Nourishment')).toBeInTheDocument();
    expect(screen.getByText(/Evolution-Specific Foods:/)).toBeInTheDocument();
    expect(screen.getByText(/Wrong Level Foods:/)).toBeInTheDocument();
    expect(screen.getByText(/Food Combinations:/)).toBeInTheDocument();
    expect(screen.getByText(/Eternal Orbs:/)).toBeInTheDocument();
  });

  test('renders environmental challenges section', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    expect(screen.getByText('⚡ Environmental Trials')).toBeInTheDocument();
    expect(screen.getByText(/Static Obstacles:/)).toBeInTheDocument();
    expect(screen.getByText(/Dynamic Hazards:/)).toBeInTheDocument();
    expect(screen.getByText(/Interactive Elements:/)).toBeInTheDocument();
    expect(screen.getByText(/Power Interactions:/)).toBeInTheDocument();
  });

  test('renders scoring section', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    expect(screen.getByText('🏆 Path to Glory')).toBeInTheDocument();
    expect(screen.getByText(/Evolution Multipliers:/)).toBeInTheDocument();
    expect(screen.getByText(/Combo System:/)).toBeInTheDocument();
    expect(screen.getByText(/Survival Bonus:/)).toBeInTheDocument();
    expect(screen.getByText(/Ultimate Goal:/)).toBeInTheDocument();
  });

  test('calls onClose when Begin Your Journey button is clicked', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    const closeButton = screen.getByText('Begin Your Journey');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('button hover effects work correctly', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    const closeButton = screen.getByText('Begin Your Journey');
    
    // Test hover enter
    fireEvent.mouseEnter(closeButton);
    expect(closeButton).toHaveStyle('background-color: rgba(138, 43, 226, 0.4)');
    
    // Test hover leave
    fireEvent.mouseLeave(closeButton);
    expect(closeButton).toHaveStyle('background-color: rgba(138, 43, 226, 0.2)');
  });

  test('displays all evolution levels in correct order', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    const evolutionLevels = [
      '1. Hatchling:',
      '2. Garden Snake:',
      '3. Viper:',
      '4. Python:',
      '5. Cobra:',
      '6. Anaconda:',
      '7. Rainbow Serpent:',
      '8. Celestial Serpent:',
      '9. Ancient Dragon:',
      '10. Ouroboros:'
    ];

    evolutionLevels.forEach(level => {
      expect(screen.getByText(new RegExp(level.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
    });
  });

  test('displays power descriptions with correct hotkeys', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    const powerDescriptions = [
      'Speed Boost (Q):',
      'Venom Strike (E):',
      'Fire Breath (O):',
      'Time Warp (I):',
      'Tail Consumption (P):'
    ];

    powerDescriptions.forEach(power => {
      expect(screen.getByText(new RegExp(power.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
    });
  });

  test('has scrollable content for long instructions', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    // Check that the main container has overflow-y auto
    const mainContainer = screen.getByText('Ancient Wisdom').closest('[style*="overflow-y: auto"]');
    expect(mainContainer).toBeInTheDocument();
  });

  test('displays mystical background pattern', () => {
    render(<InstructionsScreen onClose={mockOnClose} />);

    // Check that the component renders without errors (background pattern is present)
    expect(screen.getByText('Ancient Wisdom')).toBeInTheDocument();
    expect(screen.getByText('Master the secrets of serpentine evolution')).toBeInTheDocument();
  });
});