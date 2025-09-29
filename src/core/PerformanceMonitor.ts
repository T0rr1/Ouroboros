export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  particleCount: number;
  renderCalls: number;
  audioLatency: number;
}

export interface GraphicsQuality {
  particleQuality: 'low' | 'medium' | 'high';
  lightingQuality: 'low' | 'medium' | 'high';
  textureQuality: 'low' | 'medium' | 'high';
  shadowQuality: 'low' | 'medium' | 'high';
  effectsEnabled: boolean;
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimeHistory: number[] = [];
  private readonly HISTORY_SIZE = 60; // 1 second at 60 FPS
  private readonly TARGET_FPS = 60;
  private readonly MIN_ACCEPTABLE_FPS = 45;
  private readonly FRAME_DROP_THRESHOLD = 5;
  
  private currentMetrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    particleCount: 0,
    renderCalls: 0,
    audioLatency: 0
  };
  
  private currentQuality: GraphicsQuality = {
    particleQuality: 'high',
    lightingQuality: 'high',
    textureQuality: 'high',
    shadowQuality: 'high',
    effectsEnabled: true
  };
  
  private frameDropCount = 0;
  private qualityAdjustmentCooldown = 0;
  private readonly QUALITY_ADJUSTMENT_COOLDOWN = 3000; // 3 seconds
  
  private onQualityChange?: (quality: GraphicsQuality) => void;
  
  public setQualityChangeCallback(callback: (quality: GraphicsQuality) => void): void {
    this.onQualityChange = callback;
  }
  
  public startFrame(): void {
    this.lastFrameTime = performance.now();
  }
  
  public endFrame(): void {
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }
    
    this.frameCount++;
    
    // Calculate FPS from frame time history
    if (this.frameTimeHistory.length >= 10) {
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      this.currentMetrics.fps = 1000 / avgFrameTime;
      this.currentMetrics.frameTime = avgFrameTime;
      
      this.checkPerformanceAndAdjustQuality();
    }
  }
  
  private checkPerformanceAndAdjustQuality(): void {
    if (this.qualityAdjustmentCooldown > 0) {
      this.qualityAdjustmentCooldown -= this.currentMetrics.frameTime;
      return;
    }
    
    if (this.currentMetrics.fps < this.MIN_ACCEPTABLE_FPS) {
      this.frameDropCount++;
      
      if (this.frameDropCount >= this.FRAME_DROP_THRESHOLD) {
        this.reduceGraphicsQuality();
        this.frameDropCount = 0;
        this.qualityAdjustmentCooldown = this.QUALITY_ADJUSTMENT_COOLDOWN;
      }
    } else if (this.currentMetrics.fps > this.TARGET_FPS + 5) {
      // Performance is good, potentially increase quality
      this.frameDropCount = Math.max(0, this.frameDropCount - 1);
      
      if (this.frameDropCount === 0 && this.canIncreaseQuality()) {
        this.increaseGraphicsQuality();
        this.qualityAdjustmentCooldown = this.QUALITY_ADJUSTMENT_COOLDOWN;
      }
    } else {
      this.frameDropCount = Math.max(0, this.frameDropCount - 1);
    }
  }
  
  private reduceGraphicsQuality(): void {
    let qualityReduced = false;
    
    if (this.currentQuality.shadowQuality !== 'low') {
      this.currentQuality.shadowQuality = this.currentQuality.shadowQuality === 'high' ? 'medium' : 'low';
      qualityReduced = true;
    } else if (this.currentQuality.particleQuality !== 'low') {
      this.currentQuality.particleQuality = this.currentQuality.particleQuality === 'high' ? 'medium' : 'low';
      qualityReduced = true;
    } else if (this.currentQuality.lightingQuality !== 'low') {
      this.currentQuality.lightingQuality = this.currentQuality.lightingQuality === 'high' ? 'medium' : 'low';
      qualityReduced = true;
    } else if (this.currentQuality.effectsEnabled) {
      this.currentQuality.effectsEnabled = false;
      qualityReduced = true;
    } else if (this.currentQuality.textureQuality !== 'low') {
      this.currentQuality.textureQuality = this.currentQuality.textureQuality === 'high' ? 'medium' : 'low';
      qualityReduced = true;
    }
    
    if (qualityReduced && this.onQualityChange) {
      console.warn('Performance degraded, reducing graphics quality:', this.currentQuality);
      this.onQualityChange(this.currentQuality);
    }
  }
  
  private increaseGraphicsQuality(): void {
    let qualityIncreased = false;
    
    if (this.currentQuality.textureQuality !== 'high') {
      this.currentQuality.textureQuality = this.currentQuality.textureQuality === 'low' ? 'medium' : 'high';
      qualityIncreased = true;
    } else if (!this.currentQuality.effectsEnabled) {
      this.currentQuality.effectsEnabled = true;
      qualityIncreased = true;
    } else if (this.currentQuality.lightingQuality !== 'high') {
      this.currentQuality.lightingQuality = this.currentQuality.lightingQuality === 'low' ? 'medium' : 'high';
      qualityIncreased = true;
    } else if (this.currentQuality.particleQuality !== 'high') {
      this.currentQuality.particleQuality = this.currentQuality.particleQuality === 'low' ? 'medium' : 'high';
      qualityIncreased = true;
    } else if (this.currentQuality.shadowQuality !== 'high') {
      this.currentQuality.shadowQuality = this.currentQuality.shadowQuality === 'low' ? 'medium' : 'high';
      qualityIncreased = true;
    }
    
    if (qualityIncreased && this.onQualityChange) {
      console.log('Performance improved, increasing graphics quality:', this.currentQuality);
      this.onQualityChange(this.currentQuality);
    }
  }
  
  private canIncreaseQuality(): boolean {
    return this.currentQuality.textureQuality !== 'high' ||
           !this.currentQuality.effectsEnabled ||
           this.currentQuality.lightingQuality !== 'high' ||
           this.currentQuality.particleQuality !== 'high' ||
           this.currentQuality.shadowQuality !== 'high';
  }
  
  public updateMetrics(metrics: Partial<PerformanceMetrics>): void {
    Object.assign(this.currentMetrics, metrics);
  }
  
  public getMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics };
  }
  
  public getQuality(): GraphicsQuality {
    return { ...this.currentQuality };
  }
  
  public setQuality(quality: Partial<GraphicsQuality>): void {
    Object.assign(this.currentQuality, quality);
    if (this.onQualityChange) {
      this.onQualityChange(this.currentQuality);
    }
  }
  
  public getMemoryUsage(): number {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return memInfo.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }
  
  public reset(): void {
    this.frameCount = 0;
    this.frameTimeHistory = [];
    this.frameDropCount = 0;
    this.qualityAdjustmentCooldown = 0;
    this.currentMetrics = {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      particleCount: 0,
      renderCalls: 0,
      audioLatency: 0
    };
  }
}