import { describe, test, expect, beforeEach } from 'vitest';
import { VisualPatternManager } from '../core/VisualPatternManager';
import { VisualPattern } from '../core/EvolutionSystem';

describe('VisualPatternManager', () => {
  let patternManager: VisualPatternManager;
  let mockTime: number;
  
  const getMockTime = () => mockTime;

  beforeEach(() => {
    mockTime = 0;
    patternManager = new VisualPatternManager(getMockTime);
  });

  test('should initialize with default patterns', () => {
    expect(patternManager).toBeDefined();
    
    // Test that we can get patterns for first 3 levels
    const level1Pattern = patternManager.getPatternForLevel(1);
    const level2Pattern = patternManager.getPatternForLevel(2);
    const level3Pattern = patternManager.getPatternForLevel(3);
    
    expect(level1Pattern).toBeDefined();
    expect(level2Pattern).toBeDefined();
    expect(level3Pattern).toBeDefined();
  });

  test('should return correct patterns for each evolution level', () => {
    // Level 1: Hatchling - solid green
    const level1 = patternManager.getPatternForLevel(1);
    expect(level1.baseColor).toBe('#4CAF50');
    expect(level1.secondaryColor).toBe('#66BB6A');
    expect(level1.patternType).toBe('solid');
    expect(level1.glowIntensity).toBe(0.0);
    expect(level1.scaleTexture).toBe('basic');
    expect(level1.animationSpeed).toBe(1.0);

    // Level 2: Garden Snake - green with yellow stripes
    const level2 = patternManager.getPatternForLevel(2);
    expect(level2.baseColor).toBe('#4CAF50');
    expect(level2.secondaryColor).toBe('#FFEB3B');
    expect(level2.patternType).toBe('stripes');
    expect(level2.glowIntensity).toBe(0.1);
    expect(level2.scaleTexture).toBe('detailed');
    expect(level2.animationSpeed).toBe(1.1);

    // Level 3: Viper - brown with diamond patterns
    const level3 = patternManager.getPatternForLevel(3);
    expect(level3.baseColor).toBe('#795548');
    expect(level3.secondaryColor).toBe('#FF5722');
    expect(level3.patternType).toBe('diamond');
    expect(level3.glowIntensity).toBe(0.2);
    expect(level3.scaleTexture).toBe('diamond');
    expect(level3.animationSpeed).toBe(1.2);
  });

  test('should fallback to level 1 pattern for unknown levels', () => {
    const unknownLevel = patternManager.getPatternForLevel(99);
    const level1Pattern = patternManager.getPatternForLevel(1);
    
    expect(unknownLevel).toEqual(level1Pattern);
  });

  test('should start and manage transitions', () => {
    expect(patternManager.isTransitioning()).toBe(false);
    
    patternManager.startTransition(1, 2);
    
    expect(patternManager.isTransitioning()).toBe(true);
    expect(patternManager.getTransitionProgress()).toBe(0.0);
  });

  test('should update transition progress over time', () => {
    patternManager.startTransition(1, 2);
    
    // Advance mock time
    mockTime = 500; // 500ms
    patternManager.update(16);
    
    expect(patternManager.isTransitioning()).toBe(true);
    expect(patternManager.getTransitionProgress()).toBeGreaterThan(0);
    expect(patternManager.getTransitionProgress()).toBeLessThan(1);
  });

  test('should complete transition after duration', () => {
    patternManager.startTransition(1, 2);
    
    // Advance mock time past transition duration
    mockTime = 2500; // More than 2000ms duration
    patternManager.update(16);
    
    expect(patternManager.isTransitioning()).toBe(false);
    expect(patternManager.getTransitionProgress()).toBe(0);
  });

  test('should interpolate patterns during transition', () => {
    patternManager.startTransition(1, 2);
    
    // Advance to halfway through transition
    mockTime = 1000; // Halfway through 2000ms
    patternManager.update(16);
    
    const currentPattern = patternManager.getCurrentPattern(1);
    
    // Should be somewhere between level 1 and level 2 patterns
    expect(currentPattern).toBeDefined();
    expect(currentPattern.baseColor).toBeDefined();
    expect(currentPattern.secondaryColor).toBeDefined();
    
    // Pattern type should switch at midpoint
    const progress = patternManager.getTransitionProgress();
    if (progress < 0.5) {
      expect(currentPattern.patternType).toBe('solid'); // Level 1
    } else {
      expect(currentPattern.patternType).toBe('stripes'); // Level 2
    }
  });

  test('should return base pattern when not transitioning', () => {
    const level2Pattern = patternManager.getPatternForLevel(2);
    const currentPattern = patternManager.getCurrentPattern(2);
    
    expect(currentPattern).toEqual(level2Pattern);
  });

  test('should create custom patterns', () => {
    const customPattern = patternManager.createCustomPattern(
      '#FF0000',
      '#00FF00',
      'scales',
      0.5,
      'detailed',
      1.5
    );
    
    expect(customPattern.baseColor).toBe('#FF0000');
    expect(customPattern.secondaryColor).toBe('#00FF00');
    expect(customPattern.patternType).toBe('scales');
    expect(customPattern.glowIntensity).toBe(0.5);
    expect(customPattern.scaleTexture).toBe('detailed');
    expect(customPattern.animationSpeed).toBe(1.5);
  });

  test('should register new patterns', () => {
    const customPattern: VisualPattern = {
      baseColor: '#FF0000',
      secondaryColor: '#00FF00',
      patternType: 'scales',
      glowIntensity: 0.5,
      scaleTexture: 'detailed',
      animationSpeed: 1.5
    };
    
    patternManager.registerPattern(4, customPattern);
    
    const retrievedPattern = patternManager.getPatternForLevel(4);
    expect(retrievedPattern).toEqual(customPattern);
  });

  test('should validate patterns correctly', () => {
    const validPattern: VisualPattern = {
      baseColor: '#4CAF50',
      secondaryColor: '#66BB6A',
      patternType: 'solid',
      glowIntensity: 0.5,
      scaleTexture: 'basic',
      animationSpeed: 1.0
    };
    
    const invalidPattern: VisualPattern = {
      baseColor: 'invalid-color',
      secondaryColor: '#66BB6A',
      patternType: 'invalid-pattern',
      glowIntensity: -1.0, // Invalid negative value
      scaleTexture: 'invalid-texture',
      animationSpeed: 0.0 // Invalid zero value
    };
    
    expect(patternManager.validatePattern(validPattern)).toBe(true);
    expect(patternManager.validatePattern(invalidPattern)).toBe(false);
  });

  test('should reset to initial state', () => {
    patternManager.startTransition(1, 2);
    patternManager.update(500);
    
    expect(patternManager.isTransitioning()).toBe(true);
    
    patternManager.reset();
    
    expect(patternManager.isTransitioning()).toBe(false);
    expect(patternManager.getTransitionProgress()).toBe(0);
  });

  test('should force complete transitions', () => {
    patternManager.startTransition(1, 2);
    patternManager.update(500); // Partial progress
    
    expect(patternManager.isTransitioning()).toBe(true);
    
    patternManager.completeTransition();
    
    expect(patternManager.isTransitioning()).toBe(false);
  });

  test('should get all patterns', () => {
    const allPatterns = patternManager.getAllPatterns();
    
    expect(allPatterns.size).toBeGreaterThanOrEqual(3);
    expect(allPatterns.has(1)).toBe(true);
    expect(allPatterns.has(2)).toBe(true);
    expect(allPatterns.has(3)).toBe(true);
  });

  test('should handle color interpolation correctly', () => {
    patternManager.startTransition(1, 3); // Green to brown
    
    // Advance to halfway through transition
    mockTime = 1000; // Halfway
    patternManager.update(16);
    
    const currentPattern = patternManager.getCurrentPattern(1);
    
    // Color should be interpolated between green and brown
    expect(currentPattern.baseColor).toMatch(/^#[0-9A-F]{6}$/i);
    expect(currentPattern.baseColor).not.toBe('#4CAF50'); // Not original green
    expect(currentPattern.baseColor).not.toBe('#795548'); // Not target brown
  });

  test('should handle glow intensity interpolation', () => {
    patternManager.startTransition(1, 3); // 0.0 to 0.2 glow
    
    // Advance to halfway through transition
    mockTime = 1000; // Halfway through 2000ms transition
    patternManager.update(16);
    
    const currentPattern = patternManager.getCurrentPattern(1);
    
    expect(currentPattern.glowIntensity).toBeGreaterThan(0.0);
    expect(currentPattern.glowIntensity).toBeLessThan(0.2);
    // Check that it's somewhere in the middle range
    expect(currentPattern.glowIntensity).toBeGreaterThan(0.05);
    expect(currentPattern.glowIntensity).toBeLessThan(0.15);
  });
});