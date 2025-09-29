import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FoodManager } from '../core/FoodManager';
import { GameConfig, Vector2, FoodType, EffectType } from '../types/game';

describe('FoodManager', () => {
  let foodManager: FoodManager;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    foodManager = new FoodManager(config);
    
    // Mock performance.now for consistent testing
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  describe('Initialization', () => {
    it('should initialize with empty food state', () => {
      const state = foodManager.getFoodState();
      expect(state.activeFoods).toHaveLength(0);
      expect(state.spawnTimer).toBe(0);
      expect(state.maxSimultaneousFoods).toBe(6);
      expect(state.minSimultaneousFoods).toBe(3);
      expect(state.recentConsumptions).toHaveLength(0);
      expect(state.activeEffects).toHaveLength(0);
    });

    it('should initialize with correct spawn interval', () => {
      const state = foodManager.getFoodState();
      expect(state.spawnInterval).toBe(2000);
    });

    it('should initialize all food definitions', () => {
      const definitions = foodManager.getAllFoodDefinitions();
      expect(definitions).toHaveLength(10);
      
      // Check that all food types are defined
      const foodTypes = definitions.map(def => def.type);
      expect(foodTypes).toContain(FoodType.BasicBerry);
      expect(foodTypes).toContain(FoodType.WildMushroom);
      expect(foodTypes).toContain(FoodType.CrystalFruit);
      expect(foodTypes).toContain(FoodType.VenomousFlower);
      expect(foodTypes).toContain(FoodType.AquaticPlant);
      expect(foodTypes).toContain(FoodType.RainbowNectar);
      expect(foodTypes).toContain(FoodType.StardustBerry);
      expect(foodTypes).toContain(FoodType.DragonScale);
      expect(foodTypes).toContain(FoodType.EternalOrb);
      expect(foodTypes).toContain(FoodType.OuroborosEssence);
    });

    it('should initialize food combinations', () => {
      const combinations = foodManager.getFoodCombinations();
      expect(combinations.length).toBeGreaterThan(0);
      
      // Check for specific combinations
      const combinationNames = combinations.map(combo => combo.name);
      expect(combinationNames).toContain('Nature\'s Bounty');
      expect(combinationNames).toContain('Divine Transcendence');
    });
  });

  describe('Food Spawning', () => {
    it('should spawn food when below minimum count', () => {
      const snakePositions: Vector2[] = [{ x: 25, y: 17 }];
      
      foodManager.update(100, snakePositions, [], 1);
      
      const foodCount = foodManager.getFoodCount();
      expect(foodCount).toBeGreaterThanOrEqual(1);
      expect(foodCount).toBeLessThanOrEqual(3);
    });

    it('should spawn 3-6 foods simultaneously when starting', () => {
      const snakePositions: Vector2[] = [{ x: 25, y: 17 }];
      
      // Update multiple times to trigger spawning
      for (let i = 0; i < 5; i++) {
        foodManager.update(500, snakePositions, [], 1);
      }
      
      const foodCount = foodManager.getFoodCount();
      expect(foodCount).toBeGreaterThanOrEqual(3);
      expect(foodCount).toBeLessThanOrEqual(6);
    });

    it('should not spawn food on occupied positions', () => {
      const snakePositions: Vector2[] = [];
      
      // Fill most of the grid with snake positions
      for (let x = 0; x < config.gridWidth; x++) {
        for (let y = 0; y < config.gridHeight - 1; y++) {
          snakePositions.push({ x, y });
        }
      }
      
      foodManager.update(100, snakePositions, [], 1);
      
      const foods = foodManager.getActiveFoods();
      foods.forEach(food => {
        const isOnSnake = snakePositions.some(pos => 
          pos.x === food.position.x && pos.y === food.position.y
        );
        expect(isOnSnake).toBe(false);
      });
    });

    it('should create Basic Berry food with correct properties', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      
      expect(food).not.toBeNull();
      expect(food!.type).toBe(FoodType.BasicBerry);
      expect(food!.evolutionLevel).toBe(1);
      expect(food!.points).toBe(10);
      expect(food!.position).toEqual({ x: 10, y: 10 });
      expect(food!.isSpecial).toBe(false);
      expect(food!.effects).toHaveLength(1);
      expect(food!.effects[0].type).toBe(EffectType.Growth);
      expect(food!.effects[0].magnitude).toBe(1);
    });
  });

  describe('Food Consumption', () => {
    it('should successfully consume existing food', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      expect(food).not.toBeNull();
      
      const result = foodManager.consumeFood(food!.id, 1);
      
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(12); // 10 * 1.2 bonus for exact level match
      expect(result.segmentsToGrow).toBe(1);
      expect(result.evolutionProgress).toBe(12);
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].type).toBe(EffectType.Growth);
    });

    it('should remove food from active list after consumption', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      expect(food).not.toBeNull();
      
      const initialCount = foodManager.getFoodCount();
      foodManager.consumeFood(food!.id, 1);
      
      expect(foodManager.getFoodCount()).toBe(initialCount - 1);
      expect(foodManager.getFoodAtPosition({ x: 10, y: 10 })).toBeNull();
    });

    it('should fail to consume non-existent food', () => {
      const result = foodManager.consumeFood('non-existent-id', 1);
      
      expect(result.success).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.segmentsToGrow).toBe(0);
      expect(result.evolutionProgress).toBe(0);
      expect(result.effects).toHaveLength(0);
    });

    it('should handle Basic Berry consumption for different evolution levels', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      expect(food).not.toBeNull();
      
      // Test consumption at level 1 (exact match)
      const result1 = foodManager.consumeFood(food!.id, 1);
      expect(result1.success).toBe(true);
      expect(result1.pointsAwarded).toBe(12); // Bonus for exact match
      
      const food2 = foodManager.forceSpawnFood({ x: 11, y: 10 }, FoodType.BasicBerry);
      // Test consumption at level 3 (still appropriate)
      const result2 = foodManager.consumeFood(food2!.id, 3);
      expect(result2.success).toBe(true);
      expect(result2.pointsAwarded).toBe(10); // No bonus but still appropriate
    });
  });

  describe('Food Position Management', () => {
    it('should find food at specific position', () => {
      const position = { x: 15, y: 20 };
      const food = foodManager.forceSpawnFood(position);
      
      const foundFood = foodManager.getFoodAtPosition(position);
      expect(foundFood).not.toBeNull();
      expect(foundFood!.id).toBe(food!.id);
      expect(foundFood!.position).toEqual(position);
    });

    it('should return null for position without food', () => {
      const foundFood = foodManager.getFoodAtPosition({ x: 30, y: 25 });
      expect(foundFood).toBeNull();
    });

    it('should handle fractional positions correctly', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 });
      
      // Should find food even with fractional coordinates
      const foundFood = foodManager.getFoodAtPosition({ x: 10.7, y: 10.3 });
      expect(foundFood).not.toBeNull();
      expect(foundFood!.id).toBe(food!.id);
    });
  });

  describe('Configuration Management', () => {
    it('should update spawn interval', () => {
      foodManager.setSpawnInterval(5000);
      const state = foodManager.getFoodState();
      expect(state.spawnInterval).toBe(5000);
    });

    it('should enforce minimum spawn interval', () => {
      foodManager.setSpawnInterval(100); // Below minimum
      const state = foodManager.getFoodState();
      expect(state.spawnInterval).toBe(500); // Should be clamped to minimum
    });

    it('should update maximum simultaneous foods', () => {
      foodManager.setMaxSimultaneousFoods(10);
      const state = foodManager.getFoodState();
      expect(state.maxSimultaneousFoods).toBe(10);
    });

    it('should enforce maximum simultaneous foods limits', () => {
      foodManager.setMaxSimultaneousFoods(25); // Above maximum
      const state = foodManager.getFoodState();
      expect(state.maxSimultaneousFoods).toBe(20); // Should be clamped
      
      foodManager.setMaxSimultaneousFoods(0); // Below minimum
      const state2 = foodManager.getFoodState();
      expect(state2.maxSimultaneousFoods).toBe(1); // Should be clamped to minimum
    });

    it('should update minimum simultaneous foods', () => {
      foodManager.setMinSimultaneousFoods(2);
      const state = foodManager.getFoodState();
      expect(state.minSimultaneousFoods).toBe(2);
    });

    it('should enforce minimum foods does not exceed maximum', () => {
      foodManager.setMaxSimultaneousFoods(4);
      foodManager.setMinSimultaneousFoods(6); // Above maximum
      const state = foodManager.getFoodState();
      expect(state.minSimultaneousFoods).toBe(4); // Should be clamped to max
    });
  });

  describe('Food State Management', () => {
    it('should clear all food', () => {
      foodManager.forceSpawnFood({ x: 10, y: 10 });
      foodManager.forceSpawnFood({ x: 15, y: 15 });
      
      expect(foodManager.getFoodCount()).toBe(2);
      
      foodManager.clearAllFood();
      expect(foodManager.getFoodCount()).toBe(0);
      expect(foodManager.getActiveFoods()).toHaveLength(0);
    });

    it('should return copy of active foods array', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 });
      const foods1 = foodManager.getActiveFoods();
      const foods2 = foodManager.getActiveFoods();
      
      expect(foods1).not.toBe(foods2); // Different array instances
      expect(foods1).toEqual(foods2); // Same content
      expect(foods1[0].id).toBe(food!.id);
    });

    it('should return copy of food state', () => {
      const state1 = foodManager.getFoodState();
      const state2 = foodManager.getFoodState();
      
      expect(state1).not.toBe(state2); // Different object instances
      expect(state1.activeFoods).not.toBe(state2.activeFoods); // Different array instances
      expect(state1).toEqual(state2); // Same content
    });
  });

  describe('Spawn Timing', () => {
    it('should respect spawn interval timing', () => {
      const snakePositions: Vector2[] = [{ x: 25, y: 17 }];
      
      // Clear any existing food and set up controlled state
      foodManager.clearAllFood();
      foodManager.setMinSimultaneousFoods(1);
      foodManager.setMaxSimultaneousFoods(2);
      
      // First update should spawn food (below minimum)
      foodManager.update(100, snakePositions, [], 1);
      const initialCount = foodManager.getFoodCount();
      expect(initialCount).toBeGreaterThan(0);
      
      // If we're at max capacity, no more should spawn immediately
      if (initialCount >= 2) {
        foodManager.update(100, snakePositions, [], 1);
        expect(foodManager.getFoodCount()).toBe(initialCount);
      }
      
      // Update with sufficient time should allow more spawning if under max
      vi.spyOn(performance, 'now').mockReturnValue(4000); // 3 seconds later
      foodManager.update(100, snakePositions, [], 1);
      expect(foodManager.getFoodCount()).toBeGreaterThanOrEqual(initialCount);
      expect(foodManager.getFoodCount()).toBeLessThanOrEqual(2); // Should not exceed max
    });

    it('should spawn immediately when below minimum foods', () => {
      const snakePositions: Vector2[] = [{ x: 25, y: 17 }];
      
      // Clear any existing food
      foodManager.clearAllFood();
      expect(foodManager.getFoodCount()).toBe(0);
      
      // Should spawn immediately since we're below minimum
      foodManager.update(100, snakePositions, [], 1);
      expect(foodManager.getFoodCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Evolution-Specific Food System', () => {
    it('should spawn appropriate foods based on snake evolution level', () => {
      const snakePositions: Vector2[] = [{ x: 25, y: 17 }];
      
      // Test level 1 snake - should get mostly basic foods
      foodManager.update(100, snakePositions, [], 1);
      let foods = foodManager.getActiveFoods();
      const basicFoods = foods.filter(food => food.evolutionLevel <= 3);
      expect(basicFoods.length).toBeGreaterThan(0);
      
      foodManager.clearAllFood();
      
      // Test level 5 snake - should get mid-tier foods
      foodManager.update(100, snakePositions, [], 5);
      foods = foodManager.getActiveFoods();
      const midTierFoods = foods.filter(food => food.evolutionLevel >= 3 && food.evolutionLevel <= 7);
      expect(midTierFoods.length).toBeGreaterThan(0);
    });

    it('should create foods with correct properties for each type', () => {
      const basicBerry = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      expect(basicBerry!.evolutionLevel).toBe(1);
      expect(basicBerry!.points).toBe(10);
      expect(basicBerry!.isSpecial).toBe(false);

      const eternalOrb = foodManager.forceSpawnFood({ x: 11, y: 10 }, FoodType.EternalOrb);
      expect(eternalOrb!.evolutionLevel).toBe(9);
      expect(eternalOrb!.points).toBe(150);
      expect(eternalOrb!.isSpecial).toBe(true);
    });

    it('should handle appropriate level consumption correctly', () => {
      // Level 3 snake consuming Level 3 food (exact match)
      const result = foodManager.simulateConsumption(FoodType.CrystalFruit, 3);
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(30); // 25 * 1.2 bonus for exact match
      expect(result.segmentsToGrow).toBe(2);
      expect(result.evolutionProgress).toBe(30);
      expect(result.effects.some(effect => effect.type === EffectType.Growth)).toBe(true);
    });

    it('should handle inappropriate level consumption with negative effects', () => {
      // Level 1 snake consuming Level 5 food (too high)
      const result = foodManager.simulateConsumption(FoodType.AquaticPlant, 1);
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(12); // 40 * 0.3 penalty
      expect(result.evolutionProgress).toBe(1); // Very low evolution progress
      expect(result.effects.some(effect => effect.type === EffectType.ReversedControls)).toBe(true);
      expect(result.effects.some(effect => effect.type === EffectType.SlowDown)).toBe(true);
    });

    it('should prevent consumption of foods too high level', () => {
      // Level 1 snake consuming Level 10 food (way too high)
      const result = foodManager.simulateConsumption(FoodType.OuroborosEssence, 1);
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(60); // 200 * 0.3 penalty
      expect(result.segmentsToGrow).toBe(-5); // Segment loss
      expect(result.effects.some(effect => effect.type === EffectType.Poison)).toBe(true);
      expect(result.effects.some(effect => effect.type === EffectType.SegmentLoss)).toBe(true);
    });
  });

  describe('Food Combination System', () => {
    it('should detect simple food combinations', () => {
      // Consume BasicBerry and WildMushroom for Nature's Bounty
      const food1 = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      const food2 = foodManager.forceSpawnFood({ x: 11, y: 10 }, FoodType.WildMushroom);
      
      foodManager.consumeFood(food1!.id, 2);
      const result = foodManager.consumeFood(food2!.id, 2);
      
      expect(result.pointsAwarded).toBeGreaterThan(15); // Should have bonus multiplier
      expect(result.effects.some(effect => effect.type === EffectType.Regeneration)).toBe(true);
    });

    it('should detect complex food combinations', () => {
      // Test Evolution Chain combination (3 foods)
      const food1 = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      const food2 = foodManager.forceSpawnFood({ x: 11, y: 10 }, FoodType.CrystalFruit);
      const food3 = foodManager.forceSpawnFood({ x: 12, y: 10 }, FoodType.StardustBerry);
      
      foodManager.consumeFood(food1!.id, 5);
      foodManager.consumeFood(food2!.id, 5);
      const result = foodManager.consumeFood(food3!.id, 5);
      
      expect(result.pointsAwarded).toBeGreaterThan(75); // Should have 4x multiplier
      expect(result.effects.some(effect => effect.type === EffectType.EvolutionBoost)).toBe(true);
    });

    it('should not apply combination bonus for non-matching foods', () => {
      const food1 = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      const food2 = foodManager.forceSpawnFood({ x: 11, y: 10 }, FoodType.DragonScale);
      
      foodManager.consumeFood(food1!.id, 5);
      const result = foodManager.consumeFood(food2!.id, 5);
      
      expect(result.pointsAwarded).toBe(30); // 100 * 0.3 (no combination bonus)
    });

    it('should track recent consumptions for combinations', () => {
      const food1 = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      foodManager.consumeFood(food1!.id, 1);
      
      const recentConsumptions = foodManager.getRecentConsumptions();
      expect(recentConsumptions).toHaveLength(1);
      expect(recentConsumptions[0].type).toBe(FoodType.BasicBerry);
    });

    it('should clean up old consumption history', () => {
      const food1 = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      foodManager.consumeFood(food1!.id, 1);
      
      // Mock time passing
      vi.spyOn(performance, 'now').mockReturnValue(15000); // 14 seconds later
      
      foodManager.update(100, [{ x: 25, y: 17 }], [], 1);
      
      const recentConsumptions = foodManager.getRecentConsumptions();
      expect(recentConsumptions).toHaveLength(0); // Should be cleaned up
    });
  });

  describe('Active Effects System', () => {
    it('should track active effects from food consumption', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.WildMushroom);
      foodManager.consumeFood(food!.id, 2);
      
      const activeEffects = foodManager.getActiveEffects();
      expect(activeEffects.some(effect => effect.type === EffectType.SpeedBoost)).toBe(true);
    });

    it('should update effect durations over time', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.WildMushroom);
      foodManager.consumeFood(food!.id, 2);
      
      let activeEffects = foodManager.getActiveEffects();
      const initialDuration = activeEffects.find(effect => effect.type === EffectType.SpeedBoost)?.duration || 0;
      
      foodManager.update(1000, [{ x: 25, y: 17 }], [], 2); // 1 second passes
      
      activeEffects = foodManager.getActiveEffects();
      const updatedDuration = activeEffects.find(effect => effect.type === EffectType.SpeedBoost)?.duration || 0;
      
      expect(updatedDuration).toBeLessThan(initialDuration);
    });

    it('should remove expired effects', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.WildMushroom);
      foodManager.consumeFood(food!.id, 2);
      
      // Fast forward past effect duration
      foodManager.update(5000, [{ x: 25, y: 17 }], [], 2); // 5 seconds
      
      const activeEffects = foodManager.getActiveEffects();
      expect(activeEffects.some(effect => effect.type === EffectType.SpeedBoost)).toBe(false);
    });

    it('should provide helper methods for checking active effects', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.WildMushroom);
      foodManager.consumeFood(food!.id, 2);
      
      expect(foodManager.hasActiveEffect(EffectType.SpeedBoost)).toBe(true);
      expect(foodManager.hasActiveEffect(EffectType.Poison)).toBe(false);
      
      const magnitude = foodManager.getActiveEffectMagnitude(EffectType.SpeedBoost);
      expect(magnitude).toBe(1.2);
    });

    it('should clear active effects when requested', () => {
      const food = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.WildMushroom);
      foodManager.consumeFood(food!.id, 2);
      
      expect(foodManager.getActiveEffects()).toHaveLength(1);
      
      foodManager.clearActiveEffects();
      expect(foodManager.getActiveEffects()).toHaveLength(0);
    });
  });

  describe('Food Definition System', () => {
    it('should provide access to food definitions', () => {
      const basicBerryDef = foodManager.getFoodDefinition(FoodType.BasicBerry);
      expect(basicBerryDef).toBeDefined();
      expect(basicBerryDef!.name).toBe('Basic Berry');
      expect(basicBerryDef!.evolutionLevel).toBe(1);
      expect(basicBerryDef!.basePoints).toBe(10);
    });

    it('should have correct evolution level progression', () => {
      const definitions = foodManager.getAllFoodDefinitions();
      const sortedByLevel = definitions.sort((a, b) => a.evolutionLevel - b.evolutionLevel);
      
      expect(sortedByLevel[0].evolutionLevel).toBe(1); // BasicBerry
      expect(sortedByLevel[sortedByLevel.length - 1].evolutionLevel).toBe(10); // OuroborosEssence
    });

    it('should have appropriate spawn weights', () => {
      const basicBerry = foodManager.getFoodDefinition(FoodType.BasicBerry);
      const ouroborosEssence = foodManager.getFoodDefinition(FoodType.OuroborosEssence);
      
      expect(basicBerry!.spawnWeight).toBeGreaterThan(ouroborosEssence!.spawnWeight);
    });

    it('should have negative effects for higher level foods', () => {
      const eternalOrb = foodManager.getFoodDefinition(FoodType.EternalOrb);
      expect(eternalOrb!.negativeEffects).toBeDefined();
      expect(eternalOrb!.negativeEffects!.length).toBeGreaterThan(0);
      expect(eternalOrb!.negativeEffects!.some(effect => effect.type === EffectType.Poison)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty snake positions', () => {
      expect(() => {
        foodManager.update(100, [], [], 1);
      }).not.toThrow();
      
      expect(foodManager.getFoodCount()).toBeGreaterThan(0);
    });

    it('should handle obstacle positions', () => {
      const snakePositions: Vector2[] = [{ x: 25, y: 17 }];
      const obstaclePositions: Vector2[] = [{ x: 10, y: 10 }, { x: 20, y: 20 }];
      
      foodManager.update(100, snakePositions, obstaclePositions, 1);
      
      const foods = foodManager.getActiveFoods();
      foods.forEach(food => {
        const isOnObstacle = obstaclePositions.some(pos => 
          pos.x === food.position.x && pos.y === food.position.y
        );
        expect(isOnObstacle).toBe(false);
      });
    });

    it('should handle invalid food type in simulation', () => {
      const result = foodManager.simulateConsumption('InvalidFoodType' as FoodType, 1);
      expect(result.success).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it('should handle consumption history cleanup', () => {
      foodManager.clearConsumptionHistory();
      expect(foodManager.getRecentConsumptions()).toHaveLength(0);
    });

    it('should handle grid boundaries correctly', () => {
      const snakePositions: Vector2[] = [{ x: 25, y: 17 }];
      
      foodManager.update(100, snakePositions, [], 1);
      
      const foods = foodManager.getActiveFoods();
      foods.forEach(food => {
        expect(food.position.x).toBeGreaterThanOrEqual(0);
        expect(food.position.x).toBeLessThan(config.gridWidth);
        expect(food.position.y).toBeGreaterThanOrEqual(0);
        expect(food.position.y).toBeLessThan(config.gridHeight);
      });
    });

    it('should handle full grid scenario gracefully', () => {
      const snakePositions: Vector2[] = [];
      
      // Fill entire grid
      for (let x = 0; x < config.gridWidth; x++) {
        for (let y = 0; y < config.gridHeight; y++) {
          snakePositions.push({ x, y });
        }
      }
      
      expect(() => {
        foodManager.update(100, snakePositions, [], 1);
      }).not.toThrow();
      
      // Should not spawn any food since grid is full
      expect(foodManager.getFoodCount()).toBe(0);
    });
  });
});