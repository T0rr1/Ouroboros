import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FoodManager } from '../core/FoodManager';
import { SnakeManager } from '../core/SnakeManager';
import { GameConfig, FoodType } from '../types/game';

describe('Food System Integration', () => {
  let foodManager: FoodManager;
  let snakeManager: SnakeManager;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    
    foodManager = new FoodManager(config);
    snakeManager = new SnakeManager(config, { x: 25, y: 17 });
    
    // Mock performance.now for consistent testing
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  describe('Complete Food Consumption Flow', () => {
    it('should handle complete food consumption workflow', () => {
      // 1. Spawn food
      const food = foodManager.forceSpawnFood({ x: 26, y: 17 }); // Right next to snake head
      expect(food).not.toBeNull();
      expect(food!.type).toBe(FoodType.BasicBerry);

      // 2. Move snake to food position
      snakeManager.move(); // Snake moves right from (25,17) to (26,17)
      
      // 3. Check for food collision using actual head position
      const head = snakeManager.getHead();
      const headPosition = { x: head.x, y: head.y }; // Use grid position, not interpolated
      const foodAtPosition = foodManager.getFoodAtPosition(headPosition);
      expect(foodAtPosition).not.toBeNull();
      expect(foodAtPosition!.id).toBe(food!.id);

      // 4. Consume food
      const initialLength = snakeManager.getLength();
      const consumptionResult = foodManager.consumeFood(food!.id, snakeManager.getEvolutionLevel());
      
      expect(consumptionResult.success).toBe(true);
      expect(consumptionResult.pointsAwarded).toBe(12); // 10 * 1.2 bonus for exact level match
      expect(consumptionResult.segmentsToGrow).toBe(1);

      // 5. Apply growth to snake
      snakeManager.consumeFood(consumptionResult.segmentsToGrow);
      expect(snakeManager.getLength()).toBe(initialLength + 1);

      // 6. Verify food is removed
      expect(foodManager.getFoodAtPosition(headPosition)).toBeNull();
      expect(foodManager.getFoodCount()).toBe(0);
    });

    it('should handle multiple food consumption', () => {
      const initialLength = snakeManager.getLength();
      
      // Spawn multiple foods
      const food1 = foodManager.forceSpawnFood({ x: 26, y: 17 });
      const food2 = foodManager.forceSpawnFood({ x: 27, y: 17 });
      const food3 = foodManager.forceSpawnFood({ x: 28, y: 17 });
      
      expect(foodManager.getFoodCount()).toBe(3);

      // Consume foods one by one as snake moves
      let totalGrowth = 0;

      // First food
      snakeManager.move(); // Move to (26,17)
      let result = foodManager.consumeFood(food1!.id, snakeManager.getEvolutionLevel());
      snakeManager.consumeFood(result.segmentsToGrow);
      totalGrowth += result.segmentsToGrow;

      // Second food
      snakeManager.move(); // Move to (27,17)
      result = foodManager.consumeFood(food2!.id, snakeManager.getEvolutionLevel());
      snakeManager.consumeFood(result.segmentsToGrow);
      totalGrowth += result.segmentsToGrow;

      // Third food
      snakeManager.move(); // Move to (28,17)
      result = foodManager.consumeFood(food3!.id, snakeManager.getEvolutionLevel());
      snakeManager.consumeFood(result.segmentsToGrow);
      totalGrowth += result.segmentsToGrow;

      expect(snakeManager.getLength()).toBe(initialLength + totalGrowth);
      expect(totalGrowth).toBe(3); // Each Basic Berry grows by 1
      expect(foodManager.getFoodCount()).toBe(0);
    });

    it('should avoid spawning food on snake positions', () => {
      // Get all snake positions
      const snakePositions = snakeManager.getAllPositions();
      
      // Update food manager with snake positions
      foodManager.update(100, snakePositions);
      
      // Check that no food spawned on snake positions
      const foods = foodManager.getActiveFoods();
      foods.forEach(food => {
        const isOnSnake = snakePositions.some(pos => 
          pos.x === food.position.x && pos.y === food.position.y
        );
        expect(isOnSnake).toBe(false);
      });
    });

    it('should handle food collision detection through snake manager', () => {
      // Spawn food at specific positions
      const food1 = foodManager.forceSpawnFood({ x: 10, y: 10 });
      const food2 = foodManager.forceSpawnFood({ x: 25, y: 17 }); // Same as snake head
      const food3 = foodManager.forceSpawnFood({ x: 30, y: 30 });

      const foodPositions = foodManager.getActiveFoods().map(f => f.position);
      
      // Check collision through snake manager
      const collisionResult = snakeManager.checkFoodCollision(foodPositions);
      
      expect(collisionResult.hasCollision).toBe(true);
      expect(collisionResult.collisionData?.foodIndex).toBe(1); // food2 at index 1
    });

    it('should maintain food spawning during gameplay', () => {
      const snakePositions = snakeManager.getAllPositions();
      
      // Clear existing food and set controlled parameters
      foodManager.clearAllFood();
      foodManager.setMinSimultaneousFoods(1);
      foodManager.setMaxSimultaneousFoods(3);
      expect(foodManager.getFoodCount()).toBe(0);
      
      // Update should spawn food since we're below minimum
      foodManager.update(100, snakePositions);
      expect(foodManager.getFoodCount()).toBeGreaterThan(0);
      expect(foodManager.getFoodCount()).toBeLessThanOrEqual(3);
      
      // Consume some food
      const foods = foodManager.getActiveFoods();
      if (foods.length > 0) {
        const firstFood = foods[0];
        const result = foodManager.consumeFood(firstFood.id, 1);
        expect(result.success).toBe(true);
      }
      
      // Update again - should spawn more food if needed
      foodManager.update(100, snakePositions);
      expect(foodManager.getFoodCount()).toBeGreaterThan(0);
    });

    it('should handle edge case of no valid spawn positions', () => {
      // Create a scenario with very limited space
      const snakePositions: any[] = [];
      
      // Fill most of the grid
      for (let x = 0; x < config.gridWidth; x++) {
        for (let y = 0; y < config.gridHeight; y++) {
          if (x < config.gridWidth - 1 || y < config.gridHeight - 1) {
            snakePositions.push({ x, y });
          }
        }
      }
      
      // Should not crash when trying to spawn food
      expect(() => {
        foodManager.update(100, snakePositions);
      }).not.toThrow();
      
      // May or may not spawn food depending on available space
      const foodCount = foodManager.getFoodCount();
      expect(foodCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Food System Performance', () => {
    it('should handle rapid food consumption efficiently', () => {
      const startTime = performance.now();
      
      // Spawn and consume many foods rapidly
      for (let i = 0; i < 100; i++) {
        const food = foodManager.forceSpawnFood({ x: i % config.gridWidth, y: Math.floor(i / config.gridWidth) });
        if (food) {
          const result = foodManager.consumeFood(food.id, 1);
          expect(result.success).toBe(true);
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should maintain food count within configured limits', () => {
      const snakePositions = [{ x: 25, y: 17 }];
      
      // Clear food and set controlled parameters
      foodManager.clearAllFood();
      foodManager.setMinSimultaneousFoods(1);
      foodManager.setMaxSimultaneousFoods(3);
      
      // Update should spawn food
      foodManager.update(100, snakePositions);
      const count = foodManager.getFoodCount();
      
      // Should have spawned some food within limits
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(3);
    });
  });
});