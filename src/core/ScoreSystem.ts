import { 
  ScoreState, 
  ScoreEvent, 
  ScoreEventType, 
  HighScoreEntry, 
  FoodType, 
  ConsumptionResult,
  StrategicAdvantage 
} from '../types/game';
import { PowerType } from './EvolutionSystem';

export class ScoreSystem {
  private scoreState: ScoreState;
  private scoreHistory: ScoreEvent[] = [];
  private highScores: HighScoreEntry[] = [];
  private readonly STORAGE_KEY = 'ouroboros-high-scores';
  private readonly MAX_HIGH_SCORES = 10;
  private readonly COMBO_TIME_WINDOW = 3000; // 3 seconds for combo window
  private readonly SURVIVAL_BONUS_INTERVAL = 30000; // 30 seconds for survival bonus

  constructor() {
    this.scoreState = this.initializeScoreState();
    this.loadHighScores();
  }

  private initializeScoreState(): ScoreState {
    return {
      currentScore: 0,
      highScore: 0,
      evolutionLevelMultiplier: 1.0,
      comboMultiplier: 1.0,
      comboCount: 0,
      lastScoreTime: 0,
      totalFoodConsumed: 0,
      evolutionBonuses: 0,
      powerUsageBonuses: 0,
      survivalTimeBonus: 0,
      gameStartTime: Date.now()
    };
  }

  public startNewGame(): void {
    this.scoreState = this.initializeScoreState();
    this.scoreHistory = [];
    this.updateHighScore();
  }

  public addFoodConsumptionScore(
    foodType: FoodType, 
    consumptionResult: ConsumptionResult, 
    evolutionLevel: number
  ): number {
    const basePoints = consumptionResult.pointsAwarded;
    const evolutionMultiplier = this.calculateEvolutionMultiplier(evolutionLevel);
    const comboMultiplier = this.updateComboMultiplier();
    
    const totalPoints = Math.floor(basePoints * evolutionMultiplier * comboMultiplier);
    
    this.scoreState.currentScore += totalPoints;
    this.scoreState.totalFoodConsumed++;
    this.scoreState.evolutionLevelMultiplier = evolutionMultiplier;
    this.scoreState.comboMultiplier = comboMultiplier;
    this.scoreState.lastScoreTime = Date.now();

    // Record score event
    const scoreEvent: ScoreEvent = {
      type: ScoreEventType.FoodConsumption,
      points: totalPoints,
      multiplier: evolutionMultiplier * comboMultiplier,
      timestamp: Date.now(),
      description: `Consumed ${foodType}`,
      evolutionLevel
    };
    
    this.scoreHistory.push(scoreEvent);
    this.updateHighScore();
    
    return totalPoints;
  }

  public addEvolutionBonus(fromLevel: number, toLevel: number): number {
    // Evolution bonus increases exponentially with level
    const baseBonus = 1000;
    const levelMultiplier = Math.pow(2, toLevel - 1);
    const evolutionBonus = Math.floor(baseBonus * levelMultiplier);
    
    this.scoreState.currentScore += evolutionBonus;
    this.scoreState.evolutionBonuses += evolutionBonus;
    
    // Reset combo for evolution (fresh start)
    this.resetCombo();
    
    const scoreEvent: ScoreEvent = {
      type: ScoreEventType.Evolution,
      points: evolutionBonus,
      multiplier: levelMultiplier,
      timestamp: Date.now(),
      description: `Evolved to level ${toLevel}`,
      evolutionLevel: toLevel
    };
    
    this.scoreHistory.push(scoreEvent);
    this.updateHighScore();
    
    return evolutionBonus;
  }

  public addPowerUsageBonus(powerType: PowerType, evolutionLevel: number, wasEffective: boolean): number {
    if (!wasEffective) return 0;
    
    const basePowerBonus = this.getPowerBaseBonus(powerType);
    const evolutionMultiplier = this.calculateEvolutionMultiplier(evolutionLevel);
    const powerBonus = Math.floor(basePowerBonus * evolutionMultiplier);
    
    this.scoreState.currentScore += powerBonus;
    this.scoreState.powerUsageBonuses += powerBonus;
    
    const scoreEvent: ScoreEvent = {
      type: ScoreEventType.PowerUsage,
      points: powerBonus,
      multiplier: evolutionMultiplier,
      timestamp: Date.now(),
      description: `Used ${powerType} effectively`,
      evolutionLevel
    };
    
    this.scoreHistory.push(scoreEvent);
    this.updateHighScore();
    
    return powerBonus;
  }

  public addTailConsumptionBonus(
    strategicAdvantage: StrategicAdvantage, 
    evolutionLevel: number
  ): number {
    const tailBonus = strategicAdvantage.bonusPoints;
    const mysticalBonus = strategicAdvantage.mysticalEnergy * 10; // 10 points per mystical energy
    const totalBonus = tailBonus + mysticalBonus;
    
    this.scoreState.currentScore += totalBonus;
    
    const scoreEvent: ScoreEvent = {
      type: ScoreEventType.TailConsumption,
      points: totalBonus,
      multiplier: 1.0,
      timestamp: Date.now(),
      description: `Ouroboros tail consumption`,
      evolutionLevel
    };
    
    this.scoreHistory.push(scoreEvent);
    this.updateHighScore();
    
    return totalBonus;
  }

  public addSurvivalTimeBonus(): number {
    const survivalTime = this.getSurvivalTime();
    const survivalMinutes = Math.floor(survivalTime / 60000);
    const survivalBonus = survivalMinutes * 500; // 500 points per minute survived
    
    if (survivalBonus > this.scoreState.survivalTimeBonus) {
      const newBonus = survivalBonus - this.scoreState.survivalTimeBonus;
      this.scoreState.currentScore += newBonus;
      this.scoreState.survivalTimeBonus = survivalBonus;
      
      const scoreEvent: ScoreEvent = {
        type: ScoreEventType.SurvivalTime,
        points: newBonus,
        multiplier: 1.0,
        timestamp: Date.now(),
        description: `Survived ${survivalMinutes} minutes`,
        evolutionLevel: 0 // Not evolution-specific
      };
      
      this.scoreHistory.push(scoreEvent);
      this.updateHighScore();
      
      return newBonus;
    }
    
    return 0;
  }

  private calculateEvolutionMultiplier(evolutionLevel: number): number {
    // Multiplier increases with evolution level: 1.0, 1.2, 1.4, ..., 2.8
    return 1.0 + (evolutionLevel - 1) * 0.2;
  }

  private updateComboMultiplier(): number {
    const currentTime = Date.now();
    const timeSinceLastScore = currentTime - this.scoreState.lastScoreTime;
    
    if (timeSinceLastScore <= this.COMBO_TIME_WINDOW) {
      // Within combo window - increase combo
      this.scoreState.comboCount++;
      this.scoreState.comboMultiplier = Math.min(1.0 + (this.scoreState.comboCount * 0.1), 3.0); // Max 3x combo
    } else {
      // Outside combo window - reset combo
      this.resetCombo();
    }
    
    return this.scoreState.comboMultiplier;
  }

  private resetCombo(): void {
    this.scoreState.comboCount = 0;
    this.scoreState.comboMultiplier = 1.0;
  }

  private getPowerBaseBonus(powerType: PowerType): number {
    const powerBonuses: Record<PowerType, number> = {
      [PowerType.SpeedBoost]: 100,
      [PowerType.VenomStrike]: 200,
      [PowerType.Constrict]: 150,
      [PowerType.HoodExpansion]: 250,
      [PowerType.AquaticMovement]: 300,
      [PowerType.ColorChange]: 350,
      [PowerType.TimeWarp]: 500,
      [PowerType.FireBreath]: 750,
      [PowerType.TailConsumption]: 1000,
      [PowerType.PowerCycling]: 1200,
      [PowerType.RealityManipulation]: 1500
    };
    
    return powerBonuses[powerType] || 100;
  }

  private updateHighScore(): void {
    if (this.scoreState.currentScore > this.scoreState.highScore) {
      this.scoreState.highScore = this.scoreState.currentScore;
    }
  }

  public saveHighScore(evolutionLevel: number, playerName?: string): void {
    const currentTime = Date.now();
    const survivalTime = currentTime - this.scoreState.gameStartTime;
    
    const highScoreEntry: HighScoreEntry = {
      score: this.scoreState.currentScore,
      evolutionLevel,
      survivalTime,
      foodConsumed: this.scoreState.totalFoodConsumed,
      timestamp: currentTime,
      playerName
    };
    
    this.highScores.push(highScoreEntry);
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, this.MAX_HIGH_SCORES);
    
    this.persistHighScores();
  }

  private loadHighScores(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.highScores = JSON.parse(stored);
        if (this.highScores.length > 0) {
          this.scoreState.highScore = this.highScores[0].score;
        }
      }
    } catch (error) {
      console.warn('Failed to load high scores from localStorage:', error);
      this.highScores = [];
    }
  }

  private persistHighScores(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.highScores));
    } catch (error) {
      console.warn('Failed to save high scores to localStorage:', error);
    }
  }

  public getScoreState(): ScoreState {
    return { ...this.scoreState };
  }

  public getHighScores(): HighScoreEntry[] {
    return [...this.highScores];
  }

  public getScoreHistory(): ScoreEvent[] {
    return [...this.scoreHistory];
  }

  public getCurrentScore(): number {
    return this.scoreState.currentScore;
  }

  public getHighScore(): number {
    return this.scoreState.highScore;
  }

  public getComboInfo(): { count: number; multiplier: number } {
    return {
      count: this.scoreState.comboCount,
      multiplier: this.scoreState.comboMultiplier
    };
  }

  public getSurvivalTime(): number {
    return Date.now() - this.scoreState.gameStartTime;
  }

  public getFormattedSurvivalTime(): string {
    const survivalTime = this.getSurvivalTime();
    const minutes = Math.floor(survivalTime / 60000);
    const seconds = Math.floor((survivalTime % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public shouldAwardSurvivalBonus(): boolean {
    const survivalTime = this.getSurvivalTime();
    const currentMinutes = Math.floor(survivalTime / 60000);
    const bonusMinutes = Math.floor(this.scoreState.survivalTimeBonus / 500);
    
    return currentMinutes > bonusMinutes;
  }

  public addPoints(points: number): void {
    this.scoreState.currentScore += points;
    this.updateHighScore();
    
    // Create a score event for the points addition
    const scoreEvent: ScoreEvent = {
      type: ScoreEventType.FoodConsumption,
      points,
      multiplier: 1.0,
      timestamp: Date.now(),
      description: `Manual points addition: ${points}`,
      evolutionLevel: 1 // Default level
    };
    
    this.scoreHistory.push(scoreEvent);
    this.scoreState.lastScoreTime = Date.now();
  }

  public addFoodPoints(foodType: any, points: number, evolutionLevel: number): void {
    // Apply evolution level multiplier
    const evolutionMultiplier = this.calculateEvolutionMultiplier(evolutionLevel);
    const finalPoints = Math.floor(points * evolutionMultiplier);
    
    this.scoreState.currentScore += finalPoints;
    this.updateHighScore();
    
    // Create a score event for the food consumption
    const scoreEvent: ScoreEvent = {
      type: ScoreEventType.FoodConsumption,
      points: finalPoints,
      multiplier: evolutionMultiplier,
      timestamp: Date.now(),
      description: `Food consumed: ${foodType} (${points} base points)`,
      evolutionLevel
    };
    
    this.scoreHistory.push(scoreEvent);
    this.scoreState.lastScoreTime = Date.now();
  }



  public reset(): void {
    this.scoreState = this.initializeScoreState();
    this.scoreHistory = [];
  }
}