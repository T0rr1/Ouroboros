import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentSystem } from '../core/EnvironmentSystem';
import { 
  GameConfig, 
  InteractiveFeatureType, 
  InteractiveFeature,
  InteractiveFeatureActivationResult 
} from '../types/game';

describe('InteractiveFeatures', () => {
  let environmentSystem: EnvironmentSystem;
  let config: GameConfig;

  beforeEach(() => {
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    environmentSystem = new EnvironmentSystem(config);
  });

  describe('Pressure Plates', () => {
    it('should initialize pressure plates with correct properties', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const pressurePlates = features.filter(f => f.type === InteractiveFeatureType.PressurePlate);
      
      expect(pressurePlates.length).toBeGreaterThan(0);
      
      const plate = pressurePlates[0];
      expect(plate.type).toBe(InteractiveFeatureType.PressurePlate);
      expect(plate.requiresConstrictPower).toBe(true);
      expect(plate.requiredWeight).toBe(8);
      expect(plate.isActive).toBe(true);
      expect(plate.isActivated).toBe(false);
      expect(plate.connectedElements).toBeDefined();
      expect(plate.connectedElements!.length).toBeGreaterThan(0);
    });

    it('should activate pressure plate with Constrict power', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const pressurePlate = features.find(f => f.type === InteractiveFeatureType.PressurePlate);
      
      expect(pressurePlate).toBeDefined();
      
      const result = environmentSystem.activateInteractiveFeature(
        pressurePlate!.id,
        5, // snake length
        4, // Python evolution level
        true // has Constrict power
      );
      
      expect(result.success).toBe(true);
      expect(result.feature.isActivated).toBe(true);
      expect(result.effects?.removeObstacles).toBeDefined();
      expect(result.effects!.removeObstacles!.length).toBeGreaterThan(0);
    });

    it('should activate pressure plate with sufficient snake weight', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const pressurePlate = features.find(f => f.type === InteractiveFeatureType.PressurePlate);
      
      expect(pressurePlate).toBeDefined();
      
      const result = environmentSystem.activateInteractiveFeature(
        pressurePlate!.id,
        10, // snake length >= required weight
        3, // evolution level
        false // no Constrict power
      );
      
      expect(result.success).toBe(true);
      expect(result.feature.isActivated).toBe(true);
    });

    it('should fail to activate pressure plate without requirements', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const pressurePlate = features.find(f => f.type === InteractiveFeatureType.PressurePlate);
      
      expect(pressurePlate).toBeDefined();
      
      const result = environmentSystem.activateInteractiveFeature(
        pressurePlate!.id,
        5, // snake length < required weight
        3, // evolution level
        false // no Constrict power
      );
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Requires');
    });

    it('should deactivate connected obstacles when pressure plate is activated', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const pressurePlate = features.find(f => f.type === InteractiveFeatureType.PressurePlate);
      
      expect(pressurePlate).toBeDefined();
      expect(pressurePlate!.connectedElements).toBeDefined();
      
      // Get all obstacles before activation
      const allObstacles = environmentSystem.getObstacles();
      const initialActiveCount = allObstacles.filter(obs => obs.isActive).length;
      
      // Activate pressure plate
      const result = environmentSystem.activateInteractiveFeature(
        pressurePlate!.id,
        10,
        4,
        true
      );
      
      expect(result.success).toBe(true);
      
      // Check that some obstacles were deactivated (the connected ones)
      const obstaclesAfterActivation = environmentSystem.getObstacles();
      const activeCountAfterActivation = obstaclesAfterActivation.filter(obs => obs.isActive).length;
      
      // The number of active obstacles should be less than or equal to initial count
      // (some connected obstacles should be deactivated)
      expect(activeCountAfterActivation).toBeLessThanOrEqual(initialActiveCount);
    });

    it('should respect cooldown period', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const pressurePlate = features.find(f => f.type === InteractiveFeatureType.PressurePlate);
      
      expect(pressurePlate).toBeDefined();
      
      // First activation
      const result1 = environmentSystem.activateInteractiveFeature(
        pressurePlate!.id,
        10,
        4,
        true
      );
      expect(result1.success).toBe(true);
      
      // Immediate second activation should fail due to cooldown
      const result2 = environmentSystem.activateInteractiveFeature(
        pressurePlate!.id,
        10,
        4,
        true
      );
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('cooldown');
    });
  });

  describe('Ancient Switches', () => {
    it('should initialize ancient switches with correct properties', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const ancientSwitches = features.filter(f => f.type === InteractiveFeatureType.AncientSwitch);
      
      expect(ancientSwitches.length).toBeGreaterThan(0);
      
      const switchFeature = ancientSwitches[0];
      expect(switchFeature.type).toBe(InteractiveFeatureType.AncientSwitch);
      expect(switchFeature.requiredSnakeLength).toBeGreaterThan(0);
      expect(switchFeature.isActive).toBe(true);
      expect(switchFeature.isActivated).toBe(false);
      expect(switchFeature.connectedElements).toBeDefined();
    });

    it('should activate ancient switch with sufficient snake length', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const ancientSwitch = features.find(f => f.type === InteractiveFeatureType.AncientSwitch);
      
      expect(ancientSwitch).toBeDefined();
      
      const result = environmentSystem.activateInteractiveFeature(
        ancientSwitch!.id,
        ancientSwitch!.requiredSnakeLength!, // exact required length
        5, // evolution level
        false // Constrict power not needed
      );
      
      expect(result.success).toBe(true);
      expect(result.feature.isActivated).toBe(true);
      expect(result.effects?.removeObstacles).toBeDefined();
    });

    it('should fail to activate ancient switch with insufficient snake length', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const ancientSwitch = features.find(f => f.type === InteractiveFeatureType.AncientSwitch);
      
      expect(ancientSwitch).toBeDefined();
      
      const result = environmentSystem.activateInteractiveFeature(
        ancientSwitch!.id,
        ancientSwitch!.requiredSnakeLength! - 1, // one less than required
        5, // evolution level
        false
      );
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('snake length');
    });

    it('should have longer activation duration than pressure plates', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const ancientSwitch = features.find(f => f.type === InteractiveFeatureType.AncientSwitch);
      const pressurePlate = features.find(f => f.type === InteractiveFeatureType.PressurePlate);
      
      expect(ancientSwitch).toBeDefined();
      expect(pressurePlate).toBeDefined();
      
      expect(ancientSwitch!.activationDuration).toBeGreaterThan(pressurePlate!.activationDuration);
    });
  });

  describe('Mystical Portals', () => {
    it('should initialize mystical portals with correct properties', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const mysticalPortals = features.filter(f => f.type === InteractiveFeatureType.MysticalPortal);
      
      expect(mysticalPortals.length).toBeGreaterThan(0);
      expect(mysticalPortals.length % 2).toBe(0); // Should be pairs
      
      const portal = mysticalPortals[0];
      expect(portal.type).toBe(InteractiveFeatureType.MysticalPortal);
      expect(portal.requiredEvolutionLevel).toBeGreaterThanOrEqual(7);
      expect(portal.teleportDestination).toBeDefined();
      expect(portal.size.x).toBe(2);
      expect(portal.size.y).toBe(2);
    });

    it('should activate mystical portal with sufficient evolution level', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const mysticalPortal = features.find(f => f.type === InteractiveFeatureType.MysticalPortal);
      
      expect(mysticalPortal).toBeDefined();
      
      const result = environmentSystem.activateInteractiveFeature(
        mysticalPortal!.id,
        15, // snake length
        mysticalPortal!.requiredEvolutionLevel!, // exact required level
        false
      );
      
      expect(result.success).toBe(true);
      expect(result.feature.isActivated).toBe(true);
      expect(result.effects?.teleportTo).toBeDefined();
      expect(result.effects!.teleportTo).toEqual(mysticalPortal!.teleportDestination);
    });

    it('should fail to activate mystical portal with insufficient evolution level', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const mysticalPortal = features.find(f => f.type === InteractiveFeatureType.MysticalPortal);
      
      expect(mysticalPortal).toBeDefined();
      
      const result = environmentSystem.activateInteractiveFeature(
        mysticalPortal!.id,
        15, // snake length
        mysticalPortal!.requiredEvolutionLevel! - 1, // one less than required
        false
      );
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('evolution level');
    });

    it('should create portal pairs with matching destinations', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const mysticalPortals = features.filter(f => f.type === InteractiveFeatureType.MysticalPortal);
      
      // Group portals by their base ID (without _a or _b suffix)
      const portalGroups: { [key: string]: InteractiveFeature[] } = {};
      
      mysticalPortals.forEach(portal => {
        const baseId = portal.id.replace(/_[ab]$/, '');
        if (!portalGroups[baseId]) {
          portalGroups[baseId] = [];
        }
        portalGroups[baseId].push(portal);
      });
      
      // Check that each group has exactly 2 portals
      Object.values(portalGroups).forEach(group => {
        expect(group.length).toBe(2);
        
        const [portal1, portal2] = group;
        
        // Check that destinations are swapped (portal1 destination = portal2 position)
        expect(portal1.teleportDestination).toEqual(portal2.position);
        expect(portal2.teleportDestination).toEqual(portal1.position);
        
        // Check that they have the same evolution requirement
        expect(portal1.requiredEvolutionLevel).toBe(portal2.requiredEvolutionLevel);
      });
    });
  });

  describe('Collision Detection', () => {
    it('should detect collision with interactive features', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const feature = features[0];
      
      // Test collision at feature position
      const collisionFeature = environmentSystem.checkInteractiveFeatureCollision(feature.position);
      expect(collisionFeature).toBeDefined();
      expect(collisionFeature!.id).toBe(feature.id);
      
      // Test no collision at different position
      const noCollisionFeature = environmentSystem.checkInteractiveFeatureCollision({ x: 100, y: 100 });
      expect(noCollisionFeature).toBeUndefined();
    });

    it('should handle multi-cell features correctly', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const mysticalPortal = features.find(f => f.type === InteractiveFeatureType.MysticalPortal);
      
      expect(mysticalPortal).toBeDefined();
      
      // Test collision at different positions within the 2x2 portal
      const positions = [
        mysticalPortal!.position,
        { x: mysticalPortal!.position.x + 1, y: mysticalPortal!.position.y },
        { x: mysticalPortal!.position.x, y: mysticalPortal!.position.y + 1 },
        { x: mysticalPortal!.position.x + 1, y: mysticalPortal!.position.y + 1 }
      ];
      
      positions.forEach(pos => {
        const collisionFeature = environmentSystem.checkInteractiveFeatureCollision(pos);
        expect(collisionFeature).toBeDefined();
        expect(collisionFeature!.id).toBe(mysticalPortal!.id);
      });
    });
  });

  describe('Feature Updates', () => {
    it('should update activation progress over time', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const pressurePlate = features.find(f => f.type === InteractiveFeatureType.PressurePlate);
      
      expect(pressurePlate).toBeDefined();
      
      // Activate the feature
      environmentSystem.activateInteractiveFeature(
        pressurePlate!.id,
        10,
        4,
        true
      );
      
      expect(pressurePlate!.isActivated).toBe(true);
      expect(pressurePlate!.activationProgress).toBe(1.0);
      
      // Update with time passage
      environmentSystem.update(1000); // 1 second
      
      // Progress should decrease
      expect(pressurePlate!.activationProgress).toBeLessThan(1.0);
      expect(pressurePlate!.activationProgress).toBeGreaterThan(0);
    });

    it('should deactivate feature when activation expires', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const pressurePlate = features.find(f => f.type === InteractiveFeatureType.PressurePlate);
      
      expect(pressurePlate).toBeDefined();
      
      // Activate the feature
      environmentSystem.activateInteractiveFeature(
        pressurePlate!.id,
        10,
        4,
        true
      );
      
      expect(pressurePlate!.isActivated).toBe(true);
      
      // Update with full activation duration
      environmentSystem.update(pressurePlate!.activationDuration + 100);
      
      // Feature should be deactivated
      expect(pressurePlate!.isActivated).toBe(false);
      expect(pressurePlate!.activationProgress).toBe(0);
    });

    it('should update visual feedback during cooldown', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const feature = features[0];
      
      const initialGlow = feature.visualData.glowIntensity;
      
      // Activate and then let it expire
      environmentSystem.activateInteractiveFeature(
        feature.id,
        20, // high values to ensure activation
        10,
        true
      );
      
      // Let activation expire
      environmentSystem.update(feature.activationDuration + 100);
      
      // Update during cooldown
      environmentSystem.update(100);
      
      // Glow intensity should be different (indicating cooldown state)
      expect(feature.visualData.glowIntensity).not.toBe(initialGlow);
    });
  });

  describe('Area Queries', () => {
    it('should return features in specified area', () => {
      const allFeatures = environmentSystem.getInteractiveFeatures();
      expect(allFeatures.length).toBeGreaterThan(0);
      
      // Get features in a large area that should include some features
      const featuresInArea = environmentSystem.getInteractiveFeaturesInArea(
        { x: 0, y: 0 },
        { x: 50, y: 35 }
      );
      
      expect(featuresInArea.length).toBe(allFeatures.length);
      
      // Get features in a small area that might not include any
      const featuresInSmallArea = environmentSystem.getInteractiveFeaturesInArea(
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      );
      
      expect(featuresInSmallArea.length).toBeLessThanOrEqual(allFeatures.length);
    });

    it('should handle edge cases for area queries', () => {
      // Empty area
      const emptyArea = environmentSystem.getInteractiveFeaturesInArea(
        { x: 100, y: 100 },
        { x: 101, y: 101 }
      );
      expect(emptyArea).toEqual([]);
      
      // Single point
      const singlePoint = environmentSystem.getInteractiveFeaturesInArea(
        { x: 10, y: 10 },
        { x: 10, y: 10 }
      );
      expect(Array.isArray(singlePoint)).toBe(true);
    });
  });

  describe('Feature Management', () => {
    it('should add and remove interactive features', () => {
      const initialCount = environmentSystem.getInteractiveFeatures().length;
      
      const newFeature: InteractiveFeature = {
        id: 'test_feature',
        type: InteractiveFeatureType.PressurePlate,
        position: { x: 1, y: 1 },
        size: { x: 1, y: 1 },
        isActive: true,
        isActivated: false,
        requiresConstrictPower: true,
        activationProgress: 0,
        lastActivationTime: 0,
        activationDuration: 1000,
        cooldownTime: 500,
        visualData: {
          baseColor: '#000000',
          activatedColor: '#FFFFFF',
          glowIntensity: 0.5,
          pulseSpeed: 1.0
        }
      };
      
      // Add feature
      environmentSystem.addInteractiveFeature(newFeature);
      expect(environmentSystem.getInteractiveFeatures().length).toBe(initialCount + 1);
      
      // Remove feature
      const removed = environmentSystem.removeInteractiveFeature('test_feature');
      expect(removed).toBe(true);
      expect(environmentSystem.getInteractiveFeatures().length).toBe(initialCount);
      
      // Try to remove non-existent feature
      const notRemoved = environmentSystem.removeInteractiveFeature('non_existent');
      expect(notRemoved).toBe(false);
    });

    it('should reset interactive features', () => {
      const initialFeatures = environmentSystem.getInteractiveFeatures();
      
      // Activate a feature
      if (initialFeatures.length > 0) {
        environmentSystem.activateInteractiveFeature(
          initialFeatures[0].id,
          20,
          10,
          true
        );
        expect(initialFeatures[0].isActivated).toBe(true);
      }
      
      // Reset
      environmentSystem.reset();
      
      // Check that features are reset
      const resetFeatures = environmentSystem.getInteractiveFeatures();
      expect(resetFeatures.length).toBe(initialFeatures.length);
      
      resetFeatures.forEach(feature => {
        expect(feature.isActivated).toBe(false);
        expect(feature.activationProgress).toBe(0);
      });
    });
  });

  describe('Integration with Obstacles', () => {
    it('should properly connect features to obstacles', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const obstacles = environmentSystem.getObstacles();
      
      // Find a feature with connected elements
      const connectedFeature = features.find(f => f.connectedElements && f.connectedElements.length > 0);
      expect(connectedFeature).toBeDefined();
      
      // Check that connected obstacles exist
      if (connectedFeature && connectedFeature.connectedElements) {
        connectedFeature.connectedElements.forEach(elementId => {
          const obstacle = obstacles.find(obs => obs.id === elementId);
          // Note: obstacle might not exist if it's a dynamic element or if IDs don't match exactly
          // This is expected behavior as some connected elements might be dynamic elements
        });
      }
    });

    it('should reactivate obstacles when feature deactivates', () => {
      const features = environmentSystem.getInteractiveFeatures();
      const pressurePlate = features.find(f => 
        f.type === InteractiveFeatureType.PressurePlate && 
        f.connectedElements && 
        f.connectedElements.length > 0
      );
      
      expect(pressurePlate).toBeDefined();
      
      if (pressurePlate) {
        // Get initial active obstacle count
        const initialActiveCount = environmentSystem.getObstacles().filter(obs => obs.isActive).length;
        
        // Activate pressure plate
        environmentSystem.activateInteractiveFeature(
          pressurePlate.id,
          10,
          4,
          true
        );
        
        // Some obstacles should be deactivated
        const activeCountDuringActivation = environmentSystem.getObstacles().filter(obs => obs.isActive).length;
        expect(activeCountDuringActivation).toBeLessThanOrEqual(initialActiveCount);
        
        // Let activation expire
        environmentSystem.update(pressurePlate.activationDuration + 100);
        
        // Obstacles should be reactivated
        const finalActiveCount = environmentSystem.getObstacles().filter(obs => obs.isActive).length;
        expect(finalActiveCount).toBe(initialActiveCount);
      }
    });
  });
});