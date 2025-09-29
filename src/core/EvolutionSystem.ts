import { GameConfig, Vector2, FoodType, ConsumptionResult } from '../types/game';

export enum PowerType {
  SpeedBoost = 'SpeedBoost',
  VenomStrike = 'VenomStrike',
  Constrict = 'Constrict',
  HoodExpansion = 'HoodExpansion',
  AquaticMovement = 'AquaticMovement',
  ColorChange = 'ColorChange',
  TimeWarp = 'TimeWarp',
  FireBreath = 'FireBreath',
  TailConsumption = 'TailConsumption',
  PowerCycling = 'PowerCycling',
  RealityManipulation = 'RealityManipulation'
}

export interface VisualPattern {
  id: string;
  name: string;
  colors: string[];
  pattern: 'solid' | 'stripes' | 'spots' | 'gradient' | 'scales' | 'mystical';
  intensity: number;
  animationSpeed: number;
}

export interface EvolutionLevel {
  level: number;
  name: string;
  requiredFood: number;
  segmentCount: number;
  powers: PowerType[];
  visualPattern: VisualPattern;
  description: string;
  speedMultiplier: number;
  scoreMultiplier: number;
}

export interface PowerState {
  type: PowerType;
  isUnlocked: boolean;
  isActive: boolean;
  cooldownRemaining: number;
  duration: number;
  level: number;
  remainingDuration?: number;
  lastActivated?: number;
}

export interface EvolutionState {
  currentLevel: number;
  foodProgress: number;
  totalFoodConsumed: number;
  isTransformationInProgress: boolean;
  transformationProgress: number;
  availablePowers: PowerType[];
  powerStates: Map<PowerType, PowerState>;
}

export interface EvolutionResult {
  success: boolean;
  newLevel: number;
  unlockedPowers: PowerType[];
  newVisualPattern: VisualPattern;
  message: string;
}

export class EvolutionSystem {
  private config: GameConfig;
  private state: EvolutionState;
  private evolutionLevels: Map<number, EvolutionLevel>;

  constructor(config: GameConfig) {
    this.config = config;
    this.state = this.initializeState();
    this.evolutionLevels = this.initializeEvolutionLevels();
  }

  private initializeState(): EvolutionState {
    return {
      currentLevel: 1,
      foodProgress: 0,
      totalFoodConsumed: 0,
      isTransformationInProgress: false,
      transformationProgress: 0,
      availablePowers: [],
      powerStates: new Map()
    };
  }

  private initializeEvolutionLevels(): Map<number, EvolutionLevel> {
    const levels = new Map<number, EvolutionLevel>();
    
    // Level 1: Hatchling
    levels.set(1, {
      level: 1,
      name: 'Hatchling',
      requiredFood: 0,
      segmentCount: 3,
      powers: [],
      visualPattern: {
        id: 'hatchling',
        name: 'Basic Green',
        colors: ['#4CAF50'],
        pattern: 'solid',
        intensity: 1.0,
        animationSpeed: 0
      },
      description: 'A young snake just beginning its journey',
      speedMultiplier: 1.0,
      scoreMultiplier: 1.0
    });

    // Level 2: Garden Snake
    levels.set(2, {
      level: 2,
      name: 'Garden Snake',
      requiredFood: 50,
      segmentCount: 5,
      powers: [PowerType.SpeedBoost],
      visualPattern: {
        id: 'garden',
        name: 'Garden Stripes',
        colors: ['#4CAF50', '#2E7D32'],
        pattern: 'stripes',
        intensity: 1.1,
        animationSpeed: 0.5
      },
      description: 'A common garden snake with basic speed abilities',
      speedMultiplier: 1.1,
      scoreMultiplier: 1.2
    });

    // Add more levels as needed...
    for (let i = 3; i <= 9; i++) {
      levels.set(i, {
        level: i,
        name: `Evolution Level ${i}`,
        requiredFood: i * 50,
        segmentCount: i + 2,
        powers: this.getPowersForLevel(i),
        visualPattern: this.getVisualPatternForLevel(i),
        description: `Evolution level ${i}`,
        speedMultiplier: 1.0 + (i - 1) * 0.1,
        scoreMultiplier: 1.0 + (i - 1) * 0.2
      });
    }

    // Level 10: Ouroboros
    levels.set(10, {
      level: 10,
      name: 'Ouroboros',
      requiredFood: 1600,
      segmentCount: 30,
      powers: this.getPowersForLevel(10),
      visualPattern: this.getVisualPatternForLevel(10),
      description: 'The ultimate serpent form',
      speedMultiplier: 2.0,
      scoreMultiplier: 3.0
    });

    return levels;
  }

  private getPowersForLevel(level: number): PowerType[] {
    const powersByLevel: Record<number, PowerType[]> = {
      2: [PowerType.SpeedBoost],
      3: [PowerType.VenomStrike],
      4: [PowerType.Constrict],
      5: [PowerType.HoodExpansion],
      6: [PowerType.AquaticMovement],
      7: [PowerType.ColorChange],
      8: [PowerType.TimeWarp],
      9: [PowerType.FireBreath],
      10: [PowerType.TailConsumption]
    };
    
    return powersByLevel[level] || [];
  }

  private getVisualPatternForLevel(level: number): VisualPattern {
    const patterns: Record<number, VisualPattern> = {
      3: {
        id: 'venom',
        name: 'Venomous Purple',
        colors: ['#9C27B0', '#4A148C'],
        pattern: 'gradient',
        intensity: 1.2,
        animationSpeed: 1.0
      },
      4: {
        id: 'constrictor',
        name: 'Constrictor Brown',
        colors: ['#8D6E63', '#5D4037'],
        pattern: 'scales',
        intensity: 1.3,
        animationSpeed: 0.8
      },
      // Add more patterns as needed
    };

    return patterns[level] || {
      id: `level${level}`,
      name: `Level ${level} Pattern`,
      colors: ['#4CAF50'],
      pattern: 'solid',
      intensity: 1.0 + level * 0.1,
      animationSpeed: level * 0.2
    };
  }

  public getCurrentLevel(): number {
    return this.state.currentLevel;
  }

  public getAvailablePowers(): PowerType[] {
    return [...this.state.availablePowers];
  }

  public getFoodProgress(): number {
    return this.state.foodProgress;
  }

  public getTotalFoodConsumed(): number {
    return this.state.totalFoodConsumed;
  }

  public isTransformationInProgress(): boolean {
    return this.state.isTransformationInProgress;
  }

  public getEvolutionLevel(level: number): EvolutionLevel | null {
    return this.evolutionLevels.get(level) || null;
  }

  public addEvolutionProgress(amount: number): EvolutionResult | null {
    this.state.foodProgress += amount;
    this.state.totalFoodConsumed += amount;

    const currentLevelData = this.evolutionLevels.get(this.state.currentLevel);
    const nextLevelData = this.evolutionLevels.get(this.state.currentLevel + 1);

    if (!currentLevelData || !nextLevelData) {
      return null;
    }

    if (this.state.foodProgress >= nextLevelData.requiredFood) {
      return this.evolveToNextLevel();
    }

    return null;
  }

  public addFoodProgress(amount: number): { evolved: boolean; newLevel?: number } {
    const result = this.addEvolutionProgress(amount);
    return {
      evolved: result !== null,
      newLevel: result?.newLevel
    };
  }

  private evolveToNextLevel(): EvolutionResult {
    const newLevel = this.state.currentLevel + 1;
    const newLevelData = this.evolutionLevels.get(newLevel);

    if (!newLevelData) {
      return {
        success: false,
        newLevel: this.state.currentLevel,
        unlockedPowers: [],
        newVisualPattern: this.evolutionLevels.get(this.state.currentLevel)!.visualPattern,
        message: 'Maximum evolution level reached'
      };
    }

    this.state.currentLevel = newLevel;
    this.state.isTransformationInProgress = true;
    this.state.transformationProgress = 0;

    // Unlock new powers
    const unlockedPowers = newLevelData.powers.filter(
      power => !this.state.availablePowers.includes(power)
    );
    
    this.state.availablePowers.push(...unlockedPowers);

    // Initialize power states for new powers
    unlockedPowers.forEach(power => {
      this.state.powerStates.set(power, {
        type: power,
        isUnlocked: true,
        isActive: false,
        cooldownRemaining: 0,
        duration: 0,
        level: 1
      });
    });

    return {
      success: true,
      newLevel,
      unlockedPowers,
      newVisualPattern: newLevelData.visualPattern,
      message: `Evolved to ${newLevelData.name}!`
    };
  }

  public getRequiredProgressForNextLevel(): number {
    const nextLevelData = this.evolutionLevels.get(this.state.currentLevel + 1);
    return nextLevelData ? nextLevelData.requiredFood : 0;
  }

  public forceEvolution(targetLevel: number): boolean {
    if (targetLevel <= this.state.currentLevel || !this.evolutionLevels.has(targetLevel)) {
      return false;
    }

    this.state.currentLevel = targetLevel;
    this.state.foodProgress = this.evolutionLevels.get(targetLevel)!.requiredFood;

    // Unlock all powers up to this level
    this.state.availablePowers = [];
    for (let level = 1; level <= targetLevel; level++) {
      const levelData = this.evolutionLevels.get(level);
      if (levelData) {
        this.state.availablePowers.push(...levelData.powers);
      }
    }

    // Initialize power states
    this.state.availablePowers.forEach(power => {
      this.state.powerStates.set(power, {
        type: power,
        isUnlocked: true,
        isActive: false,
        cooldownRemaining: 0,
        duration: 0,
        level: 1
      });
    });

    return true;
  }

  public update(deltaTime: number): void {
    if (this.state.isTransformationInProgress) {
      this.state.transformationProgress += deltaTime / 2000; // 2 second transformation
      if (this.state.transformationProgress >= 1.0) {
        this.state.isTransformationInProgress = false;
        this.state.transformationProgress = 0;
      }
    }

    // Update power cooldowns
    this.state.powerStates.forEach(powerState => {
      if (powerState.cooldownRemaining > 0) {
        powerState.cooldownRemaining = Math.max(0, powerState.cooldownRemaining - deltaTime);
      }
    });
  }

  public getState(): EvolutionState {
    return {
      ...this.state,
      powerStates: new Map(this.state.powerStates)
    };
  }

  public activatePower(powerType: PowerType): boolean {
    const powerState = this.state.powerStates.get(powerType);
    if (!powerState || !powerState.isUnlocked) {
      return false;
    }

    // Update power state to active
    powerState.isActive = true;
    powerState.lastActivated = Date.now();
    
    return true;
  }

  public setLevel(level: number): void {
    if (level >= 1 && level <= 10) {
      this.state.currentLevel = level;
      const levelData = this.evolutionLevels.get(level);
      if (levelData) {
        this.state.foodProgress = levelData.requiredFood;
      }
    }
  }

  public getProgressToNextLevel(): number {
    const nextLevelData = this.evolutionLevels.get(this.state.currentLevel + 1);
    if (!nextLevelData) {
      return 1.0; // At max level
    }
    
    const currentLevelData = this.evolutionLevels.get(this.state.currentLevel);
    const currentRequired = currentLevelData?.requiredFood || 0;
    const nextRequired = nextLevelData.requiredFood;
    const progress = (this.state.foodProgress - currentRequired) / (nextRequired - currentRequired);
    
    return Math.max(0, Math.min(1, progress));
  }

  public getFoodRequiredForNextLevel(): number {
    const nextLevelData = this.evolutionLevels.get(this.state.currentLevel + 1);
    return nextLevelData ? nextLevelData.requiredFood - this.state.foodProgress : 0;
  }

  public getTransformationProgress(): number {
    return this.state.transformationProgress;
  }

  public getCurrentVisualPattern(): any {
    const levelData = this.evolutionLevels.get(this.state.currentLevel);
    return levelData ? {
      baseColor: levelData.visualPattern.colors[0],
      patternType: levelData.visualPattern.pattern,
      intensity: levelData.visualPattern.intensity
    } : null;
  }

  public getEvolutionState(): EvolutionState {
    return { ...this.state };
  }

  public getAllEvolutionLevels(): EvolutionLevel[] {
    return Array.from(this.evolutionLevels.values());
  }

  public reset(): void {
    this.state = this.initializeState();
  }
}