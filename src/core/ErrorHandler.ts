export interface ErrorReport {
  type: 'webgl' | 'audio' | 'memory' | 'performance' | 'general';
  message: string;
  stack?: string;
  timestamp: number;
  context?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface FallbackState {
  webglFallback: boolean;
  audioFallback: boolean;
  reducedEffects: boolean;
  lowQualityMode: boolean;
}

export class ErrorHandler {
  private errorLog: ErrorReport[] = [];
  private maxLogSize = 100;
  private fallbackState: FallbackState = {
    webglFallback: false,
    audioFallback: false,
    reducedEffects: false,
    lowQualityMode: false
  };
  
  private onFallbackChange?: (state: FallbackState) => void;
  private onCriticalError?: (error: ErrorReport) => void;
  
  constructor() {
    this.setupGlobalErrorHandlers();
  }
  
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'general',
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        severity: 'high'
      });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'general',
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: Date.now(),
        context: { reason: event.reason },
        severity: 'medium'
      });
    });
  }
  
  public setFallbackChangeCallback(callback: (state: FallbackState) => void): void {
    this.onFallbackChange = callback;
  }
  
  public setCriticalErrorCallback(callback: (error: ErrorReport) => void): void {
    this.onCriticalError = callback;
  }
  
  public handleError(error: ErrorReport): void {
    // Add to error log
    this.errorLog.push(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    console.error(`[${error.type.toUpperCase()}] ${error.message}`, error);
    
    // Handle specific error types
    switch (error.type) {
      case 'webgl':
        this.handleWebGLError(error);
        break;
      case 'audio':
        this.handleAudioError(error);
        break;
      case 'memory':
        this.handleMemoryError(error);
        break;
      case 'performance':
        this.handlePerformanceError(error);
        break;
    }
    
    // Handle critical errors
    if (error.severity === 'critical' && this.onCriticalError) {
      this.onCriticalError(error);
    }
  }
  
  private handleWebGLError(error: ErrorReport): void {
    if (!this.fallbackState.webglFallback) {
      console.warn('WebGL error detected, enabling fallback mode');
      this.fallbackState.webglFallback = true;
      this.fallbackState.reducedEffects = true;
      this.notifyFallbackChange();
    }
  }
  
  private handleAudioError(error: ErrorReport): void {
    if (!this.fallbackState.audioFallback) {
      console.warn('Audio error detected, enabling silent fallback mode');
      this.fallbackState.audioFallback = true;
      this.notifyFallbackChange();
    }
  }
  
  private handleMemoryError(error: ErrorReport): void {
    console.warn('Memory error detected, enabling low quality mode');
    this.fallbackState.lowQualityMode = true;
    this.fallbackState.reducedEffects = true;
    this.notifyFallbackChange();
  }
  
  private handlePerformanceError(error: ErrorReport): void {
    if (!this.fallbackState.lowQualityMode) {
      console.warn('Performance error detected, reducing quality');
      this.fallbackState.reducedEffects = true;
      this.notifyFallbackChange();
    }
  }
  
  private notifyFallbackChange(): void {
    if (this.onFallbackChange) {
      this.onFallbackChange({ ...this.fallbackState });
    }
  }
  
  public getFallbackState(): FallbackState {
    return { ...this.fallbackState };
  }
  
  public getErrorLog(): ErrorReport[] {
    return [...this.errorLog];
  }
  
  public getErrorsByType(type: ErrorReport['type']): ErrorReport[] {
    return this.errorLog.filter(error => error.type === type);
  }
  
  public getRecentErrors(minutes = 5): ErrorReport[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.errorLog.filter(error => error.timestamp > cutoff);
  }
  
  public clearErrorLog(): void {
    this.errorLog = [];
  }
  
  public checkWebGLSupport(gl: WebGLRenderingContext | null): boolean {
    try {
      if (!gl) {
        this.handleError({
          type: 'webgl',
          message: 'WebGL context is null',
          timestamp: Date.now(),
          severity: 'critical'
        });
        return false;
      }
      
      // Test basic WebGL functionality
      const testTexture = gl.createTexture();
      if (!testTexture) {
        this.handleError({
          type: 'webgl',
          message: 'Failed to create WebGL texture',
          timestamp: Date.now(),
          severity: 'high'
        });
        return false;
      }
      
      gl.deleteTexture(testTexture);
      return true;
    } catch (error) {
      this.handleError({
        type: 'webgl',
        message: `WebGL support check failed: ${error}`,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
        severity: 'critical'
      });
      return false;
    }
  }
  
  public checkAudioSupport(): boolean {
    try {
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        this.handleError({
          type: 'audio',
          message: 'Web Audio API not supported',
          timestamp: Date.now(),
          severity: 'medium'
        });
        return false;
      }
      
      // Test audio context creation
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const testContext = new AudioContextClass();
      testContext.close();
      
      return true;
    } catch (error) {
      this.handleError({
        type: 'audio',
        message: `Audio support check failed: ${error}`,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
        severity: 'medium'
      });
      return false;
    }
  }
  
  public wrapAsyncOperation<T>(
    operation: () => Promise<T>,
    errorType: ErrorReport['type'],
    context?: any
  ): Promise<T | null> {
    return operation().catch(error => {
      this.handleError({
        type: errorType,
        message: `Async operation failed: ${error.message || error}`,
        stack: error.stack,
        timestamp: Date.now(),
        context,
        severity: 'medium'
      });
      return null;
    });
  }
  
  public wrapSyncOperation<T>(
    operation: () => T,
    errorType: ErrorReport['type'],
    context?: any,
    fallbackValue?: T
  ): T | null {
    try {
      return operation();
    } catch (error) {
      this.handleError({
        type: errorType,
        message: `Sync operation failed: ${error instanceof Error ? error.message : error}`,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
        context,
        severity: 'medium'
      });
      return fallbackValue ?? null;
    }
  }
  
  public createSafeWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
    try {
      const contextOptions = {
        alpha: false,
        antialias: true,
        depth: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default' as WebGLPowerPreference,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        stencil: false
      };
      
      let gl = canvas.getContext('webgl', contextOptions) || 
               canvas.getContext('experimental-webgl', contextOptions);
      
      if (!gl) {
        // Try with reduced options
        gl = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
             canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false });
      }
      
      if (gl && this.checkWebGLSupport(gl)) {
        return gl as WebGLRenderingContext;
      }
      
      return null;
    } catch (error) {
      this.handleError({
        type: 'webgl',
        message: `Failed to create WebGL context: ${error}`,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
        severity: 'critical'
      });
      return null;
    }
  }
}