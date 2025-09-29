import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { GameOverScreen } from '../components/GameOverScreen';
import { DeathReason, ScoreState } from '../types/game';

const mockScoreState: ScoreState = {
  currentScore: 25000,
  highScore: 30000,
  evolutionLevelMultiplier: 3.0,
  comboMultiplier: 2.0,
  comboCount: 5,
  lastScoreTime: Date.now(),
  totalFoodConsumed: 75,
  evolutionBonuses: 10000,
  powerUsageBonuses: 5000,
  survivalTimeBonus: 3000,
  gameStartTime: Date.now() - 300000 // 5 minutes ago
};

describe('GameOverScreen', () => {
  const mockOnRestart = vi.fn();
  const mockOnMainMenu = vi.fn();

  beforeEach(() => {
    mockOnRestart.mockClear();
    mockOnMainMenu.mockClear();
  });

  test('renders death message for self collision', () => {
    render(
      <GameOverScreen
        finalScore={25000}
        finalEvolutionLevel={5}
        survivalTime={300000}
        deathReason={DeathReason.SelfCollision}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    expect(screen.getByText('The Serpent Consumed Itself')).toBeInTheDocument();
    expect(screen.getByText(/ancient cycle of self-consumption/)).toBeInTheDocument();
  });

  test('renders death message for wall collision', () => {
    render(
      <GameOverScreen
        finalScore={25000}
        finalEvolutionLevel={3}
        survivalTime={180000}
        deathReason={DeathReason.WallCollision}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    expect(screen.getByText('Bound by Ancient Barriers')).toBeInTheDocument();
    expect(screen.getByText(/mystical boundaries proved too strong/)).toBeInTheDocument();
  });

  test('displays final evolution level correctly', () => {
    render(
      <GameOverScreen
        finalScore={25000}
        finalEvolutionLevel={7}
        survivalTime={300000}
        deathReason={DeathReason.SelfCollision}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    expect(screen.getByText('Rainbow Serpent')).toBeInTheDocument();
    expect(screen.getByText('Level 7 of 10')).toBeInTheDocument();
  });

  test('shows special message for Ouroboros achievement', () => {
    render(
      <GameOverScreen
        finalScore={50000}
        finalEvolutionLevel={10}
        survivalTime={600000}
        deathReason={DeathReason.SelfCollision}
        scoreState={mockScoreState}
        isNewHighScore={true}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    expect(screen.getByText('Ouroboros')).toBeInTheDocument();
    expect(screen.getByText('🐍 OUROBOROS ACHIEVED! 🐍')).toBeInTheDocument();
  });

  test('displays final score with proper formatting', () => {
    render(
      <GameOverScreen
        finalScore={1234567}
        finalEvolutionLevel={8}
        survivalTime={300000}
        deathReason={DeathReason.EnvironmentalHazard}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  test('shows new high score message when applicable', () => {
    render(
      <GameOverScreen
        finalScore={35000}
        finalEvolutionLevel={6}
        survivalTime={400000}
        deathReason={DeathReason.ObstacleCollision}
        scoreState={mockScoreState}
        isNewHighScore={true}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    expect(screen.getByText('NEW HIGH SCORE!')).toBeInTheDocument();
  });

  test('formats survival time correctly for minutes and seconds', () => {
    render(
      <GameOverScreen
        finalScore={25000}
        finalEvolutionLevel={5}
        survivalTime={185000} // 3:05
        deathReason={DeathReason.PoisonEffect}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    expect(screen.getByText('3:05')).toBeInTheDocument();
  });

  test('formats survival time correctly for hours', () => {
    render(
      <GameOverScreen
        finalScore={25000}
        finalEvolutionLevel={5}
        survivalTime={3665000} // 1:01:05
        deathReason={DeathReason.PoisonEffect}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    expect(screen.getByText('1:01:05')).toBeInTheDocument();
  });

  test('displays game statistics correctly', () => {
    render(
      <GameOverScreen
        finalScore={25000}
        finalEvolutionLevel={5}
        survivalTime={300000}
        deathReason={DeathReason.SelfCollision}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    expect(screen.getByText('75')).toBeInTheDocument(); // Food consumed
    expect(screen.getByText('5x')).toBeInTheDocument(); // Best combo
  });

  test('calls onRestart when Evolve Again button is clicked', () => {
    render(
      <GameOverScreen
        finalScore={25000}
        finalEvolutionLevel={5}
        survivalTime={300000}
        deathReason={DeathReason.SelfCollision}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    const restartButton = screen.getByText('Evolve Again');
    fireEvent.click(restartButton);

    expect(mockOnRestart).toHaveBeenCalledTimes(1);
  });

  test('calls onMainMenu when Return to Menu button is clicked', () => {
    render(
      <GameOverScreen
        finalScore={25000}
        finalEvolutionLevel={5}
        survivalTime={300000}
        deathReason={DeathReason.SelfCollision}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    const menuButton = screen.getByText('Return to Menu');
    fireEvent.click(menuButton);

    expect(mockOnMainMenu).toHaveBeenCalledTimes(1);
  });

  test('displays mystical quote at bottom', () => {
    render(
      <GameOverScreen
        finalScore={25000}
        finalEvolutionLevel={5}
        survivalTime={300000}
        deathReason={DeathReason.SelfCollision}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    expect(screen.getByText(/In the end, all serpents return to the beginning/)).toBeInTheDocument();
  });

  test('button hover effects work correctly', () => {
    render(
      <GameOverScreen
        finalScore={25000}
        finalEvolutionLevel={5}
        survivalTime={300000}
        deathReason={DeathReason.SelfCollision}
        scoreState={mockScoreState}
        isNewHighScore={false}
        onRestart={mockOnRestart}
        onMainMenu={mockOnMainMenu}
      />
    );

    const restartButton = screen.getByText('Evolve Again');
    
    // Test hover enter
    fireEvent.mouseEnter(restartButton);
    expect(restartButton).toHaveStyle('background-color: rgba(138, 43, 226, 0.4)');
    
    // Test hover leave
    fireEvent.mouseLeave(restartButton);
    expect(restartButton).toHaveStyle('background-color: rgba(138, 43, 226, 0.2)');
  });

  test('handles all death reasons correctly', () => {
    const deathReasons = [
      { reason: DeathReason.SelfCollision, title: 'The Serpent Consumed Itself' },
      { reason: DeathReason.WallCollision, title: 'Bound by Ancient Barriers' },
      { reason: DeathReason.ObstacleCollision, title: 'Crushed by Stone and Crystal' },
      { reason: DeathReason.EnvironmentalHazard, title: 'Consumed by Elemental Forces' },
      { reason: DeathReason.PoisonEffect, title: 'Venom Coursed Through Your Scales' }
    ];

    deathReasons.forEach(({ reason, title }) => {
      const { rerender } = render(
        <GameOverScreen
          finalScore={25000}
          finalEvolutionLevel={5}
          survivalTime={300000}
          deathReason={reason}
          scoreState={mockScoreState}
          isNewHighScore={false}
          onRestart={mockOnRestart}
          onMainMenu={mockOnMainMenu}
        />
      );

      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });
});