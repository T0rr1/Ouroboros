import { describe, it, expect, beforeEach } from 'vitest';
import { SnakeManager } from '../core/SnakeManager';
import { PowerType } from '../core/EvolutionSystem';
import { GameConfig, Vector2 } from '../types/game';

describe('PowerSystem Integration', () => {
  let snakeManager: SnakeManager;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    
    const startPosition: Vector2 = { x: 25, y: 17 };
    snakeManager = new SnakeManager(config, startPosition);
  });

  describe('Power System Integration with SnakeManager', () => {
    it('should initialize power system in snake manager', () => {
      const powerSystem = snakeManager.getPowerSystem();
      expect(powerSystem).toBeDefined();
      
      const visualState = powerSystem.getVisualState();
      expect(visualState).toBeDefined();
      expect(visualState.activePowers).toHaveLength(0);
    });

    it('should not have powers available at level 1', () => {
      const availablePowers = snakeManager.getAvailablePowers();
      expect(availablePowers).toHaveLength(0);
      
      const result = snakeManager.activatePower(PowerType.SpeedBoost);
      expect(result.success).toBe(false);
    });

    it('should initialize powers when evolving to level 2', () => {
      // Force evolution to level 2 (Garden Snake)
      const evolutionSystem = snakeManager.getEvolutionSystem();
      evolutionSystem.setLevel(2);
      
      // Initialize powers for the new level
      snakeManager.initializePowersForLevel(2);
      
      const availablePowers = snakeManager.getAvailablePowers();
      expect(availablePowers).toContain(PowerType.SpeedBoost);
      
      const powerVisualState = snakeManager.getPowerVisualState();
      expect(powerVisualState.cooldowns.has(PowerType.SpeedBoost)).toBe(true);
    });

    it('should activate Speed Boost power at level 2', () => {
      // Set up level 2 with Speed Boost
      const evolutionSystem = snakeManager.getEvolutionSystem();
      evolutionSystem.setLevel(2);
      snakeManager.initializePowersForLevel(2);
      
      const result = snakeManager.activatePower(PowerType.SpeedBoost);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.SpeedBoost);
      expect(result.message).toBe('Speed Boost activated!');
      
      // Check that power is active
      expect(snakeManager.isPowerActive(PowerType.SpeedBoost)).toBe(true);
      expect(snakeManager.getPowerCooldown(PowerType.SpeedBoost)).toBeGreaterThan(0);
    });

    it('should activate Venom Strike power at level 3', () => {
      // Set up level 3 with Venom Strike
      const evolutionSystem = snakeManager.getEvolutionSystem();
      evolutionSystem.setLevel(3);
      snakeManager.initializePowersForLevel(3);
      
      const result = snakeManager.activatePower(PowerType.VenomStrike);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.VenomStrike);
      expect(result.effects).toHaveLength(1);
      
      // Venom Strike should be instant (not active after activation)
      expect(snakeManager.isPowerActive(PowerType.VenomStrike)).toBe(false);
      expect(snakeManager.getPowerCooldown(PowerType.VenomStrike)).toBeGreaterThan(0);
    });

    it('should apply speed multiplier when Speed Boost is active', () => {
      // Set up level 2 with Speed Boost
      const evolutionSystem = snakeManager.getEvolutionSystem();
      evolutionSystem.setLevel(2);
      snakeManager.initializePowersForLevel(2);
      
      const initialSpeed = snakeManager.getSpeed();
      
      // Activate Speed Boost
      snakeManager.activatePower(PowerType.SpeedBoost);
      
      // Speed should be affected by the multiplier
      const powerSystem = snakeManager.getPowerSystem();
      expect(powerSystem.getSpeedMultiplier()).toBe(2.0);
    });

    it('should update power system during snake manager updates', () => {
      // Set up level 2 with Speed Boost
      const evolutionSystem = snakeManager.getEvolutionSystem();
      evolutionSystem.setLevel(2);
      snakeManager.initializePowersForLevel(2);
      
      // Activate power
      snakeManager.activatePower(PowerType.SpeedBoost);
      
      const initialCooldown = snakeManager.getPowerCooldown(PowerType.SpeedBoost);
      const initialDuration = snakeManager.getPowerDuration(PowerType.SpeedBoost);
      
      // Update snake manager (which should update power system)
      snakeManager.update(1000); // 1 second
      
      const updatedCooldown = snakeManager.getPowerCooldown(PowerType.SpeedBoost);
      const updatedDuration = snakeManager.getPowerDuration(PowerType.SpeedBoost);
      
      expect(updatedCooldown).toBeLessThan(initialCooldown);
      expect(updatedDuration).toBeLessThan(initialDuration);
    });

    it('should provide visual state for UI integration', () => {
      // Set up level 3 with multiple powers
      const evolutionSystem = snakeManager.getEvolutionSystem();
      evolutionSystem.setLevel(3);
      snakeManager.initializePowersForLevel(3);
      
      const visualState = snakeManager.getPowerVisualState();
      
      expect(visualState.cooldowns.size).toBe(2); // SpeedBoost and VenomStrike
      expect(visualState.cooldowns.has(PowerType.SpeedBoost)).toBe(true);
      expect(visualState.cooldowns.has(PowerType.VenomStrike)).toBe(true);
      expect(visualState.activePowers).toHaveLength(0); // No powers active initially
      expect(visualState.effects).toHaveLength(0); // No effects initially
    });

    it('should handle power activation failures gracefully', () => {
      // Try to activate power without initializing it
      const result = snakeManager.activatePower(PowerType.SpeedBoost);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Power not available');
      expect(result.effects).toHaveLength(0);
    });

    it('should prevent power activation during cooldown', () => {
      // Set up level 2 with Speed Boost
      const evolutionSystem = snakeManager.getEvolutionSystem();
      evolutionSystem.setLevel(2);
      snakeManager.initializePowersForLevel(2);
      
      // First activation
      const result1 = snakeManager.activatePower(PowerType.SpeedBoost);
      expect(result1.success).toBe(true);
      
      // Second activation should fail due to cooldown
      const result2 = snakeManager.activatePower(PowerType.SpeedBoost);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('Power on cooldown');
    });
  });

  describe('Evolution and Power Integration', () => {
    it('should automatically initialize powers when evolving', () => {
      // Start at level 1
      expect(snakeManager.getCurrentEvolutionLevel()).toBe(1);
      expect(snakeManager.getAvailablePowers()).toHaveLength(0);
      
      // Simulate food consumption to trigger evolution
      const evolutionResult = snakeManager.consumeFood(1, 50); // Enough to reach level 2
      
      if (evolutionResult.evolved) {
        expect(evolutionResult.newLevel).toBe(2);
        expect(evolutionResult.unlockedPowers).toContain(PowerType.SpeedBoost);
        
        // Powers should be available after evolution
        const availablePowers = snakeManager.getAvailablePowers();
        expect(availablePowers).toContain(PowerType.SpeedBoost);
        
        // Power should be activatable
        const result = snakeManager.activatePower(PowerType.SpeedBoost);
        expect(result.success).toBe(true);
      }
    });

    it('should maintain power states across evolution levels', () => {
      // Evolve to level 3
      const evolutionSystem = snakeManager.getEvolutionSystem();
      evolutionSystem.setLevel(3);
      snakeManager.initializePowersForLevel(3);
      
      // Activate Speed Boost
      snakeManager.activatePower(PowerType.SpeedBoost);
      expect(snakeManager.isPowerActive(PowerType.SpeedBoost)).toBe(true);
      
      // Evolve to level 4 (should maintain existing power states)
      evolutionSystem.setLevel(4);
      snakeManager.initializePowersForLevel(4);
      
      // Speed Boost should still be active
      expect(snakeManager.isPowerActive(PowerType.SpeedBoost)).toBe(true);
      
      // New powers should be available
      const availablePowers = snakeManager.getAvailablePowers();
      expect(availablePowers).toContain(PowerType.SpeedBoost);
      expect(availablePowers).toContain(PowerType.VenomStrike);
      expect(availablePowers).toContain(PowerType.Constrict);
    });
  });
});