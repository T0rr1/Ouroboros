import { VisualPattern } from './EvolutionSystem';

export interface PatternTransition {
  fromPattern: VisualPattern;
  toPattern: VisualPattern;
  progress: number; // 0.0 to 1.0
  duration: number; // milliseconds
  startTime: number;
}

export class VisualPatternManager {
  private currentTransition: PatternTransition | null = null;
  private readonly TRANSITION_DURATION = 2000; // 2 seconds
  private getTime: () => number;

  // Predefined patterns for evolution levels 1-7
  private readonly EVOLUTION_PATTERNS: Map<number, VisualPattern> = new Map([
    // Level 1: Hatchling - Simple green scales
    [1, {
      baseColor: '#4CAF50',      // Forest green
      secondaryColor: '#66BB6A',  // Lighter green
      patternType: 'solid',
      glowIntensity: 0.0,
      scaleTexture: 'basic',
      animationSpeed: 1.0
    }],
    
    // Level 2: Garden Snake - Green with yellow stripes
    [2, {
      baseColor: '#4CAF50',      // Forest green
      secondaryColor: '#FFEB3B',  // Bright yellow
      patternType: 'stripes',
      glowIntensity: 0.1,
      scaleTexture: 'detailed',
      animationSpeed: 1.1
    }],
    
    // Level 3: Viper - Brown with diamond patterns
    [3, {
      baseColor: '#795548',      // Brown
      secondaryColor: '#FF5722',  // Deep orange/red
      patternType: 'diamond',
      glowIntensity: 0.2,
      scaleTexture: 'diamond',
      animationSpeed: 1.2
    }],

    // Level 4: Python - Reticulated brown patterns
    [4, {
      baseColor: '#8D6E63',      // Medium brown
      secondaryColor: '#3E2723',  // Dark brown
      patternType: 'reticulated',
      glowIntensity: 0.3,
      scaleTexture: 'reticulated',
      animationSpeed: 1.0
    }],

    // Level 5: Cobra - Dark with golden hood markings
    [5, {
      baseColor: '#424242',      // Dark gray
      secondaryColor: '#FFC107',  // Golden yellow
      patternType: 'hooded',
      glowIntensity: 0.4,
      scaleTexture: 'hooded',
      animationSpeed: 1.3
    }],

    // Level 6: Anaconda - Aquatic green patterns
    [6, {
      baseColor: '#2E7D32',      // Dark green
      secondaryColor: '#1B5E20',  // Very dark green
      patternType: 'aquatic',
      glowIntensity: 0.5,
      scaleTexture: 'aquatic',
      animationSpeed: 0.9
    }],

    // Level 7: Rainbow Serpent - Iridescent rainbow patterns
    [7, {
      baseColor: '#E91E63',      // Pink/magenta
      secondaryColor: '#9C27B0',  // Purple
      patternType: 'rainbow',
      glowIntensity: 0.6,
      scaleTexture: 'iridescent',
      animationSpeed: 1.4
    }],

    // Level 8: Celestial Serpent - Starry blue patterns with celestial glow
    [8, {
      baseColor: '#3F51B5',      // Indigo blue
      secondaryColor: '#E8EAF6',  // Light blue/white
      patternType: 'celestial',
      glowIntensity: 0.8,
      scaleTexture: 'starry',
      animationSpeed: 1.5
    }],

    // Level 9: Ancient Dragon Serpent - Fiery red with draconic patterns
    [9, {
      baseColor: '#D32F2F',      // Deep red
      secondaryColor: '#FF9800',  // Orange
      patternType: 'draconic',
      glowIntensity: 0.9,
      scaleTexture: 'draconic',
      animationSpeed: 1.6
    }],

    // Level 10: Ouroboros - Golden mystical with reality-bending effects
    [10, {
      baseColor: '#FFD700',      // Pure gold
      secondaryColor: '#FFF8E1',  // Cream/light gold
      patternType: 'mystical',
      glowIntensity: 1.0,
      scaleTexture: 'mystical',
      animationSpeed: 1.8
    }]
  ]);

  constructor(getTime: () => number = () => performance.now()) {
    this.getTime = getTime;
  }

  public getPatternForLevel(level: number): VisualPattern {
    const pattern = this.EVOLUTION_PATTERNS.get(level);
    if (pattern) {
      return { ...pattern }; // Return a copy
    }
    
    // Fallback to level 1 pattern if level not found
    return { ...this.EVOLUTION_PATTERNS.get(1)! };
  }

  public startTransition(fromLevel: number, toLevel: number): void {
    const fromPattern = this.getPatternForLevel(fromLevel);
    const toPattern = this.getPatternForLevel(toLevel);
    
    this.currentTransition = {
      fromPattern,
      toPattern,
      progress: 0.0,
      duration: this.TRANSITION_DURATION,
      startTime: this.getTime()
    };
  }

  public update(deltaTime: number): void {
    if (!this.currentTransition) return;
    
    const elapsed = this.getTime() - this.currentTransition.startTime;
    this.currentTransition.progress = Math.min(1.0, elapsed / this.currentTransition.duration);
    
    if (this.currentTransition.progress >= 1.0) {
      this.currentTransition = null;
    }
  }

  public getCurrentPattern(baseLevel: number): VisualPattern {
    if (!this.currentTransition) {
      return this.getPatternForLevel(baseLevel);
    }
    
    // Interpolate between patterns during transition
    return this.interpolatePatterns(
      this.currentTransition.fromPattern,
      this.currentTransition.toPattern,
      this.currentTransition.progress
    );
  }

  private interpolatePatterns(from: VisualPattern, to: VisualPattern, t: number): VisualPattern {
    // Smooth transition curve (ease-in-out)
    const smoothT = t * t * (3.0 - 2.0 * t);
    
    return {
      baseColor: this.interpolateColor(from.baseColor, to.baseColor, smoothT),
      secondaryColor: this.interpolateColor(from.secondaryColor, to.secondaryColor, smoothT),
      patternType: smoothT < 0.5 ? from.patternType : to.patternType, // Switch at midpoint
      glowIntensity: this.lerp(from.glowIntensity, to.glowIntensity, smoothT),
      scaleTexture: smoothT < 0.5 ? from.scaleTexture : to.scaleTexture,
      animationSpeed: this.lerp(from.animationSpeed, to.animationSpeed, smoothT)
    };
  }

  private interpolateColor(fromHex: string, toHex: string, t: number): string {
    const fromRgb = this.hexToRgb(fromHex);
    const toRgb = this.hexToRgb(toHex);
    
    const r = Math.round(this.lerp(fromRgb.r, toRgb.r, t));
    const g = Math.round(this.lerp(fromRgb.g, toRgb.g, t));
    const b = Math.round(this.lerp(fromRgb.b, toRgb.b, t));
    
    return this.rgbToHex(r, g, b);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public isTransitioning(): boolean {
    return this.currentTransition !== null;
  }

  public getTransitionProgress(): number {
    return this.currentTransition ? this.currentTransition.progress : 0.0;
  }

  // Method to create custom patterns for testing or future levels
  public createCustomPattern(
    baseColor: string,
    secondaryColor: string,
    patternType: string,
    glowIntensity: number = 0.0,
    scaleTexture: string = 'basic',
    animationSpeed: number = 1.0
  ): VisualPattern {
    return {
      baseColor,
      secondaryColor,
      patternType,
      glowIntensity,
      scaleTexture,
      animationSpeed
    };
  }

  // Method to add new patterns dynamically (for future evolution levels)
  public registerPattern(level: number, pattern: VisualPattern): void {
    this.EVOLUTION_PATTERNS.set(level, { ...pattern });
  }

  // Get all available patterns (useful for debugging/testing)
  public getAllPatterns(): Map<number, VisualPattern> {
    return new Map(this.EVOLUTION_PATTERNS);
  }

  // Validate pattern properties
  public validatePattern(pattern: VisualPattern): boolean {
    const validPatternTypes = ['solid', 'stripes', 'diamond', 'scales', 'reticulated', 'hooded', 'aquatic', 'rainbow', 'celestial', 'draconic', 'mystical'];
    const validScaleTextures = ['basic', 'detailed', 'diamond', 'reticulated', 'hooded', 'aquatic', 'iridescent', 'starry', 'draconic', 'mystical'];
    
    return (
      this.isValidHexColor(pattern.baseColor) &&
      this.isValidHexColor(pattern.secondaryColor) &&
      validPatternTypes.includes(pattern.patternType) &&
      pattern.glowIntensity >= 0.0 && pattern.glowIntensity <= 2.0 &&
      validScaleTextures.includes(pattern.scaleTexture) &&
      pattern.animationSpeed > 0.0 && pattern.animationSpeed <= 3.0
    );
  }

  private isValidHexColor(hex: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(hex);
  }

  // Reset to initial state
  public reset(): void {
    this.currentTransition = null;
  }

  // Force complete current transition
  public completeTransition(): void {
    if (this.currentTransition) {
      this.currentTransition.progress = 1.0;
      this.currentTransition = null;
    }
  }
}