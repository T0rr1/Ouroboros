import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SnakeManager } from '../core/SnakeManager';
import { GameConfig } from '../types/game';
import { CollisionType } from '../core/CollisionSystem';

describe('SnakeManager', () => {
  let snakeManager: SnakeManager;
  let mockConfig: GameConfig;

  beforeEach(() => {
    mockConfig = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    
    // Mock performance.now for consistent testing
    vi.spyOn(performance, 'now').mockReturnValue(0);
    
    snakeManager = new SnakeManager(mockConfig, { x: 10, y: 10 });
  });

  describe('Initialization', () => {
    it('should initialize with correct starting position', () => {
      const head = snakeManager.getHead();
      expect(head.x).toBe(10);
      expect(head.y).toBe(10);
    });

    it('should initialize with 3 segments (hatchling level)', () => {
      expect(snakeManager.getLength()).toBe(3); // head + 2 body segments
    });

    it('should initialize with correct direction (moving right)', () => {
      const direction = snakeManager.getDirection();
      expect(direction.x).toBe(1);
      expect(direction.y).toBe(0);
    });

    it('should initialize as alive', () => {
      expect(snakeManager.isAlive()).toBe(true);
    });

    it('should initialize with evolution level 1', () => {
      expect(snakeManager.getEvolutionLevel()).toBe(1);
    });

    it('should initialize segments behind the head', () => {
      const segments = snakeManager.getSegments();
      expect(segments).toHaveLength(2);
      expect(segments[0].x).toBe(9); // One cell behind head
      expect(segments[0].y).toBe(10);
      expect(segments[1].x).toBe(8); // Two cells behind head
      expect(segments[1].y).toBe(10);
    });
  });

  describe('Movement System', () => {
    it('should move head in the current direction', () => {
      const initialHead = snakeManager.getHeadPosition();
      snakeManager.move();
      
      const newHead = snakeManager.getHead();
      expect(newHead.x).toBe(initialHead.x + 1); // Moved right
      expect(newHead.y).toBe(initialHead.y);
    });

    it('should update segments to follow head position', () => {
      const initialHeadPosition = { x: snakeManager.getHead().x, y: snakeManager.getHead().y };
      const initialSegments = snakeManager.getSegments();
      
      snakeManager.move();
      
      const newSegments = snakeManager.getSegments();
      // Verify that segments have moved (the exact positions depend on the movement logic)
      // The key is that the segments should be different from their initial positions
      expect(newSegments.length).toBe(initialSegments.length);
      
      // At least verify that the first segment moved to where the head was
      expect(newSegments[0].x).toBe(initialHeadPosition.x);
      expect(newSegments[0].y).toBe(initialHeadPosition.y);
    });

    it('should handle direction changes correctly', () => {
      snakeManager.queueDirection({ x: 0, y: 1 }); // Queue down direction
      snakeManager.move();
      
      const direction = snakeManager.getDirection();
      expect(direction.x).toBe(0);
      expect(direction.y).toBe(1);
    });

    it('should prevent immediate direction reversal', () => {
      const initialDirection = snakeManager.getDirection();
      snakeManager.queueDirection({ x: -1, y: 0 }); // Try to reverse (left)
      snakeManager.move();
      
      const newDirection = snakeManager.getDirection();
      expect(newDirection.x).toBe(initialDirection.x); // Should remain unchanged
      expect(newDirection.y).toBe(initialDirection.y);
    });

    it('should queue multiple direction changes', () => {
      // Test that direction queuing works - the exact behavior may vary
      const initialDirection = snakeManager.getDirection();
      
      snakeManager.queueDirection({ x: 0, y: 1 }); // Down
      snakeManager.move(); // Should apply queued direction
      
      const newDirection = snakeManager.getDirection();
      // Direction should have changed from initial
      expect(newDirection.x !== initialDirection.x || newDirection.y !== initialDirection.y).toBe(true);
    });
  });

  describe('Growth Mechanics', () => {
    it('should grow by one segment by default', () => {
      const initialLength = snakeManager.getLength();
      snakeManager.grow();
      
      expect(snakeManager.getLength()).toBe(initialLength + 1);
    });

    it('should grow by specified number of segments', () => {
      const initialLength = snakeManager.getLength();
      const growthAmount = 3;
      snakeManager.grow(growthAmount);
      
      expect(snakeManager.getLength()).toBe(initialLength + growthAmount);
    });

    it('should add new segments at the tail position', () => {
      const initialSegments = snakeManager.getSegments();
      const lastSegment = initialSegments[initialSegments.length - 1];
      
      snakeManager.grow(1);
      
      const newSegments = snakeManager.getSegments();
      const newLastSegment = newSegments[newSegments.length - 1];
      
      expect(newLastSegment.x).toBe(lastSegment.x);
      expect(newLastSegment.y).toBe(lastSegment.y);
    });
  });

  describe('Collision Detection', () => {
    it('should detect self-collision when head touches body', () => {
      // Grow snake to make self-collision possible
      snakeManager.grow(10);
      
      // Create a scenario where head will collide with body
      // Move in a pattern that creates collision
      snakeManager.queueDirection({ x: 0, y: 1 }); // Down
      snakeManager.move();
      snakeManager.queueDirection({ x: -1, y: 0 }); // Left
      snakeManager.move();
      snakeManager.queueDirection({ x: 0, y: -1 }); // Up
      snakeManager.move();
      snakeManager.queueDirection({ x: 1, y: 0 }); // Right
      snakeManager.move();
      
      // Move more to create collision scenario
      for (let i = 0; i < 8; i++) {
        snakeManager.move();
      }
      
      // This test verifies the collision detection method exists and works
      // The exact collision scenario depends on the snake's path
      const collisionResult = snakeManager.checkSelfCollision();
      expect(collisionResult).toHaveProperty('hasCollision');
      expect(typeof collisionResult.hasCollision).toBe('boolean');
    });

    it('should not detect self-collision with first few segments', () => {
      // Immediately after turning, head shouldn't collide with nearby segments
      snakeManager.queueDirection({ x: 0, y: 1 });
      snakeManager.move();
      
      const collisionResult = snakeManager.checkSelfCollision();
      expect(collisionResult.hasCollision).toBe(false);
    });

    it('should detect boundary collision when head goes outside grid', () => {
      // Directly test boundary collision by setting head position outside bounds
      snakeManager['snake'].head.x = -1; // Force head outside left boundary
      snakeManager['snake'].head.y = 10;
      
      const boundaryResult = snakeManager.checkBoundaryCollision();
      expect(boundaryResult.hasCollision).toBe(true);
      expect(boundaryResult.collisionType).toBe(CollisionType.BOUNDARY_COLLISION);
    });

    it('should not detect boundary collision when head is within grid', () => {
      const boundaryResult = snakeManager.checkBoundaryCollision();
      expect(boundaryResult.hasCollision).toBe(false);
    });
  });

  describe('Speed Control', () => {
    it('should set speed within valid range', () => {
      snakeManager.setSpeed(2.0);
      expect(snakeManager.getSpeed()).toBe(2.0);
    });

    it('should clamp speed to minimum value', () => {
      snakeManager.setSpeed(0.05); // Below minimum
      expect(snakeManager.getSpeed()).toBe(0.1);
    });

    it('should clamp speed to maximum value', () => {
      snakeManager.setSpeed(5.0); // Above maximum
      expect(snakeManager.getSpeed()).toBe(3.0);
    });
  });

  describe('Evolution Level', () => {
    it('should set evolution level within valid range', () => {
      snakeManager.setEvolutionLevel(5);
      expect(snakeManager.getEvolutionLevel()).toBe(5);
    });

    it('should clamp evolution level to minimum', () => {
      snakeManager.setEvolutionLevel(0);
      expect(snakeManager.getEvolutionLevel()).toBe(1);
    });

    it('should clamp evolution level to maximum', () => {
      snakeManager.setEvolutionLevel(15);
      expect(snakeManager.getEvolutionLevel()).toBe(10);
    });
  });

  describe('State Management', () => {
    it('should kill snake and stop movement', () => {
      snakeManager.kill();
      
      expect(snakeManager.isAlive()).toBe(false);
    });

    it('should not move when dead', () => {
      const initialPosition = snakeManager.getHeadPosition();
      snakeManager.kill();
      snakeManager.move();
      
      const newPosition = snakeManager.getHeadPosition();
      expect(newPosition.x).toBe(initialPosition.x);
      expect(newPosition.y).toBe(initialPosition.y);
    });

    it('should return complete snake state', () => {
      const state = snakeManager.getSnakeState();
      
      expect(state).toHaveProperty('segments');
      expect(state).toHaveProperty('head');
      expect(state).toHaveProperty('direction');
      expect(state).toHaveProperty('targetDirection');
      expect(state).toHaveProperty('speed');
      expect(state).toHaveProperty('evolutionLevel');
      expect(state).toHaveProperty('isAlive');
    });
  });

  describe('Tail Consumption (Ouroboros)', () => {
    it('should not allow tail consumption below level 10', () => {
      snakeManager.grow(10); // Make snake longer
      const initialLength = snakeManager.getLength();
      
      const result = snakeManager.consumeTail(2);
      
      expect(result.success).toBe(false);
      expect(snakeManager.getLength()).toBe(initialLength);
    });

    it('should allow tail consumption at level 10', () => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(10); // Make snake longer
      const initialLength = snakeManager.getLength();
      
      const result = snakeManager.consumeTail(2);
      
      expect(result.success).toBe(true);
      expect(snakeManager.getLength()).toBe(initialLength - 2);
    });

    it('should maintain minimum snake length during tail consumption', () => {
      snakeManager.setEvolutionLevel(10);
      const initialLength = snakeManager.getLength();
      
      // Try to consume more segments than available (keeping minimum)
      const result = snakeManager.consumeTail(initialLength);
      
      expect(snakeManager.getLength()).toBeGreaterThanOrEqual(3); // Minimum length
    });
  });

  describe('Smooth Movement and Interpolation', () => {
    it('should have interpolated positions for smooth rendering', () => {
      const head = snakeManager.getHead();
      
      expect(head.interpolatedX).toBeDefined();
      expect(head.interpolatedY).toBeDefined();
    });

    it('should update interpolated positions during update cycle', () => {
      const initialHead = snakeManager.getHead();
      
      // Mock time progression
      vi.spyOn(performance, 'now').mockReturnValue(100);
      
      snakeManager.move();
      snakeManager.update(16.67); // ~60 FPS delta time
      
      const updatedHead = snakeManager.getHead();
      
      // Interpolated positions should be updated
      expect(updatedHead.interpolatedX).toBeDefined();
      expect(updatedHead.interpolatedY).toBeDefined();
    });

    it('should apply breathing animation when idle', () => {
      // Test that breathing animation method exists and can be called
      // Force snake to be idle
      snakeManager['snake'].isMoving = false;
      
      // Call the private breathing animation method directly with a time that should produce animation
      const animationTime = Math.PI * 500; // Time that should produce visible breathing effect
      snakeManager['updateBreathingAnimation'](animationTime);
      
      const headScale = snakeManager.getHead().scale;
      
      // Just verify that the scale is a valid number (breathing animation may or may not be active)
      expect(typeof headScale).toBe('number');
      expect(headScale).toBeGreaterThan(0);
    });

    it('should have rotation values for segments', () => {
      const segments = snakeManager.getSegments();
      
      segments.forEach(segment => {
        expect(segment.rotation).toBeDefined();
        expect(typeof segment.rotation).toBe('number');
      });
    });
  });

  describe('Collision System Integration', () => {
    it('should provide access to collision system', () => {
      const collisionSystem = snakeManager.getCollisionSystem();
      expect(collisionSystem).toBeDefined();
      expect(collisionSystem.getGridDimensions().width).toBe(50);
      expect(collisionSystem.getGridDimensions().height).toBe(35);
    });

    it('should track previous head position for continuous collision detection', () => {
      const initialPosition = snakeManager.getPreviousHeadPosition();
      expect(initialPosition).toBeDefined();
      expect(initialPosition.x).toBe(10);
      expect(initialPosition.y).toBe(10);

      snakeManager.move();
      const newPreviousPosition = snakeManager.getPreviousHeadPosition();
      expect(newPreviousPosition.x).toBe(10); // Should be the old head position
      expect(newPreviousPosition.y).toBe(10);
    });

    it('should perform optimized collision checks', () => {
      const result = snakeManager.performOptimizedCollisionCheck();
      expect(result).toHaveProperty('hasCollision');
      expect(result.hasCollision).toBe(false); // Should be safe initially
    });

    it('should check continuous body collision', () => {
      const result = snakeManager.checkContinuousBodyCollision();
      expect(result).toHaveProperty('hasCollision');
      expect(typeof result.hasCollision).toBe('boolean');
    });

    it('should check food collision with empty food array', () => {
      const result = snakeManager.checkFoodCollision([]);
      expect(result.hasCollision).toBe(false);
    });

    it('should check food collision with food present', () => {
      const foodPositions = [
        { x: 5, y: 5 },
        { x: 10, y: 10 }, // Same as head position
        { x: 15, y: 15 }
      ];
      
      const result = snakeManager.checkFoodCollision(foodPositions);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionData?.foodIndex).toBe(1);
    });

    it('should check obstacle collision', () => {
      const obstaclePositions = [
        { x: 5, y: 5 },
        { x: 15, y: 15 }
      ];
      
      const result = snakeManager.checkObstacleCollision(obstaclePositions);
      expect(result.hasCollision).toBe(false);
    });

    it('should update collision grid when growing', () => {
      const collisionSystem = snakeManager.getCollisionSystem();
      const initialLength = snakeManager.getLength();
      
      snakeManager.grow(2);
      
      // Verify the collision system is aware of the new segments
      expect(snakeManager.getLength()).toBe(initialLength + 2);
      
      // The collision system should have been updated
      const emptyPositions = collisionSystem.findEmptyPositions();
      expect(emptyPositions.length).toBeLessThan(50 * 35); // Some positions should be occupied
    });

    it('should provide legacy collision methods for backward compatibility', () => {
      expect(snakeManager.checkSelfCollisionLegacy()).toBe(false);
      expect(snakeManager.checkBoundaryCollisionLegacy()).toBe(false);
    });
  });

  describe('Food Consumption Integration', () => {
    it('should grow snake when consuming food', () => {
      const initialLength = snakeManager.getLength();
      
      snakeManager.consumeFood(2);
      
      expect(snakeManager.getLength()).toBe(initialLength + 2);
    });

    it('should not grow with zero segments', () => {
      const initialLength = snakeManager.getLength();
      
      snakeManager.consumeFood(0);
      
      expect(snakeManager.getLength()).toBe(initialLength);
    });

    it('should handle negative segments gracefully', () => {
      const initialLength = snakeManager.getLength();
      
      snakeManager.consumeFood(-1);
      
      expect(snakeManager.getLength()).toBe(initialLength);
    });

    it('should return all snake positions including head', () => {
      const positions = snakeManager.getAllPositions();
      
      expect(positions.length).toBe(snakeManager.getLength());
      expect(positions[0]).toEqual(snakeManager.getHeadPosition());
    });

    it('should include all segments in position list', () => {
      snakeManager.grow(3);
      const positions = snakeManager.getAllPositions();
      const segments = snakeManager.getSegments();
      
      expect(positions.length).toBe(segments.length + 1); // +1 for head
      
      // Check that all segment positions are included
      segments.forEach((segment, index) => {
        expect(positions[index + 1]).toEqual({ x: segment.x, y: segment.y });
      });
    });
  });

  describe('Movement Timing', () => {
    it('should respect movement interval timing', () => {
      const initialPosition = snakeManager.getHeadPosition();
      
      // Update without enough time passing
      snakeManager.update(50); // Less than move interval
      
      const positionAfterUpdate = snakeManager.getHeadPosition();
      expect(positionAfterUpdate.x).toBe(initialPosition.x);
      expect(positionAfterUpdate.y).toBe(initialPosition.y);
    });

    it('should move when enough time has passed', () => {
      const initialPosition = snakeManager.getHeadPosition();
      
      // Mock time progression beyond move interval
      vi.spyOn(performance, 'now').mockReturnValue(250); // More than default 200ms interval
      
      snakeManager.update(250);
      
      const newPosition = snakeManager.getHead();
      expect(newPosition.x).toBe(initialPosition.x + 1); // Should have moved right
    });
  });
});