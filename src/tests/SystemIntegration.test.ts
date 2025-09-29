import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { FoodType, PowerType } from '../types/game';

// Mock canvas and WebGL context
const mockCanvas = {
  width: 1750,
  height: 1225,
  getContext: vi.fn(() => ({
    clearColor: vi.fn(),
    clear: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    viewport: vi.fn(),
    scissor: vi.fn(),
    getParameter: vi.fn(() => [0, 0, 1750, 1225]),
    getExtension: vi.fn(() => ({ loseContext: vi.fn() })),
    createBuffer: vi.fn(),
    createShader: vi.fn(),
    createProgram: vi.fn(),
    createTexture: vi.fn(),
    createFramebuffer: vi.fn(),
    createRenderbuffer: vi.fn(),
    COLOR_BUFFER_BIT: 16384,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    SCISSOR_TEST: 3089,
    VIEWPORT: 2978
  })),
  style: {}
} as unknown as HTMLCanvasElement;

// Mock Web Audio API
const mockAudioContext = {
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 }
  })),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    buffer: null,
    loop: false,
    playbackRate: { value: 1 },
    onended: null
  })),
  createPanner: vi.fn(() => ({
    connect: vi.fn(),
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    panningModel: 'HRTF',
    distanceModel: 'inverse',
    refDistance: 1,
    maxDistance: 10000,
    rolloffFactor: 1
  })),
  decodeAudioData: vi.fn(() => Promise.resolve({})),
  destination: {},
  currentTime: 0,
  close: vi.fn(() => Promise.resolve()),
  state: 'running'
};

// Mock global objects
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext)
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext)
});

Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn((callback) => setTimeout(callback, 16))
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn()
});

describe('System Integration Tests', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    gameEngine = new GameEngine(mockCanvas);
  });

  afterEach(() => {
    if (gameEngine) {
      gameEngine.dispose();
    }
  });

  describe('Complete Game Flow Integration', () => {
    it('should initialize all systems correctly', () => {
      expect(gameEngine).toBeDefined();
      expect(gameEngine.getSnakeManager()).toBeDefined();
      expect(gameEngine.getEnvironmentSystem()).toBeDefined();
      expect(gameEngine.getFoodManager()).toBeDefined();
      expect(gameEngine.getAudioManager()).toBeDefined();
      expect(gameEngine.getLightingSystem()).toBeDefined();
      expect(gameEngine.getParticleSystem()).toBeDefined();
      expect(gameEngine.getScoreSystem()).toBeDefined();
    });

    it('should handle complete evolution progression', async () => {
      const snakeManager = gameEngine.getSnakeManager();
      const evolutionSystem = snakeManager.getEvolutionSystem();
      const foodManager = gameEngine.getFoodManager();
      
      // Start the game
      gameEngine.start();
      
      // Simulate evolution progression from level 1 to 10
      for (let targetLevel = 2; targetLevel <= 10; targetLevel++) {
        const currentLevel = evolutionSystem.getCurrentLevel();
        expect(currentLevel).toBe(targetLevel - 1);
        
        // Add enough evolution progress to trigger evolution
        const requiredProgress = evolutionSystem.getRequiredProgressForNextLevel();
        evolutionSystem.addEvolutionProgress(requiredProgress);
        
        // Trigger evolution check
        evolutionSystem.checkEvolution();
        
        // Wait for evolution to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(evolutionSystem.getCurrentLevel()).toBe(targetLevel);
      }
      
      // Verify Ouroboros level reached
      expect(evolutionSystem.getCurrentLevel()).toBe(10);
      expect(evolutionSystem.getCurrentEvolutionName()).toBe('Ouroboros');
    });

    it('should integrate food system with evolution and scoring', () => {
      const foodManager = gameEngine.getFoodManager();
      const snakeManager = gameEngine.getSnakeManager();
      const scoreSystem = gameEngine.getScoreSystem();
      
      // Force spawn different food types
      const basicBerry = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      const crystalFruit = foodManager.forceSpawnFood({ x: 15, y: 15 }, FoodType.CrystalFruit);
      
      expect(basicBerry).toBeDefined();
      expect(crystalFruit).toBeDefined();
      
      const initialScore = scoreSystem.getCurrentScore();
      const initialLength = snakeManager.getLength();
      
      // Simulate food consumption
      if (basicBerry) {
        const result = foodManager.consumeFood(basicBerry.id, 1);
        expect(result.success).toBe(true);
        expect(result.segmentsToGrow).toBeGreaterThan(0);
      }
      
      // Verify score and length changes
      expect(scoreSystem.getCurrentScore()).toBeGreaterThan(initialScore);
      expect(snakeManager.getLength()).toBeGreaterThan(initialLength);
    });

    it('should handle power activation with all integrated systems', () => {
      const snakeManager = gameEngine.getSnakeManager();
      const evolutionSystem = snakeManager.getEvolutionSystem();
      const audioManager = gameEngine.getAudioManager();
      const lightingSystem = gameEngine.getLightingSystem();
      
      // Evolve to level 2 to unlock Speed Boost
      evolutionSystem.forceEvolution(2);
      
      const initialLightCount = lightingSystem.getActiveLightCount();
      
      // Activate Speed Boost power
      const result = snakeManager.activatePower(PowerType.SpeedBoost);
      
      expect(result.success).toBe(true);
      
      // Verify lighting effects were added
      expect(lightingSystem.getActiveLightCount()).toBeGreaterThan(initialLightCount);
    });

    it('should handle environmental interactions with powers', () => {
      const snakeManager = gameEngine.getSnakeManager();
      const environmentSystem = gameEngine.getEnvironmentSystem();
      const evolutionSystem = snakeManager.getEvolutionSystem();
      
      // Evolve to level 9 to unlock Fire Breath
      evolutionSystem.forceEvolution(9);
      
      // Add destructible obstacles
      const obstacle = environmentSystem.addObstacle({
        type: 'IceWall',
        position: { x: 20, y: 20 },
        size: { x: 2, y: 2 },
        isDestructible: true
      });
      
      expect(obstacle).toBeDefined();
      
      const initialObstacleCount = environmentSystem.getObstacles().length;
      
      // Use Fire Breath to destroy obstacle
      const result = snakeManager.activatePower(PowerType.FireBreath);
      expect(result.success).toBe(true);
      
      // Simulate power-environment interaction
      if (result.environmentalInteractions) {
        result.environmentalInteractions.forEach(interaction => {
          if (interaction.type === 'destroy') {
            environmentSystem.removeObstacle(interaction.obstacleId);
          }
        });
      }
      
      expect(environmentSystem.getObstacles().length).toBeLessThan(initialObstacleCount);
    });

    it('should handle Ouroboros tail consumption mechanics', () => {
      const snakeManager = gameEngine.getSnakeManager();
      const evolutionSystem = snakeManager.getEvolutionSystem();
      const scoreSystem = gameEngine.getScoreSystem();
      
      // Evolve to Ouroboros level
      evolutionSystem.forceEvolution(10);
      
      // Grow snake to have enough segments for tail consumption
      snakeManager.grow(20);
      
      const initialLength = snakeManager.getLength();
      const initialScore = scoreSystem.getCurrentScore();
      
      // Get tail segment position
      const snakeState = snakeManager.getSnakeState();
      const tailSegment = snakeState.segments[snakeState.segments.length - 1];
      
      // Simulate tail consumption
      const result = snakeManager.consumeTailFromSegment(snakeState.segments.length - 1);
      
      expect(result.success).toBe(true);
      expect(result.segmentsConsumed).toBeGreaterThan(0);
      expect(snakeManager.getLength()).toBeLessThan(initialLength);
      
      // Verify strategic advantages were applied
      if (result.strategicAdvantage) {
        expect(result.strategicAdvantage.bonusPoints).toBeGreaterThan(0);
      }
    });

    it('should maintain performance under load', async () => {
      const performanceMonitor = gameEngine.getPerformanceMetrics();
      
      gameEngine.start();
      
      // Simulate heavy load scenario
      const foodManager = gameEngine.getFoodManager();
      const particleSystem = gameEngine.getParticleSystem();
      
      // Spawn maximum food
      for (let i = 0; i < 20; i++) {
        foodManager.forceSpawnFood(
          { x: Math.floor(Math.random() * 50), y: Math.floor(Math.random() * 35) },
          FoodType.BasicBerry
        );
      }
      
      // Create many particle effects
      for (let i = 0; i < 10; i++) {
        particleSystem.createBurst(
          { x: Math.random() * 1750, y: Math.random() * 1225 },
          'sparkle',
          20,
          { x: 0, y: 0 },
          Math.PI * 2
        );
      }
      
      // Run for a few frames
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check performance metrics
      expect(performanceMonitor.fps).toBeGreaterThan(30); // Should maintain at least 30 FPS
      expect(performanceMonitor.memoryUsage).toBeLessThan(500); // Should use less than 500MB
    });

    it('should handle error recovery gracefully', () => {
      const errorHandler = gameEngine.getErrorLog();
      
      // Simulate WebGL context loss
      const gl = gameEngine.getWebGLContext();
      if (gl && gl.getExtension('WEBGL_lose_context')) {
        gl.getExtension('WEBGL_lose_context')!.loseContext();
      }
      
      // Game should continue running in fallback mode
      expect(gameEngine.getFallbackState().webglFallback).toBe(true);
      
      // Should have logged the error
      expect(errorHandler.length).toBeGreaterThan(0);
    });

    it('should save and restore game state correctly', () => {
      const gameStateManager = gameEngine.getGameStateManager();
      const snakeManager = gameEngine.getSnakeManager();
      const scoreSystem = gameEngine.getScoreSystem();
      
      // Modify game state
      snakeManager.grow(5);
      scoreSystem.addPoints(1000);
      
      const initialLength = snakeManager.getLength();
      const initialScore = scoreSystem.getCurrentScore();
      
      // Save state
      const savedState = gameStateManager.saveGameState();
      expect(savedState).toBeDefined();
      
      // Modify state further
      snakeManager.grow(3);
      scoreSystem.addPoints(500);
      
      // Restore state
      gameStateManager.loadGameState(savedState);
      
      // Verify restoration
      expect(snakeManager.getLength()).toBe(initialLength);
      expect(scoreSystem.getCurrentScore()).toBe(initialScore);
    });
  });

  describe('Cross-System Communication', () => {
    it('should properly communicate between all systems during gameplay', () => {
      const snakeManager = gameEngine.getSnakeManager();
      const foodManager = gameEngine.getFoodManager();
      const environmentSystem = gameEngine.getEnvironmentSystem();
      const audioManager = gameEngine.getAudioManager();
      const lightingSystem = gameEngine.getLightingSystem();
      const particleSystem = gameEngine.getParticleSystem();
      
      // Start game
      gameEngine.start();
      
      // Verify all systems are active
      expect(snakeManager.isAlive()).toBe(true);
      expect(foodManager.getFoodCount()).toBeGreaterThanOrEqual(0);
      expect(environmentSystem.getObstacles().length).toBeGreaterThanOrEqual(0);
      expect(audioManager.isAudioSupported()).toBeDefined();
      expect(lightingSystem.getActiveLightCount()).toBeGreaterThanOrEqual(0);
      expect(particleSystem.getActiveParticleCount()).toBeGreaterThanOrEqual(0);
      
      // Systems should be updating in sync
      const initialTime = performance.now();
      
      // Simulate one update cycle
      gameEngine['update'](16.67); // 60 FPS frame time
      
      // All systems should have processed the update
      expect(performance.now() - initialTime).toBeLessThan(100); // Should complete quickly
    });
  });
});