import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserCompatibility } from '../core/BrowserCompatibility';

// Mock browser APIs for testing
const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    configurable: true
  });
};

const mockWebGL = (supported: boolean) => {
  const mockCanvas = {
    getContext: vi.fn().mockReturnValue(supported ? {} : null)
  };
  
  global.document.createElement = vi.fn().mockReturnValue(mockCanvas);
};

const mockWebAudio = (supported: boolean) => {
  if (supported) {
    (global as any).AudioContext = vi.fn();
    (global as any).webkitAudioContext = vi.fn();
  } else {
    delete (global as any).AudioContext;
    delete (global as any).webkitAudioContext;
  }
};

const mockLocalStorage = (supported: boolean) => {
  if (supported) {
    const mockStorage = {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(global, 'localStorage', {
      value: mockStorage,
      configurable: true
    });
  } else {
    Object.defineProperty(global, 'localStorage', {
      value: undefined,
      configurable: true
    });
  }
};

describe('BrowserCompatibility', () => {
  let compatibility: BrowserCompatibility;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Set default browser environment
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    mockWebGL(true);
    mockWebAudio(true);
    mockLocalStorage(true);
    
    // Mock other APIs
    (global as any).ResizeObserver = vi.fn();
    (global as any).IntersectionObserver = vi.fn();
    global.requestAnimationFrame = vi.fn();
    global.performance = { now: vi.fn() };
  });

  it('should create instance without errors', () => {
    expect(() => {
      compatibility = new BrowserCompatibility();
    }).not.toThrow();
  });

  describe('Browser Detection', () => {
    it('should detect Chrome browser correctly', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      compatibility = new BrowserCompatibility();
      
      const browserInfo = compatibility.getBrowserInfo();
      expect(browserInfo.name).toBe('Chrome');
      expect(browserInfo.version).toBe('91');
      expect(browserInfo.engine).toBe('Blink');
    });

    it('should detect Firefox browser correctly', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0');
      compatibility = new BrowserCompatibility();
      
      const browserInfo = compatibility.getBrowserInfo();
      expect(browserInfo.name).toBe('Firefox');
      expect(browserInfo.version).toBe('89');
      expect(browserInfo.engine).toBe('Gecko');
    });

    it('should detect Safari browser correctly', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15');
      compatibility = new BrowserCompatibility();
      
      const browserInfo = compatibility.getBrowserInfo();
      expect(browserInfo.name).toBe('Safari');
      expect(browserInfo.version).toBe('14');
      expect(browserInfo.engine).toBe('WebKit');
    });

    it('should detect Edge browser correctly', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59');
      compatibility = new BrowserCompatibility();
      
      const browserInfo = compatibility.getBrowserInfo();
      expect(browserInfo.name).toBe('Edge');
      expect(browserInfo.version).toBe('91');
      expect(browserInfo.engine).toBe('Blink');
    });

    it('should detect mobile devices correctly', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
      compatibility = new BrowserCompatibility();
      
      const browserInfo = compatibility.getBrowserInfo();
      expect(browserInfo.isMobile).toBe(true);
      expect(browserInfo.isTablet).toBe(false);
    });

    it('should detect tablet devices correctly', () => {
      mockUserAgent('Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
      compatibility = new BrowserCompatibility();
      
      const browserInfo = compatibility.getBrowserInfo();
      expect(browserInfo.isMobile).toBe(true);
      expect(browserInfo.isTablet).toBe(true);
    });
  });

  describe('Feature Detection', () => {
    it('should detect WebGL support correctly', () => {
      mockWebGL(true);
      compatibility = new BrowserCompatibility();
      
      const features = compatibility.getFeatures();
      expect(features.webgl).toBe(true);
      expect(compatibility.isFeatureSupported('webgl')).toBe(true);
    });

    it('should detect WebGL absence correctly', () => {
      mockWebGL(false);
      compatibility = new BrowserCompatibility();
      
      const features = compatibility.getFeatures();
      expect(features.webgl).toBe(false);
      expect(compatibility.isFeatureSupported('webgl')).toBe(false);
    });

    it('should detect Web Audio support correctly', () => {
      mockWebAudio(true);
      compatibility = new BrowserCompatibility();
      
      const features = compatibility.getFeatures();
      expect(features.webAudio).toBe(true);
    });

    it('should detect Web Audio absence correctly', () => {
      mockWebAudio(false);
      compatibility = new BrowserCompatibility();
      
      const features = compatibility.getFeatures();
      expect(features.webAudio).toBe(false);
    });

    it('should detect localStorage support correctly', () => {
      mockLocalStorage(true);
      compatibility = new BrowserCompatibility();
      
      const features = compatibility.getFeatures();
      expect(features.localStorage).toBe(true);
    });

    it('should detect localStorage absence correctly', () => {
      mockLocalStorage(false);
      compatibility = new BrowserCompatibility();
      
      const features = compatibility.getFeatures();
      expect(features.localStorage).toBe(false);
    });

    it('should detect touch events support', () => {
      Object.defineProperty(global, 'ontouchstart', {
        value: {},
        configurable: true
      });
      
      compatibility = new BrowserCompatibility();
      const features = compatibility.getFeatures();
      expect(features.touchEvents).toBe(true);
    });

    it('should detect ResizeObserver support', () => {
      (global as any).ResizeObserver = vi.fn();
      compatibility = new BrowserCompatibility();
      
      const features = compatibility.getFeatures();
      expect(features.resizeObserver).toBe(true);
    });
  });

  describe('Modern Browser Detection', () => {
    it('should identify modern Chrome as modern', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      compatibility = new BrowserCompatibility();
      
      expect(compatibility.isModernBrowser()).toBe(true);
    });

    it('should identify old Chrome as not modern', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36');
      compatibility = new BrowserCompatibility();
      
      expect(compatibility.isModernBrowser()).toBe(false);
    });

    it('should identify modern Firefox as modern', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0');
      compatibility = new BrowserCompatibility();
      
      expect(compatibility.isModernBrowser()).toBe(true);
    });

    it('should identify old Firefox as not modern', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:45.0) Gecko/20100101 Firefox/45.0');
      compatibility = new BrowserCompatibility();
      
      expect(compatibility.isModernBrowser()).toBe(false);
    });
  });

  describe('Recommended Settings', () => {
    it('should recommend high quality settings for modern desktop browsers', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      mockWebGL(true);
      mockWebAudio(true);
      compatibility = new BrowserCompatibility();
      
      const settings = compatibility.getRecommendedSettings();
      expect(settings.useWebGL).toBe(true);
      expect(settings.useWebAudio).toBe(true);
      expect(settings.enableAdvancedFeatures).toBe(true);
      expect(settings.particleQuality).toBe('high');
      expect(settings.enableTouchControls).toBe(false);
    });

    it('should recommend lower quality settings for mobile browsers', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
      mockWebGL(true);
      mockWebAudio(true);
      compatibility = new BrowserCompatibility();
      
      const settings = compatibility.getRecommendedSettings();
      expect(settings.useWebGL).toBe(true);
      expect(settings.useWebAudio).toBe(true);
      expect(settings.enableAdvancedFeatures).toBe(false);
      expect(settings.particleQuality).toBe('low');
      expect(settings.enableTouchControls).toBe(true);
    });

    it('should recommend fallback settings for old browsers', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36');
      mockWebGL(false);
      mockWebAudio(false);
      compatibility = new BrowserCompatibility();
      
      const settings = compatibility.getRecommendedSettings();
      expect(settings.useWebGL).toBe(false);
      expect(settings.useWebAudio).toBe(false);
      expect(settings.enableAdvancedFeatures).toBe(false);
      expect(settings.particleQuality).toBe('medium');
    });
  });

  describe('Polyfills', () => {
    it('should apply requestAnimationFrame polyfill when needed', () => {
      delete (global as any).requestAnimationFrame;
      compatibility = new BrowserCompatibility();
      
      const polyfills = compatibility.getPolyfills();
      expect(polyfills).toContain('requestAnimationFrame');
      expect(global.requestAnimationFrame).toBeDefined();
    });

    it('should apply performance.now polyfill when needed', () => {
      delete (global as any).performance;
      compatibility = new BrowserCompatibility();
      
      const polyfills = compatibility.getPolyfills();
      expect(polyfills).toContain('performance.now');
      expect(global.performance.now).toBeDefined();
    });

    it('should apply Array.from polyfill when needed', () => {
      delete (Array as any).from;
      compatibility = new BrowserCompatibility();
      
      const polyfills = compatibility.getPolyfills();
      expect(polyfills).toContain('Array.from');
      expect(Array.from).toBeDefined();
    });

    it('should apply Object.assign polyfill when needed', () => {
      delete (Object as any).assign;
      compatibility = new BrowserCompatibility();
      
      const polyfills = compatibility.getPolyfills();
      expect(polyfills).toContain('Object.assign');
      expect(Object.assign).toBeDefined();
    });

    it('should not apply polyfills when features are already available', () => {
      // All features are available by default in our test setup
      compatibility = new BrowserCompatibility();
      
      const polyfills = compatibility.getPolyfills();
      expect(polyfills).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle WebGL context creation errors gracefully', () => {
      const mockCanvas = {
        getContext: vi.fn().mockImplementation(() => {
          throw new Error('WebGL not supported');
        })
      };
      
      global.document.createElement = vi.fn().mockReturnValue(mockCanvas);
      
      expect(() => {
        compatibility = new BrowserCompatibility();
      }).not.toThrow();
      
      const features = compatibility.getFeatures();
      expect(features.webgl).toBe(false);
    });

    it('should handle localStorage access errors gracefully', () => {
      const mockStorage = {
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage quota exceeded');
        }),
        getItem: vi.fn(),
        removeItem: vi.fn()
      };
      
      Object.defineProperty(global, 'localStorage', {
        value: mockStorage,
        configurable: true
      });
      
      expect(() => {
        compatibility = new BrowserCompatibility();
      }).not.toThrow();
      
      const features = compatibility.getFeatures();
      expect(features.localStorage).toBe(false);
    });
  });
});