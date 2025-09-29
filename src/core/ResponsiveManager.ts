import { GameConfig } from '../types/game';

export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  isMobile: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
}

export interface ResponsiveConfig {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  aspectRatio: number;
  scaleFactor: number;
}

export class ResponsiveManager {
  private canvas: HTMLCanvasElement;
  private config: GameConfig;
  private responsiveConfig: ResponsiveConfig;
  private resizeObserver?: ResizeObserver;
  private orientationChangeHandler: () => void;
  private resizeHandler: () => void;
  
  public onResize?: (viewport: ViewportInfo, canvasSize: { width: number; height: number }) => void;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.config = config;
    
    // Calculate responsive configuration based on game grid
    const baseWidth = config.gridWidth * config.cellSize;
    const baseHeight = config.gridHeight * config.cellSize;
    
    this.responsiveConfig = {
      minWidth: Math.min(320, baseWidth * 0.5), // Minimum mobile width
      minHeight: Math.min(480, baseHeight * 0.5), // Minimum mobile height
      maxWidth: baseWidth * 1.5, // Maximum desktop width
      maxHeight: baseHeight * 1.5, // Maximum desktop height
      aspectRatio: baseWidth / baseHeight, // Maintain game aspect ratio
      scaleFactor: 1.0
    };

    // Bind event handlers
    this.orientationChangeHandler = this.handleOrientationChange.bind(this);
    this.resizeHandler = this.handleResize.bind(this);

    this.setupResponsiveCanvas();
    this.attachEventListeners();
  }

  private setupResponsiveCanvas(): void {
    // Set initial canvas size
    this.updateCanvasSize();
    
    // Setup ResizeObserver for modern browsers
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.canvas.parentElement || document.body);
    }
  }

  private attachEventListeners(): void {
    // Handle window resize
    window.addEventListener('resize', this.resizeHandler, { passive: true });
    
    // Handle orientation change (mobile)
    window.addEventListener('orientationchange', this.orientationChangeHandler, { passive: true });
    
    // Handle viewport changes (mobile browsers)
    if ('visualViewport' in window) {
      window.visualViewport?.addEventListener('resize', this.resizeHandler, { passive: true });
    }
  }

  private handleResize(): void {
    // Debounce resize events
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.updateCanvasSize();
    }, 100);
  }

  private resizeTimeout?: number;

  private handleOrientationChange(): void {
    // Wait for orientation change to complete
    setTimeout(() => {
      this.updateCanvasSize();
    }, 200);
  }

  private updateCanvasSize(): void {
    const viewport = this.getViewportInfo();
    const canvasSize = this.calculateOptimalCanvasSize(viewport);
    
    // Update canvas dimensions
    this.canvas.width = canvasSize.width;
    this.canvas.height = canvasSize.height;
    
    // Update CSS dimensions for proper scaling
    this.canvas.style.width = `${canvasSize.displayWidth}px`;
    this.canvas.style.height = `${canvasSize.displayHeight}px`;
    
    // Update scale factor for coordinate conversion
    this.responsiveConfig.scaleFactor = canvasSize.width / (this.config.gridWidth * this.config.cellSize);
    
    // Notify listeners
    if (this.onResize) {
      this.onResize(viewport, {
        width: canvasSize.width,
        height: canvasSize.height
      });
    }
  }

  private getViewportInfo(): ViewportInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (width <= 768 && 'ontouchstart' in window);
    const isTablet = isMobile && Math.min(width, height) >= 768;
    
    // Determine orientation
    const orientation = width > height ? 'landscape' : 'portrait';
    
    return {
      width,
      height,
      devicePixelRatio,
      isMobile,
      isTablet,
      orientation
    };
  }

  private calculateOptimalCanvasSize(viewport: ViewportInfo): {
    width: number;
    height: number;
    displayWidth: number;
    displayHeight: number;
  } {
    const { width: viewportWidth, height: viewportHeight, devicePixelRatio, isMobile } = viewport;
    
    // Calculate available space (accounting for UI elements)
    const availableWidth = viewportWidth * (isMobile ? 0.95 : 0.9);
    const availableHeight = viewportHeight * (isMobile ? 0.85 : 0.9); // Leave space for mobile UI
    
    // Calculate size maintaining aspect ratio
    let displayWidth = availableWidth;
    let displayHeight = displayWidth / this.responsiveConfig.aspectRatio;
    
    // If height exceeds available space, scale by height instead
    if (displayHeight > availableHeight) {
      displayHeight = availableHeight;
      displayWidth = displayHeight * this.responsiveConfig.aspectRatio;
    }
    
    // Apply constraints
    displayWidth = Math.max(this.responsiveConfig.minWidth, 
                           Math.min(this.responsiveConfig.maxWidth, displayWidth));
    displayHeight = Math.max(this.responsiveConfig.minHeight, 
                            Math.min(this.responsiveConfig.maxHeight, displayHeight));
    
    // Calculate actual canvas size (accounting for device pixel ratio)
    const canvasWidth = Math.floor(displayWidth * devicePixelRatio);
    const canvasHeight = Math.floor(displayHeight * devicePixelRatio);
    
    return {
      width: canvasWidth,
      height: canvasHeight,
      displayWidth,
      displayHeight
    };
  }

  public getScaleFactor(): number {
    return this.responsiveConfig.scaleFactor;
  }

  public convertScreenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (screenX - rect.left) * scaleX,
      y: (screenY - rect.top) * scaleY
    };
  }

  public convertCanvasToGrid(canvasX: number, canvasY: number): { x: number; y: number } {
    const cellSize = this.config.cellSize * this.responsiveConfig.scaleFactor;
    return {
      x: Math.floor(canvasX / cellSize),
      y: Math.floor(canvasY / cellSize)
    };
  }

  public getCurrentViewportInfo(): ViewportInfo {
    return this.getViewportInfo();
  }

  public destroy(): void {
    // Remove event listeners
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.orientationChangeHandler);
    
    if ('visualViewport' in window) {
      window.visualViewport?.removeEventListener('resize', this.resizeHandler);
    }
    
    // Disconnect ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Clear timeout
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }
}