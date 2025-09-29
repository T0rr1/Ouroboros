import { describe, it, expect, beforeEach } from 'vitest';
import { PowerSystem, PowerEffectType, EnvironmentalInteraction } from '../core/PowerSystem';
import { EnvironmentSystem } from '../core/EnvironmentSystem';
import { PowerType } from '../core/EvolutionSystem';
import { GameConfig, Vector2, ObstacleType, Obstacle } from '../types/game';

describe('PowerEnvironmentIntegration', () => {
  let powerSystem: PowerSystem;
  let environmentSystem: EnvironmentSystem;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };

    powerSystem = new PowerSystem(config);
    environmentSystem = new EnvironmentSystem(config);

    // Initialize powers for testing
    powerSystem.initializePower(PowerType.VenomStrike);
    powerSystem.initializePower(PowerType.SpeedBoost);
    powerSystem.initializePower(PowerType.FireBreath);
  });

  describe('Venom Strike - Crystal Formation Interaction', () => {
    it('should destroy crystal formations when hit by venom projectile', () => {
      // Setup - snake at grid position (3, 3), shooting right
      const snakePosition: Vector2 = { x: 3 * config.cellSize, y: 3 * config.cellSize };
      const snakeDirection: Vector2 = { x: 1, y: 0 };
      
      // Add a crystal formation directly in the projectile path
      const crystal: Obstacle = {
        id: 'test_crystal',
        type: ObstacleType.CrystalFormation,
        position: { x: 6, y: 3 }, // Grid position directly in path
        size: { x: 1, y: 1 },
        isDestructible: true,
        requiredPower: 'VenomStrike',
        isActive: true,
        health: 50
      };
      
      environmentSystem.addObstacle(crystal);
      const obstacles = environmentSystem.getObstacles();

      // Act
      const result = powerSystem.activatePower(
        PowerType.VenomStrike,
        snakePosition,
        snakeDirection,
        obstacles
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.environmentalInteractions).toBeDefined();
      expect(result.environmentalInteractions!.length).toBeGreaterThan(0);
      
      const crystalInteraction = result.environmentalInteractions!.find(
        interaction => interaction.obstacleId === 'test_crystal'
      );
      
      expect(crystalInteraction).toBeDefined();
      expect(crystalInteraction!.type).toBe('destroy');
      expect(crystalInteraction!.powerType).toBe(PowerType.VenomStrike);
      expect(crystalInteraction!.effects.length).toBeGreaterThan(0);
      expect(crystalInteraction!.effects[0].type).toBe(PowerEffectType.CrystalShatter);
    });

    it('should not destroy non-crystal obstacles with venom strike', () => {
      // Setup
      const snakePosition: Vector2 = { x: 3 * config.cellSize, y: 3 * config.cellSize };
      const snakeDirection: Vector2 = { x: 1, y: 0 };
      
      // Add a stone pillar (non-destructible by venom)
      const stonePillar: Obstacle = {
        id: 'test_stone',
        type: ObstacleType.StonePillar,
        position: { x: 6, y: 3 },
        size: { x: 1, y: 1 },
        isDestructible: false,
        isActive: true,
        health: 100
      };
      
      environmentSystem.addObstacle(stonePillar);
      const obstacles = environmentSystem.getObstacles();

      // Act
      const result = powerSystem.activatePower(
        PowerType.VenomStrike,
        snakePosition,
        snakeDirection,
        obstacles
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.environmentalInteractions).toBeDefined();
      
      const stoneInteraction = result.environmentalInteractions!.find(
        interaction => interaction.obstacleId === 'test_stone'
      );
      
      expect(stoneInteraction).toBeUndefined();
    });
  });

  describe('Speed Boost - Magic Barrier Phasing', () => {
    it('should enable phasing through magic barriers when speed boost is active', () => {
      // Setup
      const snakePosition: Vector2 = { x: 3 * config.cellSize, y: 3 * config.cellSize };
      const snakeDirection: Vector2 = { x: 1, y: 0 };
      
      // Add a magic barrier near the snake (within 2 cell radius)
      const magicBarrier: Obstacle = {
        id: 'test_barrier',
        type: ObstacleType.MagicBarrier,
        position: { x: 4, y: 3 }, // Close to snake position
        size: { x: 1, y: 1 },
        isDestructible: false,
        requiredPower: 'SpeedBoost',
        isActive: true
      };
      
      environmentSystem.addObstacle(magicBarrier);
      const obstacles = environmentSystem.getObstacles();

      // Act
      const result = powerSystem.activatePower(
        PowerType.SpeedBoost,
        snakePosition,
        snakeDirection,
        obstacles
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.environmentalInteractions).toBeDefined();
      
      const phasingInteraction = result.environmentalInteractions!.find(
        interaction => interaction.obstacleId === 'test_barrier'
      );
      
      expect(phasingInteraction).toBeDefined();
      expect(phasingInteraction!.type).toBe('phase');
      expect(phasingInteraction!.powerType).toBe(PowerType.SpeedBoost);
      expect(phasingInteraction!.effects.length).toBeGreaterThan(0);
      expect(phasingInteraction!.effects[0].type).toBe(PowerEffectType.WallPhasing);
    });

    it('should verify environment system can handle phasing', () => {
      // Setup
      const magicBarrier: Obstacle = {
        id: 'test_barrier',
        type: ObstacleType.MagicBarrier,
        position: { x: 3, y: 3 },
        size: { x: 1, y: 1 },
        isDestructible: false,
        requiredPower: 'SpeedBoost',
        isActive: true
      };
      
      environmentSystem.addObstacle(magicBarrier);

      // Act
      const canPhase = environmentSystem.canPhaseThrough('test_barrier', 'SpeedBoost');

      // Assert
      expect(canPhase).toBe(true);
    });
  });

  describe('Fire Breath - Obstacle Destruction', () => {
    it('should destroy ice walls with fire breath', () => {
      // Setup
      const snakePosition: Vector2 = { x: 3 * config.cellSize, y: 3 * config.cellSize };
      const snakeDirection: Vector2 = { x: 1, y: 0 };
      
      // Add ice walls in fire breath range
      const iceWall: Obstacle = {
        id: 'test_ice_wall',
        type: ObstacleType.IceWall,
        position: { x: 5, y: 3 }, // Within fire breath cone
        size: { x: 1, y: 1 },
        isDestructible: true,
        requiredPower: 'FireBreath',
        isActive: true,
        health: 30
      };
      
      environmentSystem.addObstacle(iceWall);
      const obstacles = environmentSystem.getObstacles();

      // Act
      const result = powerSystem.activatePower(
        PowerType.FireBreath,
        snakePosition,
        snakeDirection,
        obstacles
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.environmentalInteractions).toBeDefined();
      
      const fireInteraction = result.environmentalInteractions!.find(
        interaction => interaction.obstacleId === 'test_ice_wall'
      );
      
      expect(fireInteraction).toBeDefined();
      expect(fireInteraction!.type).toBe('destroy');
      expect(fireInteraction!.powerType).toBe(PowerType.FireBreath);
      expect(fireInteraction!.damage).toBe(100);
      expect(fireInteraction!.effects.length).toBeGreaterThan(0);
      expect(fireInteraction!.effects[0].type).toBe(PowerEffectType.ObstacleDestruction);
    });

    it('should create fire breath cone effect', () => {
      // Setup
      const snakePosition: Vector2 = { x: 3 * config.cellSize, y: 3 * config.cellSize };
      const snakeDirection: Vector2 = { x: 1, y: 0 };

      // Act
      const result = powerSystem.activatePower(
        PowerType.FireBreath,
        snakePosition,
        snakeDirection,
        []
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.effects.length).toBe(10); // 10 fire particles in cone
      
      result.effects.forEach(effect => {
        expect(effect.type).toBe(PowerEffectType.DragonicFlames);
        expect(effect.lifetime).toBe(1500); // 1.5 second duration
        expect(['#D32F2F', '#FF5722', '#FFC107']).toContain(effect.color); // Fire colors (red, orange, yellow)
      });
    });

    it('should not destroy non-fire-destructible obstacles', () => {
      // Setup
      const snakePosition: Vector2 = { x: 3 * config.cellSize, y: 3 * config.cellSize };
      const snakeDirection: Vector2 = { x: 1, y: 0 };
      
      // Add a crystal formation (not destructible by fire)
      const crystal: Obstacle = {
        id: 'test_crystal',
        type: ObstacleType.CrystalFormation,
        position: { x: 5, y: 3 },
        size: { x: 1, y: 1 },
        isDestructible: true,
        requiredPower: 'VenomStrike', // Only destructible by venom
        isActive: true,
        health: 50
      };
      
      environmentSystem.addObstacle(crystal);
      const obstacles = environmentSystem.getObstacles();

      // Act
      const result = powerSystem.activatePower(
        PowerType.FireBreath,
        snakePosition,
        snakeDirection,
        obstacles
      );

      // Assert
      expect(result.success).toBe(true);
      
      const crystalInteraction = result.environmentalInteractions!.find(
        interaction => interaction.obstacleId === 'test_crystal'
      );
      
      expect(crystalInteraction).toBeUndefined();
    });
  });

  describe('Environment System Integration', () => {
    it('should handle power interactions correctly', () => {
      // Setup
      const crystal: Obstacle = {
        id: 'test_crystal',
        type: ObstacleType.CrystalFormation,
        position: { x: 5, y: 5 },
        size: { x: 1, y: 1 },
        isDestructible: true,
        requiredPower: 'VenomStrike',
        isActive: true,
        health: 50
      };
      
      environmentSystem.addObstacle(crystal);

      const interaction: EnvironmentalInteraction = {
        type: 'destroy',
        obstacleId: 'test_crystal',
        powerType: PowerType.VenomStrike,
        effects: []
      };

      // Act
      const result = environmentSystem.handlePowerInteraction(interaction);

      // Assert
      expect(result).toBe(true);
      
      // Verify obstacle was destroyed
      const destroyedObstacle = environmentSystem.getObstacleById('test_crystal');
      expect(destroyedObstacle).toBeUndefined(); // Should be removed from active obstacles
    });

    it('should reject invalid power interactions', () => {
      // Setup
      const stonePillar: Obstacle = {
        id: 'test_stone',
        type: ObstacleType.StonePillar,
        position: { x: 5, y: 5 },
        size: { x: 1, y: 1 },
        isDestructible: false,
        isActive: true,
        health: 100
      };
      
      environmentSystem.addObstacle(stonePillar);

      const interaction: EnvironmentalInteraction = {
        type: 'destroy',
        obstacleId: 'test_stone',
        powerType: PowerType.VenomStrike,
        effects: []
      };

      // Act
      const result = environmentSystem.handlePowerInteraction(interaction);

      // Assert
      expect(result).toBe(false);
      
      // Verify obstacle was not destroyed
      const obstacle = environmentSystem.getObstacleById('test_stone');
      expect(obstacle).toBeDefined();
      expect(obstacle!.isActive).toBe(true);
    });
  });

  describe('Visual Effects', () => {
    it('should create appropriate visual effects for each power type', () => {
      const snakePosition: Vector2 = { x: 3 * config.cellSize, y: 3 * config.cellSize };
      const snakeDirection: Vector2 = { x: 1, y: 0 };

      // Test Venom Strike effects
      const venomResult = powerSystem.activatePower(
        PowerType.VenomStrike,
        snakePosition,
        snakeDirection
      );
      
      expect(venomResult.effects.length).toBe(1);
      expect(venomResult.effects[0].type).toBe(PowerEffectType.VenomProjectile);

      // Test Speed Boost effects
      const speedResult = powerSystem.activatePower(
        PowerType.SpeedBoost,
        snakePosition,
        snakeDirection
      );
      
      expect(speedResult.effects.length).toBe(1);
      expect(speedResult.effects[0].type).toBe(PowerEffectType.PowerActivation);

      // Test Fire Breath effects
      const fireResult = powerSystem.activatePower(
        PowerType.FireBreath,
        snakePosition,
        snakeDirection
      );
      
      expect(fireResult.effects.length).toBe(10); // Cone of fire particles
      fireResult.effects.forEach(effect => {
        expect(effect.type).toBe(PowerEffectType.DragonicFlames);
      });
    });
  });
});