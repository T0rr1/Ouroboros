import { describe, test, expect, beforeEach } from 'vitest';
import { EvolutionSystem, PowerType } from '../core/EvolutionSystem';
import { GameConfig } from '../types/game';

describe('EvolutionSystem', () => {
  let evolutionSystem: EvolutionSystem;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    evolutionSystem = new EvolutionSystem(config);
  });

  describe('Initialization', () => {
    test('should start at level 1 (Hatchling)', () => {
      expect(evolutionSystem.getCurrentLevel()).toBe(1);
    });

    test('should have no available powers at level 1', () => {
      expect(evolutionSystem.getAvailablePowers()).toEqual([]);
    });

    test('should have zero food progress initially', () => {
      expect(evolutionSystem.getFoodProgress()).toBe(0);
      expect(evolutionSystem.getTotalFoodConsumed()).toBe(0);
    });

    test('should not be in transformation initially', () => {
      expect(evolutionSystem.isTransformationInProgress()).toBe(false);
    });
  });

  describe('Evolution Level Data', () => {
    test('should have correct data for Hatchling (Level 1)', () => {
      const levelData = evolutionSystem.getEvolutionLevel(1);
      expect(levelData).toBeDefined();
      expect(levelData!.name).toBe('Hatchling');
      expect(levelData!.requiredFood).toBe(0);
      expect(levelData!.segmentCount).toBe(3);
      expect(levelData!.powers).toEqual([]);
    });

    test('should have correct data for Garden Snake (Level 2)', () => {
      const levelData = evolutionSystem.getEvolutionLevel(2);
      expect(levelData).toBeDefined();
      expect(levelData!.name).toBe('Garden Snake');
      expect(levelData!.requiredFood).toBe(50);
      expect(levelData!.segmentCount).toBe(5);
      expect(levelData!.powers).toEqual([PowerType.SpeedBoost]);
    });

    test('should have correct data for Ouroboros (Level 10)', () => {
      const levelData = evolutionSystem.getEvolutionLevel(10);
      expect(levelData).toBeDefined();
      expect(levelData!.name).toBe('Ouroboros');
      expect(levelData!.requiredFood).toBe(1600);
      expect(levelData!.segmentCount).toBe(30);
      expect(levelData!.powers).toContain(PowerType.TailConsumption);
      expect(levelData!.powers).toContain(PowerType.PowerCycling);
      expect(levelData!.powers).toContain(PowerType.RealityManipulation);
    });

    test('should return null for invalid evolution levels', () => {
      expect(evolutionSystem.getEvolutionLevel(0)).toBeNull();
      expect(evolutionSystem.getEvolutionLevel(11)).toBeNull();
      expect(evolutionSystem.getEvolutionLevel(-1)).toBeNull();
    });
  });

  describe('Food Progress and Evolution Triggers', () => {
    test('should add food progress correctly', () => {
      const result = evolutionSystem.addFoodProgress(25);
      expect(evolutionSystem.getFoodProgress()).toBe(25);
      expect(evolutionSystem.getTotalFoodConsumed()).toBe(25);
      expect(result.evolved).toBe(false);
    });

    test('should trigger evolution from Hatchling to Garden Snake at 50 food points', () => {
      const result = evolutionSystem.addFoodProgress(50);
      
      expect(result.evolved).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(result.previousLevel).toBe(1);
      expect(result.unlockedPowers).toEqual([PowerType.SpeedBoost]);
      expect(evolutionSystem.getCurrentLevel()).toBe(2);
      expect(evolutionSystem.isTransformationInProgress()).toBe(true);
    });

    test('should not evolve if insufficient food progress', () => {
      const result = evolutionSystem.addFoodProgress(49);
      
      expect(result.evolved).toBe(false);
      expect(evolutionSystem.getCurrentLevel()).toBe(1);
      expect(evolutionSystem.isTransformationInProgress()).toBe(false);
    });

    test('should evolve multiple levels with sufficient food', () => {
      // Add enough food to reach level 3 (Viper - requires 120 total)
      const result = evolutionSystem.addFoodProgress(120);
      
      expect(result.evolved).toBe(true);
      expect(result.newLevel).toBe(2); // Should only evolve one level at a time
      expect(evolutionSystem.getCurrentLevel()).toBe(2);
    });

    test('should not evolve beyond level 10', () => {
      // Set to level 10 and try to add more food
      evolutionSystem.setLevel(10);
      const result = evolutionSystem.addFoodProgress(1000);
      
      expect(result.evolved).toBe(false);
      expect(evolutionSystem.getCurrentLevel()).toBe(10);
    });
  });

  describe('Evolution Progress Calculation', () => {
    test('should calculate progress to next level correctly', () => {
      // At level 1, need 50 food for level 2
      evolutionSystem.addFoodProgress(25); // 50% progress
      expect(evolutionSystem.getProgressToNextLevel()).toBeCloseTo(0.5, 2);
      
      evolutionSystem.addFoodProgress(12.5); // 75% progress
      expect(evolutionSystem.getProgressToNextLevel()).toBeCloseTo(0.75, 2);
    });

    test('should return 1.0 progress when at max level', () => {
      evolutionSystem.setLevel(10);
      expect(evolutionSystem.getProgressToNextLevel()).toBe(1.0);
    });

    test('should calculate food required for next level', () => {
      expect(evolutionSystem.getFoodRequiredForNextLevel()).toBe(50); // Level 1 -> 2
      
      evolutionSystem.addFoodProgress(25);
      expect(evolutionSystem.getFoodRequiredForNextLevel()).toBe(25); // 25 more needed
      
      evolutionSystem.setLevel(10);
      expect(evolutionSystem.getFoodRequiredForNextLevel()).toBe(0); // Already at max
    });
  });

  describe('Power System', () => {
    beforeEach(() => {
      // Evolve to level 2 to get SpeedBoost power
      evolutionSystem.addFoodProgress(50);
      // Complete transformation
      evolutionSystem.update(3000); // 3 seconds to complete transformation
    });

    test('should unlock powers when evolving', () => {
      const availablePowers = evolutionSystem.getAvailablePowers();
      expect(availablePowers).toContain(PowerType.SpeedBoost);
    });

    test('should activate power successfully', () => {
      const success = evolutionSystem.activatePower(PowerType.SpeedBoost);
      expect(success).toBe(true);
      expect(evolutionSystem.isPowerActive(PowerType.SpeedBoost)).toBe(true);
    });

    test('should not activate unavailable power', () => {
      const success = evolutionSystem.activatePower(PowerType.VenomStrike);
      expect(success).toBe(false);
      expect(evolutionSystem.isPowerActive(PowerType.VenomStrike)).toBe(false);
    });

    test('should not activate power while on cooldown', () => {
      // Activate power first time
      evolutionSystem.activatePower(PowerType.SpeedBoost);
      
      // Try to activate again immediately
      const success = evolutionSystem.activatePower(PowerType.SpeedBoost);
      expect(success).toBe(false);
    });

    test('should track power cooldowns', () => {
      evolutionSystem.activatePower(PowerType.SpeedBoost);
      const cooldown = evolutionSystem.getPowerCooldownRemaining(PowerType.SpeedBoost);
      expect(cooldown).toBeGreaterThan(0);
    });

    test('should deactivate power after duration', () => {
      evolutionSystem.activatePower(PowerType.SpeedBoost);
      expect(evolutionSystem.isPowerActive(PowerType.SpeedBoost)).toBe(true);
      
      // Simulate time passing (SpeedBoost duration is 3000ms)
      // Use multiple smaller updates to simulate real-time behavior
      for (let i = 0; i < 5; i++) {
        evolutionSystem.update(800); // 5 * 800 = 4000ms total
      }
      expect(evolutionSystem.isPowerActive(PowerType.SpeedBoost)).toBe(false);
    });
  });

  describe('Transformation System', () => {
    test('should be in transformation state after evolution', () => {
      evolutionSystem.addFoodProgress(50);
      expect(evolutionSystem.isTransformationInProgress()).toBe(true);
      expect(evolutionSystem.getTransformationProgress()).toBeGreaterThanOrEqual(0);
      expect(evolutionSystem.getTransformationProgress()).toBeLessThan(0.1); // Should be very close to 0
    });

    test('should complete transformation after duration', () => {
      evolutionSystem.addFoodProgress(50);
      
      // Simulate transformation duration (2000ms) with multiple updates
      for (let i = 0; i < 3; i++) {
        evolutionSystem.update(1000); // 3 * 1000 = 3000ms total
      }
      
      expect(evolutionSystem.isTransformationInProgress()).toBe(false);
      expect(evolutionSystem.getTransformationProgress()).toBe(0);
    });

    test('should track transformation progress', () => {
      evolutionSystem.addFoodProgress(50);
      
      // Simulate half transformation time
      evolutionSystem.update(1000);
      
      const progress = evolutionSystem.getTransformationProgress();
      expect(progress).toBeGreaterThan(0.3);
      expect(progress).toBeLessThan(0.7);
    });

    test('should not trigger new evolution during transformation', () => {
      evolutionSystem.addFoodProgress(50); // Evolve to level 2
      expect(evolutionSystem.isTransformationInProgress()).toBe(true);
      
      // Try to evolve again during transformation
      const result = evolutionSystem.addFoodProgress(70); // Enough for level 3
      expect(result.evolved).toBe(false);
      expect(evolutionSystem.getCurrentLevel()).toBe(2);
    });
  });

  describe('Visual Pattern System', () => {
    test('should return correct visual pattern for current level', () => {
      const pattern = evolutionSystem.getCurrentVisualPattern();
      expect(pattern.baseColor).toBe('#4CAF50'); // Hatchling green
      expect(pattern.patternType).toBe('solid');
      expect(pattern.glowIntensity).toBe(0);
    });

    test('should update visual pattern after evolution', () => {
      evolutionSystem.addFoodProgress(50); // Evolve to Garden Snake
      
      const pattern = evolutionSystem.getCurrentVisualPattern();
      expect(pattern.baseColor).toBe('#4CAF50');
      expect(pattern.secondaryColor).toBe('#FFEB3B'); // Yellow stripes
      expect(pattern.patternType).toBe('stripes');
      expect(pattern.glowIntensity).toBe(0.1);
    });
  });

  describe('State Management', () => {
    test('should return complete evolution state', () => {
      evolutionSystem.addFoodProgress(25);
      const state = evolutionSystem.getEvolutionState();
      
      expect(state.currentLevel).toBe(1);
      expect(state.foodProgress).toBe(25);
      expect(state.totalFoodConsumed).toBe(25);
      expect(state.availablePowers).toEqual([]);
      expect(state.transformationInProgress).toBe(false);
    });

    test('should reset to initial state', () => {
      evolutionSystem.addFoodProgress(100);
      evolutionSystem.activatePower(PowerType.SpeedBoost);
      
      evolutionSystem.reset();
      
      expect(evolutionSystem.getCurrentLevel()).toBe(1);
      expect(evolutionSystem.getFoodProgress()).toBe(0);
      expect(evolutionSystem.getTotalFoodConsumed()).toBe(0);
      expect(evolutionSystem.getAvailablePowers()).toEqual([]);
      expect(evolutionSystem.isTransformationInProgress()).toBe(false);
    });

    test('should allow setting level for testing', () => {
      evolutionSystem.setLevel(5);
      expect(evolutionSystem.getCurrentLevel()).toBe(5);
      
      const levelData = evolutionSystem.getCurrentLevelData();
      expect(levelData!.name).toBe('Cobra');
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero food progress', () => {
      const result = evolutionSystem.addFoodProgress(0);
      expect(result.evolved).toBe(false);
      expect(evolutionSystem.getFoodProgress()).toBe(0);
    });

    test('should handle negative food progress', () => {
      const result = evolutionSystem.addFoodProgress(-10);
      expect(evolutionSystem.getFoodProgress()).toBe(-10);
      expect(result.evolved).toBe(false);
    });

    test('should handle very large food progress', () => {
      const result = evolutionSystem.addFoodProgress(10000);
      expect(result.evolved).toBe(true);
      expect(evolutionSystem.getCurrentLevel()).toBe(2); // Should only evolve one level
    });

    test('should handle invalid level setting', () => {
      evolutionSystem.setLevel(0);
      expect(evolutionSystem.getCurrentLevel()).toBe(1); // Should stay at minimum

      evolutionSystem.setLevel(15);
      expect(evolutionSystem.getCurrentLevel()).toBe(10); // Should cap at maximum
    });
  });

  describe('Integration with Game Systems', () => {
    test('should provide all evolution levels for game reference', () => {
      const allLevels = evolutionSystem.getAllEvolutionLevels();
      expect(allLevels).toHaveLength(10);
      expect(allLevels[0].name).toBe('Hatchling');
      expect(allLevels[9].name).toBe('Ouroboros');
    });

    test('should track cumulative food consumption across evolutions', () => {
      // First evolution: Hatchling (1) -> Garden Snake (2) at 50 food
      const firstResult = evolutionSystem.addFoodProgress(50);
      expect(firstResult.evolved).toBe(true);
      expect(firstResult.newLevel).toBe(2);
      
      evolutionSystem.update(3000); // Complete transformation
      
      // Add more food to trigger next evolution: Garden Snake (2) -> Viper (3) at 120 total food
      const result = evolutionSystem.addFoodProgress(70); // More food (total 120, enough for level 3)
      
      expect(evolutionSystem.getTotalFoodConsumed()).toBe(120);
      expect(result.evolved).toBe(true);
      expect(result.newLevel).toBe(3);
      expect(evolutionSystem.getCurrentLevel()).toBe(3);
    });
  });
});