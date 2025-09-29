import { GameEngine } from './GameEngine';
import { GraphicsQuality } from './PerformanceMonitor';

/**
 * GameOptimizer - Provides final polish and optimization for the complete game
 */
export class GameOptimizer {
  private gameEngine: GameEngine;
  private optimizationLevel: 'low' | 'medium' | 'high' = 'high';
  private targetFPS = 60;
  private performanceHistory: number[] = [];
  private lastOptimizationTime = 0;

  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
    this.setupOptimization();
  }

  private setupOptimization(): void {
    // Monitor performance every 5 seconds
    setInterval(() => {
      this.checkAndOptimize();
    }, 5000);
  }

  private checkAndOptimize(): void {
    const currentTime = performance.now();
    if (currentTime - this.lastOptimizationTime < 10000) {
      return; // Don't optimize too frequently
    }

    const metrics = this.gameEngine.getPerformanceMetrics();
    this.performanceHistory.push(metrics.fps);

    // Keep only last 10 measurements
    if (this.performanceHistory.length > 10) {
      this.performanceHistory.shift();
    }

    const averageFPS = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;

    if (averageFPS < this.targetFPS * 0.8) {
      this.reduceQuality();
    } else if (averageFPS > this.targetFPS * 0.95 && this.optimizationLevel !== 'high') {
      this.increaseQuality();
    }

    this.lastOptimizationTime = currentTime;
  }

  private reduceQuality(): void {
    console.log('Reducing graphics quality for better performance');
    
    switch (this.optimizationLevel) {
      case 'high':
        this.optimizationLevel = 'medium';
        this.gameEngine.setQuality({
          particleQuality: 'medium',
          lightingQuality: 'medium',
          textureQuality: 'medium',
          shadowQuality: 'medium',
          effectsEnabled: true
        });
        break;
      case 'medium':
        this.optimizationLevel = 'low';
        this.gameEngine.setQuality({
          particleQuality: 'low',
          lightingQuality: 'low',
          textureQuality: 'low',
          shadowQuality: 'low',
          effectsEnabled: false
        });
        break;
      case 'low':
        // Already at lowest quality
        break;
    }
  }

  private increaseQuality(): void {
    console.log('Increasing graphics quality');
    
    switch (this.optimizationLevel) {
      case 'low':
        this.optimizationLevel = 'medium';
        this.gameEngine.setQuality({
          particleQuality: 'medium',
          lightingQuality: 'medium',
          textureQuality: 'medium',
          shadowQuality: 'medium',
          effectsEnabled: true
        });
        break;
      case 'medium':
        this.optimizationLevel = 'high';
        this.gameEngine.setQuality({
          particleQuality: 'high',
          lightingQuality: 'high',
          textureQuality: 'high',
          shadowQuality: 'high',
          effectsEnabled: true
        });
        break;
      case 'high':
        // Already at highest quality
        break;
    }
  }

  public optimizeForDevice(): void {
    // Detect device capabilities and optimize accordingly
    const canvas = this.gameEngine.getCanvas();
    const gl = this.gameEngine.getWebGLContext();
    
    if (!gl) {
      // No WebGL support - use lowest quality
      this.optimizationLevel = 'low';
      return;
    }

    // Check for mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      this.optimizationLevel = 'medium';
      this.targetFPS = 30; // Lower target FPS for mobile
    }

    // Check WebGL capabilities
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    
    if (maxTextureSize < 2048 || maxRenderbufferSize < 2048) {
      this.optimizationLevel = 'low';
    }

    // Apply initial optimization
    this.applyOptimization();
  }

  private applyOptimization(): void {
    const quality: GraphicsQuality = {
      particleQuality: this.optimizationLevel,
      lightingQuality: this.optimizationLevel,
      textureQuality: this.optimizationLevel,
      shadowQuality: this.optimizationLevel,
      effectsEnabled: this.optimizationLevel !== 'low'
    };

    this.gameEngine.setQuality(quality);
  }

  public getOptimizationLevel(): string {
    return this.optimizationLevel;
  }

  public getPerformanceReport(): any {
    const metrics = this.gameEngine.getPerformanceMetrics();
    const memoryStats = this.gameEngine.getMemoryStats();
    
    return {
      currentFPS: metrics.fps,
      averageFPS: this.performanceHistory.length > 0 
        ? this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length 
        : 0,
      optimizationLevel: this.optimizationLevel,
      memoryUsage: memoryStats.textureMemory + memoryStats.bufferMemory,
      particleCount: metrics.particleCount,
      renderCalls: metrics.renderCalls,
      recommendations: this.getRecommendations()
    };
  }

  private getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.gameEngine.getPerformanceMetrics();
    
    if (metrics.fps < 30) {
      recommendations.push('Consider reducing graphics quality');
    }
    
    if (metrics.particleCount > 1000) {
      recommendations.push('High particle count detected - may impact performance');
    }
    
    if (metrics.memoryUsage > 200) {
      recommendations.push('High memory usage detected');
    }
    
    if (metrics.renderCalls > 50) {
      recommendations.push('High render call count - consider batching');
    }
    
    return recommendations;
  }
}

/**
 * Final Polish Manager - Handles visual polish and user experience enhancements
 */
export class FinalPolishManager {
  private gameEngine: GameEngine;
  private polishEffects: Map<string, any> = new Map();

  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
    this.setupPolishEffects();
  }

  private setupPolishEffects(): void {
    // Screen shake effect for impacts
    this.polishEffects.set('screenShake', {
      intensity: 0,
      duration: 0,
      timeRemaining: 0
    });

    // Color grading for different evolution levels
    this.polishEffects.set('colorGrading', {
      enabled: true,
      evolutionLevel: 1
    });

    // Dynamic camera effects
    this.polishEffects.set('cameraEffects', {
      zoom: 1.0,
      targetZoom: 1.0,
      smoothing: 0.1
    });
  }

  public addScreenShake(intensity: number, duration: number): void {
    const effect = this.polishEffects.get('screenShake');
    if (effect) {
      effect.intensity = Math.max(effect.intensity, intensity);
      effect.duration = duration;
      effect.timeRemaining = duration;
    }
  }

  public updateColorGrading(evolutionLevel: number): void {
    const effect = this.polishEffects.get('colorGrading');
    if (effect) {
      effect.evolutionLevel = evolutionLevel;
    }
  }

  public setCameraZoom(zoom: number): void {
    const effect = this.polishEffects.get('cameraEffects');
    if (effect) {
      effect.targetZoom = zoom;
    }
  }

  public update(deltaTime: number): void {
    this.updateScreenShake(deltaTime);
    this.updateCameraEffects(deltaTime);
  }

  private updateScreenShake(deltaTime: number): void {
    const effect = this.polishEffects.get('screenShake');
    if (effect && effect.timeRemaining > 0) {
      effect.timeRemaining -= deltaTime;
      
      if (effect.timeRemaining <= 0) {
        effect.intensity = 0;
        effect.timeRemaining = 0;
      }
    }
  }

  private updateCameraEffects(deltaTime: number): void {
    const effect = this.polishEffects.get('cameraEffects');
    if (effect) {
      const diff = effect.targetZoom - effect.zoom;
      effect.zoom += diff * effect.smoothing * (deltaTime / 16.67); // Normalize to 60fps
    }
  }

  public getScreenShakeOffset(): { x: number; y: number } {
    const effect = this.polishEffects.get('screenShake');
    if (effect && effect.intensity > 0) {
      const shake = effect.intensity * (effect.timeRemaining / effect.duration);
      return {
        x: (Math.random() - 0.5) * shake * 10,
        y: (Math.random() - 0.5) * shake * 10
      };
    }
    return { x: 0, y: 0 };
  }

  public getCameraZoom(): number {
    const effect = this.polishEffects.get('cameraEffects');
    return effect ? effect.zoom : 1.0;
  }

  public getColorGradingLevel(): number {
    const effect = this.polishEffects.get('colorGrading');
    return effect ? effect.evolutionLevel : 1;
  }
}

/**
 * End-to-End Game Flow Manager - Ensures smooth gameplay from start to Ouroboros level
 */
export class EndToEndFlowManager {
  private gameEngine: GameEngine;
  private flowState: 'tutorial' | 'early_game' | 'mid_game' | 'late_game' | 'endgame' = 'tutorial';
  private milestones: Set<string> = new Set();

  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
    this.setupFlowTracking();
  }

  private setupFlowTracking(): void {
    // Track evolution milestones
    const snakeManager = this.gameEngine.getSnakeManager();
    const evolutionSystem = snakeManager.getEvolutionSystem();
    
    // Monitor evolution progress
    setInterval(() => {
      this.checkFlowProgress();
    }, 1000);
  }

  private checkFlowProgress(): void {
    const snakeManager = this.gameEngine.getSnakeManager();
    const evolutionLevel = snakeManager.getCurrentEvolutionLevel();
    const scoreSystem = this.gameEngine.getScoreSystem();
    const currentScore = scoreSystem.getCurrentScore();

    // Update flow state based on progress
    if (evolutionLevel >= 8) {
      this.flowState = 'endgame';
    } else if (evolutionLevel >= 5) {
      this.flowState = 'late_game';
    } else if (evolutionLevel >= 3) {
      this.flowState = 'mid_game';
    } else if (currentScore > 100) {
      this.flowState = 'early_game';
    }

    // Check for milestones
    this.checkMilestones(evolutionLevel, currentScore);
  }

  private checkMilestones(evolutionLevel: number, score: number): void {
    // First evolution milestone
    if (evolutionLevel >= 2 && !this.milestones.has('first_evolution')) {
      this.milestones.add('first_evolution');
      this.triggerMilestone('First Evolution!', 'You evolved to Garden Snake');
    }

    // First power milestone
    if (evolutionLevel >= 2 && !this.milestones.has('first_power')) {
      this.milestones.add('first_power');
      this.triggerMilestone('Power Unlocked!', 'Speed Boost is now available');
    }

    // Mid-game milestone
    if (evolutionLevel >= 5 && !this.milestones.has('mid_game')) {
      this.milestones.add('mid_game');
      this.triggerMilestone('Halfway There!', 'You reached Cobra level');
    }

    // Ouroboros milestone
    if (evolutionLevel >= 10 && !this.milestones.has('ouroboros')) {
      this.milestones.add('ouroboros');
      this.triggerMilestone('OUROBOROS ACHIEVED!', 'You have reached the ultimate form');
    }

    // Score milestones
    if (score >= 1000 && !this.milestones.has('score_1000')) {
      this.milestones.add('score_1000');
      this.triggerMilestone('Score Master!', '1000 points achieved');
    }
  }

  private triggerMilestone(title: string, description: string): void {
    console.log(`🎉 MILESTONE: ${title} - ${description}`);
    
    // Add visual celebration effects
    const particleSystem = this.gameEngine.getParticleSystem();
    const snakeManager = this.gameEngine.getSnakeManager();
    const snakeState = snakeManager.getSnakeState();
    
    const celebrationPosition = {
      x: snakeState.head.x * 35 + 17.5,
      y: snakeState.head.y * 35 + 17.5
    };
    
    // Create celebration particle burst
    particleSystem.createBurst(
      celebrationPosition,
      'sparkle',
      20,
      { x: 0, y: 0 },
      Math.PI * 2
    );
  }

  public getFlowState(): string {
    return this.flowState;
  }

  public getMilestones(): string[] {
    return Array.from(this.milestones);
  }

  public getProgressSummary(): any {
    const snakeManager = this.gameEngine.getSnakeManager();
    const evolutionLevel = snakeManager.getCurrentEvolutionLevel();
    const scoreSystem = this.gameEngine.getScoreSystem();
    
    return {
      flowState: this.flowState,
      evolutionLevel,
      evolutionName: snakeManager.getEvolutionSystem().getCurrentEvolutionName(),
      score: scoreSystem.getCurrentScore(),
      milestonesAchieved: this.milestones.size,
      totalMilestones: 6, // Adjust based on total milestones
      progressPercentage: Math.min(100, (evolutionLevel / 10) * 100)
    };
  }
}