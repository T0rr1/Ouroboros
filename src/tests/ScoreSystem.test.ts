import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ScoreSystem } from '../core/ScoreSystem';
import { 
  FoodType, 
  ConsumptionResult, 
  StrategicAdvantage, 
  ScoreEventType,
  HighScoreEntry 
} from '../types/game';
import { PowerType } from '../core/EvolutionSystem';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('ScoreSystem', () => {
  let scoreSystem: ScoreSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    scoreSystem = new ScoreSystem();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default score state', () => {
      const scoreState = scoreSystem.getScoreState();
      
      expect(scoreState.currentScore).toBe(0);
      expect(scoreState.highScore).toBe(0);
      expect(scoreState.evolutionLevelMultiplier).toBe(1.0);
      expect(scoreState.comboMultiplier).toBe(1.0);
      expect(scoreState.comboCount).toBe(0);
      expect(scoreState.totalFoodConsumed).toBe(0);
      expect(scoreState.evolutionBonuses).toBe(0);
      expect(scoreState.powerUsageBonuses).toBe(0);
      expect(scoreState.survivalTimeBonus).toBe(0);
    });

    it('should load high scores from localStorage', () => {
      const mockHighScores: HighScoreEntry[] = [
        {
          score: 5000,
          evolutionLevel: 5,
          survivalTime: 300000,
          foodConsumed: 50,
          timestamp: Date.now()
        }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHighScores));
      
      const newScoreSystem = new ScoreSystem();
      const highScores = newScoreSystem.getHighScores();
      
      expect(highScores).toEqual(mockHighScores);
      expect(newScoreSystem.getHighScore()).toBe(5000);
    });
  });

  describe('Food Consumption Scoring', () => {
    it('should calculate correct score for basic food consumption', () => {
      const consumptionResult: ConsumptionResult = {
        success: true,
        pointsAwarded: 100,
        segmentsToGrow: 1,
        effects: [],
        evolutionProgress: 10
      };

      const points = scoreSystem.addFoodConsumptionScore(
        FoodType.BasicBerry,
        consumptionResult,
        1
      );

      expect(points).toBe(100); // Base points * 1.0 evolution multiplier * 1.0 combo multiplier
      expect(scoreSystem.getCurrentScore()).toBe(100);
      
      const scoreState = scoreSystem.getScoreState();
      expect(scoreState.totalFoodConsumed).toBe(1);
      expect(scoreState.evolutionLevelMultiplier).toBe(1.0);
    });

    it('should apply evolution level multiplier correctly', () => {
      const consumptionResult: ConsumptionResult = {
        success: true,
        pointsAwarded: 100,
        segmentsToGrow: 1,
        effects: [],
        evolutionProgress: 10
      };

      const points = scoreSystem.addFoodConsumptionScore(
        FoodType.BasicBerry,
        consumptionResult,
        5 // Evolution level 5 should have 1.8x multiplier
      );

      expect(points).toBe(180); // 100 * 1.8 * 1.0
      expect(scoreSystem.getCurrentScore()).toBe(180);
    });

    it('should build combo multiplier for consecutive food consumption', () => {
      const consumptionResult: ConsumptionResult = {
        success: true,
        pointsAwarded: 100,
        segmentsToGrow: 1,
        effects: [],
        evolutionProgress: 10
      };

      // First consumption - no combo
      const points1 = scoreSystem.addFoodConsumptionScore(FoodType.BasicBerry, consumptionResult, 1);
      expect(points1).toBe(100);

      // Second consumption within combo window - 1.1x combo
      const points2 = scoreSystem.addFoodConsumptionScore(FoodType.BasicBerry, consumptionResult, 1);
      expect(points2).toBe(110); // 100 * 1.0 * 1.1

      // Third consumption - 1.2x combo
      const points3 = scoreSystem.addFoodConsumptionScore(FoodType.BasicBerry, consumptionResult, 1);
      expect(points3).toBe(120); // 100 * 1.0 * 1.2

      const comboInfo = scoreSystem.getComboInfo();
      expect(comboInfo.count).toBe(2); // Started at 0, incremented twice
      expect(comboInfo.multiplier).toBe(1.2);
    });

    it('should reset combo after time window expires', async () => {
      const consumptionResult: ConsumptionResult = {
        success: true,
        pointsAwarded: 100,
        segmentsToGrow: 1,
        effects: [],
        evolutionProgress: 10
      };

      // First consumption
      scoreSystem.addFoodConsumptionScore(FoodType.BasicBerry, consumptionResult, 1);
      
      // Mock time passage beyond combo window (3 seconds)
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 4000);
      
      // Second consumption after time window - should reset combo
      const points = scoreSystem.addFoodConsumptionScore(FoodType.BasicBerry, consumptionResult, 1);
      expect(points).toBe(100); // Back to base multiplier

      const comboInfo = scoreSystem.getComboInfo();
      expect(comboInfo.count).toBe(0);
      expect(comboInfo.multiplier).toBe(1.0);
    });

    it('should cap combo multiplier at 3.0x', () => {
      const consumptionResult: ConsumptionResult = {
        success: true,
        pointsAwarded: 100,
        segmentsToGrow: 1,
        effects: [],
        evolutionProgress: 10
      };

      // Build up combo to maximum
      for (let i = 0; i < 25; i++) {
        scoreSystem.addFoodConsumptionScore(FoodType.BasicBerry, consumptionResult, 1);
      }

      const comboInfo = scoreSystem.getComboInfo();
      expect(comboInfo.multiplier).toBe(3.0);
    });
  });

  describe('Evolution Bonuses', () => {
    it('should award correct evolution bonus', () => {
      const bonus = scoreSystem.addEvolutionBonus(1, 2);
      
      // Level 2 evolution: 1000 * 2^(2-1) = 2000
      expect(bonus).toBe(2000);
      expect(scoreSystem.getCurrentScore()).toBe(2000);
      
      const scoreState = scoreSystem.getScoreState();
      expect(scoreState.evolutionBonuses).toBe(2000);
    });

    it('should award exponentially increasing bonuses for higher levels', () => {
      const bonus5 = scoreSystem.addEvolutionBonus(4, 5);
      const bonus10 = scoreSystem.addEvolutionBonus(9, 10);
      
      // Level 5: 1000 * 2^4 = 16000
      // Level 10: 1000 * 2^9 = 512000
      expect(bonus5).toBe(16000);
      expect(bonus10).toBe(512000);
    });

    it('should reset combo on evolution', () => {
      const consumptionResult: ConsumptionResult = {
        success: true,
        pointsAwarded: 100,
        segmentsToGrow: 1,
        effects: [],
        evolutionProgress: 10
      };

      // Build up combo
      scoreSystem.addFoodConsumptionScore(FoodType.BasicBerry, consumptionResult, 1);
      scoreSystem.addFoodConsumptionScore(FoodType.BasicBerry, consumptionResult, 1);
      
      expect(scoreSystem.getComboInfo().count).toBe(1);
      
      // Evolution should reset combo
      scoreSystem.addEvolutionBonus(1, 2);
      
      const comboInfo = scoreSystem.getComboInfo();
      expect(comboInfo.count).toBe(0);
      expect(comboInfo.multiplier).toBe(1.0);
    });
  });

  describe('Power Usage Bonuses', () => {
    it('should award power usage bonus when effective', () => {
      const bonus = scoreSystem.addPowerUsageBonus(PowerType.VenomStrike, 3, true);
      
      // VenomStrike base bonus: 200, evolution level 3 multiplier: 1.4
      expect(bonus).toBe(280); // 200 * 1.4
      expect(scoreSystem.getCurrentScore()).toBe(280);
      
      const scoreState = scoreSystem.getScoreState();
      expect(scoreState.powerUsageBonuses).toBe(280);
    });

    it('should not award bonus when power usage is ineffective', () => {
      const bonus = scoreSystem.addPowerUsageBonus(PowerType.VenomStrike, 3, false);
      
      expect(bonus).toBe(0);
      expect(scoreSystem.getCurrentScore()).toBe(0);
    });

    it('should award different bonuses for different power types', () => {
      const speedBoostBonus = scoreSystem.addPowerUsageBonus(PowerType.SpeedBoost, 1, true);
      const fireBreathBonus = scoreSystem.addPowerUsageBonus(PowerType.FireBreath, 1, true);
      
      expect(speedBoostBonus).toBe(100); // Base bonus for SpeedBoost
      expect(fireBreathBonus).toBe(750); // Base bonus for FireBreath
    });
  });

  describe('Tail Consumption Bonuses', () => {
    it('should award tail consumption bonus correctly', () => {
      const strategicAdvantage: StrategicAdvantage = {
        bonusPoints: 500,
        navigationBonus: 'moderate',
        speedBoost: { multiplier: 1.5, duration: 5000 },
        mysticalEnergy: 10
      };

      const bonus = scoreSystem.addTailConsumptionBonus(strategicAdvantage, 10);
      
      // 500 bonus points + (10 mystical energy * 10) = 600
      expect(bonus).toBe(600);
      expect(scoreSystem.getCurrentScore()).toBe(600);
    });
  });

  describe('Survival Time Bonuses', () => {
    it('should award survival time bonus', () => {
      // Mock game start time to 2 minutes ago
      const gameStartTime = Date.now() - 120000; // 2 minutes ago
      scoreSystem.startNewGame();
      
      // Mock current time to simulate 2 minutes of survival
      vi.spyOn(scoreSystem, 'getSurvivalTime').mockReturnValue(120000);
      
      const bonus = scoreSystem.addSurvivalTimeBonus();
      
      // 2 minutes * 500 points per minute = 1000
      expect(bonus).toBe(1000);
      expect(scoreSystem.getCurrentScore()).toBe(1000);
    });

    it('should not award duplicate survival bonuses', () => {
      vi.spyOn(scoreSystem, 'getSurvivalTime').mockReturnValue(120000);
      
      const bonus1 = scoreSystem.addSurvivalTimeBonus();
      const bonus2 = scoreSystem.addSurvivalTimeBonus();
      
      expect(bonus1).toBe(1000);
      expect(bonus2).toBe(0); // No additional bonus
    });

    it('should check if survival bonus should be awarded', () => {
      vi.spyOn(scoreSystem, 'getSurvivalTime').mockReturnValue(120000);
      
      expect(scoreSystem.shouldAwardSurvivalBonus()).toBe(true);
      
      scoreSystem.addSurvivalTimeBonus();
      
      expect(scoreSystem.shouldAwardSurvivalBonus()).toBe(false);
    });
  });

  describe('High Score Management', () => {
    it('should save high score correctly', () => {
      scoreSystem.addFoodConsumptionScore(
        FoodType.BasicBerry,
        { success: true, pointsAwarded: 1000, segmentsToGrow: 1, effects: [], evolutionProgress: 10 },
        5
      );

      scoreSystem.saveHighScore(5, 'TestPlayer');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ouroboros-high-scores',
        expect.stringContaining('"score":1800') // 1000 * 1.8 evolution multiplier
      );

      const highScores = scoreSystem.getHighScores();
      expect(highScores).toHaveLength(1);
      expect(highScores[0].score).toBe(1800);
      expect(highScores[0].evolutionLevel).toBe(5);
      expect(highScores[0].playerName).toBe('TestPlayer');
    });

    it('should maintain only top 10 high scores', () => {
      // Add 15 high scores
      for (let i = 0; i < 15; i++) {
        scoreSystem.addFoodConsumptionScore(
          FoodType.BasicBerry,
          { success: true, pointsAwarded: 100 * (i + 1), segmentsToGrow: 1, effects: [], evolutionProgress: 10 },
          1
        );
        scoreSystem.saveHighScore(1);
        scoreSystem.reset(); // Reset for next score
      }

      const highScores = scoreSystem.getHighScores();
      expect(highScores).toHaveLength(10);
      
      // Should be sorted by score descending
      expect(highScores[0].score).toBe(1500); // Highest score (100 * 15)
      expect(highScores[9].score).toBe(600);  // 10th highest score (100 * 6)
    });
  });

  describe('Score History', () => {
    it('should track score events in history', () => {
      const consumptionResult: ConsumptionResult = {
        success: true,
        pointsAwarded: 100,
        segmentsToGrow: 1,
        effects: [],
        evolutionProgress: 10
      };

      scoreSystem.addFoodConsumptionScore(FoodType.BasicBerry, consumptionResult, 1);
      scoreSystem.addEvolutionBonus(1, 2);
      scoreSystem.addPowerUsageBonus(PowerType.SpeedBoost, 2, true);

      const history = scoreSystem.getScoreHistory();
      expect(history).toHaveLength(3);
      
      expect(history[0].type).toBe(ScoreEventType.FoodConsumption);
      expect(history[1].type).toBe(ScoreEventType.Evolution);
      expect(history[2].type).toBe(ScoreEventType.PowerUsage);
    });
  });

  describe('Game State Management', () => {
    it('should start new game correctly', () => {
      // Add some score first
      scoreSystem.addFoodConsumptionScore(
        FoodType.BasicBerry,
        { success: true, pointsAwarded: 100, segmentsToGrow: 1, effects: [], evolutionProgress: 10 },
        1
      );

      expect(scoreSystem.getCurrentScore()).toBe(100);

      scoreSystem.startNewGame();

      expect(scoreSystem.getCurrentScore()).toBe(0);
      expect(scoreSystem.getScoreHistory()).toHaveLength(0);
      
      const scoreState = scoreSystem.getScoreState();
      expect(scoreState.totalFoodConsumed).toBe(0);
      expect(scoreState.comboCount).toBe(0);
    });

    it('should reset score state', () => {
      scoreSystem.addFoodConsumptionScore(
        FoodType.BasicBerry,
        { success: true, pointsAwarded: 100, segmentsToGrow: 1, effects: [], evolutionProgress: 10 },
        1
      );

      scoreSystem.reset();

      expect(scoreSystem.getCurrentScore()).toBe(0);
      expect(scoreSystem.getScoreHistory()).toHaveLength(0);
    });

    it('should format survival time correctly', () => {
      vi.spyOn(scoreSystem, 'getSurvivalTime').mockReturnValue(125000); // 2:05

      const formatted = scoreSystem.getFormattedSurvivalTime();
      expect(formatted).toBe('2:05');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Should not throw error
      expect(() => new ScoreSystem()).not.toThrow();
    });

    it('should handle invalid localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const newScoreSystem = new ScoreSystem();
      expect(newScoreSystem.getHighScores()).toEqual([]);
    });
  });
});