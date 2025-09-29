import { GameEngine } from './GameEngine';
import { GameOptimizer, FinalPolishManager, EndToEndFlowManager } from './GameOptimizer';
import { FoodType, DeathReason } from '../types/game';
import { PowerType } from './EvolutionSystem';

/**
 * CompleteGameIntegration - Final integration layer that brings all systems together
 * This class ensures all game systems work seamlessly together for the complete Ouroboros experience
 */
export class CompleteGameIntegration {
  private gameEngine: GameEngine;
  private optimizer: GameOptimizer;
  private polishManager: FinalPolishManager;
  private flowManager: EndToEndFlowManager;
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.gameEngine = new GameEngine(canvas);
    this.optimizer = new GameOptimizer(this.gameEngine);
    this.polishManager = new FinalPolishManager(this.gameEngine);
    this.flowManager = new EndToEndFlowManager(this.gameEngine);
    
    this.setupIntegration();
  }

  private setupIntegration(): void {
    // Integrate all systems with enhanced callbacks
    this.setupEnhancedCallbacks();
    
    // Optimize for current device
    this.optimizer.optimizeForDevice();
    
    // Start background audio
    const audioManager = this.gameEngine.getAudioManager();
    audioManager.startBackgroundAudio();
    
    this.isInitialized = true;
  }

  private setupEnhancedCallbacks(): void {
    const snakeManager = this.gameEngine.getSnakeManager();
    const evolutionSystem = snakeManager.getEvolutionSystem();
    const gameStateManager = this.gameEngine.getGameStateManager();
    const audioManager = this.gameEngine.getAudioManager();
    const lightingSystem = this.gameEngine.getLightingSystem();
    const particleSystem = this.gameEngine.getParticleSystem();

    // Enhanced evolution callback
    const originalEvolutionCallback = evolutionSystem.onEvolution;
    evolutionSystem.onEvolution = (fromLevel: number, toLevel: number) => {
      // Call original callback if it exists
      if (originalEvolutionCallback) {
        originalEvolutionCallback(fromLevel, toLevel);
      }

      // Add enhanced effects
      this.handleEvolutionEffects(fromLevel, toLevel);
    };

    // Enhanced game over callback
    gameStateManager.onGameOver((gameOverState) => {
      this.handleGameOverEffects(gameOverState.deathReason);
    });

    // Enhanced power activation
    const originalPowerCallback = snakeManager.onPowerActivation;
    snakeManager.onPowerActivation = (powerType: PowerType, success: boolean) => {
      if (originalPowerCallback) {
        originalPowerCallback(powerType, success);
      }

      if (success) {
        this.handlePowerActivationEffects(powerType);
      }
    };
  }

  private handleEvolutionEffects(fromLevel: number, toLevel: number): void {
    console.log(`🐍 Evolution: ${fromLevel} → ${toLevel}`);
    
    // Screen shake for dramatic effect
    this.polishManager.addScreenShake(0.5, 1000);
    
    // Update color grading
    this.polishManager.updateColorGrading(toLevel);
    
    // Zoom effect for high-level evolutions
    if (toLevel >= 8) {
      this.polishManager.setCameraZoom(1.2);
      setTimeout(() => {
        this.polishManager.setCameraZoom(1.0);
      }, 2000);
    }

    // Special effects for Ouroboros evolution
    if (toLevel === 10) {
      this.handleOuroborosEvolution();
    }
  }

  private handleOuroborosEvolution(): void {
    console.log('🌟 OUROBOROS FORM ACHIEVED! 🌟');
    
    // Dramatic screen shake
    this.polishManager.addScreenShake(1.0, 3000);
    
    // Create massive particle celebration
    const particleSystem = this.gameEngine.getParticleSystem();
    const snakeManager = this.gameEngine.getSnakeManager();
    const snakeState = snakeManager.getSnakeState();
    
    const headPosition = {
      x: snakeState.head.x * 35 + 17.5,
      y: snakeState.head.y * 35 + 17.5
    };
    
    // Multiple particle bursts
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        particleSystem.createBurst(
          headPosition,
          'sparkle',
          50,
          { x: 0, y: 0 },
          Math.PI * 2
        );
      }, i * 200);
    }
    
    // Dramatic lighting
    const lightingSystem = this.gameEngine.getLightingSystem();
    lightingSystem.addTemporaryLight({
      position: headPosition,
      color: [1.0, 0.8, 0.0], // Golden light
      intensity: 2.0,
      radius: 300,
      duration: 5000
    });
  }

  private handlePowerActivationEffects(powerType: PowerType): void {
    // Add screen shake for powerful abilities
    switch (powerType) {
      case PowerType.FireBreath:
        this.polishManager.addScreenShake(0.3, 500);
        break;
      case PowerType.VenomStrike:
        this.polishManager.addScreenShake(0.2, 300);
        break;
      case PowerType.TimeWarp:
        this.polishManager.addScreenShake(0.1, 1000);
        break;
    }
  }

  private handleGameOverEffects(deathReason: DeathReason): void {
    console.log(`💀 Game Over: ${deathReason}`);
    
    // Screen shake for death
    this.polishManager.addScreenShake(0.8, 2000);
    
    // Stop background audio
    const audioManager = this.gameEngine.getAudioManager();
    audioManager.stopBackgroundAudio();
  }

  // Public API methods
  public start(): void {
    if (!this.isInitialized) {
      throw new Error('Game integration not initialized');
    }
    
    this.gameEngine.start();
  }

  public stop(): void {
    this.gameEngine.stop();
  }

  public pause(): void {
    this.gameEngine.pause();
  }

  public restart(): void {
    this.gameEngine.restart();
    
    // Reset polish effects
    this.polishManager = new FinalPolishManager(this.gameEngine);
    
    // Reset flow tracking
    this.flowManager = new EndToEndFlowManager(this.gameEngine);
  }

  public update(deltaTime: number): void {
    // Update polish effects
    this.polishManager.update(deltaTime);
    
    // Apply screen shake to rendering
    const shakeOffset = this.polishManager.getScreenShakeOffset();
    if (shakeOffset.x !== 0 || shakeOffset.y !== 0) {
      // Apply shake offset to camera/rendering
      // This would be implemented in the rendering system
    }
  }

  // System access methods
  public getGameEngine(): GameEngine {
    return this.gameEngine;
  }

  public getOptimizer(): GameOptimizer {
    return this.optimizer;
  }

  public getPolishManager(): FinalPolishManager {
    return this.polishManager;
  }

  public getFlowManager(): EndToEndFlowManager {
    return this.flowManager;
  }

  // Performance and diagnostics
  public getPerformanceReport(): any {
    return {
      optimizer: this.optimizer.getPerformanceReport(),
      flow: this.flowManager.getProgressSummary(),
      gameEngine: {
        fps: this.gameEngine.getPerformanceMetrics().fps,
        memoryUsage: this.gameEngine.getMemoryStats(),
        fallbackState: this.gameEngine.getFallbackState()
      }
    };
  }

  public runDiagnostics(): any {
    const snakeManager = this.gameEngine.getSnakeManager();
    const foodManager = this.gameEngine.getFoodManager();
    const environmentSystem = this.gameEngine.getEnvironmentSystem();
    const audioManager = this.gameEngine.getAudioManager();
    const lightingSystem = this.gameEngine.getLightingSystem();
    const particleSystem = this.gameEngine.getParticleSystem();

    return {
      systems: {
        snake: {
          isAlive: snakeManager.isAlive(),
          evolutionLevel: snakeManager.getCurrentEvolutionLevel(),
          length: snakeManager.getLength(),
          availablePowers: snakeManager.getAvailablePowers().length
        },
        food: {
          activeFoods: foodManager.getFoodCount(),
          activeEffects: foodManager.getActiveEffects().length
        },
        environment: {
          obstacles: environmentSystem.getObstacles().length,
          dynamicElements: environmentSystem.getDynamicElements().length
        },
        audio: {
          isSupported: audioManager.isAudioSupported(),
          activeSources: audioManager.getActiveSourceCount(),
          isMuted: audioManager.isMuted()
        },
        lighting: {
          activeLights: lightingSystem.getActiveLightCount()
        },
        particles: {
          activeParticles: particleSystem.getActiveParticleCount()
        }
      },
      integration: {
        isInitialized: this.isInitialized,
        optimizationLevel: this.optimizer.getOptimizationLevel(),
        flowState: this.flowManager.getFlowState(),
        milestones: this.flowManager.getMilestones()
      }
    };
  }

  // Test complete game flow
  public async testCompleteGameFlow(): Promise<boolean> {
    console.log('🧪 Testing complete game flow...');
    
    try {
      // Test system initialization
      const diagnostics = this.runDiagnostics();
      if (!diagnostics.integration.isInitialized) {
        throw new Error('Game integration not properly initialized');
      }

      // Test evolution progression
      const snakeManager = this.gameEngine.getSnakeManager();
      const evolutionSystem = snakeManager.getEvolutionSystem();
      
      for (let level = 2; level <= 10; level++) {
        evolutionSystem.forceEvolution(level);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (evolutionSystem.getCurrentLevel() !== level) {
          throw new Error(`Evolution to level ${level} failed`);
        }
      }

      // Test power system integration
      for (const powerType of snakeManager.getAvailablePowers()) {
        const result = snakeManager.activatePower(powerType);
        if (!result.success && result.message !== 'Power is on cooldown') {
          console.warn(`Power ${powerType} activation failed: ${result.message}`);
        }
      }

      // Test food system integration
      const foodManager = this.gameEngine.getFoodManager();
      const testFood = foodManager.forceSpawnFood({ x: 10, y: 10 }, FoodType.BasicBerry);
      if (!testFood) {
        throw new Error('Food spawning failed');
      }

      const consumptionResult = foodManager.consumeFood(testFood.id, 1);
      if (!consumptionResult.success) {
        throw new Error('Food consumption failed');
      }

      // Test audio system
      const audioManager = this.gameEngine.getAudioManager();
      if (audioManager.isAudioSupported()) {
        audioManager.playPowerActivation(PowerType.SpeedBoost);
      }

      console.log('✅ Complete game flow test passed!');
      return true;
      
    } catch (error) {
      console.error('❌ Complete game flow test failed:', error);
      return false;
    }
  }

  public dispose(): void {
    this.gameEngine.dispose();
  }
}

// Export factory function for easy integration
export function createCompleteGame(canvas: HTMLCanvasElement): CompleteGameIntegration {
  return new CompleteGameIntegration(canvas);
}