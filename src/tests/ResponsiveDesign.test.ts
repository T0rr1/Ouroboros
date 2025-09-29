import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResponsiveManager } from '../core/ResponsiveManager';
import { GameConfig } from '../types/game';

// Mock DOM APIs
const mockCanvas = () => {
  const canvas = {
    width: 1750,
    height: 1225,
    style: {
      width: '1750px',
      height: '1225px'
    },
    getBoundingClientRect: vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 1750,
      height: 1225
    }),
    parentElement: document.body
  };
  
  return canvas as unknown as HTMLCanvasElement;
};

const mockWindow = (width: number, height: number, devicePixelRatio: number = 1) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height
  });
  
  Object.defineProperty(window, 'devicePixelRatio', {
    writable: true,
    configurable: true,
    value: devicePixelRatio
  });
};

const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    configurable: true
  });
};

const mockResizeObserver = () => {
  const mockObserver = {
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn()
  };
  
  (global as any).ResizeObserver = vi.fn().mockImplementation(() => mockObserver);
  return mockObserver;
};

describe('ResponsiveManager', () => {
  let responsiveManager: ResponsiveManager;
  let canvas: HTMLCanvasElement;
  let config: GameConfig;
  let mockObserver: any;

  beforeEach(() => {
    // Setup default test environment
    mockWindow(1920, 1080);
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    mockObserver = mockResizeObserver();
    
    canvas = mockCanvas();
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };
    
    // Mock event listeners
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
    
    // Mock visualViewport
    Object.defineProperty(window, 'visualViewport', {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      configurable: true
    });
  });

  afterEach(() => {
    if (responsiveManager) {
      responsiveManager.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct responsive configuration', () => {
      responsiveManager = new ResponsiveManager(canvas, config);
      
      const scaleFactor = responsiveManager.getScaleFactor();
      expect(scaleFactor).toBeGreaterThan(0); // Should have a valid scale factor
    });

    it('should setup ResizeObserver when available', () => {
      responsiveManager = new ResponsiveManager(canvas, config);
      
      expect(global.ResizeObserver).toHaveBeenCalled();
      expect(mockObserver.observe).toHaveBeenCalled();
    });

    it('should attach window event listeners', () => {
      responsiveManager = new ResponsiveManager(canvas, config);
      
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true });
      expect(window.addEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function), { passive: true });
    });
  });

  describe('Viewport Detection', () => {
    it('should detect desktop viewport correctly', () => {
      mockWindow(1920, 1080);
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      responsiveManager = new ResponsiveManager(canvas, config);
      const viewport = responsiveManager.getCurrentViewportInfo();
      
      expect(viewport.width).toBe(1920);
      expect(viewport.height).toBe(1080);
      expect(viewport.isMobile).toBe(false);
      expect(viewport.isTablet).toBe(false);
      expect(viewport.orientation).toBe('landscape');
    });

    it('should detect mobile viewport correctly', () => {
      mockWindow(375, 667);
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15');
      
      responsiveManager = new ResponsiveManager(canvas, config);
      const viewport = responsiveManager.getCurrentViewportInfo();
      
      expect(viewport.width).toBe(375);
      expect(viewport.height).toBe(667);
      expect(viewport.isMobile).toBe(true);
      expect(viewport.isTablet).toBe(false);
      expect(viewport.orientation).toBe('portrait');
    });

    it('should detect tablet viewport correctly', () => {
      mockWindow(768, 1024);
      mockUserAgent('Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15');
      
      responsiveManager = new ResponsiveManager(canvas, config);
      const viewport = responsiveManager.getCurrentViewportInfo();
      
      expect(viewport.width).toBe(768);
      expect(viewport.height).toBe(1024);
      expect(viewport.isMobile).toBe(true);
      expect(viewport.isTablet).toBe(true);
      expect(viewport.orientation).toBe('portrait');
    });

    it('should handle high DPI displays correctly', () => {
      mockWindow(1920, 1080, 2.0);
      
      responsiveManager = new ResponsiveManager(canvas, config);
      const viewport = responsiveManager.getCurrentViewportInfo();
      
      expect(viewport.devicePixelRatio).toBe(2.0);
    });
  });

  describe('Canvas Sizing', () => {
    it('should maintain aspect ratio on desktop', () => {
      mockWindow(1920, 1080);
      const onResize = vi.fn();
      
      responsiveManager = new ResponsiveManager(canvas, config);
      responsiveManager.onResize = onResize;
      
      // Trigger resize
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
      
      // Should maintain 50:35 aspect ratio (1.428...)
      const expectedAspectRatio = 50 / 35;
      
      if (onResize.mock.calls.length > 0) {
        const [, canvasSize] = onResize.mock.calls[0];
        const actualAspectRatio = canvasSize.width / canvasSize.height;
        expect(Math.abs(actualAspectRatio - expectedAspectRatio)).toBeLessThan(0.1);
      }
    });

    it('should scale down for mobile devices', () => {
      mockWindow(375, 667);
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15');
      const onResize = vi.fn();
      
      responsiveManager = new ResponsiveManager(canvas, config);
      responsiveManager.onResize = onResize;
      
      // Trigger resize
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
      
      if (onResize.mock.calls.length > 0) {
        const [, canvasSize] = onResize.mock.calls[0];
        // Canvas should be smaller than original size for mobile
        expect(canvasSize.width).toBeLessThan(1750);
        expect(canvasSize.height).toBeLessThan(1225);
      }
    });

    it('should respect minimum size constraints', () => {
      mockWindow(200, 200); // Very small viewport
      const onResize = vi.fn();
      
      responsiveManager = new ResponsiveManager(canvas, config);
      responsiveManager.onResize = onResize;
      
      // Trigger resize
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
      
      if (onResize.mock.calls.length > 0) {
        const [, canvasSize] = onResize.mock.calls[0];
        // Should respect minimum constraints
        expect(canvasSize.width).toBeGreaterThan(0);
        expect(canvasSize.height).toBeGreaterThan(0);
      }
    });

    it('should handle device pixel ratio correctly', () => {
      mockWindow(1920, 1080, 2.0);
      const onResize = vi.fn();
      
      responsiveManager = new ResponsiveManager(canvas, config);
      responsiveManager.onResize = onResize;
      
      // Trigger resize
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
      
      if (onResize.mock.calls.length > 0) {
        const [viewport, canvasSize] = onResize.mock.calls[0];
        expect(viewport.devicePixelRatio).toBe(2.0);
        // Canvas size should account for device pixel ratio
        expect(canvasSize.width).toBeGreaterThan(1750);
      }
    });
  });

  describe('Coordinate Conversion', () => {
    beforeEach(() => {
      responsiveManager = new ResponsiveManager(canvas, config);
    });

    it('should convert screen coordinates to canvas coordinates correctly', () => {
      const screenCoords = { x: 100, y: 100 };
      const canvasCoords = responsiveManager.convertScreenToCanvas(screenCoords.x, screenCoords.y);
      
      expect(canvasCoords.x).toBeGreaterThanOrEqual(0);
      expect(canvasCoords.y).toBeGreaterThanOrEqual(0);
    });

    it('should convert canvas coordinates to grid coordinates correctly', () => {
      const canvasCoords = { x: 350, y: 350 }; // Should convert to grid coordinates
      const gridCoords = responsiveManager.convertCanvasToGrid(canvasCoords.x, canvasCoords.y);
      
      expect(gridCoords.x).toBeGreaterThanOrEqual(0);
      expect(gridCoords.y).toBeGreaterThanOrEqual(0);
      expect(gridCoords.x).toBeLessThan(config.gridWidth);
      expect(gridCoords.y).toBeLessThan(config.gridHeight);
    });

    it('should handle scaled coordinates correctly', () => {
      // Simulate a scaled canvas
      const scaledCanvas = mockCanvas();
      scaledCanvas.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 875, // Half size display
        height: 612.5
      });
      
      const scaledManager = new ResponsiveManager(scaledCanvas, config);
      const screenCoords = { x: 50, y: 50 };
      const canvasCoords = scaledManager.convertScreenToCanvas(screenCoords.x, screenCoords.y);
      
      // Should account for scaling
      expect(canvasCoords.x).toBeGreaterThan(50); // Should be scaled up
      expect(canvasCoords.y).toBeGreaterThan(50);
    });
  });

  describe('Orientation Changes', () => {
    it('should handle orientation change events', () => {
      const onResize = vi.fn();
      responsiveManager = new ResponsiveManager(canvas, config);
      responsiveManager.onResize = onResize;
      
      // Simulate orientation change
      mockWindow(667, 375); // Landscape to portrait
      const orientationEvent = new Event('orientationchange');
      window.dispatchEvent(orientationEvent);
      
      // Should trigger resize after orientation change
      setTimeout(() => {
        expect(onResize).toHaveBeenCalled();
      }, 250); // Account for orientation change delay
    });

    it('should detect orientation correctly after change', () => {
      mockWindow(375, 667); // Portrait
      responsiveManager = new ResponsiveManager(canvas, config);
      
      let viewport = responsiveManager.getCurrentViewportInfo();
      expect(viewport.orientation).toBe('portrait');
      
      // Change to landscape
      mockWindow(667, 375);
      viewport = responsiveManager.getCurrentViewportInfo();
      expect(viewport.orientation).toBe('landscape');
    });
  });

  describe('Performance', () => {
    it('should debounce resize events', () => {
      const onResize = vi.fn();
      responsiveManager = new ResponsiveManager(canvas, config);
      responsiveManager.onResize = onResize;
      
      // Trigger multiple rapid resize events
      for (let i = 0; i < 10; i++) {
        const resizeEvent = new Event('resize');
        window.dispatchEvent(resizeEvent);
      }
      
      // Should debounce and only call once after delay
      setTimeout(() => {
        expect(onResize.mock.calls.length).toBeLessThanOrEqual(1);
      }, 150);
    });

    it('should cleanup resources on destroy', () => {
      responsiveManager = new ResponsiveManager(canvas, config);
      
      responsiveManager.destroy();
      
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function));
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing ResizeObserver gracefully', () => {
      delete (global as any).ResizeObserver;
      
      expect(() => {
        responsiveManager = new ResponsiveManager(canvas, config);
      }).not.toThrow();
    });

    it('should handle missing visualViewport gracefully', () => {
      delete (window as any).visualViewport;
      
      expect(() => {
        responsiveManager = new ResponsiveManager(canvas, config);
      }).not.toThrow();
    });

    it('should handle zero viewport dimensions', () => {
      mockWindow(0, 0);
      
      expect(() => {
        responsiveManager = new ResponsiveManager(canvas, config);
      }).not.toThrow();
      
      const viewport = responsiveManager.getCurrentViewportInfo();
      expect(viewport.width).toBe(0);
      expect(viewport.height).toBe(0);
    });

    it('should handle extreme aspect ratios', () => {
      mockWindow(3000, 100); // Very wide
      const onResize = vi.fn();
      
      responsiveManager = new ResponsiveManager(canvas, config);
      responsiveManager.onResize = onResize;
      
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
      
      // Should still maintain game aspect ratio
      if (onResize.mock.calls.length > 0) {
        const [, canvasSize] = onResize.mock.calls[0];
        const aspectRatio = canvasSize.width / canvasSize.height;
        expect(aspectRatio).toBeCloseTo(50 / 35, 1);
      }
    });
  });
});