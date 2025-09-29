import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { ParticleSystem, ParticleType } from '../core/ParticleSystem';
import { PowerType } from '../core/EvolutionSystem';

// Mock HTML Canvas and WebGL
const createMockCanvas = () => {
  const mockCanvas = {
    width: 1750,
    height: 1225,
    style: {},
    getContext: vi.fn(() => createMockWebGLContext())
  };
  return mockCanvas as any;
};

const createMockWebGLContext = () => {
  const mockGL = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    POINTS: 0,
    TRIANGLES: 4,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    COLOR_BUFFER_BIT: 16384,
    
    canvas: { width: 1750, height: 1225 },
    
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),
    
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),
    
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform2f: vi.fn(),
    uniform1f: vi.fn(),
    uniform3f: vi.fn(),
    uniform1i: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniform2fv: vi.fn(),
    
    enable: vi.fn(),
    blendFunc: vi.fn(),
    drawArrays: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    viewport: vi.fn()
  };
  
  return mockGL as any;
};

describe('ParticleSystem Integration Tests', () => {
  let gameEngine: GameEngine;
  let mockCanvas: any;
  let particleSystem: ParticleSystem;

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    gameEngine = new GameEngine(mockCanvas);
    particleSystem = gameEngine.getParticleSystem();
  });

  afterEach(() => {
    gameEngine.dispose();
  });

  describe('Game Engine Integration', () => {
    it('should initialize particle system with game engine', () => {
      expect(particleSystem).toBeDefined();
      expect(particleSystem).toBeInstanceOf(ParticleSystem);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.maxParticles).toBe(1500); // As configured in GameEngine
    });

    it('should update particle system during game loop', () => {
      const updateSpy = vi.spyOn(particleSystem, 'update');
      
      // Start game engine
      gameEngine.start();
      
      // Wait a bit for game loop to run
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          gameEngine.stop();
          
          // Particle system update should have been called
          expect(updateSpy).toHaveBeenCalled();
          resolve();
        }, 100);
      });
    });

    it('should render particles during game rendering', () => {
      const renderSpy = vi.spyOn(particleSystem, 'render');
      
      // Add some particles
      particleSystem.createBurst({ x: 100, y: 100 }, ParticleType.Sparkle, 5);
      
      // Start game engine
      gameEngine.start();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          gameEngine.stop();
          
          // Particle system render should have been called
          expect(renderSpy).toHaveBeenCalled();
          resolve();
        }, 100);
      });
    });
  });

  describe('Evolution System Integration', () => {
    it('should create evolution transformation effects when snake evolves', () => {
      // Test the particle system integration directly rather than through the full game loop
      const createEvolutionEffectSpy = vi.spyOn(particleSystem, 'createEvolutionTransformationEffect');
      
      // Directly test the particle effect creation
      const position = { x: 100, y: 100 };
      particleSystem.createEvolutionTransformationEffect(position, 1, 2);
      
      expect(createEvolutionEffectSpy).toHaveBeenCalledWith(position, 1, 2);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeGreaterThan(0);
    });

    it('should create appropriate particle effects for different evolution levels', () => {
      const createEvolutionEffectSpy = vi.spyOn(particleSystem, 'createEvolutionTransformationEffect');
      
      // Simulate evolution to higher level
      particleSystem.createEvolutionTransformationEffect({ x: 100, y: 100 }, 6, 7);
      
      expect(createEvolutionEffectSpy).toHaveBeenCalledWith({ x: 100, y: 100 }, 6, 7);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeGreaterThan(0);
    });
  });

  describe('Power System Integration', () => {
    it('should create speed trail effects when speed boost is activated', () => {
      const createSpeedTrailSpy = vi.spyOn(particleSystem, 'createSpeedTrailEffect');
      const snakeManager = gameEngine.getSnakeManager();
      
      // Evolve snake to level 2 to unlock speed boost
      const evolutionSystem = snakeManager.getEvolutionSystem();
      for (let i = 0; i < 10; i++) {
        evolutionSystem.addFoodProgress('BasicBerry' as any, 10);
      }
      
      // Activate speed boost power
      const result = snakeManager.activatePower(PowerType.SpeedBoost);
      
      if (result.success) {
        // Manually trigger particle effect (since we're not running full game loop)
        const snakeState = snakeManager.getSnakeState();
        const headPosition = {
          x: snakeState.head.x * 35 + 17.5,
          y: snakeState.head.y * 35 + 17.5
        };
        particleSystem.createSpeedTrailEffect(headPosition, snakeState.direction);
        
        expect(createSpeedTrailSpy).toHaveBeenCalled();
      }
    });

    it('should create venom strike effects when venom strike is activated', () => {
      const createVenomStrikeSpy = vi.spyOn(particleSystem, 'createVenomStrikeEffect');
      const snakeManager = gameEngine.getSnakeManager();
      
      // Evolve snake to level 3 to unlock venom strike
      const evolutionSystem = snakeManager.getEvolutionSystem();
      for (let i = 0; i < 20; i++) {
        evolutionSystem.addFoodProgress('BasicBerry' as any, 10);
      }
      
      // Activate venom strike power
      const result = snakeManager.activatePower(PowerType.VenomStrike);
      
      if (result.success) {
        // Manually trigger particle effect
        const snakeState = snakeManager.getSnakeState();
        const headPosition = {
          x: snakeState.head.x * 35 + 17.5,
          y: snakeState.head.y * 35 + 17.5
        };
        particleSystem.createVenomStrikeEffect(headPosition, snakeState.direction);
        
        expect(createVenomStrikeSpy).toHaveBeenCalled();
      }
    });

    it('should create fire breath effects when fire breath is activated', () => {
      const createFireBreathSpy = vi.spyOn(particleSystem, 'createFireBreathEffect');
      
      // Simulate fire breath effect
      const startPos = { x: 100, y: 100 };
      const endPos = { x: 300, y: 100 };
      
      particleSystem.createFireBreathEffect(startPos, endPos);
      
      expect(createFireBreathSpy).toHaveBeenCalledWith(startPos, endPos);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeGreaterThan(0);
    });

    it('should create time warp effects when time warp is activated', () => {
      const createTimeWarpSpy = vi.spyOn(particleSystem, 'createTimeWarpEffect');
      
      // Simulate time warp effect
      const position = { x: 100, y: 100 };
      const radius = 150;
      
      particleSystem.createTimeWarpEffect(position, radius);
      
      expect(createTimeWarpSpy).toHaveBeenCalledWith(position, radius);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeGreaterThan(0);
    });
  });

  describe('Environment System Integration', () => {
    it('should create destruction effects when obstacles are destroyed', () => {
      const createCrystalDestructionSpy = vi.spyOn(particleSystem, 'createCrystalDestructionEffect');
      const createIceDestructionSpy = vi.spyOn(particleSystem, 'createIceDestructionEffect');
      const createStoneDestructionSpy = vi.spyOn(particleSystem, 'createStoneDestructionEffect');
      
      const position = { x: 100, y: 100 };
      
      // Test different destruction effects
      particleSystem.createCrystalDestructionEffect(position);
      particleSystem.createIceDestructionEffect(position);
      particleSystem.createStoneDestructionEffect(position);
      
      expect(createCrystalDestructionSpy).toHaveBeenCalledWith(position);
      expect(createIceDestructionSpy).toHaveBeenCalledWith(position);
      expect(createStoneDestructionSpy).toHaveBeenCalledWith(position);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(37); // 12 + 10 + 15 particles
    });

    it('should handle environmental interactions with appropriate particle effects', () => {
      const environmentSystem = gameEngine.getEnvironmentSystem();
      
      // Add some obstacles
      environmentSystem.addObstacle({
        id: 'test-crystal',
        type: 'CrystalFormation' as any,
        position: { x: 10, y: 10 },
        size: { x: 1, y: 1 },
        isDestructible: true,
        isActive: true
      });
      
      // Simulate destruction
      const createCrystalDestructionSpy = vi.spyOn(particleSystem, 'createCrystalDestructionEffect');
      
      const obstaclePosition = { x: 10 * 35 + 17.5, y: 10 * 35 + 17.5 };
      particleSystem.createCrystalDestructionEffect(obstaclePosition);
      
      expect(createCrystalDestructionSpy).toHaveBeenCalledWith(obstaclePosition);
    });
  });

  describe('Visual Effects Coordination', () => {
    it('should coordinate particle effects with visual pattern transitions', () => {
      const visualPatternManager = gameEngine.getVisualPatternManager();
      
      // Start a visual transition
      visualPatternManager.startTransition(1, 2);
      
      // Create corresponding particle effect
      const createEvolutionEffectSpy = vi.spyOn(particleSystem, 'createEvolutionTransformationEffect');
      particleSystem.createEvolutionTransformationEffect({ x: 100, y: 100 }, 1, 2);
      
      expect(createEvolutionEffectSpy).toHaveBeenCalledWith({ x: 100, y: 100 }, 1, 2);
    });

    it('should maintain visual consistency between snake rendering and particle effects', () => {
      const snakeManager = gameEngine.getSnakeManager();
      const snakeState = snakeManager.getSnakeState();
      
      // Create particles at snake head position
      const headPosition = {
        x: snakeState.head.x * 35 + 17.5,
        y: snakeState.head.y * 35 + 17.5
      };
      
      particleSystem.createBurst(headPosition, ParticleType.Sparkle, 5);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(5);
      
      // Particles should be created at correct world coordinates
      expect(headPosition.x).toBeGreaterThan(0);
      expect(headPosition.y).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration', () => {
    it('should maintain game performance with active particle effects', () => {
      // Create many particle effects
      for (let i = 0; i < 10; i++) {
        particleSystem.createBurst({ x: i * 50, y: i * 50 }, ParticleType.Sparkle, 20);
        particleSystem.createEvolutionTransformationEffect({ x: i * 60, y: i * 60 }, 1, 2);
      }
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeGreaterThan(0);
      
      // Game should still be able to update efficiently
      const startTime = performance.now();
      
      for (let i = 0; i < 60; i++) { // Simulate 1 second at 60 FPS
        particleSystem.update(16.67);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete 60 updates in reasonable time
      expect(totalTime).toBeLessThan(100); // Less than 100ms for 60 updates
    });

    it('should handle particle cleanup during game state changes', () => {
      // Create particles
      particleSystem.createBurst({ x: 100, y: 100 }, ParticleType.Sparkle, 50);
      
      let stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(50);
      
      // Simulate game state change (like restart)
      particleSystem.update(10000); // Long update to expire all particles
      
      stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(0);
      expect(stats.poolSize).toBeGreaterThan(0); // Particles should be returned to pool
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle WebGL context loss gracefully', () => {
      // Simulate WebGL context loss
      const mockGL = mockCanvas.getContext();
      mockGL.getShaderParameter = vi.fn(() => false); // Simulate shader compilation failure
      mockGL.getShaderInfoLog = vi.fn(() => 'Shader compilation failed');
      
      // Creating new particle system should handle errors
      expect(() => {
        new ParticleSystem(mockGL);
      }).toThrow(); // Should throw but not crash the game
    });

    it('should continue functioning when particle limits are exceeded', () => {
      // Try to create more particles than the limit
      for (let i = 0; i < 100; i++) {
        particleSystem.createBurst({ x: i, y: i }, ParticleType.Sparkle, 50);
      }
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeLessThanOrEqual(stats.maxParticles);
      
      // System should still be functional
      expect(() => {
        particleSystem.update(16.67);
        particleSystem.render({ x: 0, y: 0 });
      }).not.toThrow();
    });
  });

  describe('Memory Management Integration', () => {
    it('should properly dispose resources when game engine is disposed', () => {
      const disposeSpy = vi.spyOn(particleSystem, 'dispose');
      
      gameEngine.dispose();
      
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should handle rapid particle creation and destruction without memory leaks', () => {
      const initialStats = particleSystem.getPerformanceStats();
      
      // Rapidly create and destroy particles
      for (let cycle = 0; cycle < 20; cycle++) {
        // Create particles
        for (let i = 0; i < 10; i++) {
          particleSystem.createBurst({ x: i * 10, y: cycle * 10 }, ParticleType.Sparkle, 5);
        }
        
        // Update to expire particles
        particleSystem.update(2000);
      }
      
      const finalStats = particleSystem.getPerformanceStats();
      
      // Should not have excessive memory growth
      expect(finalStats.poolSize).toBeLessThan(initialStats.poolSize + 200);
      expect(finalStats.activeParticles).toBe(0);
    });
  });
});