import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SnakeManager } from '../core/SnakeManager';
import { GameConfig, TailConsumptionResult, ClickableSegmentInfo } from '../types/game';

describe('Tail Consumption Mechanics (Ouroboros)', () => {
  let snakeManager: SnakeManager;
  let mockConfig: GameConfig;

  beforeEach(() => {
    mockConfig = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    
    // Mock performance.now for consistent testing
    vi.spyOn(performance, 'now').mockReturnValue(0);
    
    snakeManager = new SnakeManager(mockConfig, { x: 25, y: 17 });
  });

  describe('Evolution Level Requirements', () => {
    it('should not allow tail consumption below level 10', () => {
      snakeManager.setEvolutionLevel(9);
      snakeManager.grow(10); // Make snake longer
      
      const result = snakeManager.consumeTail(3);
      
      expect(result.success).toBe(false);
      expect(result.segmentsConsumed).toBe(0);
      expect(result.message).toContain('Ouroboros level');
    });

    it('should allow tail consumption at level 10', () => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(10); // Make snake longer
      
      const result = snakeManager.consumeTail(2);
      
      expect(result.success).toBe(true);
      expect(result.segmentsConsumed).toBe(2);
    });

    it('should not allow tail consumption at levels 1-9', () => {
      for (let level = 1; level <= 9; level++) {
        snakeManager.setEvolutionLevel(level);
        snakeManager.grow(10);
        
        const result = snakeManager.consumeTail(1);
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('Ouroboros level');
      }
    });
  });

  describe('Length Reduction Mechanics', () => {
    beforeEach(() => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(15); // Make snake 18 segments total (3 initial + 15)
    });

    it('should reduce snake length by specified segments', () => {
      const initialLength = snakeManager.getLength();
      
      const result = snakeManager.consumeTail(3);
      
      expect(result.success).toBe(true);
      expect(result.segmentsConsumed).toBe(3);
      expect(snakeManager.getLength()).toBe(initialLength - 3);
    });

    it('should remove segments from the tail end', () => {
      const initialLength = snakeManager.getLength();
      const initialSegments = snakeManager.getSegments();
      const segmentsToConsume = 3;
      
      const result = snakeManager.consumeTail(segmentsToConsume);
      
      expect(result.success).toBe(true);
      expect(result.segmentsConsumed).toBe(segmentsToConsume);
      
      const newSegments = snakeManager.getSegments();
      const newLength = snakeManager.getLength();
      
      // Verify the correct number of segments were removed
      expect(newLength).toBe(initialLength - segmentsToConsume);
      expect(newSegments.length).toBe(initialSegments.length - segmentsToConsume);
      
      // Verify that consumed segment positions are returned
      expect(result.consumedSegmentPositions).toBeDefined();
      expect(result.consumedSegmentPositions).toHaveLength(segmentsToConsume);
    });

    it('should maintain minimum snake length', () => {
      const result = snakeManager.consumeTail(20); // Try to consume more than available
      
      expect(result.success).toBe(true);
      expect(snakeManager.getLength()).toBeGreaterThanOrEqual(5); // Minimum length
    });

    it('should not consume segments if at minimum length', () => {
      // Reduce to minimum length first
      const currentLength = snakeManager.getLength();
      const toConsume = currentLength - 5; // Leave minimum
      snakeManager.consumeTail(toConsume);
      
      // Try to consume more
      const result = snakeManager.consumeTail(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('minimum length');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(10);
    });

    it('should reject zero segments', () => {
      const result = snakeManager.consumeTail(0);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid number');
    });

    it('should reject negative segments', () => {
      const result = snakeManager.consumeTail(-5);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid number');
    });

    it('should handle large segment requests gracefully', () => {
      const initialLength = snakeManager.getLength();
      
      const result = snakeManager.consumeTail(1000);
      
      expect(result.success).toBe(true);
      expect(result.segmentsConsumed).toBeLessThan(initialLength);
      expect(snakeManager.getLength()).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Cooldown System', () => {
    beforeEach(() => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(15);
    });

    it('should enforce cooldown between consumptions', () => {
      // First consumption should succeed
      const result1 = snakeManager.consumeTail(2);
      expect(result1.success).toBe(true);
      
      // Immediate second consumption should fail
      const result2 = snakeManager.consumeTail(2);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('cooldown');
    });

    it('should allow consumption after cooldown period', () => {
      // First consumption
      snakeManager.consumeTail(2);
      
      // Advance time beyond cooldown (2 seconds)
      vi.spyOn(performance, 'now').mockReturnValue(2500);
      
      // Second consumption should succeed
      const result = snakeManager.consumeTail(2);
      expect(result.success).toBe(true);
    });

    it('should provide accurate cooldown remaining time', () => {
      snakeManager.consumeTail(2);
      
      // Check cooldown immediately after
      const cooldown1 = snakeManager.getTailConsumptionCooldown();
      expect(cooldown1).toBeGreaterThan(1900); // Should be close to 2000ms
      
      // Advance time partially
      vi.spyOn(performance, 'now').mockReturnValue(1000);
      const cooldown2 = snakeManager.getTailConsumptionCooldown();
      expect(cooldown2).toBeGreaterThan(900);
      expect(cooldown2).toBeLessThan(1100);
      
      // After cooldown period
      vi.spyOn(performance, 'now').mockReturnValue(2500);
      const cooldown3 = snakeManager.getTailConsumptionCooldown();
      expect(cooldown3).toBe(0);
    });
  });

  describe('Strategic Advantages', () => {
    beforeEach(() => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(15);
    });

    it('should provide bonus points based on segments consumed', () => {
      const result = snakeManager.consumeTail(3);
      
      expect(result.success).toBe(true);
      expect(result.strategicAdvantage).toBeDefined();
      expect(result.strategicAdvantage!.bonusPoints).toBe(150); // 3 * 50
    });

    it('should provide navigation bonus based on consumption amount', () => {
      const result1 = snakeManager.consumeTail(1);
      expect(result1.strategicAdvantage!.navigationBonus).toBe('minor');
      
      // Reset for next test
      vi.spyOn(performance, 'now').mockReturnValue(3000);
      const result2 = snakeManager.consumeTail(2);
      expect(result2.strategicAdvantage!.navigationBonus).toBe('moderate');
      
      // Reset for next test
      vi.spyOn(performance, 'now').mockReturnValue(6000);
      const result3 = snakeManager.consumeTail(3);
      expect(result3.strategicAdvantage!.navigationBonus).toBe('significant');
    });

    it('should provide speed boost with correct multiplier and duration', () => {
      const result = snakeManager.consumeTail(2);
      
      expect(result.strategicAdvantage!.speedBoost.multiplier).toBe(1.4); // 1.2 + 2*0.1
      expect(result.strategicAdvantage!.speedBoost.duration).toBe(3000);
    });

    it('should provide mystical energy based on segments consumed', () => {
      const result = snakeManager.consumeTail(4);
      
      expect(result.strategicAdvantage!.mysticalEnergy).toBe(40); // 4 * 10
    });
  });

  describe('Click/Tap Detection', () => {
    beforeEach(() => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(10);
    });

    it('should detect clicks on tail segments', () => {
      const segments = snakeManager.getSegments();
      const tailStartIndex = Math.floor(segments.length * 0.3);
      
      // Pick a segment that's definitely in the tail region
      const tailSegmentIndex = Math.max(tailStartIndex + 1, segments.length - 2); // Ensure we're well into the tail
      const tailSegment = segments[tailSegmentIndex];
      
      const worldPosition = {
        x: tailSegment.x * mockConfig.cellSize + mockConfig.cellSize / 2,
        y: tailSegment.y * mockConfig.cellSize + mockConfig.cellSize / 2
      };
      
      const segmentInfo = snakeManager.getClickableSegmentInfo(worldPosition);
      
      expect(segmentInfo).toBeDefined();
      expect(segmentInfo!.isConsumable).toBe(true);
      expect(segmentInfo!.segmentIndex).toBeGreaterThanOrEqual(tailStartIndex);
    });

    it('should not allow consumption of head or front segments', () => {
      const segments = snakeManager.getSegments();
      const frontSegment = segments[0]; // First segment (near head)
      
      const worldPosition = {
        x: frontSegment.x * mockConfig.cellSize + mockConfig.cellSize / 2,
        y: frontSegment.y * mockConfig.cellSize + mockConfig.cellSize / 2
      };
      
      const segmentInfo = snakeManager.getClickableSegmentInfo(worldPosition);
      
      expect(segmentInfo).toBeDefined();
      expect(segmentInfo!.isConsumable).toBe(false);
    });

    it('should only allow consumption of tail 70% of segments', () => {
      const segments = snakeManager.getSegments();
      const tailStartIndex = Math.floor(segments.length * 0.3);
      
      // Test segment just before tail region
      expect(snakeManager.canConsumeTailSegment(tailStartIndex - 1)).toBe(false);
      
      // Test segment at start of tail region
      expect(snakeManager.canConsumeTailSegment(tailStartIndex)).toBe(true);
      
      // Test segment at end of tail
      expect(snakeManager.canConsumeTailSegment(segments.length - 1)).toBe(true);
    });

    it('should return null for clicks outside snake body', () => {
      const worldPosition = {
        x: 1000, // Far outside grid
        y: 1000
      };
      
      const segmentInfo = snakeManager.getClickableSegmentInfo(worldPosition);
      
      expect(segmentInfo).toBeNull();
    });

    it('should return null for clicks when not at Ouroboros level', () => {
      snakeManager.setEvolutionLevel(9);
      
      const segments = snakeManager.getSegments();
      const tailSegment = segments[segments.length - 1];
      
      const worldPosition = {
        x: tailSegment.x * mockConfig.cellSize + mockConfig.cellSize / 2,
        y: tailSegment.y * mockConfig.cellSize + mockConfig.cellSize / 2
      };
      
      const segmentInfo = snakeManager.getClickableSegmentInfo(worldPosition);
      
      expect(segmentInfo).toBeNull();
    });
  });

  describe('Segment-Specific Consumption', () => {
    beforeEach(() => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(10);
    });

    it('should consume from specific segment to tail', () => {
      const segments = snakeManager.getSegments();
      const targetIndex = segments.length - 3; // 3rd from last
      const initialLength = snakeManager.getLength();
      
      const result = snakeManager.consumeTailFromSegment(targetIndex);
      
      expect(result.success).toBe(true);
      expect(result.segmentsConsumed).toBe(3);
      expect(snakeManager.getLength()).toBe(initialLength - 3);
    });

    it('should not consume from non-tail segments', () => {
      const result = snakeManager.consumeTailFromSegment(0); // First segment
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot consume this segment');
    });

    it('should handle invalid segment indices', () => {
      const segments = snakeManager.getSegments();
      
      // Negative index
      const result1 = snakeManager.consumeTailFromSegment(-1);
      expect(result1.success).toBe(false);
      
      // Index beyond array
      const result2 = snakeManager.consumeTailFromSegment(segments.length + 5);
      expect(result2.success).toBe(false);
    });
  });

  describe('Game Balance and Exploitation Prevention', () => {
    beforeEach(() => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(20);
    });

    it('should track consumption count', () => {
      expect(snakeManager.getTailConsumptionCount()).toBe(0);
      
      snakeManager.consumeTail(2);
      expect(snakeManager.getTailConsumptionCount()).toBe(1);
      
      // Advance time and consume again
      vi.spyOn(performance, 'now').mockReturnValue(3000);
      snakeManager.consumeTail(1);
      expect(snakeManager.getTailConsumptionCount()).toBe(2);
    });

    it('should prevent rapid successive consumptions', () => {
      const results: TailConsumptionResult[] = [];
      
      // Try to consume multiple times rapidly
      for (let i = 0; i < 5; i++) {
        results.push(snakeManager.consumeTail(1));
      }
      
      // Only first should succeed
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(false);
      expect(results[3].success).toBe(false);
      expect(results[4].success).toBe(false);
    });

    it('should maintain minimum viable snake length', () => {
      const initialLength = snakeManager.getLength();
      
      // Try to consume almost entire snake
      const result = snakeManager.consumeTail(initialLength - 2);
      
      expect(result.success).toBe(true);
      expect(snakeManager.getLength()).toBeGreaterThanOrEqual(5);
    });

    it('should provide diminishing returns for large consumptions', () => {
      // Small consumption
      const result1 = snakeManager.consumeTail(1);
      const pointsPerSegment1 = result1.strategicAdvantage!.bonusPoints / result1.segmentsConsumed;
      
      // Reset and try large consumption
      vi.spyOn(performance, 'now').mockReturnValue(3000);
      const result2 = snakeManager.consumeTail(5);
      const pointsPerSegment2 = result2.strategicAdvantage!.bonusPoints / result2.segmentsConsumed;
      
      // Points per segment should be the same (no diminishing returns in current implementation)
      // This test documents current behavior - could be modified for balance
      expect(pointsPerSegment1).toBe(pointsPerSegment2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle consumption when snake is at minimum length', () => {
      snakeManager.setEvolutionLevel(10);
      // Don't grow - keep at initial 3 segments
      
      const result = snakeManager.consumeTail(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('minimum length');
    });

    it('should handle consumption with exactly minimum segments', () => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(2); // Total of 5 segments (minimum)
      
      const result = snakeManager.consumeTail(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('minimum length');
    });

    it('should handle consumption with one more than minimum', () => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(3); // Total of 6 segments
      
      const result = snakeManager.consumeTail(1);
      
      expect(result.success).toBe(true);
      expect(result.segmentsConsumed).toBe(1);
      expect(snakeManager.getLength()).toBe(5); // Back to minimum
    });

    it('should provide consumed segment positions for visual effects', () => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(10);
      
      const result = snakeManager.consumeTail(3);
      
      expect(result.success).toBe(true);
      expect(result.consumedSegmentPositions).toBeDefined();
      expect(result.consumedSegmentPositions).toHaveLength(3);
      
      result.consumedSegmentPositions!.forEach(pos => {
        expect(typeof pos.x).toBe('number');
        expect(typeof pos.y).toBe('number');
      });
    });
  });

  describe('Legacy Compatibility', () => {
    it('should maintain backward compatibility with legacy method', () => {
      snakeManager.setEvolutionLevel(10);
      snakeManager.grow(10);
      
      const legacyResult = snakeManager.consumeTailLegacy(2);
      expect(legacyResult).toBe(true);
      
      // Should still enforce cooldown
      const legacyResult2 = snakeManager.consumeTailLegacy(1);
      expect(legacyResult2).toBe(false);
    });

    it('should return false for legacy method when not at Ouroboros level', () => {
      snakeManager.setEvolutionLevel(9);
      snakeManager.grow(10);
      
      const legacyResult = snakeManager.consumeTailLegacy(2);
      expect(legacyResult).toBe(false);
    });
  });
});