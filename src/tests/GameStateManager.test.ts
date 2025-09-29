import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameStateManager } from '../core/GameStateManager';
import { ScoreSystem } from '../core/ScoreSystem';
import { DeathReason, Vector2 } from '../types/game';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock DOM events
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener
});

Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener
});

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener
});

describe('GameStateManager', () => {
  let gameStateManager: GameStateManager;
  let scoreSystem: ScoreSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    scoreSystem = new ScoreSystem();
    gameStateManager = new GameStateManager(scoreSystem);
  });

  afterEach(() => {
    gameStateManager.dispose();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      const gameState = gameStateManager.getGameState();
      const gameOverState = gameStateManager.getGameOverState();

      expect(gameState.isRunning).toBe(false);
      expect(gameState.isPaused).toBe(false);
      expect(gameOverState.isGameOver).toBe(false);
      expect(gameOverState.deathAnimation.isPlaying).toBe(false);
    });

    it('should set up event listeners for pause functionality', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        deathAnimationDuration: 3000,
        pauseOnFocusLoss: false,
        enableAutoSave: false
      };

      const customGameStateManager = new GameStateManager(scoreSystem, customConfig);
      const gameOverState = customGameStateManager.getGameOverState();

      expect(gameOverState.deathAnimation.duration).toBe(3000);
      customGameStateManager.dispose();
    });
  });

  describe('Game State Control', () => {
    it('should start game correctly', () => {
      gameStateManager.startGame();

      const gameState = gameStateManager.getGameState();
      expect(gameState.isRunning).toBe(true);
      expect(gameState.isPaused).toBe(false);
      expect(gameStateManager.isGameRunning()).toBe(true);
      expect(gameStateManager.isGamePaused()).toBe(false);
      expect(gameStateManager.isGameOver()).toBe(false);
    });

    it('should stop game correctly', () => {
      gameStateManager.startGame();
      gameStateManager.stopGame();

      const gameState = gameStateManager.getGameState();
      expect(gameState.isRunning).toBe(false);
      expect(gameState.isPaused).toBe(false);
      expect(gameStateManager.isGameRunning()).toBe(false);
    });

    it('should pause game correctly', () => {
      gameStateManager.startGame();
      gameStateManager.pause();

      expect(gameStateManager.isGamePaused()).toBe(true);
    });

    it('should resume game correctly', () => {
      gameStateManager.startGame();
      gameStateManager.pause();
      gameStateManager.resume();

      expect(gameStateManager.isGamePaused()).toBe(false);
    });

    it('should toggle pause correctly', () => {
      gameStateManager.startGame();
      
      expect(gameStateManager.isGamePaused()).toBe(false);
      
      gameStateManager.togglePause();
      expect(gameStateManager.isGamePaused()).toBe(true);
      
      gameStateManager.togglePause();
      expect(gameStateManager.isGamePaused()).toBe(false);
    });

    it('should not pause when game is not running', () => {
      gameStateManager.pause();
      expect(gameStateManager.isGamePaused()).toBe(false);
    });

    it('should not pause when game is over', () => {
      gameStateManager.startGame();
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5);
      gameStateManager.pause();

      expect(gameStateManager.isGamePaused()).toBe(false);
    });
  });

  describe('Game Over Handling', () => {
    it('should trigger game over correctly', () => {
      gameStateManager.startGame();
      
      const deathPosition: Vector2 = { x: 10, y: 15 };
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5, deathPosition);

      const gameOverState = gameStateManager.getGameOverState();
      expect(gameOverState.isGameOver).toBe(true);
      expect(gameOverState.deathReason).toBe(DeathReason.SelfCollision);
      expect(gameOverState.finalEvolutionLevel).toBe(5);
      expect(gameOverState.deathAnimation.isPlaying).toBe(true);
      expect(gameOverState.deathAnimation.progress).toBe(0);
      
      expect(gameStateManager.isGameOver()).toBe(true);
      expect(gameStateManager.isDeathAnimationPlaying()).toBe(true);
    });

    it('should not trigger game over if already game over', () => {
      gameStateManager.startGame();
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5);
      
      const firstGameOverState = gameStateManager.getGameOverState();
      
      gameStateManager.triggerGameOver(DeathReason.WallCollision, 3);
      
      const secondGameOverState = gameStateManager.getGameOverState();
      expect(secondGameOverState.deathReason).toBe(DeathReason.SelfCollision); // Should remain unchanged
      expect(secondGameOverState.finalEvolutionLevel).toBe(5); // Should remain unchanged
    });

    it('should provide correct death reason messages', () => {
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5);
      expect(gameStateManager.getDeathReasonMessage()).toBe("The serpent consumed itself in confusion");

      gameStateManager.restartGame();
      gameStateManager.triggerGameOver(DeathReason.WallCollision, 3);
      expect(gameStateManager.getDeathReasonMessage()).toBe("The serpent struck the ancient barriers");

      gameStateManager.restartGame();
      gameStateManager.triggerGameOver(DeathReason.EnvironmentalHazard, 7);
      expect(gameStateManager.getDeathReasonMessage()).toBe("The serpent succumbed to environmental dangers");
    });

    it('should restart game correctly', () => {
      gameStateManager.startGame();
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5);
      
      expect(gameStateManager.isGameOver()).toBe(true);
      
      gameStateManager.restartGame();
      
      expect(gameStateManager.isGameOver()).toBe(false);
      expect(gameStateManager.isGameRunning()).toBe(true);
      expect(gameStateManager.isDeathAnimationPlaying()).toBe(false);
      
      const gameOverState = gameStateManager.getGameOverState();
      expect(gameOverState.deathAnimation.progress).toBe(0);
    });
  });

  describe('Death Animation', () => {
    it('should update death animation progress', () => {
      gameStateManager.startGame();
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5);
      
      expect(gameStateManager.getDeathAnimationProgress()).toBe(0);
      
      // Update with half the animation duration
      gameStateManager.update(1000); // 1 second of 2 second animation
      
      expect(gameStateManager.getDeathAnimationProgress()).toBe(0.5);
      expect(gameStateManager.isDeathAnimationPlaying()).toBe(true);
    });

    it('should complete death animation', () => {
      gameStateManager.startGame();
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5);
      
      // Update with full animation duration
      gameStateManager.update(2000); // Full 2 second animation
      
      expect(gameStateManager.getDeathAnimationProgress()).toBe(1.0);
      expect(gameStateManager.isDeathAnimationPlaying()).toBe(false);
    });

    it('should not exceed animation progress of 1.0', () => {
      gameStateManager.startGame();
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5);
      
      // Update with more than animation duration
      gameStateManager.update(3000); // More than 2 second animation
      
      expect(gameStateManager.getDeathAnimationProgress()).toBe(1.0);
    });
  });

  describe('Survival Time Bonus', () => {
    it('should check survival time bonus periodically', () => {
      const shouldAwardSpy = vi.spyOn(scoreSystem, 'shouldAwardSurvivalBonus').mockReturnValue(true);
      const addBonusSpy = vi.spyOn(scoreSystem, 'addSurvivalTimeBonus').mockReturnValue(500);
      
      gameStateManager.startGame();
      
      // Update with 30 seconds (survival bonus check interval)
      // Need to call update multiple times to accumulate the time
      for (let i = 0; i < 30; i++) {
        gameStateManager.update(1000); // 1 second each time
      }
      
      expect(shouldAwardSpy).toHaveBeenCalled();
      expect(addBonusSpy).toHaveBeenCalled();
    });

    it('should not check survival bonus when game is paused', () => {
      const shouldAwardSpy = vi.spyOn(scoreSystem, 'shouldAwardSurvivalBonus');
      
      gameStateManager.startGame();
      gameStateManager.pause();
      
      gameStateManager.update(30000);
      
      expect(shouldAwardSpy).not.toHaveBeenCalled();
    });

    it('should not check survival bonus when game is over', () => {
      const shouldAwardSpy = vi.spyOn(scoreSystem, 'shouldAwardSurvivalBonus');
      
      gameStateManager.startGame();
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5);
      
      gameStateManager.update(30000);
      
      expect(shouldAwardSpy).not.toHaveBeenCalled();
    });
  });

  describe('Event Callbacks', () => {
    it('should call pause callbacks when paused', () => {
      const pauseCallback = vi.fn();
      gameStateManager.onPause(pauseCallback);
      
      gameStateManager.startGame();
      gameStateManager.pause();
      
      expect(pauseCallback).toHaveBeenCalled();
    });

    it('should call resume callbacks when resumed', () => {
      const resumeCallback = vi.fn();
      gameStateManager.onResume(resumeCallback);
      
      gameStateManager.startGame();
      gameStateManager.pause();
      gameStateManager.resume();
      
      expect(resumeCallback).toHaveBeenCalled();
    });

    it('should call game over callbacks when game over is triggered', () => {
      const gameOverCallback = vi.fn();
      gameStateManager.onGameOver(gameOverCallback);
      
      gameStateManager.startGame();
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5);
      
      expect(gameOverCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          isGameOver: true,
          deathReason: DeathReason.SelfCollision,
          finalEvolutionLevel: 5
        })
      );
    });

    it('should remove callbacks correctly', () => {
      const pauseCallback = vi.fn();
      gameStateManager.onPause(pauseCallback);
      gameStateManager.removePauseCallback(pauseCallback);
      
      gameStateManager.startGame();
      gameStateManager.pause();
      
      expect(pauseCallback).not.toHaveBeenCalled();
    });
  });

  describe('FPS and Delta Time', () => {
    it('should calculate FPS correctly', () => {
      gameStateManager.update(16.67); // ~60 FPS
      
      expect(gameStateManager.getFPS()).toBeCloseTo(60, 0);
    });

    it('should track delta time correctly', () => {
      gameStateManager.update(16.67);
      
      expect(gameStateManager.getDeltaTime()).toBe(16.67);
    });
  });

  describe('Space Bar Handling', () => {
    it('should handle space bar key press for pause/resume', () => {
      gameStateManager.startGame();
      
      // Simulate space bar press
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      const preventDefaultSpy = vi.spyOn(keydownEvent, 'preventDefault');
      
      // Find the keydown event listener that was added
      const keydownListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )?.[1];
      
      expect(keydownListener).toBeDefined();
      
      // Call the listener with space bar event
      keydownListener(keydownEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(gameStateManager.isGamePaused()).toBe(true);
    });

    it('should not handle space bar when game is over', () => {
      gameStateManager.startGame();
      gameStateManager.triggerGameOver(DeathReason.SelfCollision, 5);
      
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      const preventDefaultSpy = vi.spyOn(keydownEvent, 'preventDefault');
      
      const keydownListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )?.[1];
      
      keydownListener(keydownEvent);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(gameStateManager.isGamePaused()).toBe(false);
    });
  });

  describe('Focus Loss Handling', () => {
    it('should pause on window blur when configured', () => {
      gameStateManager.startGame();
      
      // Find the blur event listener
      const blurListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'blur'
      )?.[1];
      
      expect(blurListener).toBeDefined();
      
      // Simulate window blur
      blurListener();
      
      expect(gameStateManager.isGamePaused()).toBe(true);
    });

    it('should not pause on focus loss when disabled', () => {
      // Clear previous mock calls
      mockAddEventListener.mockClear();
      
      const customGameStateManager = new GameStateManager(scoreSystem, {
        pauseOnFocusLoss: false
      });
      
      customGameStateManager.startGame();
      
      // Should not have added blur listener after clearing
      const blurListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'blur'
      );
      
      expect(blurListener).toBeUndefined();
      
      customGameStateManager.dispose();
    });
  });

  describe('Disposal', () => {
    it('should clean up resources on disposal', () => {
      // Add callback before disposal
      const pauseCallback = vi.fn();
      gameStateManager.onPause(pauseCallback);
      
      // Dispose should clear callbacks
      gameStateManager.dispose();
      
      // Try to trigger pause after disposal - callback should not be called
      gameStateManager.startGame();
      gameStateManager.pause();
      
      expect(pauseCallback).not.toHaveBeenCalled();
    });
  });
});