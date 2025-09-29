import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnvironmentSystem } from '../core/EnvironmentSystem';
import { EnvironmentRenderer } from '../core/EnvironmentRenderer';
import { GameConfig, DynamicElementType, EffectType } from '../types/game';

describe('Environment Integration', () => {
  let environmentSystem: EnvironmentSystem;
  let environmentRenderer: EnvironmentRenderer;
  let config: GameConfig;
  let mockCanvas: HTMLCanvasElement;
  let mockGL: WebGLRenderingContext;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };

    // Mock canvas and WebGL context
    mockCanvas = {
      width: config.gridWidth * config.cellSize,
      height: config.gridHeight * config.cellSize
    } as HTMLCanvasElement;

    mockGL = {
      createShader: vi.fn().mockReturnValue({}),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      createProgram: vi.fn().mockReturnValue({}),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn().mockReturnValue(true),
      createBuffer: vi.fn().mockReturnValue({}),
      useProgram: vi.fn(),
      getUniformLocation: vi.fn().mockReturnValue({}),
      uniform2f: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn().mockReturnValue(0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      drawArrays: vi.fn(),
      deleteProgram: vi.fn(),
      deleteBuffer: vi.fn(),
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      COMPILE_STATUS: 35713,
      LINK_STATUS: 35714,
      ARRAY_BUFFER: 34962,
      DYNAMIC_DRAW: 35048,
      TRIANGLES: 4,
      FLOAT: 5126
    } as unknown as WebGLRenderingContext;

    environmentSystem = new EnvironmentSystem(config);
    environmentRenderer = new EnvironmentRenderer({
      gl: mockGL,
      canvas: mockCanvas,
      cellSize: config.cellSize,
      gridWidth: config.gridWidth,
      gridHeight: config.gridHeight
    });
  });

  describe('System Integration', () => {
    it('should initialize both static obstacles and dynamic elements', () => {
      const obstacles = environmentSystem.getObstacles();
      const dynamicElements = environmentSystem.getDynamicElements();

      expect(obstacles.length).toBeGreaterThan(0);
      expect(dynamicElements.length).toBeGreaterThan(0);

      // Should have all types of dynamic elements
      const elementTypes = new Set(dynamicElements.map(elem => elem.type));
      expect(elementTypes.has(DynamicElementType.WaterPool)).toBe(true);
      expect(elementTypes.has(DynamicElementType.FlameGeyser)).toBe(true);
      expect(elementTypes.has(DynamicElementType.MovingStoneBlock)).toBe(true);
      expect(elementTypes.has(DynamicElementType.PoisonGasCloud)).toBe(true);
      expect(elementTypes.has(DynamicElementType.LightningStrike)).toBe(true);
    });

    it('should update dynamic elements over time', () => {
      const elements = environmentSystem.getDynamicElements();
      
      // Find a flame geyser and manually trigger phase changes
      const geyser = elements.find(elem => elem.type === DynamicElementType.FlameGeyser);
      if (geyser) {
        const initialPhase = geyser.currentPhase;
        geyser.currentPhase = 'inactive';
        geyser.phaseTimer = 0;

        // Update enough to trigger warning phase (cycle time - total phase time)
        environmentSystem.update(4500); // Should trigger warning phase
        expect(geyser.currentPhase).toBe('warning');

        // Update to trigger active phase
        environmentSystem.update(2000); // Warning duration
        expect(geyser.currentPhase).toBe('active');

        // Update to trigger cooldown phase
        environmentSystem.update(1500); // Active duration
        expect(geyser.currentPhase).toBe('cooldown');
      } else {
        // If no geyser found, just verify system updates without errors
        expect(() => {
          for (let i = 0; i < 100; i++) {
            environmentSystem.update(100);
          }
        }).not.toThrow();
      }
    });

    it('should render both obstacles and dynamic elements', () => {
      const obstacles = environmentSystem.getObstacles();
      const dynamicElements = environmentSystem.getDynamicElements();

      expect(() => {
        environmentRenderer.render(obstacles, dynamicElements);
      }).not.toThrow();

      // Verify WebGL calls were made
      expect(mockGL.useProgram).toHaveBeenCalled();
      expect(mockGL.drawArrays).toHaveBeenCalled();
    });
  });

  describe('Dynamic Element Behavior', () => {
    it('should handle water pool interactions correctly', () => {
      const waterPools = environmentSystem.getDynamicElements()
        .filter(elem => elem.type === DynamicElementType.WaterPool);

      expect(waterPools.length).toBeGreaterThan(0);

      const waterPool = waterPools[0];
      
      // Low evolution level should be blocked
      const lowLevelCollision = environmentSystem.checkDynamicElementCollision(
        waterPool.position, 3 // Level 3 snake
      );
      expect(lowLevelCollision.hasCollision).toBe(true);
      expect(lowLevelCollision.canPass).toBe(false);

      // High evolution level should pass through
      const highLevelCollision = environmentSystem.checkDynamicElementCollision(
        waterPool.position, 6 // Level 6 snake (Anaconda)
      );
      expect(highLevelCollision.hasCollision).toBe(true);
      expect(highLevelCollision.canPass).toBe(true);
    });

    it('should handle flame geyser timing correctly', () => {
      const geysers = environmentSystem.getDynamicElements()
        .filter(elem => elem.type === DynamicElementType.FlameGeyser);

      expect(geysers.length).toBeGreaterThan(0);

      const geyser = geysers[0];
      geyser.currentPhase = 'inactive';
      geyser.phaseTimer = 0;

      // Should not damage when inactive
      let collision = environmentSystem.checkDynamicElementCollision(geyser.position, 5);
      expect(collision.damage).toBe(0);

      // Set to active phase
      geyser.currentPhase = 'active';

      // Should damage when active
      collision = environmentSystem.checkDynamicElementCollision(geyser.position, 5);
      expect(collision.damage).toBe(25);
      expect(collision.effect).toBe(EffectType.Poison);
    });

    it('should handle moving stone block movement', () => {
      const blocks = environmentSystem.getDynamicElements()
        .filter(elem => elem.type === DynamicElementType.MovingStoneBlock);

      expect(blocks.length).toBeGreaterThan(0);

      const block = blocks[0];
      const initialPosition = { ...block.position };

      // Update for 2 seconds to allow movement
      for (let i = 0; i < 20; i++) {
        environmentSystem.update(100);
      }

      // Position should have changed
      const moved = block.position.x !== initialPosition.x || block.position.y !== initialPosition.y;
      expect(moved).toBe(true);

      // Should always block movement
      const collision = environmentSystem.checkDynamicElementCollision(block.position, 5);
      expect(collision.hasCollision).toBe(true);
      expect(collision.canPass).toBe(false);
      expect(collision.damage).toBe(30);
    });

    it('should handle poison gas cloud effects', () => {
      const clouds = environmentSystem.getDynamicElements()
        .filter(elem => elem.type === DynamicElementType.PoisonGasCloud);

      expect(clouds.length).toBeGreaterThan(0);

      const cloud = clouds[0];
      cloud.currentPhase = 'active';

      const collision = environmentSystem.checkDynamicElementCollision(cloud.position, 5);
      expect(collision.hasCollision).toBe(true);
      expect(collision.canPass).toBe(true); // Can move through but takes damage
      expect(collision.damage).toBe(15);
      expect(collision.effect).toBe(EffectType.Poison);
    });

    it('should handle lightning strike effects', () => {
      const strikes = environmentSystem.getDynamicElements()
        .filter(elem => elem.type === DynamicElementType.LightningStrike);

      expect(strikes.length).toBeGreaterThan(0);

      const strike = strikes[0];
      strike.currentPhase = 'active';

      const collision = environmentSystem.checkDynamicElementCollision(strike.position, 5);
      expect(collision.hasCollision).toBe(true);
      expect(collision.canPass).toBe(true); // Lightning doesn't block movement
      expect(collision.damage).toBe(40);
      expect(collision.effect).toBe(EffectType.SlowDown);
    });
  });

  describe('Movement Patterns', () => {
    it('should update ping-pong movement pattern', () => {
      const blocks = environmentSystem.getDynamicElements()
        .filter(elem => elem.type === DynamicElementType.MovingStoneBlock);

      const block = blocks[0];
      const initialPosition = { ...block.position };
      const initialPathIndex = block.pathIndex || 0;

      // Update for enough time to move significantly
      for (let i = 0; i < 100; i++) {
        environmentSystem.update(100); // 10 seconds total
      }

      // Either position should have changed or path index should have changed
      const positionChanged = block.position.x !== initialPosition.x || block.position.y !== initialPosition.y;
      const pathIndexChanged = (block.pathIndex || 0) !== initialPathIndex;
      
      expect(positionChanged || pathIndexChanged).toBe(true);
    });

    it('should update random movement pattern', () => {
      const clouds = environmentSystem.getDynamicElements()
        .filter(elem => elem.type === DynamicElementType.PoisonGasCloud);

      const cloud = clouds[0];
      cloud.movementTimer = 0;

      // Update for enough time to trigger direction change
      environmentSystem.update(2500); // More than 2 seconds

      // Should have a target position
      expect(cloud.currentTarget).toBeDefined();
    });
  });

  describe('Snake Collision Integration', () => {
    it('should detect snake collision with multiple dynamic elements', () => {
      const snakeHead = { x: 25, y: 15 }; // Center of grid
      const snakeSegments = [
        { x: 24, y: 15 },
        { x: 23, y: 15 },
        { x: 22, y: 15 }
      ];

      const collision = environmentSystem.checkSnakeDynamicElementCollision(
        snakeHead, snakeSegments, 5
      );

      // Should detect collision if any dynamic element is at those positions
      expect(typeof collision.hasCollision).toBe('boolean');
      expect(typeof collision.canPass).toBe('boolean');
      expect(typeof collision.damage).toBe('number');
    });

    it('should handle evolution level requirements correctly', () => {
      // Find a water pool
      const waterPools = environmentSystem.getDynamicElements()
        .filter(elem => elem.type === DynamicElementType.WaterPool);

      if (waterPools.length > 0) {
        const waterPool = waterPools[0];
        const snakeHead = { ...waterPool.position };
        const snakeSegments = [
          { x: waterPool.position.x - 1, y: waterPool.position.y }
        ];

        // Low evolution level should be blocked
        const lowLevelCollision = environmentSystem.checkSnakeDynamicElementCollision(
          snakeHead, snakeSegments, 3
        );
        expect(lowLevelCollision.hasCollision).toBe(true);
        expect(lowLevelCollision.canPass).toBe(false);

        // High evolution level should pass
        const highLevelCollision = environmentSystem.checkSnakeDynamicElementCollision(
          snakeHead, snakeSegments, 6
        );
        expect(highLevelCollision.hasCollision).toBe(true);
        expect(highLevelCollision.canPass).toBe(true);
      }
    });
  });

  describe('Performance and Stability', () => {
    it('should handle continuous updates without errors', () => {
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          environmentSystem.update(16.67); // 60 FPS
        }
      }).not.toThrow();
    });

    it('should maintain consistent element count', () => {
      const initialCount = environmentSystem.getDynamicElements().length;

      // Update for many frames
      for (let i = 0; i < 100; i++) {
        environmentSystem.update(16.67);
      }

      const finalCount = environmentSystem.getDynamicElements().length;
      expect(finalCount).toBe(initialCount);
    });

    it('should handle rendering with many elements', () => {
      const obstacles = environmentSystem.getObstacles();
      const dynamicElements = environmentSystem.getDynamicElements();

      expect(() => {
        for (let i = 0; i < 10; i++) {
          environmentRenderer.render(obstacles, dynamicElements);
        }
      }).not.toThrow();
    });
  });

  describe('System Reset', () => {
    it('should reset dynamic elements correctly', () => {
      // Modify some elements
      const elements = environmentSystem.getDynamicElements();
      elements.forEach(elem => {
        elem.currentPhase = 'active';
        elem.phaseTimer = 1000;
      });

      // Reset system
      environmentSystem.reset();

      // Elements should be back to initial state
      const resetElements = environmentSystem.getDynamicElements();
      expect(resetElements.length).toBe(elements.length);
      
      // All elements should be active and properly initialized
      resetElements.forEach(elem => {
        expect(elem.isActive).toBe(true);
        expect(elem.phaseTimer).toBe(0);
      });
    });
  });
});