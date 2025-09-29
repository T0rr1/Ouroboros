import { describe, test, expect, beforeEach } from 'vitest';
import { SnakeManager } from '../core/SnakeManager';
import { FoodManager } from '../core/FoodManager';
import { GameConfig } from '../types/game';

describe('Evolution System Integration', () => {
  let snakeManager: SnakeManager;
  let foodManager: FoodManager;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    snakeManager = new SnakeManager(config);
    foodManager = new FoodManager(config);
  });

  describe('Snake-Evolution Integration', () => {
    test('should start at evolution level 1', () => {
      expect(snakeManager.getCurrentEvolutionLevel()).toBe(1);
      expect(snakeManager.getEvolutionProgress()).toBe(0);
    });

    test('should evolve when consuming enough food', () => {
      // Consume food to trigger evolution
      const evolutionResult = snakeManager.consumeFood(1, 50); // 1 segment growth, 50 food points
      
      expect(evolutionResult.evolved).toBe(true);
      expect(evolutionResult.newLevel).toBe(2);
      expect(evolutionResult.previousLevel).toBe(1);
      expect(snakeManager.getCurrentEvolutionLevel()).toBe(2);
      expect(snakeManager.isTransforming()).toBe(true);
    });

    test('should complete transformation after time passes', () => {
      // Trigger evolution
      snakeManager.consumeFood(1, 50);
      expect(snakeManager.isTransforming()).toBe(true);
      
      // Update snake to complete transformation
      snakeManager.update(3000); // 3 seconds
      
      expect(snakeManager.isTransforming()).toBe(false);
      expect(snakeManager.getCurrentEvolutionLevel()).toBe(2);
    });

    test('should unlock powers when evolving', () => {
      // Evolve to level 2 (Garden Snake)
      snakeManager.consumeFood(1, 50);
      snakeManager.update(3000); // Complete transformation
      
      const availablePowers = snakeManager.getAvailablePowers();
      expect(availablePowers.length).toBeGreaterThan(0);
      
      // Should be able to activate SpeedBoost power
      const powerActivationResult = snakeManager.activatePower(availablePowers[0]);
      expect(powerActivationResult.success).toBe(true);
      expect(snakeManager.isPowerActive(availablePowers[0])).toBe(true);
    });

    test('should adjust snake properties based on evolution level', () => {
      const initialLength = snakeManager.getLength();
      const initialSpeed = snakeManager.getSpeed();
      
      // Evolve to level 2
      snakeManager.consumeFood(1, 50);
      snakeManager.update(3000); // Complete transformation
      
      // Snake should have grown and potentially changed speed
      const newLength = snakeManager.getLength();
      const newSpeed = snakeManager.getSpeed();
      
      expect(newLength).toBeGreaterThanOrEqual(initialLength);
      // Speed might change due to evolution adjustments
    });

    test('should track evolution progress correctly', () => {
      // Add partial food progress
      snakeManager.consumeFood(0, 25); // No growth, 25 food points
      
      expect(snakeManager.getCurrentEvolutionLevel()).toBe(1);
      expect(snakeManager.getFoodProgress()).toBe(25);
      expect(snakeManager.getEvolutionProgress()).toBeCloseTo(0.5, 1); // 50% to next level
      
      // Add more food to complete evolution
      const result = snakeManager.consumeFood(0, 25); // Total 50 food points
      expect(result.evolved).toBe(true);
    });
  });

  describe('Food-Evolution Integration', () => {
    test('should provide evolution progress when consuming food', () => {
      // Spawn food
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 });
      expect(food).toBeDefined();
      
      // Consume food through food manager
      const consumptionResult = foodManager.consumeFood(food!.id, 1);
      expect(consumptionResult.success).toBe(true);
      expect(consumptionResult.evolutionProgress).toBeGreaterThan(0);
      
      // Apply evolution progress to snake
      const evolutionResult = snakeManager.consumeFood(
        consumptionResult.segmentsToGrow,
        consumptionResult.evolutionProgress
      );
      
      expect(snakeManager.getFoodProgress()).toBe(consumptionResult.evolutionProgress);
    });

    test('should handle multiple food consumption for evolution', () => {
      let totalFoodPoints = 0;
      
      // Consume multiple foods to reach evolution threshold
      for (let i = 0; i < 5; i++) {
        const food = foodManager.forceSpawnFood({ x: i, y: i });
        if (food) {
          const consumptionResult = foodManager.consumeFood(food.id, 1);
          const evolutionResult = snakeManager.consumeFood(
            consumptionResult.segmentsToGrow,
            consumptionResult.evolutionProgress
          );
          
          totalFoodPoints += consumptionResult.evolutionProgress;
          
          if (evolutionResult.evolved) {
            expect(snakeManager.getCurrentEvolutionLevel()).toBe(2);
            break;
          }
        }
      }
      
      expect(totalFoodPoints).toBeGreaterThanOrEqual(50); // Should have consumed enough to evolve
    });
  });

  describe('Visual Transformation Integration', () => {
    test('should provide visual pattern information for rendering', () => {
      const evolutionSystem = snakeManager.getEvolutionSystem();
      
      // Initial visual pattern
      const initialPattern = evolutionSystem.getCurrentVisualPattern();
      expect(initialPattern.baseColor).toBe('#4CAF50'); // Hatchling green
      expect(initialPattern.patternType).toBe('solid');
      
      // Evolve and check new pattern
      snakeManager.consumeFood(1, 50);
      const newPattern = evolutionSystem.getCurrentVisualPattern();
      expect(newPattern.baseColor).toBe('#4CAF50');
      expect(newPattern.secondaryColor).toBe('#FFEB3B'); // Garden Snake yellow stripes
      expect(newPattern.patternType).toBe('stripes');
    });

    test('should track transformation progress for visual effects', () => {
      snakeManager.consumeFood(1, 50); // Trigger evolution
      
      expect(snakeManager.isTransforming()).toBe(true);
      expect(snakeManager.getTransformationProgress()).toBe(0);
      
      // Update partway through transformation
      snakeManager.update(1000); // 1 second of 2 second transformation
      
      const progress = snakeManager.getTransformationProgress();
      expect(progress).toBeGreaterThan(0.3);
      expect(progress).toBeLessThan(0.7);
      
      // Complete transformation
      snakeManager.update(2000); // Additional 2 seconds
      expect(snakeManager.isTransforming()).toBe(false);
    });
  });

  describe('Game State Integration', () => {
    test('should maintain consistent state across systems', () => {
      const initialState = snakeManager.getSnakeState();
      expect(initialState.evolutionLevel).toBe(1);
      
      // Evolve snake
      snakeManager.consumeFood(1, 50);
      snakeManager.update(3000); // Complete transformation
      
      const newState = snakeManager.getSnakeState();
      expect(newState.evolutionLevel).toBe(2);
      
      // Evolution system should match
      expect(snakeManager.getCurrentEvolutionLevel()).toBe(2);
      expect(snakeManager.getEvolutionSystem().getCurrentLevel()).toBe(2);
    });

    test('should handle edge cases gracefully', () => {
      // Try to consume food with zero points
      const result1 = snakeManager.consumeFood(0, 0);
      expect(result1.evolved).toBe(false);
      
      // Try to consume food with negative points
      const result2 = snakeManager.consumeFood(0, -10);
      expect(result2.evolved).toBe(false);
      
      // Snake should still be at level 1
      expect(snakeManager.getCurrentEvolutionLevel()).toBe(1);
    });
  });
});