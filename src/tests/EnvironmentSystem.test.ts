import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnvironmentSystem } from '../core/EnvironmentSystem';
import { GameConfig, ObstacleType, Vector2, DynamicElementType, EffectType } from '../types/game';

describe('EnvironmentSystem', () => {
  let environmentSystem: EnvironmentSystem;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    environmentSystem = new EnvironmentSystem(config);
  });

  describe('Initialization', () => {
    it('should initialize with basic obstacles', () => {
      const obstacles = environmentSystem.getObstacles();
      expect(obstacles.length).toBeGreaterThan(0);
      
      // Check that we have different types of obstacles
      const obstacleTypes = new Set(obstacles.map(obs => obs.type));
      expect(obstacleTypes.has(ObstacleType.StonePillar)).toBe(true);
      expect(obstacleTypes.has(ObstacleType.CrystalFormation)).toBe(true);
      expect(obstacleTypes.has(ObstacleType.IceWall)).toBe(true);
    });

    it('should create obstacles with correct properties', () => {
      const obstacles = environmentSystem.getObstacles();
      
      obstacles.forEach(obstacle => {
        expect(obstacle.id).toBeDefined();
        expect(obstacle.type).toBeDefined();
        expect(obstacle.position).toBeDefined();
        expect(obstacle.size).toBeDefined();
        expect(typeof obstacle.isDestructible).toBe('boolean');
        expect(obstacle.isActive).toBe(true);
        // Only check health if the obstacle has health defined
        if (obstacle.health !== undefined) {
          expect(obstacle.health).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Obstacle Collision Detection', () => {
    it('should detect collision with stone pillar', () => {
      // Add a stone pillar at a known position
      environmentSystem.addObstacle({
        id: 'test_pillar',
        type: ObstacleType.StonePillar,
        position: { x: 10, y: 10 },
        size: { x: 1, y: 1 },
        isDestructible: false,
        isActive: true,
        health: 100
      });

      const collision = environmentSystem.checkObstacleCollision({ x: 10, y: 10 });
      expect(collision.hasCollision).toBe(true);
      expect(collision.obstacle?.type).toBe(ObstacleType.StonePillar);
    });

    it('should not detect collision when no obstacle present', () => {
      const collision = environmentSystem.checkObstacleCollision({ x: 1, y: 1 });
      expect(collision.hasCollision).toBe(false);
      expect(collision.obstacle).toBeUndefined();
    });

    it('should detect collision with multi-cell obstacle', () => {
      environmentSystem.addObstacle({
        id: 'test_large_obstacle',
        type: ObstacleType.IceWall,
        position: { x: 15, y: 15 },
        size: { x: 2, y: 2 },
        isDestructible: true,
        isActive: true,
        health: 50
      });

      // Test all four cells of the 2x2 obstacle
      expect(environmentSystem.checkObstacleCollision({ x: 15, y: 15 }).hasCollision).toBe(true);
      expect(environmentSystem.checkObstacleCollision({ x: 16, y: 15 }).hasCollision).toBe(true);
      expect(environmentSystem.checkObstacleCollision({ x: 15, y: 16 }).hasCollision).toBe(true);
      expect(environmentSystem.checkObstacleCollision({ x: 16, y: 16 }).hasCollision).toBe(true);
      
      // Test adjacent cells should not collide
      expect(environmentSystem.checkObstacleCollision({ x: 14, y: 15 }).hasCollision).toBe(false);
      expect(environmentSystem.checkObstacleCollision({ x: 17, y: 15 }).hasCollision).toBe(false);
    });
  });

  describe('Snake Collision Detection', () => {
    it('should detect snake head collision with obstacle', () => {
      environmentSystem.addObstacle({
        id: 'test_head_collision',
        type: ObstacleType.CrystalFormation,
        position: { x: 20, y: 20 },
        size: { x: 1, y: 1 },
        isDestructible: true,
        isActive: true,
        health: 50
      });

      const snakeHead = { x: 20, y: 20 };
      const snakeSegments = [{ x: 19, y: 20 }, { x: 18, y: 20 }];

      const collision = environmentSystem.checkSnakeObstacleCollision(snakeHead, snakeSegments);
      expect(collision.hasCollision).toBe(true);
      expect(collision.obstacle?.type).toBe(ObstacleType.CrystalFormation);
    });

    it('should detect snake body collision with obstacle', () => {
      environmentSystem.addObstacle({
        id: 'test_body_collision',
        type: ObstacleType.IceWall,
        position: { x: 19, y: 20 },
        size: { x: 1, y: 1 },
        isDestructible: true,
        isActive: true,
        health: 30
      });

      const snakeHead = { x: 21, y: 20 };
      const snakeSegments = [{ x: 20, y: 20 }, { x: 19, y: 20 }, { x: 18, y: 20 }];

      const collision = environmentSystem.checkSnakeObstacleCollision(snakeHead, snakeSegments);
      expect(collision.hasCollision).toBe(true);
      expect(collision.obstacle?.type).toBe(ObstacleType.IceWall);
    });

    it('should not detect collision when snake avoids obstacles', () => {
      environmentSystem.addObstacle({
        id: 'test_no_collision',
        type: ObstacleType.StonePillar,
        position: { x: 25, y: 25 },
        size: { x: 1, y: 1 },
        isDestructible: false,
        isActive: true,
        health: 100
      });

      const snakeHead = { x: 20, y: 20 };
      const snakeSegments = [{ x: 19, y: 20 }, { x: 18, y: 20 }];

      const collision = environmentSystem.checkSnakeObstacleCollision(snakeHead, snakeSegments);
      expect(collision.hasCollision).toBe(false);
    });
  });

  describe('Obstacle Destruction', () => {
    it('should destroy destructible obstacle with correct power', () => {
      environmentSystem.addObstacle({
        id: 'test_destructible',
        type: ObstacleType.CrystalFormation,
        position: { x: 30, y: 30 },
        size: { x: 1, y: 1 },
        isDestructible: true,
        requiredPower: 'VenomStrike',
        isActive: true,
        health: 50
      });

      const destroyed = environmentSystem.destroyObstacle('test_destructible', 'VenomStrike');
      expect(destroyed).toBe(true);

      const obstacle = environmentSystem.getObstacleById('test_destructible');
      expect(obstacle).toBeUndefined(); // Should be filtered out as inactive
    });

    it('should not destroy obstacle with wrong power', () => {
      environmentSystem.addObstacle({
        id: 'test_wrong_power',
        type: ObstacleType.IceWall,
        position: { x: 30, y: 30 },
        size: { x: 1, y: 1 },
        isDestructible: true,
        requiredPower: 'FireBreath',
        isActive: true,
        health: 30
      });

      const destroyed = environmentSystem.destroyObstacle('test_wrong_power', 'VenomStrike');
      expect(destroyed).toBe(false);

      const obstacle = environmentSystem.getObstacleById('test_wrong_power');
      expect(obstacle).toBeDefined();
      expect(obstacle?.isActive).toBe(true);
    });

    it('should not destroy indestructible obstacle', () => {
      environmentSystem.addObstacle({
        id: 'test_indestructible',
        type: ObstacleType.StonePillar,
        position: { x: 30, y: 30 },
        size: { x: 1, y: 1 },
        isDestructible: false,
        isActive: true,
        health: 100
      });

      const destroyed = environmentSystem.destroyObstacle('test_indestructible', 'FireBreath');
      expect(destroyed).toBe(false);

      const obstacle = environmentSystem.getObstacleById('test_indestructible');
      expect(obstacle).toBeDefined();
      expect(obstacle?.isActive).toBe(true);
    });
  });

  describe('Obstacle Damage', () => {
    it('should damage obstacle with correct power', () => {
      environmentSystem.addObstacle({
        id: 'test_damage',
        type: ObstacleType.CrystalFormation,
        position: { x: 35, y: 35 },
        size: { x: 1, y: 1 },
        isDestructible: true,
        requiredPower: 'VenomStrike',
        isActive: true,
        health: 50
      });

      const damaged = environmentSystem.damageObstacle('test_damage', 20, 'VenomStrike');
      expect(damaged).toBe(true);

      const obstacle = environmentSystem.getObstacleById('test_damage');
      expect(obstacle?.health).toBe(30);
      expect(obstacle?.isActive).toBe(true);
    });

    it('should destroy obstacle when health reaches zero', () => {
      environmentSystem.addObstacle({
        id: 'test_destroy_by_damage',
        type: ObstacleType.IceWall,
        position: { x: 35, y: 35 },
        size: { x: 1, y: 1 },
        isDestructible: true,
        requiredPower: 'FireBreath',
        isActive: true,
        health: 20
      });

      const damaged = environmentSystem.damageObstacle('test_destroy_by_damage', 25, 'FireBreath');
      expect(damaged).toBe(true);

      const obstacle = environmentSystem.getObstacleById('test_destroy_by_damage');
      expect(obstacle).toBeUndefined(); // Should be filtered out as inactive
    });
  });

  describe('Obstacle Queries', () => {
    beforeEach(() => {
      environmentSystem.clearObstacles();
      
      // Add test obstacles
      environmentSystem.addObstacle({
        id: 'query_test_1',
        type: ObstacleType.StonePillar,
        position: { x: 10, y: 10 },
        size: { x: 1, y: 1 },
        isDestructible: false,
        isActive: true,
        health: 100
      });

      environmentSystem.addObstacle({
        id: 'query_test_2',
        type: ObstacleType.CrystalFormation,
        position: { x: 12, y: 12 },
        size: { x: 2, y: 2 },
        isDestructible: true,
        isActive: true,
        health: 50
      });
    });

    it('should get obstacle by ID', () => {
      const obstacle = environmentSystem.getObstacleById('query_test_1');
      expect(obstacle).toBeDefined();
      expect(obstacle?.type).toBe(ObstacleType.StonePillar);
    });

    it('should get obstacle at position', () => {
      const obstacle = environmentSystem.getObstacleAt({ x: 10, y: 10 });
      expect(obstacle).toBeDefined();
      expect(obstacle?.id).toBe('query_test_1');
    });

    it('should get obstacles in area', () => {
      const obstacles = environmentSystem.getObstaclesInArea(
        { x: 9, y: 9 },
        { x: 15, y: 15 }
      );
      expect(obstacles.length).toBe(2);
    });

    it('should not find obstacles outside area', () => {
      const obstacles = environmentSystem.getObstaclesInArea(
        { x: 0, y: 0 },
        { x: 5, y: 5 }
      );
      expect(obstacles.length).toBe(0);
    });
  });

  describe('System Management', () => {
    it('should update system without errors', () => {
      expect(() => {
        environmentSystem.update(16.67); // ~60 FPS delta time
      }).not.toThrow();
    });

    it('should reset system to initial state', () => {
      environmentSystem.clearObstacles();
      expect(environmentSystem.getObstacles().length).toBe(0);

      environmentSystem.reset();
      expect(environmentSystem.getObstacles().length).toBeGreaterThan(0);
    });

    it('should add and remove obstacles', () => {
      const initialCount = environmentSystem.getObstacles().length;

      environmentSystem.addObstacle({
        id: 'test_add_remove',
        type: ObstacleType.StonePillar,
        position: { x: 40, y: 40 },
        size: { x: 1, y: 1 },
        isDestructible: false,
        isActive: true,
        health: 100
      });

      expect(environmentSystem.getObstacles().length).toBe(initialCount + 1);

      const removed = environmentSystem.removeObstacle('test_add_remove');
      expect(removed).toBe(true);
      expect(environmentSystem.getObstacles().length).toBe(initialCount);
    });

    it('should get environment state', () => {
      const state = environmentSystem.getEnvironmentState();
      expect(state.obstacles).toBeDefined();
      expect(state.dynamicElements).toBeDefined();
      expect(state.interactiveFeatures).toBeDefined();
      expect(Array.isArray(state.obstacles)).toBe(true);
    });
  });

  describe('Obstacle Types and Properties', () => {
    it('should create stone pillars with correct properties', () => {
      const obstacles = environmentSystem.getObstacles();
      const stonePillars = obstacles.filter(obs => obs.type === ObstacleType.StonePillar);
      
      expect(stonePillars.length).toBeGreaterThan(0);
      stonePillars.forEach(pillar => {
        expect(pillar.isDestructible).toBe(false);
        expect(pillar.health).toBe(100);
        expect(pillar.size.x).toBe(1);
        expect(pillar.size.y).toBe(1);
      });
    });

    it('should create crystal formations with correct properties', () => {
      const obstacles = environmentSystem.getObstacles();
      const crystals = obstacles.filter(obs => obs.type === ObstacleType.CrystalFormation);
      
      expect(crystals.length).toBeGreaterThan(0);
      crystals.forEach(crystal => {
        expect(crystal.isDestructible).toBe(true);
        expect(crystal.requiredPower).toBe('VenomStrike');
        expect(crystal.health).toBe(50);
      });
    });

    it('should create ice walls with correct properties', () => {
      const obstacles = environmentSystem.getObstacles();
      const iceWalls = obstacles.filter(obs => obs.type === ObstacleType.IceWall);
      
      expect(iceWalls.length).toBeGreaterThan(0);
      iceWalls.forEach(wall => {
        expect(wall.isDestructible).toBe(true);
        expect(wall.requiredPower).toBe('FireBreath');
        expect(wall.health).toBe(30);
      });
    });
  });

  describe('Dynamic Elements', () => {
    describe('Initialization', () => {
      it('should initialize with dynamic elements', () => {
        const elements = environmentSystem.getDynamicElements();
        expect(elements.length).toBeGreaterThan(0);
        
        // Check that we have different types of dynamic elements
        const elementTypes = new Set(elements.map(elem => elem.type));
        expect(elementTypes.has(DynamicElementType.WaterPool)).toBe(true);
        expect(elementTypes.has(DynamicElementType.FlameGeyser)).toBe(true);
        expect(elementTypes.has(DynamicElementType.MovingStoneBlock)).toBe(true);
        expect(elementTypes.has(DynamicElementType.PoisonGasCloud)).toBe(true);
        expect(elementTypes.has(DynamicElementType.LightningStrike)).toBe(true);
      });

      it('should create dynamic elements with correct properties', () => {
        const elements = environmentSystem.getDynamicElements();
        
        elements.forEach(element => {
          expect(element.id).toBeDefined();
          expect(element.type).toBeDefined();
          expect(element.position).toBeDefined();
          expect(element.size).toBeDefined();
          expect(element.isActive).toBe(true);
          expect(typeof element.damage).toBe('number');
          expect(element.currentPhase).toBeDefined();
          expect(typeof element.phaseTimer).toBe('number');
        });
      });
    });

    describe('Water Pools', () => {
      it('should create water pools with correct properties', () => {
        const elements = environmentSystem.getDynamicElements();
        const waterPools = elements.filter(elem => elem.type === DynamicElementType.WaterPool);
        
        expect(waterPools.length).toBeGreaterThan(0);
        waterPools.forEach(pool => {
          expect(pool.damage).toBe(0); // Water doesn't damage
          expect(pool.requiredEvolutionLevel).toBe(6); // Anaconda level
          expect(pool.duration).toBe(-1); // Permanent
          expect(pool.currentPhase).toBe('active');
        });
      });

      it('should block movement for low evolution levels', () => {
        const collision = environmentSystem.checkDynamicElementCollision({ x: 8, y: 8 }, 3); // Level 3 snake
        expect(collision.hasCollision).toBe(true);
        expect(collision.canPass).toBe(false);
        expect(collision.damage).toBe(0);
      });

      it('should allow movement for Anaconda level (6+)', () => {
        const collision = environmentSystem.checkDynamicElementCollision({ x: 8, y: 8 }, 6); // Level 6 snake
        expect(collision.hasCollision).toBe(true);
        expect(collision.canPass).toBe(true);
        expect(collision.damage).toBe(0);
      });
    });

    describe('Flame Geysers', () => {
      it('should create flame geysers with correct properties', () => {
        const elements = environmentSystem.getDynamicElements();
        const geysers = elements.filter(elem => elem.type === DynamicElementType.FlameGeyser);
        
        expect(geysers.length).toBeGreaterThan(0);
        geysers.forEach(geyser => {
          expect(geyser.damage).toBe(25);
          expect(geyser.activationTime).toBe(2000); // 2 second warning
          expect(geyser.duration).toBe(1500); // 1.5 seconds active
          expect(geyser.cooldownTime).toBe(4000); // 4 seconds cooldown
          expect(geyser.triggerCondition?.type).toBe('timer');
        });
      });

      it('should not damage during inactive phase', () => {
        // Find a flame geyser and set it to inactive
        const elements = environmentSystem.getDynamicElements();
        const geyser = elements.find(elem => elem.type === DynamicElementType.FlameGeyser);
        if (geyser) {
          geyser.currentPhase = 'inactive';
          
          const collision = environmentSystem.checkDynamicElementCollision(geyser.position, 5);
          expect(collision.hasCollision).toBe(true);
          expect(collision.damage).toBe(0);
        }
      });

      it('should damage during active phase', () => {
        // Find a flame geyser and set it to active
        const elements = environmentSystem.getDynamicElements();
        const geyser = elements.find(elem => elem.type === DynamicElementType.FlameGeyser);
        if (geyser) {
          geyser.currentPhase = 'active';
          
          const collision = environmentSystem.checkDynamicElementCollision(geyser.position, 5);
          expect(collision.hasCollision).toBe(true);
          expect(collision.damage).toBe(25);
          expect(collision.effect).toBe(EffectType.Poison); // Burn effect
        }
      });
    });

    describe('Moving Stone Blocks', () => {
      it('should create moving stone blocks with correct properties', () => {
        const elements = environmentSystem.getDynamicElements();
        const blocks = elements.filter(elem => elem.type === DynamicElementType.MovingStoneBlock);
        
        expect(blocks.length).toBeGreaterThan(0);
        blocks.forEach(block => {
          expect(block.damage).toBe(30);
          expect(block.size.x).toBe(2);
          expect(block.size.y).toBe(2);
          expect(block.movementPattern?.type).toBe('PingPong');
          expect(block.movementPattern?.speed).toBe(0.5);
          expect(block.movementPattern?.path).toBeDefined();
        });
      });

      it('should always block movement and cause damage', () => {
        const elements = environmentSystem.getDynamicElements();
        const block = elements.find(elem => elem.type === DynamicElementType.MovingStoneBlock);
        if (block) {
          const collision = environmentSystem.checkDynamicElementCollision(block.position, 5);
          expect(collision.hasCollision).toBe(true);
          expect(collision.canPass).toBe(false);
          expect(collision.damage).toBe(30);
        }
      });
    });

    describe('Poison Gas Clouds', () => {
      it('should create poison gas clouds with correct properties', () => {
        const elements = environmentSystem.getDynamicElements();
        const clouds = elements.filter(elem => elem.type === DynamicElementType.PoisonGasCloud);
        
        expect(clouds.length).toBeGreaterThan(0);
        clouds.forEach(cloud => {
          expect(cloud.damage).toBe(15);
          expect(cloud.size.x).toBe(3);
          expect(cloud.size.y).toBe(3);
          expect(cloud.activationTime).toBe(1000); // 1 second warning
          expect(cloud.duration).toBe(3000); // 3 seconds active
          expect(cloud.movementPattern?.type).toBe('Random');
        });
      });

      it('should allow movement but cause damage when active', () => {
        const elements = environmentSystem.getDynamicElements();
        const cloud = elements.find(elem => elem.type === DynamicElementType.PoisonGasCloud);
        if (cloud) {
          cloud.currentPhase = 'active';
          
          const collision = environmentSystem.checkDynamicElementCollision(cloud.position, 5);
          expect(collision.hasCollision).toBe(true);
          expect(collision.canPass).toBe(true);
          expect(collision.damage).toBe(15);
          expect(collision.effect).toBe(EffectType.Poison);
        }
      });
    });

    describe('Lightning Strikes', () => {
      it('should create lightning strikes with correct properties', () => {
        const elements = environmentSystem.getDynamicElements();
        const strikes = elements.filter(elem => elem.type === DynamicElementType.LightningStrike);
        
        expect(strikes.length).toBeGreaterThan(0);
        strikes.forEach(strike => {
          expect(strike.damage).toBe(40);
          expect(strike.size.x).toBe(1);
          expect(strike.size.y).toBe(1);
          expect(strike.activationTime).toBe(500); // 0.5 second warning
          expect(strike.duration).toBe(200); // 0.2 seconds active
          expect(strike.cooldownTime).toBe(8000); // 8 seconds cooldown
        });
      });

      it('should allow movement but cause damage when active', () => {
        const elements = environmentSystem.getDynamicElements();
        const strike = elements.find(elem => elem.type === DynamicElementType.LightningStrike);
        if (strike) {
          strike.currentPhase = 'active';
          
          const collision = environmentSystem.checkDynamicElementCollision(strike.position, 5);
          expect(collision.hasCollision).toBe(true);
          expect(collision.canPass).toBe(true);
          expect(collision.damage).toBe(40);
          expect(collision.effect).toBe(EffectType.SlowDown);
        }
      });
    });

    describe('Phase Management', () => {
      beforeEach(() => {
        // Mock Date.now for consistent timing tests
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should transition from inactive to warning phase', () => {
        const elements = environmentSystem.getDynamicElements();
        const geyser = elements.find(elem => elem.type === DynamicElementType.FlameGeyser);
        if (geyser) {
          geyser.currentPhase = 'inactive';
          geyser.lastActivation = 0;
          geyser.phaseTimer = 0;
          
          // Advance time to trigger warning phase
          vi.advanceTimersByTime(4500); // Just before activation time
          environmentSystem.update(16.67);
          
          expect(geyser.currentPhase).toBe('warning');
        }
      });

      it('should transition from warning to active phase', () => {
        const elements = environmentSystem.getDynamicElements();
        const geyser = elements.find(elem => elem.type === DynamicElementType.FlameGeyser);
        if (geyser) {
          geyser.currentPhase = 'warning';
          geyser.phaseTimer = 0;
          
          // Advance time to complete warning phase
          environmentSystem.update(2000); // Warning duration
          
          expect(geyser.currentPhase).toBe('active');
        }
      });

      it('should transition from active to cooldown phase', () => {
        const elements = environmentSystem.getDynamicElements();
        const geyser = elements.find(elem => elem.type === DynamicElementType.FlameGeyser);
        if (geyser) {
          geyser.currentPhase = 'active';
          geyser.phaseTimer = 0;
          
          // Advance time to complete active phase
          environmentSystem.update(1500); // Active duration
          
          expect(geyser.currentPhase).toBe('cooldown');
        }
      });
    });

    describe('Movement Patterns', () => {
      it('should update ping-pong movement correctly', () => {
        const elements = environmentSystem.getDynamicElements();
        const block = elements.find(elem => elem.type === DynamicElementType.MovingStoneBlock);
        if (block && block.movementPattern?.path) {
          const initialPosition = { ...block.position };
          const targetPosition = block.currentTarget;
          
          // Update movement for 1 second
          environmentSystem.update(1000);
          
          // Position should have changed toward target
          const moved = block.position.x !== initialPosition.x || block.position.y !== initialPosition.y;
          expect(moved).toBe(true);
        }
      });

      it('should update random movement correctly', () => {
        const elements = environmentSystem.getDynamicElements();
        const cloud = elements.find(elem => elem.type === DynamicElementType.PoisonGasCloud);
        if (cloud && cloud.movementPattern?.type === 'Random') {
          const initialPosition = { ...cloud.position };
          
          // Update movement for 3 seconds to trigger direction change
          environmentSystem.update(3000);
          
          // Should have a target position set
          expect(cloud.currentTarget).toBeDefined();
        }
      });
    });

    describe('Snake Collision with Dynamic Elements', () => {
      it('should detect snake head collision with dynamic element', () => {
        const elements = environmentSystem.getDynamicElements();
        const element = elements[0]; // Get first element
        
        const snakeHead = { ...element.position };
        const snakeSegments = [
          { x: element.position.x - 1, y: element.position.y },
          { x: element.position.x - 2, y: element.position.y }
        ];

        const collision = environmentSystem.checkSnakeDynamicElementCollision(snakeHead, snakeSegments, 5);
        expect(collision.hasCollision).toBe(true);
      });

      it('should detect snake body collision with dynamic element', () => {
        const elements = environmentSystem.getDynamicElements();
        const element = elements[0]; // Get first element
        
        const snakeHead = { x: element.position.x + 2, y: element.position.y };
        const snakeSegments = [
          { x: element.position.x + 1, y: element.position.y },
          { ...element.position }, // Body segment at element position
          { x: element.position.x - 1, y: element.position.y }
        ];

        const collision = environmentSystem.checkSnakeDynamicElementCollision(snakeHead, snakeSegments, 5);
        expect(collision.hasCollision).toBe(true);
      });
    });

    describe('Dynamic Element Queries', () => {
      it('should get dynamic element by ID', () => {
        const elements = environmentSystem.getDynamicElements();
        const firstElement = elements[0];
        
        const element = environmentSystem.getDynamicElementById(firstElement.id);
        expect(element).toBeDefined();
        expect(element?.id).toBe(firstElement.id);
      });

      it('should get dynamic elements in area', () => {
        const elementsInArea = environmentSystem.getDynamicElementsInArea(
          { x: 0, y: 0 },
          { x: 50, y: 35 }
        );
        expect(elementsInArea.length).toBeGreaterThan(0);
      });

      it('should add and remove dynamic elements', () => {
        const initialCount = environmentSystem.getDynamicElements().length;

        environmentSystem.addDynamicElement({
          id: 'test_dynamic_element',
          type: DynamicElementType.WaterPool,
          position: { x: 45, y: 30 },
          size: { x: 2, y: 2 },
          isActive: true,
          damage: 0,
          activationTime: 0,
          duration: -1,
          cooldownTime: 0,
          lastActivation: 0,
          currentPhase: 'active',
          phaseTimer: 0,
          requiredEvolutionLevel: 6
        });

        expect(environmentSystem.getDynamicElements().length).toBe(initialCount + 1);

        const removed = environmentSystem.removeDynamicElement('test_dynamic_element');
        expect(removed).toBe(true);
        expect(environmentSystem.getDynamicElements().length).toBe(initialCount);
      });
    });

    describe('System Integration', () => {
      it('should update dynamic elements without errors', () => {
        expect(() => {
          environmentSystem.update(16.67); // ~60 FPS delta time
        }).not.toThrow();
      });

      it('should reset dynamic elements on system reset', () => {
        const initialElementCount = environmentSystem.getDynamicElements().length;
        
        // Add a test element
        environmentSystem.addDynamicElement({
          id: 'test_reset_element',
          type: DynamicElementType.WaterPool,
          position: { x: 45, y: 30 },
          size: { x: 1, y: 1 },
          isActive: true,
          damage: 0,
          activationTime: 0,
          duration: -1,
          cooldownTime: 0,
          lastActivation: 0,
          currentPhase: 'active',
          phaseTimer: 0
        });

        expect(environmentSystem.getDynamicElements().length).toBe(initialElementCount + 1);

        environmentSystem.reset();
        expect(environmentSystem.getDynamicElements().length).toBe(initialElementCount);
      });

      it('should maintain element state consistency during updates', () => {
        const elements = environmentSystem.getDynamicElements();
        
        // Update multiple times
        for (let i = 0; i < 10; i++) {
          environmentSystem.update(16.67);
        }
        
        // All elements should still be active and have valid states
        elements.forEach(element => {
          expect(element.isActive).toBe(true);
          expect(['inactive', 'warning', 'active', 'cooldown']).toContain(element.currentPhase);
          expect(element.phaseTimer).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });
});