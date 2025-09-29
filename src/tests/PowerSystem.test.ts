import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PowerSystem, PowerEffectType } from '../core/PowerSystem';
import { PowerType } from '../core/EvolutionSystem';
import { GameConfig, Vector2 } from '../types/game';

describe('PowerSystem', () => {
  let powerSystem: PowerSystem;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    powerSystem = new PowerSystem(config);
  });

  describe('Power Initialization', () => {
    it('should initialize with empty power states', () => {
      const visualState = powerSystem.getVisualState();
      expect(visualState.activePowers).toHaveLength(0);
      expect(visualState.cooldowns.size).toBe(0);
      expect(visualState.effects).toHaveLength(0);
    });

    it('should initialize power when requested', () => {
      powerSystem.initializePower(PowerType.SpeedBoost);
      
      const visualState = powerSystem.getVisualState();
      expect(visualState.cooldowns.has(PowerType.SpeedBoost)).toBe(true);
      expect(visualState.cooldowns.get(PowerType.SpeedBoost)).toBe(0);
    });

    it('should not duplicate power initialization', () => {
      powerSystem.initializePower(PowerType.SpeedBoost);
      powerSystem.initializePower(PowerType.SpeedBoost);
      
      const visualState = powerSystem.getVisualState();
      expect(visualState.cooldowns.size).toBe(1);
    });
  });

  describe('Speed Boost Power', () => {
    beforeEach(() => {
      powerSystem.initializePower(PowerType.SpeedBoost);
    });

    it('should activate Speed Boost successfully', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.SpeedBoost);
      expect(result.message).toBe('Speed Boost activated!');
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].type).toBe(PowerEffectType.PowerActivation);
    });

    it('should apply speed multiplier when active', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      expect(powerSystem.getSpeedMultiplier()).toBe(1.0);
      
      powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      expect(powerSystem.getSpeedMultiplier()).toBe(2.0);
    });

    it('should be on cooldown after activation', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      
      expect(powerSystem.isPowerActive(PowerType.SpeedBoost)).toBe(true);
      expect(powerSystem.getPowerCooldown(PowerType.SpeedBoost)).toBeGreaterThan(0);
    });

    it('should not activate while on cooldown', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      // First activation
      const result1 = powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      expect(result1.success).toBe(true);
      
      // Second activation should fail
      const result2 = powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('Power on cooldown');
    });

    it('should deactivate after duration expires', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      expect(powerSystem.isPowerActive(PowerType.SpeedBoost)).toBe(true);
      
      // Simulate time passing beyond duration (3000ms)
      powerSystem.update(3500);
      
      expect(powerSystem.isPowerActive(PowerType.SpeedBoost)).toBe(false);
      expect(powerSystem.getSpeedMultiplier()).toBe(1.0);
    });
  });

  describe('Venom Strike Power', () => {
    beforeEach(() => {
      powerSystem.initializePower(PowerType.VenomStrike);
    });

    it('should activate Venom Strike successfully', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.VenomStrike, position, direction);
      
      expect(result.success).toBe(true);
      expect(result.powerType).toBe(PowerType.VenomStrike);
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].type).toBe(PowerEffectType.VenomProjectile);
    });

    it('should create projectile with correct properties', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.VenomStrike, position, direction);
      const projectile = result.effects[0];
      
      expect(projectile.position).toEqual(position);
      expect(projectile.velocity.x).toBeGreaterThan(0);
      expect(projectile.velocity.y).toBe(0);
      expect(projectile.color).toBe('#4CAF50');
    });

    it('should have instant activation (no duration)', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.VenomStrike, position, direction);
      
      expect(powerSystem.isPowerActive(PowerType.VenomStrike)).toBe(false);
      expect(powerSystem.getPowerDuration(PowerType.VenomStrike)).toBe(0);
    });

    it('should be on cooldown after activation', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.VenomStrike, position, direction);
      
      expect(powerSystem.getPowerCooldown(PowerType.VenomStrike)).toBeGreaterThan(0);
    });
  });

  describe('Power System Updates', () => {
    beforeEach(() => {
      powerSystem.initializePower(PowerType.SpeedBoost);
      powerSystem.initializePower(PowerType.VenomStrike);
    });

    it('should update cooldowns over time', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      const initialCooldown = powerSystem.getPowerCooldown(PowerType.SpeedBoost);
      
      powerSystem.update(1000); // 1 second
      
      const updatedCooldown = powerSystem.getPowerCooldown(PowerType.SpeedBoost);
      expect(updatedCooldown).toBeLessThan(initialCooldown);
      expect(updatedCooldown).toBeGreaterThanOrEqual(0);
    });

    it('should update effect lifetimes', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.VenomStrike, position, direction);
      
      const initialEffects = powerSystem.getActiveEffects();
      expect(initialEffects).toHaveLength(1);
      
      const initialLifetime = initialEffects[0].remainingLifetime;
      
      powerSystem.update(100); // 100ms
      
      const updatedEffects = powerSystem.getActiveEffects();
      expect(updatedEffects[0].remainingLifetime).toBeLessThan(initialLifetime);
    });

    it('should remove expired effects', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.VenomStrike, position, direction);
      
      expect(powerSystem.getActiveEffects()).toHaveLength(1);
      
      // Update with time longer than projectile lifetime
      powerSystem.update(1000); // 1 second (projectile should expire)
      
      expect(powerSystem.getActiveEffects()).toHaveLength(0);
    });

    it('should update projectile positions', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.VenomStrike, position, direction);
      
      const initialEffects = powerSystem.getActiveEffects();
      const initialX = initialEffects[0].position.x;
      
      powerSystem.update(100); // 100ms
      
      const updatedEffects = powerSystem.getActiveEffects();
      expect(updatedEffects[0].position.x).toBeGreaterThan(initialX);
    });
  });

  describe('Visual State', () => {
    beforeEach(() => {
      powerSystem.initializePower(PowerType.SpeedBoost);
      powerSystem.initializePower(PowerType.VenomStrike);
    });

    it('should provide correct visual state', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      
      const visualState = powerSystem.getVisualState();
      
      expect(visualState.activePowers).toContain(PowerType.SpeedBoost);
      expect(visualState.cooldowns.get(PowerType.SpeedBoost)).toBeGreaterThan(0);
      expect(visualState.durations.get(PowerType.SpeedBoost)).toBeGreaterThan(0);
      expect(visualState.effects).toHaveLength(1);
    });

    it('should track multiple power states', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      
      // Wait for cooldown to expire
      powerSystem.update(8500);
      
      powerSystem.activatePower(PowerType.VenomStrike, position, direction);
      
      const visualState = powerSystem.getVisualState();
      
      expect(visualState.cooldowns.size).toBe(2);
      expect(visualState.cooldowns.get(PowerType.SpeedBoost)).toBe(0);
      expect(visualState.cooldowns.get(PowerType.VenomStrike)).toBeGreaterThan(0);
    });
  });

  describe('Power Management', () => {
    it('should reset all powers and effects', () => {
      powerSystem.initializePower(PowerType.SpeedBoost);
      
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      
      expect(powerSystem.getActiveEffects()).toHaveLength(1);
      expect(powerSystem.getVisualState().cooldowns.size).toBe(1);
      
      powerSystem.reset();
      
      expect(powerSystem.getActiveEffects()).toHaveLength(0);
      expect(powerSystem.getVisualState().cooldowns.size).toBe(0);
    });

    it('should remove specific powers', () => {
      powerSystem.initializePower(PowerType.SpeedBoost);
      powerSystem.initializePower(PowerType.VenomStrike);
      
      expect(powerSystem.getVisualState().cooldowns.size).toBe(2);
      
      powerSystem.removePower(PowerType.SpeedBoost);
      
      expect(powerSystem.getVisualState().cooldowns.size).toBe(1);
      expect(powerSystem.getVisualState().cooldowns.has(PowerType.VenomStrike)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle activation of non-existent power', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const result = powerSystem.activatePower(PowerType.SpeedBoost, position, direction);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Power not available');
    });

    it('should handle activation of unknown power type', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      // Cast to PowerType to test error handling
      const unknownPower = 'UnknownPower' as PowerType;
      const result = powerSystem.activatePower(unknownPower, position, direction);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Power not found');
    });

    it('should handle queries for non-existent powers', () => {
      expect(powerSystem.isPowerActive(PowerType.SpeedBoost)).toBe(false);
      expect(powerSystem.getPowerCooldown(PowerType.SpeedBoost)).toBe(0);
      expect(powerSystem.getPowerDuration(PowerType.SpeedBoost)).toBe(0);
    });
  });

  describe('Projectile Collision Detection', () => {
    beforeEach(() => {
      powerSystem.initializePower(PowerType.VenomStrike);
    });

    it('should detect projectile collisions with obstacles', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.VenomStrike, position, direction);
      
      // Create a mock obstacle close to the projectile starting position
      const obstacles = [{ x: 11, y: 10, size: 35 }];
      
      const impactEffects = powerSystem.checkProjectileCollisions(obstacles);
      
      // Should detect collision and create impact effect
      expect(impactEffects).toHaveLength(1);
      expect(impactEffects[0].type).toBe(PowerEffectType.VenomImpact);
    });

    it('should remove projectile after collision', () => {
      const position: Vector2 = { x: 10, y: 10 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      powerSystem.activatePower(PowerType.VenomStrike, position, direction);
      
      expect(powerSystem.getActiveEffects()).toHaveLength(1);
      
      // Create obstacle at projectile position
      const obstacles = [{ x: 10, y: 10, size: 35 }];
      
      powerSystem.checkProjectileCollisions(obstacles);
      
      // Projectile should be removed, impact effect should be added
      const effects = powerSystem.getActiveEffects();
      const projectiles = effects.filter(e => e.type === PowerEffectType.VenomProjectile);
      const impacts = effects.filter(e => e.type === PowerEffectType.VenomImpact);
      
      expect(projectiles).toHaveLength(0);
      expect(impacts).toHaveLength(1);
    });
  });
});