import { describe, it, expect, beforeEach } from 'vitest';
import { EvolutionSystem, PowerType } from '../core/EvolutionSystem';
import { PowerSystem } from '../core/PowerSystem';
import { VisualPatternManager } from '../core/VisualPatternManager';
import { GameConfig, Vector2 } from '../types/game';

describe('Advanced Evolution Levels (4-10)', () => {
  let evolutionSystem: EvolutionSystem;
  let powerSystem: PowerSystem;
  let visualPatternManager: VisualPatternManager;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };

    evolutionSystem = new EvolutionSystem(config);
    powerSystem = new PowerSystem(config);
    visualPatternManager = new VisualPatternManager();
  });

  describe('Level 4: Python', () => {
    beforeEach(() => {
      // Set snake to Python level
      evolutionSystem.setLevel(4);
    });

    it('should have correct visual pattern for Python', () => {
      const pattern = visualPatternManager.getPatternForLevel(4);
      
      expect(pattern.baseColor).toBe('#8D6E63'); // Medium brown
      expect(pattern.secondaryColor).toBe('#3E2723'); // Dark brown
      expect(pattern.patternType).toBe('reticulated');
      expect(pattern.scaleTexture).toBe('reticulated');
      expect(pattern.glowIntensity).toBe(0.3);
      expect(pattern.animationSpeed).toBe(1.0);
    });

    it('should have Constrict power available', () => {
      const availablePowers = evolutionSystem.getAvailablePowers();
      expect(availablePowers).toContain(PowerType.Constrict);
    });

    it('should be able to activate Constrict power', () => {
      powerSystem.initializePower(PowerType.Constrict);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.Constrict, position, direction);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.Constrict);
      expect(result.effects.length).toBeGreaterThan(0);
    });

    it('should be able to activate pressure plates when Constrict is active', () => {
      powerSystem.initializePower(PowerType.Constrict);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.Constrict, position, direction);
      
      expect(powerSystem.canActivatePressurePlate()).toBe(true);
    });

    it('should provide double food value when Constrict is active', () => {
      powerSystem.initializePower(PowerType.Constrict);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.Constrict, position, direction);
      
      expect(powerSystem.getDoubleFoodValueMultiplier()).toBe(2.0);
    });

    it('should have correct segment count for Python', () => {
      const levelData = evolutionSystem.getCurrentLevelData();
      expect(levelData?.segmentCount).toBe(10);
    });
  });

  describe('Level 5: Cobra', () => {
    beforeEach(() => {
      // Set snake to Cobra level
      evolutionSystem.setLevel(5);
    });

    it('should have correct visual pattern for Cobra', () => {
      const pattern = visualPatternManager.getPatternForLevel(5);
      
      expect(pattern.baseColor).toBe('#424242'); // Dark gray
      expect(pattern.secondaryColor).toBe('#FFC107'); // Golden yellow
      expect(pattern.patternType).toBe('hooded');
      expect(pattern.scaleTexture).toBe('hooded');
      expect(pattern.glowIntensity).toBe(0.4);
      expect(pattern.animationSpeed).toBe(1.3);
    });

    it('should have Hood Expansion power available', () => {
      const availablePowers = evolutionSystem.getAvailablePowers();
      expect(availablePowers).toContain(PowerType.HoodExpansion);
    });

    it('should be able to activate Hood Expansion power', () => {
      powerSystem.initializePower(PowerType.HoodExpansion);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.HoodExpansion, position, direction);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.HoodExpansion);
      expect(result.effects.length).toBeGreaterThan(0);
    });

    it('should provide invincibility when Hood Expansion is active', () => {
      powerSystem.initializePower(PowerType.HoodExpansion);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.HoodExpansion, position, direction);
      
      expect(powerSystem.isInvincible()).toBe(true);
    });

    it('should have correct cooldown for Hood Expansion', () => {
      powerSystem.initializePower(PowerType.HoodExpansion);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.HoodExpansion, position, direction);
      
      expect(powerSystem.getPowerCooldown(PowerType.HoodExpansion)).toBe(15000); // 15 seconds
    });

    it('should have correct segment count for Cobra', () => {
      const levelData = evolutionSystem.getCurrentLevelData();
      expect(levelData?.segmentCount).toBe(12);
    });
  });

  describe('Level 6: Anaconda', () => {
    beforeEach(() => {
      // Set snake to Anaconda level
      evolutionSystem.setLevel(6);
    });

    it('should have correct visual pattern for Anaconda', () => {
      const pattern = visualPatternManager.getPatternForLevel(6);
      
      expect(pattern.baseColor).toBe('#2E7D32'); // Dark green
      expect(pattern.secondaryColor).toBe('#1B5E20'); // Very dark green
      expect(pattern.patternType).toBe('aquatic');
      expect(pattern.scaleTexture).toBe('aquatic');
      expect(pattern.glowIntensity).toBe(0.5);
      expect(pattern.animationSpeed).toBe(0.9);
    });

    it('should have Aquatic Movement power available', () => {
      const availablePowers = evolutionSystem.getAvailablePowers();
      expect(availablePowers).toContain(PowerType.AquaticMovement);
    });

    it('should be able to traverse water with Aquatic Movement', () => {
      powerSystem.initializePower(PowerType.AquaticMovement);
      
      expect(powerSystem.canTraverseWater()).toBe(true);
    });

    it('should have regeneration ability when Aquatic Movement is available', () => {
      powerSystem.initializePower(PowerType.AquaticMovement);
      
      // Aquatic Movement is passive, so it should be considered "active" for regeneration
      expect(powerSystem.getRegenerationRate()).toBeGreaterThan(0);
    });

    it('should create regeneration effects', () => {
      powerSystem.initializePower(PowerType.AquaticMovement);
      
      const position: Vector2 = { x: 100, y: 100 };
      const effects = powerSystem.createRegenerationEffect(position);
      
      expect(effects.length).toBeGreaterThan(0);
      effects.forEach(effect => {
        expect(effect.color).toBe('#4CAF50'); // Green sparkles
      });
    });

    it('should have correct segment count for Anaconda', () => {
      const levelData = evolutionSystem.getCurrentLevelData();
      expect(levelData?.segmentCount).toBe(15);
    });
  });

  describe('Level 7: Rainbow Serpent', () => {
    beforeEach(() => {
      // Set snake to Rainbow Serpent level
      evolutionSystem.setLevel(7);
    });

    it('should have correct visual pattern for Rainbow Serpent', () => {
      const pattern = visualPatternManager.getPatternForLevel(7);
      
      expect(pattern.baseColor).toBe('#E91E63'); // Pink/magenta
      expect(pattern.secondaryColor).toBe('#9C27B0'); // Purple
      expect(pattern.patternType).toBe('rainbow');
      expect(pattern.scaleTexture).toBe('iridescent');
      expect(pattern.glowIntensity).toBe(0.6);
      expect(pattern.animationSpeed).toBe(1.4);
    });

    it('should have Color Change power available', () => {
      const availablePowers = evolutionSystem.getAvailablePowers();
      expect(availablePowers).toContain(PowerType.ColorChange);
    });

    it('should be able to activate Color Change power', () => {
      powerSystem.initializePower(PowerType.ColorChange);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.ColorChange, position, direction);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.ColorChange);
      expect(result.effects.length).toBeGreaterThan(0);
    });

    it('should provide invisibility when Color Change is active', () => {
      powerSystem.initializePower(PowerType.ColorChange);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.ColorChange, position, direction);
      
      expect(powerSystem.isInvisible()).toBe(true);
    });

    it('should allow consuming any food when Color Change is active', () => {
      powerSystem.initializePower(PowerType.ColorChange);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.ColorChange, position, direction);
      
      expect(powerSystem.canConsumeAnyFood()).toBe(true);
    });

    it('should have correct invisibility alpha when Color Change is active', () => {
      powerSystem.initializePower(PowerType.ColorChange);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.ColorChange, position, direction);
      
      expect(powerSystem.getInvisibilityAlpha()).toBe(0.3); // 30% opacity
    });

    it('should have correct segment count for Rainbow Serpent', () => {
      const levelData = evolutionSystem.getCurrentLevelData();
      expect(levelData?.segmentCount).toBe(18);
    });
  });

  describe('Visual Pattern Transitions', () => {
    it('should support transitions between advanced levels', () => {
      visualPatternManager.startTransition(4, 5); // Python to Cobra
      
      expect(visualPatternManager.isTransitioning()).toBe(true);
      
      const currentPattern = visualPatternManager.getCurrentPattern(4);
      expect(currentPattern).toBeDefined();
    });

    it('should validate all advanced level patterns', () => {
      for (let level = 4; level <= 7; level++) {
        const pattern = visualPatternManager.getPatternForLevel(level);
        expect(visualPatternManager.validatePattern(pattern)).toBe(true);
      }
    });
  });

  describe('Power System Integration', () => {
    it('should handle multiple active powers correctly', () => {
      evolutionSystem.setLevel(7); // Rainbow Serpent has all previous powers
      
      // Initialize all powers for level 7
      const availablePowers = evolutionSystem.getAvailablePowers();
      availablePowers.forEach(power => {
        powerSystem.initializePower(power);
      });

      expect(availablePowers).toContain(PowerType.SpeedBoost);
      expect(availablePowers).toContain(PowerType.VenomStrike);
      expect(availablePowers).toContain(PowerType.Constrict);
      expect(availablePowers).toContain(PowerType.HoodExpansion);
      expect(availablePowers).toContain(PowerType.AquaticMovement);
      expect(availablePowers).toContain(PowerType.ColorChange);
    });

    it('should respect power cooldowns for advanced powers', () => {
      powerSystem.initializePower(PowerType.Constrict);
      powerSystem.initializePower(PowerType.HoodExpansion);
      powerSystem.initializePower(PowerType.ColorChange);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      // Activate powers
      powerSystem.activatePower(PowerType.Constrict, position, direction);
      powerSystem.activatePower(PowerType.HoodExpansion, position, direction);
      powerSystem.activatePower(PowerType.ColorChange, position, direction);
      
      // Check cooldowns
      expect(powerSystem.getPowerCooldown(PowerType.Constrict)).toBe(10000);
      expect(powerSystem.getPowerCooldown(PowerType.HoodExpansion)).toBe(15000);
      expect(powerSystem.getPowerCooldown(PowerType.ColorChange)).toBe(12000);
    });

    it('should update power effects over time', () => {
      powerSystem.initializePower(PowerType.ColorChange);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.ColorChange, position, direction);
      
      const initialEffects = powerSystem.getActiveEffects();
      expect(initialEffects.length).toBeGreaterThan(0);
      
      // Update power system
      powerSystem.update(100); // 100ms
      
      const updatedEffects = powerSystem.getActiveEffects();
      expect(updatedEffects.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Specialized Abilities', () => {
    it('should activate special abilities correctly', () => {
      powerSystem.initializePower(PowerType.Constrict);
      powerSystem.initializePower(PowerType.HoodExpansion);
      powerSystem.initializePower(PowerType.AquaticMovement);
      powerSystem.initializePower(PowerType.ColorChange);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      // Activate powers
      powerSystem.activatePower(PowerType.Constrict, position, direction);
      powerSystem.activatePower(PowerType.HoodExpansion, position, direction);
      powerSystem.activatePower(PowerType.ColorChange, position, direction);
      
      // Test special abilities
      expect(powerSystem.activateSpecialAbility('PressurePlateActivation', position)).toBe(true);
      expect(powerSystem.activateSpecialAbility('Invincibility', position)).toBe(true);
      expect(powerSystem.activateSpecialAbility('WaterTraversal', position)).toBe(true);
      expect(powerSystem.activateSpecialAbility('Invisibility', position)).toBe(true);
    });

    it('should not activate special abilities when powers are not active', () => {
      powerSystem.initializePower(PowerType.Constrict);
      powerSystem.initializePower(PowerType.HoodExpansion);
      powerSystem.initializePower(PowerType.ColorChange);
      
      const position: Vector2 = { x: 100, y: 100 };
      
      // Don't activate powers, just test abilities
      expect(powerSystem.activateSpecialAbility('PressurePlateActivation', position)).toBe(false);
      expect(powerSystem.activateSpecialAbility('Invincibility', position)).toBe(false);
      expect(powerSystem.activateSpecialAbility('Invisibility', position)).toBe(false);
    });
  });

  describe('Evolution Requirements', () => {
    it('should have correct food requirements for advanced levels', () => {
      const level4 = evolutionSystem.getEvolutionLevel(4);
      const level5 = evolutionSystem.getEvolutionLevel(5);
      const level6 = evolutionSystem.getEvolutionLevel(6);
      const level7 = evolutionSystem.getEvolutionLevel(7);
      
      expect(level4?.requiredFood).toBe(220);
      expect(level5?.requiredFood).toBe(350);
      expect(level6?.requiredFood).toBe(500);
      expect(level7?.requiredFood).toBe(700);
    });

    it('should evolve correctly through advanced levels', () => {
      // Start fresh and evolve to level 2 first
      evolutionSystem.reset();
      
      // Evolve to level 2 (Garden Snake) - requires 50 food
      let result = evolutionSystem.addFoodProgress(50);
      expect(result.evolved).toBe(true);
      expect(result.newLevel).toBe(2);
      
      // Complete any transformation in progress
      evolutionSystem.update(3000); // Wait for transformation to complete
      
      // Now evolve to level 3 (Viper) - requires 120 total (70 more)
      result = evolutionSystem.addFoodProgress(70);
      expect(result.evolved).toBe(true);
      expect(result.newLevel).toBe(3);
      
      // Complete transformation
      evolutionSystem.update(3000);
      
      // Finally evolve to level 4 (Python) - requires 220 total (100 more)
      result = evolutionSystem.addFoodProgress(100);
      expect(result.evolved).toBe(true);
      expect(result.newLevel).toBe(4);
      expect(result.unlockedPowers).toContain(PowerType.Constrict);
    });
  });

  describe('Level 8: Celestial Serpent', () => {
    beforeEach(() => {
      // Set snake to Celestial Serpent level
      evolutionSystem.setLevel(8);
    });

    it('should have correct visual pattern for Celestial Serpent', () => {
      const pattern = visualPatternManager.getPatternForLevel(8);
      
      expect(pattern.baseColor).toBe('#3F51B5'); // Indigo blue
      expect(pattern.secondaryColor).toBe('#E8EAF6'); // Light blue/white
      expect(pattern.patternType).toBe('celestial');
      expect(pattern.scaleTexture).toBe('starry');
      expect(pattern.glowIntensity).toBe(0.8);
      expect(pattern.animationSpeed).toBe(1.5);
    });

    it('should have Time Warp power available', () => {
      const availablePowers = evolutionSystem.getAvailablePowers();
      expect(availablePowers).toContain(PowerType.TimeWarp);
    });

    it('should be able to activate Time Warp power', () => {
      powerSystem.initializePower(PowerType.TimeWarp);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.TimeWarp, position, direction);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.TimeWarp);
      expect(result.effects.length).toBeGreaterThan(0);
    });

    it('should slow time when Time Warp is active', () => {
      powerSystem.initializePower(PowerType.TimeWarp);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.TimeWarp, position, direction);
      
      expect(powerSystem.isTimeWarpActive()).toBe(true);
      expect(powerSystem.getTimeSlowFactor()).toBe(0.3); // 30% speed
    });

    it('should have food attraction ability', () => {
      powerSystem.initializePower(PowerType.TimeWarp);
      
      expect(powerSystem.canAttractFood()).toBe(true);
      expect(powerSystem.getFoodAttractionRadius()).toBeGreaterThan(0);
    });

    it('should create food attraction effects', () => {
      powerSystem.initializePower(PowerType.TimeWarp);
      
      const position: Vector2 = { x: 100, y: 100 };
      const effects = powerSystem.createFoodAttractionEffect(position);
      
      expect(effects.length).toBeGreaterThan(0);
      effects.forEach(effect => {
        expect(effect.color).toBe('#E8EAF6'); // Light blue
      });
    });

    it('should have correct segment count for Celestial Serpent', () => {
      const levelData = evolutionSystem.getCurrentLevelData();
      expect(levelData?.segmentCount).toBe(22);
    });

    it('should have correct cooldown for Time Warp', () => {
      powerSystem.initializePower(PowerType.TimeWarp);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.TimeWarp, position, direction);
      
      expect(powerSystem.getPowerCooldown(PowerType.TimeWarp)).toBe(20000); // 20 seconds
    });
  });

  describe('Level 9: Ancient Dragon Serpent', () => {
    beforeEach(() => {
      // Set snake to Ancient Dragon Serpent level
      evolutionSystem.setLevel(9);
    });

    it('should have correct visual pattern for Ancient Dragon Serpent', () => {
      const pattern = visualPatternManager.getPatternForLevel(9);
      
      expect(pattern.baseColor).toBe('#D32F2F'); // Deep red
      expect(pattern.secondaryColor).toBe('#FF9800'); // Orange
      expect(pattern.patternType).toBe('draconic');
      expect(pattern.scaleTexture).toBe('draconic');
      expect(pattern.glowIntensity).toBe(0.9);
      expect(pattern.animationSpeed).toBe(1.6);
    });

    it('should have Fire Breath power available', () => {
      const availablePowers = evolutionSystem.getAvailablePowers();
      expect(availablePowers).toContain(PowerType.FireBreath);
    });

    it('should be able to activate Fire Breath power', () => {
      powerSystem.initializePower(PowerType.FireBreath);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.FireBreath, position, direction);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.FireBreath);
      expect(result.effects.length).toBeGreaterThan(0);
    });

    it('should have heat vision ability', () => {
      powerSystem.initializePower(PowerType.FireBreath);
      
      expect(powerSystem.hasHeatVision()).toBe(true);
    });

    it('should have environmental immunity', () => {
      powerSystem.initializePower(PowerType.FireBreath);
      
      expect(powerSystem.isEnvironmentallyImmune()).toBe(true);
    });

    it('should create heat vision effects', () => {
      powerSystem.initializePower(PowerType.FireBreath);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      const effects = powerSystem.createHeatVisionEffect(position, direction);
      
      expect(effects.length).toBeGreaterThan(0);
      effects.forEach(effect => {
        expect(effect.color).toBe('#FF5722'); // Orange-red
      });
    });

    it('should have correct segment count for Ancient Dragon Serpent', () => {
      const levelData = evolutionSystem.getCurrentLevelData();
      expect(levelData?.segmentCount).toBe(26);
    });

    it('should have correct cooldown for Fire Breath', () => {
      powerSystem.initializePower(PowerType.FireBreath);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.FireBreath, position, direction);
      
      expect(powerSystem.getPowerCooldown(PowerType.FireBreath)).toBe(8000); // 8 seconds
    });
  });

  describe('Level 10: Ouroboros', () => {
    beforeEach(() => {
      // Set snake to Ouroboros level
      evolutionSystem.setLevel(10);
    });

    it('should have correct visual pattern for Ouroboros', () => {
      const pattern = visualPatternManager.getPatternForLevel(10);
      
      expect(pattern.baseColor).toBe('#FFD700'); // Pure gold
      expect(pattern.secondaryColor).toBe('#FFF8E1'); // Cream/light gold
      expect(pattern.patternType).toBe('mystical');
      expect(pattern.scaleTexture).toBe('mystical');
      expect(pattern.glowIntensity).toBe(1.0);
      expect(pattern.animationSpeed).toBe(1.8);
    });

    it('should have all Ouroboros powers available', () => {
      const availablePowers = evolutionSystem.getAvailablePowers();
      expect(availablePowers).toContain(PowerType.TailConsumption);
      expect(availablePowers).toContain(PowerType.PowerCycling);
      expect(availablePowers).toContain(PowerType.RealityManipulation);
    });

    it('should be able to activate Tail Consumption power', () => {
      powerSystem.initializePower(PowerType.TailConsumption);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.TailConsumption, position, direction);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.TailConsumption);
      expect(result.effects.length).toBeGreaterThan(0);
    });

    it('should be able to consume tail segments', () => {
      powerSystem.initializePower(PowerType.TailConsumption);
      
      expect(powerSystem.canConsumeTail()).toBe(true);
      
      const result = powerSystem.activateTailConsumption(3);
      expect(result).toBe(true);
    });

    it('should be able to activate Power Cycling', () => {
      powerSystem.initializePower(PowerType.PowerCycling);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.PowerCycling, position, direction);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.PowerCycling);
      expect(result.effects.length).toBeGreaterThan(0);
    });

    it('should be able to cycle to previous powers', () => {
      powerSystem.initializePower(PowerType.PowerCycling);
      powerSystem.initializePower(PowerType.SpeedBoost); // Initialize target power
      
      expect(powerSystem.canCyclePowers()).toBe(true);
      
      const result = powerSystem.cycleToPower(PowerType.SpeedBoost);
      expect(result).toBe(true);
      expect(powerSystem.isPowerActive(PowerType.SpeedBoost)).toBe(true);
    });

    it('should be able to activate Reality Manipulation', () => {
      powerSystem.initializePower(PowerType.RealityManipulation);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.RealityManipulation, position, direction);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.RealityManipulation);
      expect(result.effects.length).toBeGreaterThan(0);
    });

    it('should be able to manipulate environment', () => {
      powerSystem.initializePower(PowerType.RealityManipulation);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      // Activate reality manipulation first
      powerSystem.activatePower(PowerType.RealityManipulation, position, direction);
      
      expect(powerSystem.canManipulateReality()).toBe(true);
      
      const result = powerSystem.manipulateEnvironment(position, 'createPath');
      expect(result).toBe(true);
    });

    it('should have correct segment count for Ouroboros', () => {
      const levelData = evolutionSystem.getCurrentLevelData();
      expect(levelData?.segmentCount).toBe(30);
    });

    it('should have correct cooldowns for Ouroboros powers', () => {
      powerSystem.initializePower(PowerType.TailConsumption);
      powerSystem.initializePower(PowerType.PowerCycling);
      powerSystem.initializePower(PowerType.RealityManipulation);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      // Activate powers
      powerSystem.activatePower(PowerType.TailConsumption, position, direction);
      powerSystem.activatePower(PowerType.PowerCycling, position, direction);
      powerSystem.activatePower(PowerType.RealityManipulation, position, direction);
      
      // Check cooldowns
      expect(powerSystem.getPowerCooldown(PowerType.TailConsumption)).toBe(3000); // 3 seconds
      expect(powerSystem.getPowerCooldown(PowerType.PowerCycling)).toBe(25000); // 25 seconds
      expect(powerSystem.getPowerCooldown(PowerType.RealityManipulation)).toBe(30000); // 30 seconds
    });
  });

  describe('Highest Evolution Levels Integration', () => {
    it('should validate all highest level patterns', () => {
      for (let level = 8; level <= 10; level++) {
        const pattern = visualPatternManager.getPatternForLevel(level);
        expect(visualPatternManager.validatePattern(pattern)).toBe(true);
      }
    });

    it('should support transitions between highest levels', () => {
      visualPatternManager.startTransition(8, 9); // Celestial to Dragon
      
      expect(visualPatternManager.isTransitioning()).toBe(true);
      
      const currentPattern = visualPatternManager.getCurrentPattern(8);
      expect(currentPattern).toBeDefined();
    });

    it('should handle all powers for Ouroboros level', () => {
      evolutionSystem.setLevel(10); // Ouroboros has all powers
      
      // Initialize all powers for level 10
      const availablePowers = evolutionSystem.getAvailablePowers();
      availablePowers.forEach(power => {
        powerSystem.initializePower(power);
      });

      // Check that all powers are available
      expect(availablePowers).toContain(PowerType.SpeedBoost);
      expect(availablePowers).toContain(PowerType.VenomStrike);
      expect(availablePowers).toContain(PowerType.Constrict);
      expect(availablePowers).toContain(PowerType.HoodExpansion);
      expect(availablePowers).toContain(PowerType.AquaticMovement);
      expect(availablePowers).toContain(PowerType.ColorChange);
      expect(availablePowers).toContain(PowerType.TimeWarp);
      expect(availablePowers).toContain(PowerType.FireBreath);
      expect(availablePowers).toContain(PowerType.TailConsumption);
      expect(availablePowers).toContain(PowerType.PowerCycling);
      expect(availablePowers).toContain(PowerType.RealityManipulation);
    });

    it('should evolve correctly through highest levels', () => {
      // Start fresh and evolve step by step to level 8
      evolutionSystem.reset();
      
      // Evolve through levels 1-7 first
      evolutionSystem.addFoodProgress(50); // Level 2
      evolutionSystem.update(3000);
      evolutionSystem.addFoodProgress(70); // Level 3 (120 total)
      evolutionSystem.update(3000);
      evolutionSystem.addFoodProgress(100); // Level 4 (220 total)
      evolutionSystem.update(3000);
      evolutionSystem.addFoodProgress(130); // Level 5 (350 total)
      evolutionSystem.update(3000);
      evolutionSystem.addFoodProgress(150); // Level 6 (500 total)
      evolutionSystem.update(3000);
      evolutionSystem.addFoodProgress(200); // Level 7 (700 total)
      evolutionSystem.update(3000);
      
      // Now evolve to level 8 (Celestial Serpent) - requires 950 total food
      let result = evolutionSystem.addFoodProgress(250); // Add 250 more (700 + 250 = 950)
      expect(result.evolved).toBe(true);
      expect(result.newLevel).toBe(8);
      expect(result.unlockedPowers).toContain(PowerType.TimeWarp);
      
      // Complete transformation
      evolutionSystem.update(3000);
      
      // Evolve to level 9 (Ancient Dragon Serpent) - requires 1250 total food
      result = evolutionSystem.addFoodProgress(300); // Add 300 more (950 + 300 = 1250)
      expect(result.evolved).toBe(true);
      expect(result.newLevel).toBe(9);
      expect(result.unlockedPowers).toContain(PowerType.FireBreath);
      
      // Complete transformation
      evolutionSystem.update(3000);
      
      // Evolve to level 10 (Ouroboros) - requires 1600 total food
      result = evolutionSystem.addFoodProgress(350); // Add 350 more (1250 + 350 = 1600)
      expect(result.evolved).toBe(true);
      expect(result.newLevel).toBe(10);
      expect(result.unlockedPowers).toContain(PowerType.TailConsumption);
      expect(result.unlockedPowers).toContain(PowerType.PowerCycling);
      expect(result.unlockedPowers).toContain(PowerType.RealityManipulation);
    });

    it('should have correct food requirements for highest levels', () => {
      const level8 = evolutionSystem.getEvolutionLevel(8);
      const level9 = evolutionSystem.getEvolutionLevel(9);
      const level10 = evolutionSystem.getEvolutionLevel(10);
      
      expect(level8?.requiredFood).toBe(950);
      expect(level9?.requiredFood).toBe(1250);
      expect(level10?.requiredFood).toBe(1600);
    });

    it('should update power effects over time for highest level powers', () => {
      powerSystem.initializePower(PowerType.TimeWarp);
      powerSystem.initializePower(PowerType.RealityManipulation);
      
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.TimeWarp, position, direction);
      powerSystem.activatePower(PowerType.RealityManipulation, position, direction);
      
      const initialEffects = powerSystem.getActiveEffects();
      expect(initialEffects.length).toBeGreaterThan(0);
      
      // Update power system
      powerSystem.update(100); // 100ms
      
      const updatedEffects = powerSystem.getActiveEffects();
      expect(updatedEffects.length).toBeGreaterThanOrEqual(0);
    });
  });
});