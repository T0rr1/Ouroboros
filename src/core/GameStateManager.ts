import { 
  GameState, 
  GameOverState, 
  DeathReason, 
  ScoreState,
  Vector2 
} from '../types/game';
import { ScoreSystem } from './ScoreSystem';

export interface GameStateManagerConfig {
  deathAnimationDuration: number;
  pauseOnFocusLoss: boolean;
  enableAutoSave: boolean;
}

export class GameStateManager {
  private gameState: GameState;
  private gameOverState: GameOverState;
  private scoreSystem: ScoreSystem;
  private config: GameStateManagerConfig;
  private pauseCallbacks: Array<() => void> = [];
  private resumeCallbacks: Array<() => void> = [];
  private gameOverCallbacks: Array<(gameOverState: GameOverState) => void> = [];
  private deathAnimationTimer: number = 0;
  private lastSurvivalBonusCheck: number = 0;
  private accumulatedTime: number = 0;
  private readonly SURVIVAL_BONUS_CHECK_INTERVAL = 30000; // Check every 30 seconds

  constructor(scoreSystem: ScoreSystem, config?: Partial<GameStateManagerConfig>) {
    this.scoreSystem = scoreSystem;
    this.config = {
      deathAnimationDuration: 2000, // 2 seconds
      pauseOnFocusLoss: true,
      enableAutoSave: true,
      ...config
    };

    this.gameState = {
      isRunning: false,
      isPaused: false,
      lastFrameTime: 0,
      deltaTime: 0,
      fps: 0
    };

    this.gameOverState = {
      isGameOver: false,
      deathReason: DeathReason.SelfCollision,
      finalScore: 0,
      finalEvolutionLevel: 1,
      survivalTime: 0,
      deathAnimation: {
        isPlaying: false,
        progress: 0,
        duration: this.config.deathAnimationDuration
      }
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (this.config.pauseOnFocusLoss) {
      // Pause game when window loses focus
      window.addEventListener('blur', () => {
        if (this.gameState.isRunning && !this.gameState.isPaused && !this.gameOverState.isGameOver) {
          this.pause();
        }
      });

      // Handle visibility change (tab switching)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.gameState.isRunning && !this.gameState.isPaused && !this.gameOverState.isGameOver) {
          this.pause();
        }
      });
    }

    // Handle space bar for pause/resume
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space' && !this.gameOverState.isGameOver) {
        event.preventDefault();
        this.togglePause();
      }
    });
  }

  public startGame(): void {
    this.gameState.isRunning = true;
    this.gameState.isPaused = false;
    this.gameState.lastFrameTime = performance.now();
    this.lastSurvivalBonusCheck = 0;
    this.accumulatedTime = 0;
    
    // Reset game over state
    this.gameOverState.isGameOver = false;
    this.gameOverState.deathAnimation.isPlaying = false;
    this.gameOverState.deathAnimation.progress = 0;
    
    // Start new game in score system
    this.scoreSystem.startNewGame();
  }

  public stopGame(): void {
    this.gameState.isRunning = false;
    this.gameState.isPaused = false;
  }

  public pause(): void {
    if (!this.gameState.isRunning || this.gameOverState.isGameOver) return;
    
    this.gameState.isPaused = true;
    this.pauseCallbacks.forEach(callback => callback());
  }

  public resume(): void {
    if (!this.gameState.isRunning || this.gameOverState.isGameOver) return;
    
    this.gameState.isPaused = false;
    this.gameState.lastFrameTime = performance.now(); // Reset frame time to prevent large delta
    this.resumeCallbacks.forEach(callback => callback());
  }

  public togglePause(): void {
    if (this.gameState.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  public triggerGameOver(
    deathReason: DeathReason, 
    finalEvolutionLevel: number,
    deathPosition?: Vector2
  ): void {
    if (this.gameOverState.isGameOver) return;

    const scoreState = this.scoreSystem.getScoreState();
    
    this.gameOverState = {
      isGameOver: true,
      deathReason,
      finalScore: scoreState.currentScore,
      finalEvolutionLevel,
      survivalTime: this.scoreSystem.getSurvivalTime(),
      deathAnimation: {
        isPlaying: true,
        progress: 0,
        duration: this.config.deathAnimationDuration
      }
    };

    // Save high score
    this.scoreSystem.saveHighScore(finalEvolutionLevel);

    // Start death animation
    this.deathAnimationTimer = 0;

    // Notify callbacks
    this.gameOverCallbacks.forEach(callback => callback(this.gameOverState));

    console.log(`Game Over: ${deathReason}, Final Score: ${this.gameOverState.finalScore}, Evolution Level: ${finalEvolutionLevel}`);
  }

  public update(deltaTime: number): void {
    this.gameState.deltaTime = deltaTime;
    this.gameState.fps = 1000 / deltaTime;

    // Update death animation if playing
    if (this.gameOverState.deathAnimation.isPlaying) {
      this.deathAnimationTimer += deltaTime;
      this.gameOverState.deathAnimation.progress = Math.min(
        this.deathAnimationTimer / this.gameOverState.deathAnimation.duration,
        1.0
      );

      if (this.gameOverState.deathAnimation.progress >= 1.0) {
        this.gameOverState.deathAnimation.isPlaying = false;
      }
    }

    // Accumulate time for survival bonus checking
    if (!this.gameOverState.isGameOver && !this.gameState.isPaused) {
      this.accumulatedTime += deltaTime;
      this.checkSurvivalTimeBonus();
    }
  }

  private checkSurvivalTimeBonus(): void {
    if (this.accumulatedTime - this.lastSurvivalBonusCheck >= this.SURVIVAL_BONUS_CHECK_INTERVAL) {
      if (this.scoreSystem.shouldAwardSurvivalBonus()) {
        const bonus = this.scoreSystem.addSurvivalTimeBonus();
        if (bonus > 0) {
          console.log(`Survival time bonus awarded: ${bonus} points`);
        }
      }
      this.lastSurvivalBonusCheck = this.accumulatedTime;
    }
  }

  public restartGame(): void {
    // Reset all states
    this.gameOverState = {
      isGameOver: false,
      deathReason: DeathReason.SelfCollision,
      finalScore: 0,
      finalEvolutionLevel: 1,
      survivalTime: 0,
      deathAnimation: {
        isPlaying: false,
        progress: 0,
        duration: this.config.deathAnimationDuration
      }
    };

    this.deathAnimationTimer = 0;
    this.accumulatedTime = 0;
    this.lastSurvivalBonusCheck = 0;
    
    // Start new game
    this.startGame();
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public getGameOverState(): GameOverState {
    return { ...this.gameOverState };
  }

  public isGameRunning(): boolean {
    return this.gameState.isRunning;
  }

  public isGamePaused(): boolean {
    return this.gameState.isPaused;
  }

  public isGameOver(): boolean {
    return this.gameOverState.isGameOver;
  }

  public isDeathAnimationPlaying(): boolean {
    return this.gameOverState.deathAnimation.isPlaying;
  }

  public getDeathAnimationProgress(): number {
    return this.gameOverState.deathAnimation.progress;
  }

  public getFPS(): number {
    return this.gameState.fps;
  }

  public getDeltaTime(): number {
    return this.gameState.deltaTime;
  }

  public getDeathReason(): DeathReason {
    return this.gameOverState.deathReason;
  }

  public getDeathReasonMessage(): string {
    const messages: Record<DeathReason, string> = {
      [DeathReason.SelfCollision]: "The serpent consumed itself in confusion",
      [DeathReason.WallCollision]: "The serpent struck the ancient barriers",
      [DeathReason.ObstacleCollision]: "The serpent was blocked by mystical obstacles",
      [DeathReason.EnvironmentalHazard]: "The serpent succumbed to environmental dangers",
      [DeathReason.PoisonEffect]: "The serpent was overcome by toxic effects"
    };
    
    return messages[this.gameOverState.deathReason] || "The serpent's journey has ended";
  }

  // Event subscription methods
  public onPause(callback: () => void): void {
    this.pauseCallbacks.push(callback);
  }

  public onResume(callback: () => void): void {
    this.resumeCallbacks.push(callback);
  }

  public onGameOver(callback: (gameOverState: GameOverState) => void): void {
    this.gameOverCallbacks.push(callback);
  }

  // Remove event listeners
  public removePauseCallback(callback: () => void): void {
    const index = this.pauseCallbacks.indexOf(callback);
    if (index > -1) {
      this.pauseCallbacks.splice(index, 1);
    }
  }

  public removeResumeCallback(callback: () => void): void {
    const index = this.resumeCallbacks.indexOf(callback);
    if (index > -1) {
      this.resumeCallbacks.splice(index, 1);
    }
  }

  public removeGameOverCallback(callback: (gameOverState: GameOverState) => void): void {
    const index = this.gameOverCallbacks.indexOf(callback);
    if (index > -1) {
      this.gameOverCallbacks.splice(index, 1);
    }
  }

  public dispose(): void {
    // Remove event listeners
    this.pauseCallbacks = [];
    this.resumeCallbacks = [];
    this.gameOverCallbacks = [];
    
    // Remove DOM event listeners
    document.removeEventListener('keydown', this.togglePause);
    window.removeEventListener('blur', this.pause);
    document.removeEventListener('visibilitychange', this.pause);
  }
}