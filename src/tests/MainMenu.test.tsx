import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { MainMenu } from '../components/MainMenu';

describe('MainMenu', () => {
  const mockOnStartGame = vi.fn();
  const mockOnShowInstructions = vi.fn();

  beforeEach(() => {
    mockOnStartGame.mockClear();
    mockOnShowInstructions.mockClear();
  });

  test('renders main menu title and subtitle', () => {
    render(
      <MainMenu
        onStartGame={mockOnStartGame}
        onShowInstructions={mockOnShowInstructions}
        highScore={0}
      />
    );

    expect(screen.getByText('OUROBOROS')).toBeInTheDocument();
    expect(screen.getByText('The Eternal Serpent')).toBeInTheDocument();
    expect(screen.getByText(/Evolve through 10 mystical forms/)).toBeInTheDocument();
  });

  test('renders menu buttons', () => {
    render(
      <MainMenu
        onStartGame={mockOnStartGame}
        onShowInstructions={mockOnShowInstructions}
        highScore={0}
      />
    );

    expect(screen.getByText('Begin Evolution')).toBeInTheDocument();
    expect(screen.getByText('Ancient Wisdom')).toBeInTheDocument();
  });

  test('calls onStartGame when Begin Evolution button is clicked', () => {
    render(
      <MainMenu
        onStartGame={mockOnStartGame}
        onShowInstructions={mockOnShowInstructions}
        highScore={0}
      />
    );

    const startButton = screen.getByText('Begin Evolution');
    fireEvent.click(startButton);

    expect(mockOnStartGame).toHaveBeenCalledTimes(1);
  });

  test('calls onShowInstructions when Ancient Wisdom button is clicked', () => {
    render(
      <MainMenu
        onStartGame={mockOnStartGame}
        onShowInstructions={mockOnShowInstructions}
        highScore={0}
      />
    );

    const instructionsButton = screen.getByText('Ancient Wisdom');
    fireEvent.click(instructionsButton);

    expect(mockOnShowInstructions).toHaveBeenCalledTimes(1);
  });

  test('displays high score when provided', () => {
    const highScore = 15750;
    
    render(
      <MainMenu
        onStartGame={mockOnStartGame}
        onShowInstructions={mockOnShowInstructions}
        highScore={highScore}
      />
    );

    expect(screen.getByText('Best Achievement')).toBeInTheDocument();
    expect(screen.getByText('15,750')).toBeInTheDocument();
  });

  test('does not display high score section when score is 0', () => {
    render(
      <MainMenu
        onStartGame={mockOnStartGame}
        onShowInstructions={mockOnShowInstructions}
        highScore={0}
      />
    );

    expect(screen.queryByText('Best Achievement')).not.toBeInTheDocument();
  });

  test('displays control instructions in footer', () => {
    render(
      <MainMenu
        onStartGame={mockOnStartGame}
        onShowInstructions={mockOnShowInstructions}
        highScore={0}
      />
    );

    expect(screen.getByText(/Use WASD or Arrow Keys/)).toBeInTheDocument();
    expect(screen.getByText(/Space to Pause/)).toBeInTheDocument();
    expect(screen.getByText(/Q-P for Powers/)).toBeInTheDocument();
  });

  test('displays mystical quote in footer', () => {
    render(
      <MainMenu
        onStartGame={mockOnStartGame}
        onShowInstructions={mockOnShowInstructions}
        highScore={0}
      />
    );

    expect(screen.getByText(/The serpent that devours its own tail/)).toBeInTheDocument();
  });

  test('button hover effects work correctly', () => {
    render(
      <MainMenu
        onStartGame={mockOnStartGame}
        onShowInstructions={mockOnShowInstructions}
        highScore={0}
      />
    );

    const startButton = screen.getByText('Begin Evolution');
    
    // Test hover enter
    fireEvent.mouseEnter(startButton);
    expect(startButton).toHaveStyle('background-color: rgba(138, 43, 226, 0.4)');
    
    // Test hover leave
    fireEvent.mouseLeave(startButton);
    expect(startButton).toHaveStyle('background-color: rgba(138, 43, 226, 0.2)');
  });

  test('formats high score with commas', () => {
    const highScore = 1234567;
    
    render(
      <MainMenu
        onStartGame={mockOnStartGame}
        onShowInstructions={mockOnShowInstructions}
        highScore={highScore}
      />
    );

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });
});