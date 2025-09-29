import {
  GameConfig,
  GameState,
  Vector2,
  TailConsumptionResult,
  StrategicAdvantage,
  DeathReason,
  ConsumptionResult,
  FoodType,
  Food
} from '../types/game';
import { SnakeManager } from './SnakeManager';
import { SnakeRenderer, RenderContext } from './SnakeRenderer';
import { VisualPatternManager } from './VisualPatternManager';
import { InputManager } from './InputManager';
import { EnvironmentSystem } from './EnvironmentSystem';
import { EnvironmentRenderer, EnvironmentRenderContext } from './EnvironmentRenderer';
import { ParticleSystem, ParticleType } from './ParticleSystem';
import { PowerSystem, PowerActivationResult } from './PowerSystem';
import { PowerType } from './EvolutionSystem';
import { ScoreSystem } from './ScoreSystem';
import { GameStateManager } from './GameStateManager';
import { PerformanceMonitor, GraphicsQuality } from './PerformanceMonitor';
import { MemoryManager } from './MemoryManager';
import { ErrorHandler, FallbackState } from './ErrorHandler';
import { AssetLoader, AssetManifest } from './AssetLoader';
import { ResponsiveManager, ViewportInfo } from './ResponsiveManager';
import { BrowserCompatibility } from './BrowserCompatibility';
import { FoodManager } from './FoodManager';
import { AudioManager } from './AudioManager';
import { LightingSystem, LightingConfig } from './LightingSystem';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private config: GameConfig;
  private state: GameState;
  private animationFrameId: number | null = null;
  private activeTimeouts: Set<number> = new Set(); // Track timeouts for cleanup

  // Game systems
  private snakeManager!: SnakeManager;
  private snakeRenderer!: SnakeRenderer;
  private visualPatternManager!: VisualPatternManager;
  private inputManager!: InputManager;
  private environmentSystem!: EnvironmentSystem;
  private environmentRenderer!: EnvironmentRenderer;
  private particleSystem!: ParticleSystem;
  private scoreSystem!: ScoreSystem;
  private gameStateManager!: GameStateManager;
  private foodManager!: FoodManager;
  private audioManager!: AudioManager;
  private lightingSystem!: LightingSystem;
  private powerSystem!: PowerSystem;

  // Performance and optimization systems
  private performanceMonitor!: PerformanceMonitor;
  private memoryManager!: MemoryManager;
  private errorHandler!: ErrorHandler;
  private assetLoader!: AssetLoader;
  private responsiveManager?: ResponsiveManager;
  private browserCompatibility!: BrowserCompatibility;

  // Fallback state
  private fallbackState: FallbackState = {
    webglFallback: false,
    audioFallback: false,
    reducedEffects: false,
    lowQualityMode: false
  };

  private currentQuality: GraphicsQuality = {
    particleQuality: 'high',
    lightingQuality: 'high',
    textureQuality: 'high',
    shadowQuality: 'high',
    effectsEnabled: true
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Initialize browser compatibility first
    this.browserCompatibility = new BrowserCompatibility();

    // Initialize error handler
    this.errorHandler = new ErrorHandler();
    this.setupErrorHandling();

    // Initialize WebGL context with error handling
    this.gl = this.errorHandler.createSafeWebGLContext(canvas);
    this.fallbackState.webglFallback = !this.gl;

    // Game configuration - 50x35 grid at 35px per cell = 1750x1225 pixels
    this.config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };

    // Initialize game state
    this.state = {
      isRunning: false,
      isPaused: false,
      lastFrameTime: 0,
      deltaTime: 0,
      fps: 0
    };

    // Initialize performance and memory systems
    this.performanceMonitor = new PerformanceMonitor();
    this.assetLoader = new AssetLoader();

    this.setupPerformanceMonitoring();
    this.setupCanvas();
    this.setupWebGL();           // will no-op if no gl
    this.initializeGameSystems(); // make this respect gl presence
  }

  private setupCanvas(): void {
    const cssWidth = this.config.gridWidth * this.config.cellSize;
    const cssHeight = this.config.gridHeight * this.config.cellSize;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.canvas.width = Math.floor(cssWidth * dpr);
    this.canvas.height = Math.floor(cssHeight * dpr);
  }

  private setupErrorHandling(): void {
    this.errorHandler.setFallbackChangeCallback((state) => {
      // ✅ capture previous state before overwriting
      const prev = this.fallbackState;
      this.fallbackState = state;
      this.handleFallbackStateChange(state, prev);
    });

    this.errorHandler.setCriticalErrorCallback((error) => {
      console.error('Critical error occurred:', error);
      this.handleCriticalError(error);
    });
  }

  private setupPerformanceMonitoring(): void {
    this.performanceMonitor.setQualityChangeCallback((quality) => {
      this.currentQuality = quality;
      this.applyQualitySettings(quality);
    });
  }

  private handleFallbackStateChange(state: FallbackState, prev: FallbackState): void {
    if (state.webglFallback && !prev.webglFallback) {
      console.warn('Switching to WebGL fallback mode');
      this.reinitializeWithFallback();
    }

    if (state.audioFallback && !prev.audioFallback) {
      console.warn('Audio disabled due to errors');
      // Disable or swap AudioManager to a no-op
    }

    if (state.reducedEffects && !prev.reducedEffects) {
      console.warn('Reducing visual effects for better performance');
      this.currentQuality.effectsEnabled = false;
      this.applyQualitySettings(this.currentQuality);
    }
  }

  private handleCriticalError(error: any): void {
    // Attempt graceful degradation
    this.fallbackState.lowQualityMode = true;
    this.currentQuality = {
      particleQuality: 'low',
      lightingQuality: 'low',
      textureQuality: 'low',
      shadowQuality: 'low',
      effectsEnabled: false
    };
    this.applyQualitySettings(this.currentQuality);
  }

  private applyQualitySettings(quality: GraphicsQuality): void {
    if (this.particleSystem?.setMaxParticles) {
      const max = quality.particleQuality === 'high' ? 1500 : quality.particleQuality === 'medium' ? 750 : 300;
      this.particleSystem.setMaxParticles(max);
      this.particleSystem.setEffectsEnabled?.(quality.effectsEnabled);
    }
    this.snakeRenderer?.setQuality?.(quality);
    this.environmentRenderer?.setQuality?.(quality);
  }

  private reinitializeWithFallback(): void {
    try {
      if (this.particleSystem?.dispose) this.particleSystem.dispose();
      // No GL in fallback; use a no-op
      this.particleSystem = {
        setMaxParticles: () => {}, setEffectsEnabled: () => {}, update: () => {}, render: () => {}, clear: () => {},
        getActiveParticleCount: () => 0, dispose: () => {}, updateViewport: () => {}, addScreenEffect: () => {},
        setTimeScale: () => {}, createFoodConsumptionEffect: () => {}, createNegativeFoodEffect: () => {},
        createSpecialFoodEffect: () => {}, createEvolutionTransformationEffect: () => {}, createSpeedTrailEffect: () => {},
        createVenomStrikeEffect: () => {}, createFireBreathEffect: () => {}, createTimeWarpEffect: () => {},
        createInvisibilityEffect: () => {}, createBurst: () => {}, createCrystalDestructionEffect: () => {},
        createIceDestructionEffect: () => {}, createStoneDestructionEffect: () => {}, createFlameExplosionEffect: () => {},
        createTailConsumptionEffect: () => {}, createMysticalDissolveEffect: () => {}, createDeathEffect: () => {}
      } as any;
    } catch (error) {
      this.errorHandler.handleError({
        type: 'general',
        message: `Fallback init failed: ${error}`,
        timestamp: Date.now(),
        severity: 'high'
      });
    }
  }

  private setupWebGL(): void {
    if (!this.gl) return; // ✅ guard

    const gl = this.gl;

    try {
      // Set viewport
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);

      // Set clear color to dark mystical background
      gl.clearColor(0.1, 0.1, 0.18, 1.0);

      // Enable blending for transparency effects
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } catch (error) {
      this.errorHandler.handleError({
        type: 'webgl',
        message: `WebGL setup failed: ${error}`,
        timestamp: Date.now(),
        severity: 'high'
      });
    }
  }

  private initializeGameSystems(): void {
    // Order: systems that don't need GL first
    this.scoreSystem = new ScoreSystem();
    this.gameStateManager = new GameStateManager(this.scoreSystem, {
      deathAnimationDuration: 2000,
      pauseOnFocusLoss: true,
      enableAutoSave: true
    });
    this.inputManager = new InputManager(this.canvas);
    this.environmentSystem = new EnvironmentSystem(this.config);
    this.foodManager = new FoodManager(this.config);

    // Visual / GL stuff
    this.visualPatternManager = new VisualPatternManager();

    if (this.gl) {
      // Initialize memory manager only when GL is available
      this.memoryManager = new MemoryManager(this.gl);

      const rc: RenderContext = { gl: this.gl, canvas: this.canvas, cellSize: this.config.cellSize, gridWidth: this.config.gridWidth, gridHeight: this.config.gridHeight };
      this.snakeRenderer = new SnakeRenderer(rc);

      const ec: EnvironmentRenderContext = { gl: this.gl, canvas: this.canvas, cellSize: this.config.cellSize, gridWidth: this.config.gridWidth, gridHeight: this.config.gridHeight };
      this.environmentRenderer = new EnvironmentRenderer(ec);

      this.particleSystem = new ParticleSystem(this.gl, {
        maxParticles: 1500,
        enableBatching: true,
        enableCulling: true,
        cullDistance: Math.max(this.canvas.width, this.canvas.height) * 1.5
      });

      this.lightingSystem = new LightingSystem(this.gl, this.canvas, {
        maxLights: 20,
        enableShadows: true,
        shadowQuality: 'medium',
        ambientIntensity: 0.3,
        lightFalloffExponent: 2.0,
        performanceMode: false
      });
    } else {
      // Provide minimal no-ops so the rest of the code can call methods safely
      this.memoryManager = { getMemoryStats: () => ({ textureMemory: 0, bufferMemory: 0, totalMemory: 0 }), dispose: () => {} } as any;
      this.snakeRenderer = { 
        createVisualState: () => ({}), render: () => {}, update: () => {}, setQuality: () => {}, updateViewport: () => {} 
      } as any;
      this.environmentRenderer = { 
        render: () => {}, update: () => {}, setQuality: () => {}, updateViewport: () => {} 
      } as any;
      this.particleSystem = {
        setMaxParticles: () => {}, setEffectsEnabled: () => {}, update: () => {}, render: () => {}, clear: () => {},
        getActiveParticleCount: () => 0, dispose: () => {}, updateViewport: () => {}, addScreenEffect: () => {},
        setTimeScale: () => {}, createFoodConsumptionEffect: () => {}, createNegativeFoodEffect: () => {},
        createSpecialFoodEffect: () => {}, createEvolutionTransformationEffect: () => {}, createSpeedTrailEffect: () => {},
        createVenomStrikeEffect: () => {}, createFireBreathEffect: () => {}, createTimeWarpEffect: () => {},
        createInvisibilityEffect: () => {}, createBurst: () => {}, createCrystalDestructionEffect: () => {},
        createIceDestructionEffect: () => {}, createStoneDestructionEffect: () => {}, createFlameExplosionEffect: () => {},
        createTailConsumptionEffect: () => {}, createMysticalDissolveEffect: () => {}, createDeathEffect: () => {}
      } as any;
      this.lightingSystem = {
        applyAmbientLighting: () => {}, render: () => {}, update: () => {}, reset: () => {},
        addTemporaryLight: () => {}, addPowerLight: () => {}, addFlickeringLight: () => {}, addSnakeGlow: () => {},
        addEvolutionLighting: () => {}, updateAmbientLighting: () => {}, addDeathLighting: () => {},
        updateViewport: () => {}, dispose: () => {}
      } as any;
    }

    // Snake last (doesn't need GL)
    const startPosition = { x: Math.floor(this.config.gridWidth / 2), y: Math.floor(this.config.gridHeight / 2) };
    this.snakeManager = new SnakeManager(this.config, startPosition);

    this.audioManager = new AudioManager();
    this.audioManager.initialize().catch(err => {
      console.warn('Audio init failed:', err);
      this.fallbackState.audioFallback = true;
    });

    // Initialize power system
    this.powerSystem = new PowerSystem(this.config);

    this.setupInputHandling();
    this.setupGameStateCallbacks();
  }

  private setupInputHandling(): void {
    // Handle direction changes from input
    this.inputManager.onDirectionChange = (direction: Vector2) => {
      // Resume audio on first user gesture
      try {
        this.audioManager.resumeOnFirstGesture?.();
        this.audioManager.resumeAudioContext?.();
      } catch (error) {
        console.warn('Audio resume failed:', error);
      }

      if (!this.gameStateManager.isGamePaused() && !this.gameStateManager.isGameOver()) {
        this.snakeManager.queueDirection(direction);
      }
    };

    // Handle power activation
    this.inputManager.onPowerActivate = (powerType: any) => {
      if (this.gameStateManager.isGamePaused() || this.gameStateManager.isGameOver()) {
        return;
      }

      const result = this.snakeManager.activatePower(powerType);
      if (result.success) {
        console.log(`Power activated: ${result.message}`);

        // Award power usage bonus
        const evolutionLevel = this.snakeManager.getEvolutionSystem().getCurrentLevel();
        this.scoreSystem.addPowerUsageBonus(powerType, evolutionLevel, true);

        // Play power activation sound with error handling
        try {
          this.audioManager.playPowerActivation(powerType);
        } catch (error) {
          console.warn('Audio playback failed:', error);
        }

        // Create particle effects for power activation
        this.handlePowerParticleEffects(result);

        // Add lighting effects for power activation
        this.handlePowerLightingEffects(result);
      } else {
        console.log(`Power activation failed: ${result.message}`);
      }
    };

    // Handle tail click/tap for Ouroboros tail consumption
    this.inputManager.onTailClick = (position: Vector2) => {
      if (this.gameStateManager.isGamePaused() || this.gameStateManager.isGameOver()) {
        return;
      }

      const segmentInfo = this.snakeManager.getClickableSegmentInfo(position);

      if (segmentInfo && segmentInfo.isConsumable) {
        const result = this.snakeManager.consumeTailFromSegment(segmentInfo.segmentIndex);

        if (result.success) {
          console.log(`Tail consumption: ${result.message}`);

          // Award tail consumption bonus
          if (result.strategicAdvantage) {
            const evolutionLevel = this.snakeManager.getEvolutionSystem().getCurrentLevel();
            this.scoreSystem.addTailConsumptionBonus(result.strategicAdvantage, evolutionLevel);
          }

          // Create mystical spiral visual effects
          this.handleTailConsumptionEffects(result, segmentInfo.position);

          // Apply strategic advantages
          if (result.strategicAdvantage) {
            this.applyStrategicAdvantages(result.strategicAdvantage);
          }
        } else {
          console.log(`Tail consumption failed: ${result.message}`);
        }
      } else if (segmentInfo && !segmentInfo.isConsumable) {
        console.log('Cannot consume this segment - only tail segments are consumable');
      }
    };
  }

  private setupGameStateCallbacks(): void {
    // Handle game over events
    this.gameStateManager.onGameOver((gameOverState) => {
      console.log(`Game Over: ${gameOverState.deathReason}`);
      console.log(`Final Score: ${gameOverState.finalScore}`);
      console.log(`Evolution Level: ${gameOverState.finalEvolutionLevel}`);
      console.log(`Survival Time: ${this.scoreSystem.getFormattedSurvivalTime()}`);
    });
  }

  public start(): void {
    if (this.gameStateManager.isGameRunning()) return;

    this.gameStateManager.startGame();
    this.state.isRunning = true;
    this.state.lastFrameTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    this.gameStateManager.stopGame();
    this.state.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public pause(): void {
    const wasPaused = this.gameStateManager.isGamePaused();
    this.gameStateManager.togglePause();

    // Update the engine state to match the game state manager
    this.state.isPaused = this.gameStateManager.isGamePaused();

    if (!wasPaused && this.gameStateManager.isGamePaused()) {
      // Game was just paused
      this.audioManager.playGamePause();
    } else if (wasPaused && !this.gameStateManager.isGamePaused()) {
      // Game was just resumed
      this.audioManager.playGameResume();
    }
  }

  public restart(): void {
    // Reset snake to starting position
    const startPosition: Vector2 = {
      x: Math.floor(this.config.gridWidth / 2),
      y: Math.floor(this.config.gridHeight / 2)
    };
    this.snakeManager.reset(startPosition);

    // Reset environment
    this.environmentSystem.reset();

    // Reset food system
    this.foodManager.clearAllFood();
    this.foodManager.clearActiveEffects();
    this.foodManager.clearConsumptionHistory();

    // Reset visual systems
    this.visualPatternManager.reset();
    if (this.particleSystem) {
      this.particleSystem.clear();
    }
    if (this.lightingSystem) {
      this.lightingSystem.reset();
    }

    // Restart background audio
    this.audioManager.startBackgroundAudio();

    // Restart game state
    this.gameStateManager.restartGame();

    // Start game loop if not already running
    if (!this.state.isRunning) {
      this.start();
    }
  }

  private gameLoop = (): void => {
    if (!this.state.isRunning) return;

    // Start performance monitoring
    this.performanceMonitor.startFrame();

    const now = performance.now();
    let dt = now - this.state.lastFrameTime;
    this.state.lastFrameTime = now;

    dt = Math.min(dt, 1000 / 15); // clamp to ~66ms (15 FPS min)
    if (dt <= 0) dt = 1000 / this.config.targetFPS;
    this.state.deltaTime = dt;
    this.state.fps = 1000 / dt;

    try {
      // Update game state manager
      this.gameStateManager.update(this.state.deltaTime);

      if (!this.gameStateManager.isGamePaused() && !this.gameStateManager.isGameOver()) {
        this.update(this.state.deltaTime);
      }

      // Always render (for death animation and paused state)
      this.render();

      // Update performance metrics
      this.updatePerformanceMetrics();

    } catch (error) {
      this.errorHandler.handleError({
        type: 'general',
        message: `Game loop error: ${error}`,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
        severity: 'high'
      });
    }

    // End performance monitoring
    this.performanceMonitor.endFrame();

    // Target 60 FPS
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private updatePerformanceMetrics(): void {
    const memoryStats = this.memoryManager.getMemoryStats();
    const particleCount = this.particleSystem ? this.particleSystem.getActiveParticleCount() : 0;

    this.performanceMonitor.updateMetrics({
      memoryUsage: this.performanceMonitor.getMemoryUsage(),
      particleCount,
      renderCalls: this.getRenderCallCount()
    });

    // Perform garbage collection if memory usage is high
    if (memoryStats.textureMemory > 200 * 1024 * 1024) { // 200MB threshold
      this.memoryManager.performGarbageCollection();
    }
  }

  private getRenderCallCount(): number {
    // Estimate render calls based on active systems
    let renderCalls = 1; // Base render call

    if (this.snakeRenderer) renderCalls += 1;
    if (this.environmentRenderer) renderCalls += 1;
    if (this.particleSystem) {
      const particleCount = this.particleSystem.getActiveParticleCount();
      renderCalls += Math.ceil(particleCount / 100); // Batched rendering
    }

    return renderCalls;
  }

  private update(deltaTime: number): void {
    // Update input manager
    this.inputManager.update(deltaTime);

    // Update environment system
    this.environmentSystem.update(deltaTime);

    // Update snake manager
    this.snakeManager.update(deltaTime);

    // Update food system with current snake and obstacle positions
    const snakeState = this.snakeManager.getSnakeState();
    const snakePositions = [snakeState.head, ...snakeState.segments.map(seg => ({ x: seg.x, y: seg.y }))];
    const obstaclePositions = this.environmentSystem.getObstacles().map(obs => obs.position);
    this.foodManager.update(deltaTime, snakePositions, obstaclePositions, snakeState.evolutionLevel);

    // Update lighting system
    if (this.lightingSystem) {
      this.lightingSystem.update(deltaTime);
    }

    // Check for collisions and game over conditions
    this.handleCollisions();

    // Check for food consumption
    this.handleFoodConsumption();

    // Update visual systems
    this.visualPatternManager.update(deltaTime);
    if (this.snakeRenderer) {
      this.snakeRenderer.update(deltaTime);
    }
    if (this.environmentRenderer) {
      this.environmentRenderer.update(deltaTime);
    }
    if (this.particleSystem) {
      this.particleSystem.update(deltaTime);
    }

    // Check for evolution transitions
    this.handleEvolutionTransitions();
  }

  private handleCollisions(): void {
    const snakeState = this.snakeManager.getSnakeState();

    // Check for self-collision
    if (this.snakeManager.checkSelfCollision()) {
      this.triggerGameOver(DeathReason.SelfCollision);
      return;
    }

    // Check for wall collision
    if (this.snakeManager.checkWallCollision()) {
      this.triggerGameOver(DeathReason.WallCollision);
      return;
    }

    // Check for obstacle collision
    const obstacleCollision = this.environmentSystem.checkSnakeObstacleCollision(
      snakeState.head,
      snakeState.segments.map(segment => ({ x: segment.x, y: segment.y }))
    );

    if (obstacleCollision.hasCollision && obstacleCollision.obstacle) {
      this.triggerGameOver(DeathReason.ObstacleCollision);
      return;
    }

    // Check for dynamic element collision (environmental hazards)
    const dynamicCollision = this.environmentSystem.checkSnakeDynamicElementCollision(
      snakeState.head,
      snakeState.segments.map(segment => ({ x: segment.x, y: segment.y })),
      snakeState.evolutionLevel
    );

    if (dynamicCollision.hasCollision && dynamicCollision.damage > 0 && !dynamicCollision.canPass) {
      this.triggerGameOver(DeathReason.EnvironmentalHazard);
      return;
    }
  }

  private handleFoodConsumption(): void {
    const snakeState = this.snakeManager.getSnakeState();
    const evolutionSystem = this.snakeManager.getEvolutionSystem();

    // Check if snake head is on any food
    const food = this.foodManager.getFoodAtPosition(snakeState.head);

    if (food) {
      // Consume the food
      const consumptionResult = this.foodManager.consumeFood(food.id, snakeState.evolutionLevel);

      if (consumptionResult.success) {
        // Award points
        this.scoreSystem.addFoodPoints(food.type, consumptionResult.pointsAwarded, snakeState.evolutionLevel);

        // Grow or shrink snake
        if (consumptionResult.segmentsToGrow > 0) {
          this.snakeManager.grow(consumptionResult.segmentsToGrow);
        } else if (consumptionResult.segmentsToGrow < 0) {
          // Handle segment loss
          this.snakeManager.shrink(Math.abs(consumptionResult.segmentsToGrow));
        }

        // Add evolution progress
        if (consumptionResult.evolutionProgress > 0) {
          evolutionSystem.addEvolutionProgress(consumptionResult.evolutionProgress);
        }

        // Apply food effects
        this.applyFoodEffects(consumptionResult.effects);

        // Play appropriate sound
        const isWrongLevel = !this.isFoodAppropriateForLevel(food.type, snakeState.evolutionLevel);
        const isCombination = consumptionResult.pointsAwarded > food.points; // Indicates bonus was applied
        this.audioManager.playFoodConsumption(food.type, isWrongLevel, isCombination);

        // Create food consumption particle effects
        const worldPosition = {
          x: food.position.x * this.config.cellSize + this.config.cellSize / 2,
          y: food.position.y * this.config.cellSize + this.config.cellSize / 2
        };

        if (isWrongLevel) {
          this.particleSystem.createNegativeFoodEffect(worldPosition, food.type);
        } else if (food.isSpecial) {
          this.particleSystem.createSpecialFoodEffect(worldPosition, food.type);
        } else {
          this.particleSystem.createFoodConsumptionEffect(worldPosition, food.type);
        }

        // Add lighting effects for special foods
        if (food.isSpecial) {
          this.lightingSystem.addTemporaryLight({
            position: worldPosition,
            color: this.getFoodLightColor(food.type),
            intensity: 0.8,
            radius: 100,
            duration: 2000
          });
        }
      }
    }
  }



  private handleEvolutionTransitions(): void {
    const evolutionSystem = this.snakeManager.getEvolutionSystem();

    // Check if evolution just occurred
    if (evolutionSystem.isTransformationInProgress() && !this.visualPatternManager.isTransitioning()) {
      const currentLevel = evolutionSystem.getCurrentLevel();
      const previousLevel = currentLevel - 1;

      // Award evolution bonus
      this.scoreSystem.addEvolutionBonus(previousLevel, currentLevel);

      // Start visual transition
      this.visualPatternManager.startTransition(previousLevel, currentLevel);

      // Play evolution sound sequence
      this.audioManager.playEvolutionSequence();

      // Create evolution transformation particle effects
      const snakeState = this.snakeManager.getSnakeState();
      const headPosition = {
        x: snakeState.head.x * this.config.cellSize + this.config.cellSize / 2,
        y: snakeState.head.y * this.config.cellSize + this.config.cellSize / 2
      };

      this.particleSystem.createEvolutionTransformationEffect(headPosition, previousLevel, currentLevel);

      // Add dramatic lighting effects for evolution
      this.lightingSystem.addEvolutionLighting(headPosition, currentLevel);

      // Update ambient lighting based on new evolution level
      this.lightingSystem.updateAmbientLighting(currentLevel);
    }
  }

  private render(): void {
    if (!this.gl) return; // ✅ guard
    const gl = this.gl;

    // Always set the background clear color before clearing
    gl.clearColor(0.1, 0.1, 0.18, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Apply lighting system base lighting
    if (this.lightingSystem) {
      this.lightingSystem.applyAmbientLighting(gl);
    }

    // Render environment obstacles first (background layer)
    this.renderEnvironment();

    // Render food items
    this.renderFood();

    // Render the snake on top
    this.renderSnake();

    // Apply dynamic lighting effects
    this.renderLighting();

    // Render particles on top of everything
    this.renderParticles();
  }

  private renderEnvironment(): void {
    this.environmentRenderer?.render?.(this.environmentSystem.getObstacles());
  }

  private renderSnake(): void {
    const snakeState = this.snakeManager.getSnakeState();
    const evo = this.snakeManager.getEvolutionSystem();
    const pattern = this.visualPatternManager.getCurrentPattern(snakeState.evolutionLevel);

    // Safe check for isMoving property
    const isIdle = typeof (snakeState as any).isMoving === 'boolean' ? !(snakeState as any).isMoving : false;

    const isTransforming = evo.isTransformationInProgress();
    const visualState = this.snakeRenderer?.createVisualState?.(
      snakeState.head,
      snakeState.segments,
      snakeState.evolutionLevel,
      pattern,
      isTransforming,
      evo.getTransformationProgress(),
      isIdle
    );
    this.snakeRenderer?.render?.(visualState);
  }

  private renderFood(): void {
    const activeFoods = this.foodManager.getActiveFoods();

    activeFoods.forEach(food => {
      const worldPosition = {
        x: food.position.x * this.config.cellSize,
        y: food.position.y * this.config.cellSize
      };

      // Render food using a simple colored rectangle for now
      // In a full implementation, this would use proper food sprites/textures
      this.renderFoodItem(food, worldPosition);
    });
  }

  private renderFoodItem(food: Food, position: Vector2): void {
    if (!this.gl) return;
    const gl = this.gl;

    const def = this.foodManager.getFoodDefinition(food.type);
    if (!def) return;

    const color = this.hexToRgb(def.visualData.color);
    const size = Math.floor(this.config.cellSize * 0.8);
    const x = Math.floor(position.x + (this.config.cellSize - size) / 2);
    const y = Math.floor(position.y + (this.config.cellSize - size) / 2);

    const prevViewport = gl.getParameter(gl.VIEWPORT) as Int32Array;
    const prevClear = gl.getParameter(gl.COLOR_CLEAR_VALUE) as Float32Array;

    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, this.canvas.height - y - size, size, size);
    gl.clearColor(color.r, color.g, color.b, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);

    gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
    gl.clearColor(prevClear[0], prevClear[1], prevClear[2], prevClear[3]); // ✅ restore
  }

  private renderLighting(): void {
    if (!this.gl) return;
    const lvl = this.snakeManager.getSnakeState().evolutionLevel;
    if (lvl >= 8) {
      const head = this.snakeManager.getSnakeState().head;
      const headPos = { x: head.x * this.config.cellSize + this.config.cellSize / 2, y: head.y * this.config.cellSize + this.config.cellSize / 2 };
      this.lightingSystem?.addSnakeGlow?.(headPos, lvl);
    }
    this.lightingSystem?.render?.(this.gl);
  }

  private renderParticles(): void {
    const camera = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    this.particleSystem?.render?.(camera);
  }

  private handlePowerParticleEffects(result: PowerActivationResult): void {
    if (!this.particleSystem) return;

    const snakeState = this.snakeManager.getSnakeState();
    const headPosition = {
      x: snakeState.head.x * this.config.cellSize + this.config.cellSize / 2,
      y: snakeState.head.y * this.config.cellSize + this.config.cellSize / 2
    };
    const direction = snakeState.direction;

    switch (result.powerType) {
      case PowerType.SpeedBoost:
        this.particleSystem.createSpeedTrailEffect(headPosition, direction);
        break;

      case PowerType.VenomStrike:
        this.particleSystem.createVenomStrikeEffect(headPosition, direction);
        break;

      case PowerType.FireBreath:
        // Create fire breath effect extending in front of snake
        const fireEndPosition = {
          x: headPosition.x + direction.x * 200,
          y: headPosition.y + direction.y * 200
        };
        this.particleSystem.createFireBreathEffect(headPosition, fireEndPosition);
        break;

      case PowerType.TimeWarp:
        this.particleSystem.createTimeWarpEffect(headPosition, 150);
        break;

      case PowerType.ColorChange:
        this.particleSystem.createInvisibilityEffect(headPosition);
        break;

      default:
        // Generic power activation effect
        this.particleSystem.createBurst(headPosition, ParticleType.Sparkle, 5, direction, Math.PI / 3);
        break;
    }

    // Handle environmental destruction effects
    if (result.environmentalInteractions) {
      result.environmentalInteractions.forEach((interaction: any) => {
        const obstacle = this.environmentSystem.getObstacles().find((obs: any) => obs.id === interaction.obstacleId);
        if (obstacle && interaction.type === 'destroy') {
          const obstaclePosition = {
            x: obstacle.position.x * this.config.cellSize + obstacle.size.x * this.config.cellSize / 2,
            y: obstacle.position.y * this.config.cellSize + obstacle.size.y * this.config.cellSize / 2
          };

          // Create destruction effects based on obstacle type
          switch (obstacle.type) {
            case 'CrystalFormation':
              this.particleSystem.createCrystalDestructionEffect(obstaclePosition);
              break;
            case 'IceWall':
              this.particleSystem.createIceDestructionEffect(obstaclePosition);
              break;
            case 'StonePillar':
              this.particleSystem.createStoneDestructionEffect(obstaclePosition);
              break;
            default:
              this.particleSystem.createFlameExplosionEffect(obstaclePosition);
              break;
          }
        }
      });
    }
  }

  private handlePowerLightingEffects(result: PowerActivationResult): void {
    if (!this.lightingSystem) return;

    const snakeState = this.snakeManager.getSnakeState();
    const headPosition = {
      x: snakeState.head.x * this.config.cellSize + this.config.cellSize / 2,
      y: snakeState.head.y * this.config.cellSize + this.config.cellSize / 2
    };

    switch (result.powerType) {
      case PowerType.SpeedBoost:
        this.lightingSystem.addPowerLight(headPosition, [0.0, 0.8, 1.0], 0.6, 150, 3000);
        break;

      case PowerType.VenomStrike:
        this.lightingSystem.addPowerLight(headPosition, [0.6, 0.2, 0.8], 0.8, 200, 2000);
        break;

      case PowerType.FireBreath: {
        // Create fire lighting along the breath path
        const direction = snakeState.direction;
        for (let i = 1; i <= 5; i++) {
          const firePosition = {
            x: headPosition.x + direction.x * i * 40,
            y: headPosition.y + direction.y * i * 40
          };
          this.lightingSystem.addPowerLight(firePosition, [1.0, 0.3, 0.0], 0.9, 120, 1500);
        }
        break;
      }

      case PowerType.TimeWarp:
        this.lightingSystem.addPowerLight(headPosition, [0.8, 0.0, 0.8], 1.0, 300, 5000);
        break;

      case PowerType.ColorChange:
        // Flickering invisibility light
        this.lightingSystem.addFlickeringLight(headPosition, [0.5, 0.5, 1.0], 0.3, 100, 4000);
        break;

      default:
        // Generic power light
        this.lightingSystem.addPowerLight(headPosition, [1.0, 1.0, 0.0], 0.5, 100, 2000);
        break;
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getWebGLContext(): WebGLRenderingContext | null { // ✅
    return this.gl;
  }

  public getConfig(): GameConfig {
    return { ...this.config };
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getSnakeManager(): SnakeManager {
    return this.snakeManager;
  }

  public getVisualPatternManager(): VisualPatternManager {
    return this.visualPatternManager;
  }

  public getEnvironmentSystem(): EnvironmentSystem {
    return this.environmentSystem;
  }

  public getParticleSystem(): ParticleSystem {
    return this.particleSystem;
  }

  public getScoreSystem(): ScoreSystem {
    return this.scoreSystem;
  }

  public getGameStateManager(): GameStateManager {
    return this.gameStateManager;
  }

  private handleTailConsumptionEffects(result: TailConsumptionResult, position: Vector2): void {
    // Create mystical spiral visual effects at the consumption point
    const worldPosition = {
      x: position.x * this.config.cellSize + this.config.cellSize / 2,
      y: position.y * this.config.cellSize + this.config.cellSize / 2
    };

    // Create spiral particle effect
    this.particleSystem.createTailConsumptionEffect(worldPosition, result.segmentsConsumed);

    // Create additional mystical effects for consumed segments
    if (result.consumedSegmentPositions) {
      result.consumedSegmentPositions.forEach((segPos: Vector2, index: number) => {
        const segmentWorldPos = {
          x: segPos.x * this.config.cellSize + this.config.cellSize / 2,
          y: segPos.y * this.config.cellSize + this.config.cellSize / 2
        };

        // Stagger the effects slightly for visual appeal
        this.setTimed(() => {
          this.particleSystem?.createMysticalDissolveEffect?.(segmentWorldPos);
        }, index * 100);
      });
    }
  }

  private applyStrategicAdvantages(advantage: StrategicAdvantage): void {
    // Apply speed boost
    if (advantage.speedBoost) {
      const currentSpeed = this.snakeManager.getSpeed();
      const boostedSpeed = currentSpeed * advantage.speedBoost.multiplier;

      this.snakeManager.setSpeed(boostedSpeed);

      // Reset speed after duration
      this.setTimed(() => {
        this.snakeManager.setSpeed(currentSpeed);
      }, advantage.speedBoost.duration);

      console.log(`Speed boost applied: ${advantage.speedBoost.multiplier}x for ${advantage.speedBoost.duration}ms`);
    }

    // Log other advantages (score system will handle bonus points in later tasks)
    if (advantage.bonusPoints > 0) {
      console.log(`Bonus points awarded: ${advantage.bonusPoints}`);
    }

    if (advantage.navigationBonus !== 'minor') {
      console.log(`Navigation advantage: ${advantage.navigationBonus}`);
    }

    if (advantage.mysticalEnergy > 0) {
      console.log(`Mystical energy gained: ${advantage.mysticalEnergy}`);
    }
  }

  public async loadAssets(manifest: AssetManifest): Promise<boolean> {
    try {
      // Load critical assets first
      const criticalLoaded = await this.assetLoader.preloadCriticalAssets(manifest);
      if (!criticalLoaded) {
        console.warn('Critical assets failed to load, continuing with fallbacks');
      }

      // Load remaining assets in background
      this.assetLoader.loadRemainingAssets(manifest).catch(error => {
        this.errorHandler.handleError({
          type: 'general',
          message: `Background asset loading failed: ${error}`,
          timestamp: Date.now(),
          severity: 'low'
        });
      });

      return true;
    } catch (error) {
      this.errorHandler.handleError({
        type: 'general',
        message: `Asset loading failed: ${error}`,
        timestamp: Date.now(),
        severity: 'medium'
      });
      return false;
    }
  }

  public getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics();
  }

  public getMemoryStats() {
    return this.memoryManager.getMemoryStats();
  }

  public getErrorLog() {
    return this.errorHandler.getErrorLog();
  }

  public getFallbackState() {
    return this.fallbackState;
  }

  public getCurrentQuality() {
    return this.currentQuality;
  }

  public setQuality(quality: Partial<GraphicsQuality>): void {
    Object.assign(this.currentQuality, quality);
    this.applyQualitySettings(this.currentQuality);
  }

  public enableResponsiveMode(onResize?: (viewport: ViewportInfo, canvasSize: { width: number; height: number }) => void): void {
    if (!this.responsiveManager) {
      this.responsiveManager = new ResponsiveManager(this.canvas, this.config);

      this.responsiveManager.onResize = (viewport, canvasSize) => {
        this.handleCanvasResize(canvasSize.width, canvasSize.height);

        // Update touch controls if available
        if (this.inputManager && this.inputManager.isTouchEnabled()) {
          this.inputManager.updateTouchControlPositions(canvasSize.width, canvasSize.height);
          this.inputManager.showVirtualControls(viewport.isMobile);
        }

        if (onResize) {
          onResize(viewport, canvasSize);
        }
      };
    }
  }

  public handleResize(width: number, height: number): void {
    this.handleCanvasResize(width, height);
  }

  private handleCanvasResize(width: number, height: number): void {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    // Update drawing buffer
    this.canvas.width  = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width  = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    this.snakeRenderer?.updateViewport?.(this.canvas.width, this.canvas.height);
    this.environmentRenderer?.updateViewport?.(this.canvas.width, this.canvas.height);
    this.particleSystem?.updateViewport?.(this.canvas.width, this.canvas.height);
    this.lightingSystem?.updateViewport?.(this.canvas.width, this.canvas.height);
  }

  // Helper methods for food and lighting integration
  private isFoodAppropriateForLevel(foodType: FoodType, snakeEvolutionLevel: number): boolean {
    const definition = this.foodManager.getFoodDefinition(foodType);
    if (!definition) return false;

    const levelDifference = Math.abs(definition.evolutionLevel - snakeEvolutionLevel);
    return levelDifference <= 2 && definition.evolutionLevel <= snakeEvolutionLevel + 3;
  }

  private applyFoodEffects(effects: any[]): void {
    // Apply food effects to the snake and game state
    effects.forEach(effect => {
      switch (effect.type) {
        case 'SpeedBoost':
          this.snakeManager.applySpeedModifier(effect.magnitude, effect.duration);
          break;
        case 'SlowDown':
          this.snakeManager.applySpeedModifier(effect.magnitude, effect.duration);
          break;
        case 'Poison':
          // Handle poison effect - could reduce health or cause periodic damage
          console.log(`Poison effect applied: magnitude ${effect.magnitude}, duration ${effect.duration}`);
          break;
        case 'ReversedControls':
          this.inputManager.setReversedControls(true, effect.duration);
          break;
        case 'BlurredVision':
          // Apply visual blur effect
          this.particleSystem.addScreenEffect('blur', effect.duration, effect.magnitude);
          break;
        case 'DisablePowers':
          this.snakeManager.disablePowers(effect.duration);
          break;
        case 'Invincibility':
          this.snakeManager.setInvincibility(true, effect.duration);
          break;
        case 'Regeneration':
          this.snakeManager.enableRegeneration(effect.duration, effect.magnitude);
          break;
        case 'PowerCooldownReduction':
          this.snakeManager.reducePowerCooldowns(effect.magnitude, effect.duration);
          break;
        case 'DoublePoints':
          this.scoreSystem.setPointsMultiplier(effect.magnitude, effect.duration);
          break;
        case 'TimeWarp':
          // Slow down time for everything except the snake
          this.applyTimeWarpEffect(effect.magnitude, effect.duration);
          break;
        default:
          console.log(`Unknown food effect: ${effect.type}`);
      }
    });
  }

  private applyTimeWarpEffect(magnitude: number, duration: number): void {
    // Slow down environment and particle systems
    this.environmentSystem.setTimeScale(magnitude);
    this.particleSystem.setTimeScale(magnitude);

    // Reset time scale after duration
    this.setTimed(() => {
      this.environmentSystem.setTimeScale(1.0);
      this.particleSystem?.setTimeScale?.(1.0);
    }, duration);
  }

  private getFoodLightColor(foodType: FoodType): [number, number, number] {
    switch (foodType) {
      case FoodType.CrystalFruit:
        return [0.5, 0.8, 1.0]; // Light blue
      case FoodType.VenomousFlower:
        return [0.6, 0.2, 0.8]; // Purple
      case FoodType.RainbowNectar:
        return [1.0, 0.4, 0.7]; // Pink
      case FoodType.StardustBerry:
        return [0.3, 0.0, 0.5]; // Deep purple
      case FoodType.DragonScale:
        return [0.9, 0.1, 0.1]; // Red
      case FoodType.EternalOrb:
        return [1.0, 0.8, 0.0]; // Gold
      case FoodType.OuroborosEssence:
        return [0.5, 0.0, 0.5]; // Mystical purple
      default:
        return [1.0, 1.0, 1.0]; // White
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    let h = hex.trim();
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return { r: r / 255, g: g / 255, b: b / 255 };
  }

  private triggerGameOver(deathReason: DeathReason): void {
    const evolutionLevel = this.snakeManager.getEvolutionSystem().getCurrentLevel();
    const snakeState = this.snakeManager.getSnakeState();

    // Play game over sound
    this.audioManager.playGameOver();

    // Stop background audio
    this.audioManager.stopBackgroundAudio();

    // Create death particle effects
    const deathPosition = {
      x: snakeState.head.x * this.config.cellSize + this.config.cellSize / 2,
      y: snakeState.head.y * this.config.cellSize + this.config.cellSize / 2
    };
    this.particleSystem.createDeathEffect(deathPosition, evolutionLevel);

    // Add dramatic lighting for death
    this.lightingSystem.addDeathLighting(deathPosition);

    this.gameStateManager.triggerGameOver(
      deathReason,
      evolutionLevel,
      { x: snakeState.head.x, y: snakeState.head.y }
    );
  }

  // Public getters for integrated systems
  public getFoodManager(): FoodManager {
    return this.foodManager;
  }

  public getAudioManager(): AudioManager {
    return this.audioManager;
  }

  public getLightingSystem(): LightingSystem {
    return this.lightingSystem;
  }

  // Enhanced dispose method
  // Helper method to track timeouts for cleanup
  private timers: number[] = [];

  private setTimed(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      this.timers = this.timers.filter(t => t !== id);
      fn();
    }, ms);
    this.timers.push(id);
  }

  public dispose(): void {
    this.stop();
    this.timers.forEach(id => clearTimeout(id));
    this.timers = [];

    // Dispose of all systems
    if (this.audioManager) {
      this.audioManager.dispose();
    }

    if (this.particleSystem) {
      this.particleSystem.dispose();
    }

    if (this.lightingSystem) {
      this.lightingSystem.dispose();
    }

    if (this.memoryManager) {
      this.memoryManager.dispose();
    }

    // Clear WebGL context
    if (this.gl && this.gl.getExtension('WEBGL_lose_context')) {
      this.gl.getExtension('WEBGL_lose_context')!.loseContext();
    }
  }

  public getBrowserCompatibility(): BrowserCompatibility {
    return this.browserCompatibility;
  }

  public getResponsiveManager(): ResponsiveManager | undefined {
    return this.responsiveManager;
  }

}