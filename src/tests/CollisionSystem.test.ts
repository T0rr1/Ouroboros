import { describe, test, expect, beforeEach } from 'vitest';
import { CollisionSystem, CollisionType } from '../core/CollisionSystem';
import { GameConfig, SnakeSegment, Vector2 } from '../types/game';

describe('CollisionSystem', () => {
  let collisionSystem: CollisionSystem;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    collisionSystem = new CollisionSystem(config);
  });

  describe('Grid System', () => {
    test('should initialize with correct grid dimensions', () => {
      const dimensions = collisionSystem.getGridDimensions();
      expect(dimensions.width).toBe(50);
      expect(dimensions.height).toBe(35);
    });

    test('should have correct cell size', () => {
      expect(collisionSystem.getCellSize()).toBe(35);
    });

    test('should mark and clear positions correctly', () => {
      const x = 10, y = 15;
      
      // Initially should be empty
      expect(collisionSystem.isPositionOccupied(x, y)).toBe(false);
      
      // Mark as food
      expect(collisionSystem.markPosition(x, y, 'food')).toBe(true);
      expect(collisionSystem.isPositionOccupied(x, y)).toBe(true);
      
      // Clear position
      collisionSystem.clearPosition(x, y);
      expect(collisionSystem.isPositionOccupied(x, y)).toBe(false);
    });

    test('should not allow marking already occupied positions', () => {
      const x = 10, y = 15;
      
      // Mark first time should succeed
      expect(collisionSystem.markPosition(x, y, 'food')).toBe(true);
      
      // Mark second time should fail
      expect(collisionSystem.markPosition(x, y, 'obstacle')).toBe(false);
    });

    test('should find empty positions correctly', () => {
      // Initially all positions should be empty
      const emptyPositions = collisionSystem.findEmptyPositions();
      expect(emptyPositions.length).toBe(50 * 35);
      
      // Mark some positions
      collisionSystem.markPosition(0, 0, 'food');
      collisionSystem.markPosition(1, 1, 'obstacle');
      
      const newEmptyPositions = collisionSystem.findEmptyPositions();
      expect(newEmptyPositions.length).toBe(50 * 35 - 2);
    });

    test('should get random empty position', () => {
      const randomPos = collisionSystem.getRandomEmptyPosition();
      expect(randomPos).not.toBeNull();
      expect(randomPos!.x).toBeGreaterThanOrEqual(0);
      expect(randomPos!.x).toBeLessThan(50);
      expect(randomPos!.y).toBeGreaterThanOrEqual(0);
      expect(randomPos!.y).toBeLessThan(35);
    });
  });

  describe('Boundary Collision Detection', () => {
    test('should detect left boundary collision', () => {
      const head: SnakeSegment = {
        x: -1,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const result = collisionSystem.checkBoundaryCollision(head);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.BOUNDARY_COLLISION);
      expect(result.collisionData?.boundary).toBe('left');
    });

    test('should detect right boundary collision', () => {
      const head: SnakeSegment = {
        x: 50,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const result = collisionSystem.checkBoundaryCollision(head);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.BOUNDARY_COLLISION);
      expect(result.collisionData?.boundary).toBe('right');
    });

    test('should detect top boundary collision', () => {
      const head: SnakeSegment = {
        x: 10,
        y: -1,
        rotation: 0,
        scale: 1
      };

      const result = collisionSystem.checkBoundaryCollision(head);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.BOUNDARY_COLLISION);
      expect(result.collisionData?.boundary).toBe('top');
    });

    test('should detect bottom boundary collision', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 35,
        rotation: 0,
        scale: 1
      };

      const result = collisionSystem.checkBoundaryCollision(head);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.BOUNDARY_COLLISION);
      expect(result.collisionData?.boundary).toBe('bottom');
    });

    test('should not detect collision when within boundaries', () => {
      const head: SnakeSegment = {
        x: 25,
        y: 17,
        rotation: 0,
        scale: 1
      };

      const result = collisionSystem.checkBoundaryCollision(head);
      expect(result.hasCollision).toBe(false);
    });

    test('should handle edge cases at exact boundaries', () => {
      // Test at exact boundary positions
      const validPositions = [
        { x: 0, y: 0 },
        { x: 49, y: 0 },
        { x: 0, y: 34 },
        { x: 49, y: 34 }
      ];

      validPositions.forEach(pos => {
        const head: SnakeSegment = {
          x: pos.x,
          y: pos.y,
          rotation: 0,
          scale: 1
        };

        const result = collisionSystem.checkBoundaryCollision(head);
        expect(result.hasCollision).toBe(false);
      });
    });
  });

  describe('Self Collision Detection', () => {
    test('should not detect collision with safe segments', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      // Create segments close to head (within safe zone)
      const segments: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 },
        { x: 8, y: 10, rotation: 0, scale: 1 },
        { x: 7, y: 10, rotation: 0, scale: 1 },
        { x: 6, y: 10, rotation: 0, scale: 1 }
      ];

      const result = collisionSystem.checkSelfCollision(head, segments);
      expect(result.hasCollision).toBe(false);
    });

    test('should detect collision with distant segments', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      // Create segments with one at the same position as head (beyond safe zone)
      const segments: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 },
        { x: 8, y: 10, rotation: 0, scale: 1 },
        { x: 7, y: 10, rotation: 0, scale: 1 },
        { x: 6, y: 10, rotation: 0, scale: 1 },
        { x: 5, y: 10, rotation: 0, scale: 1 },
        { x: 10, y: 10, rotation: 0, scale: 1 } // Collision at index 5
      ];

      const result = collisionSystem.checkSelfCollision(head, segments);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.SELF_COLLISION);
      expect(result.collisionData?.segmentIndex).toBe(5);
    });

    test('should handle floating point precision', () => {
      const head: SnakeSegment = {
        x: 10.05,
        y: 10.05,
        rotation: 0,
        scale: 1
      };

      const segments: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 },
        { x: 8, y: 10, rotation: 0, scale: 1 },
        { x: 7, y: 10, rotation: 0, scale: 1 },
        { x: 6, y: 10, rotation: 0, scale: 1 },
        { x: 5, y: 10, rotation: 0, scale: 1 },
        { x: 10.02, y: 10.03, rotation: 0, scale: 1 } // Very close position
      ];

      const result = collisionSystem.checkSelfCollision(head, segments);
      expect(result.hasCollision).toBe(true);
    });

    test('should not detect collision when segments are far apart', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const segments: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 },
        { x: 8, y: 10, rotation: 0, scale: 1 },
        { x: 7, y: 10, rotation: 0, scale: 1 },
        { x: 6, y: 10, rotation: 0, scale: 1 },
        { x: 5, y: 10, rotation: 0, scale: 1 },
        { x: 20, y: 20, rotation: 0, scale: 1 } // Far away
      ];

      const result = collisionSystem.checkSelfCollision(head, segments);
      expect(result.hasCollision).toBe(false);
    });
  });

  describe('Continuous Body Collision Detection', () => {
    test('should detect collision during fast movement', () => {
      const head: SnakeSegment = {
        x: 15,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const segments: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 },
        { x: 8, y: 10, rotation: 0, scale: 1 },
        { x: 7, y: 10, rotation: 0, scale: 1 },
        { x: 6, y: 10, rotation: 0, scale: 1 },
        { x: 5, y: 10, rotation: 0, scale: 1 },
        { x: 12, y: 10, rotation: 0, scale: 1 } // Segment in the path
      ];

      const previousHeadPosition: Vector2 = { x: 10, y: 10 };

      const result = collisionSystem.checkContinuousBodyCollision(head, segments, previousHeadPosition);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.SELF_COLLISION);
      expect(result.collisionData?.continuous).toBe(true);
    });

    test('should handle normal single-step movement', () => {
      const head: SnakeSegment = {
        x: 11,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const segments: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 },
        { x: 8, y: 10, rotation: 0, scale: 1 },
        { x: 7, y: 10, rotation: 0, scale: 1 },
        { x: 6, y: 10, rotation: 0, scale: 1 },
        { x: 5, y: 10, rotation: 0, scale: 1 }
      ];

      const previousHeadPosition: Vector2 = { x: 10, y: 10 };

      const result = collisionSystem.checkContinuousBodyCollision(head, segments, previousHeadPosition);
      expect(result.hasCollision).toBe(false);
    });
  });

  describe('Food Collision Detection', () => {
    test('should detect food collision', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const foodPositions: Vector2[] = [
        { x: 5, y: 5 },
        { x: 10, y: 10 }, // Same as head
        { x: 15, y: 15 }
      ];

      const result = collisionSystem.checkFoodCollision(head, foodPositions);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.FOOD_COLLISION);
      expect(result.collisionData?.foodIndex).toBe(1);
    });

    test('should not detect food collision when no food at head position', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const foodPositions: Vector2[] = [
        { x: 5, y: 5 },
        { x: 15, y: 15 },
        { x: 20, y: 20 }
      ];

      const result = collisionSystem.checkFoodCollision(head, foodPositions);
      expect(result.hasCollision).toBe(false);
    });
  });

  describe('Obstacle Collision Detection', () => {
    test('should detect obstacle collision', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const obstaclePositions: Vector2[] = [
        { x: 5, y: 5 },
        { x: 10, y: 10 }, // Same as head
        { x: 15, y: 15 }
      ];

      const result = collisionSystem.checkObstacleCollision(head, obstaclePositions);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.OBSTACLE_COLLISION);
      expect(result.collisionData?.obstacleIndex).toBe(1);
    });

    test('should not detect obstacle collision when no obstacle at head position', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const obstaclePositions: Vector2[] = [
        { x: 5, y: 5 },
        { x: 15, y: 15 },
        { x: 20, y: 20 }
      ];

      const result = collisionSystem.checkObstacleCollision(head, obstaclePositions);
      expect(result.hasCollision).toBe(false);
    });
  });

  describe('Optimized Collision Detection', () => {
    test('should prioritize boundary collision check', () => {
      const head: SnakeSegment = {
        x: -1, // Outside boundary
        y: 10,
        rotation: 0,
        scale: 1
      };

      const segments: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 },
        { x: 8, y: 10, rotation: 0, scale: 1 },
        { x: 7, y: 10, rotation: 0, scale: 1 },
        { x: 6, y: 10, rotation: 0, scale: 1 },
        { x: 5, y: 10, rotation: 0, scale: 1 },
        { x: -1, y: 10, rotation: 0, scale: 1 } // Would also be self-collision
      ];

      const result = collisionSystem.performOptimizedCollisionCheck(head, segments);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.BOUNDARY_COLLISION);
    });

    test('should check self-collision when no boundary collision', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const segments: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 },
        { x: 8, y: 10, rotation: 0, scale: 1 },
        { x: 7, y: 10, rotation: 0, scale: 1 },
        { x: 6, y: 10, rotation: 0, scale: 1 },
        { x: 5, y: 10, rotation: 0, scale: 1 },
        { x: 10, y: 10, rotation: 0, scale: 1 } // Self-collision
      ];

      const result = collisionSystem.performOptimizedCollisionCheck(head, segments);
      expect(result.hasCollision).toBe(true);
      expect(result.collisionType).toBe(CollisionType.SELF_COLLISION);
    });

    test('should return no collision when safe', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const segments: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 },
        { x: 8, y: 10, rotation: 0, scale: 1 },
        { x: 7, y: 10, rotation: 0, scale: 1 },
        { x: 6, y: 10, rotation: 0, scale: 1 }
      ];

      const result = collisionSystem.performOptimizedCollisionCheck(head, segments);
      expect(result.hasCollision).toBe(false);
    });
  });

  describe('Snake Grid Updates', () => {
    test('should update grid with snake position', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const segments: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 },
        { x: 8, y: 10, rotation: 0, scale: 1 }
      ];

      collisionSystem.updateSnakeGrid(head, segments);

      // Check that positions are marked as occupied
      expect(collisionSystem.isPositionOccupied(10, 10)).toBe(true); // Head
      expect(collisionSystem.isPositionOccupied(9, 10)).toBe(true);  // Segment 0
      expect(collisionSystem.isPositionOccupied(8, 10)).toBe(true);  // Segment 1
      expect(collisionSystem.isPositionOccupied(7, 10)).toBe(false); // Empty
    });

    test('should clear previous snake positions when updating', () => {
      const head1: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const segments1: SnakeSegment[] = [
        { x: 9, y: 10, rotation: 0, scale: 1 }
      ];

      collisionSystem.updateSnakeGrid(head1, segments1);
      expect(collisionSystem.isPositionOccupied(10, 10)).toBe(true);
      expect(collisionSystem.isPositionOccupied(9, 10)).toBe(true);

      // Move snake
      const head2: SnakeSegment = {
        x: 11,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const segments2: SnakeSegment[] = [
        { x: 10, y: 10, rotation: 0, scale: 1 }
      ];

      collisionSystem.updateSnakeGrid(head2, segments2);
      
      // Old positions should be cleared
      expect(collisionSystem.isPositionOccupied(9, 10)).toBe(false);
      
      // New positions should be occupied
      expect(collisionSystem.isPositionOccupied(11, 10)).toBe(true);
      expect(collisionSystem.isPositionOccupied(10, 10)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty segments array', () => {
      const head: SnakeSegment = {
        x: 10,
        y: 10,
        rotation: 0,
        scale: 1
      };

      const result = collisionSystem.checkSelfCollision(head, []);
      expect(result.hasCollision).toBe(false);
    });

    test('should handle invalid grid positions gracefully', () => {
      expect(collisionSystem.getGridCell(-1, -1)).toBeNull();
      expect(collisionSystem.getGridCell(100, 100)).toBeNull();
      expect(collisionSystem.isPositionOccupied(-1, -1)).toBe(false);
      expect(collisionSystem.markPosition(-1, -1, 'food')).toBe(false);
    });

    test('should handle very large snake', () => {
      const head: SnakeSegment = {
        x: 25,
        y: 17,
        rotation: 0,
        scale: 1
      };

      // Create a very long snake
      const segments: SnakeSegment[] = [];
      for (let i = 0; i < 100; i++) {
        segments.push({
          x: 25 - (i + 1),
          y: 17,
          rotation: 0,
          scale: 1
        });
      }

      const result = collisionSystem.checkSelfCollision(head, segments);
      expect(result.hasCollision).toBe(false); // No collision as segments are in a line
    });
  });
});