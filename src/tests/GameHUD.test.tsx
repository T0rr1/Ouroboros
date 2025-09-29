import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { GameHUD } from '../components/GameHUD';
import { GameState, ScoreState } from '../types/game';
import { PowerType } from '../core/EvolutionSystem';
import { PowerVisualState } from '../core/PowerSystem';

// Mock game state
const mockGameState: GameState = {
  isRunning: true,
  isPaused: false,
  lastFrameTime: 0,
  deltaTime: 16.67,
  fps: 60
};

const mockScoreState: ScoreState = {
  currentScore: 12500,
  highScore: 25000,
  evolutionLevelMultiplier: 2.5,
  comboMultiplier: 1.5,
  comboCount: 3,
  lastScoreTime: Date.now(),
  totalFoodConsumed: 45,
  evolutionBonuses: 5000,
  powerUsageBonuses: 2000,
  survivalTimeBonus: 1500,
  gameStartTime: Date.now() - 120000 // 2 minutes ago
};

const mockPowerState: PowerVisualState = {
  activePowers: [PowerType.SpeedBoost],
  cooldowns: new Map([
    [PowerType.SpeedBoost, 0],
    [PowerType.VenomStrike, 3000],
    [PowerType.Constrict, 0]
  ]),
  durations: new Map([
    [PowerType.SpeedBoost, 2000]
  ])
};

describe('GameHUD', () => {
  const mockOnPowerActivate = vi.fn();

  beforeEach(() => {
    mockOnPowerActivate.mockClear();
  });

  test('renders game status correctly', () => {
    render(
      <GameHUD
        gameState={mockGameState}
        evolutionLevel={3}
        scoreState={mockScoreState}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    expect(screen.getByText('Viper')).toBeInTheDocument();
    expect(screen.getByText('Level 3/10')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText(/FPS: 60/)).toBeInTheDocument();
  });

  test('displays score information correctly', () => {
    render(
      <GameHUD
        gameState={mockGameState}
        evolutionLevel={5}
        scoreState={mockScoreState}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    expect(screen.getByText('12,500')).toBeInTheDocument(); // Current score
    expect(screen.getByText('High: 25,000')).toBeInTheDocument();
    expect(screen.getByText('Combo: 3x')).toBeInTheDocument();
    expect(screen.getByText('Food: 45')).toBeInTheDocument();
  });

  test('shows paused state correctly', () => {
    const pausedGameState = { ...mockGameState, isPaused: true };
    
    render(
      <GameHUD
        gameState={pausedGameState}
        evolutionLevel={2}
        scoreState={mockScoreState}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    expect(screen.getByText('PAUSED')).toBeInTheDocument();
  });

  test('renders power buttons when powers are available', () => {
    render(
      <GameHUD
        gameState={mockGameState}
        evolutionLevel={3}
        scoreState={mockScoreState}
        powerState={mockPowerState}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    expect(screen.getByText('Mystical Powers')).toBeInTheDocument();
    expect(screen.getByText('Q')).toBeInTheDocument(); // Speed Boost
    expect(screen.getByText('E')).toBeInTheDocument(); // Venom Strike
    expect(screen.getByText('R')).toBeInTheDocument(); // Constrict
  });

  test('shows active power duration', () => {
    render(
      <GameHUD
        gameState={mockGameState}
        evolutionLevel={3}
        scoreState={mockScoreState}
        powerState={mockPowerState}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    // Speed Boost is active with 2000ms duration
    const speedBoostButton = screen.getByText('Q').closest('button');
    expect(speedBoostButton).toHaveTextContent('2s');
  });

  test('shows power cooldown', () => {
    render(
      <GameHUD
        gameState={mockGameState}
        evolutionLevel={3}
        scoreState={mockScoreState}
        powerState={mockPowerState}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    // Venom Strike is on cooldown with 3000ms remaining
    const venomStrikeButton = screen.getByText('E').closest('button');
    expect(venomStrikeButton).toHaveTextContent('3s');
    expect(venomStrikeButton).toBeDisabled();
  });

  test('calls onPowerActivate when power button is clicked', () => {
    render(
      <GameHUD
        gameState={mockGameState}
        evolutionLevel={3}
        scoreState={mockScoreState}
        powerState={mockPowerState}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    const constrictButton = screen.getByText('R').closest('button');
    fireEvent.click(constrictButton!);

    expect(mockOnPowerActivate).toHaveBeenCalledWith(PowerType.Constrict);
  });

  test('does not call onPowerActivate for powers on cooldown', () => {
    render(
      <GameHUD
        gameState={mockGameState}
        evolutionLevel={3}
        scoreState={mockScoreState}
        powerState={mockPowerState}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    const venomStrikeButton = screen.getByText('E').closest('button');
    fireEvent.click(venomStrikeButton!);

    expect(mockOnPowerActivate).not.toHaveBeenCalled();
  });

  test('formats survival time correctly', () => {
    render(
      <GameHUD
        gameState={mockGameState}
        evolutionLevel={1}
        scoreState={mockScoreState}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    // Should show 2:00 for 2 minutes
    expect(screen.getByText(/Time: 2:00/)).toBeInTheDocument();
  });

  test('displays evolution names correctly', () => {
    const evolutionLevels = [
      { level: 1, name: 'Hatchling' },
      { level: 5, name: 'Cobra' },
      { level: 10, name: 'Ouroboros' }
    ];

    evolutionLevels.forEach(({ level, name }) => {
      const { rerender } = render(
        <GameHUD
          gameState={mockGameState}
          evolutionLevel={level}
          scoreState={mockScoreState}
          onPowerActivate={mockOnPowerActivate}
        />
      );

      expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.getByText(`Level ${level}/10`)).toBeInTheDocument();
    });
  });

  test('handles missing scoreState gracefully', () => {
    render(
      <GameHUD
        gameState={mockGameState}
        evolutionLevel={1}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument(); // Default score
    expect(screen.getByText('High: 0')).toBeInTheDocument();
  });

  test('does not show combo when combo count is 1 or less', () => {
    const scoreStateNoCombo = { ...mockScoreState, comboCount: 1 };
    
    render(
      <GameHUD
        gameState={mockGameState}
        evolutionLevel={1}
        scoreState={scoreStateNoCombo}
        onPowerActivate={mockOnPowerActivate}
      />
    );

    expect(screen.queryByText(/Combo:/)).not.toBeInTheDocument();
  });
});