import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor, GraphicsQuality } from '../core/PerformanceMonitor';
import { MemoryManager, ObjectPool, TextureManager } from '../core/MemoryManager';
import { ErrorHandler, FallbackState } from '../core/ErrorHandler';
import { AssetLoader } from '../core/AssetLoader';

// Mock WebGL context
const createMockWebGLContext = () => ({
  createTexture: vi.fn(() => ({})),
  deleteTexture: vi.fn(),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  TEXTURE_2D: 0x0DE1,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  CLAMP_TO_EDGE: 0x812F,
  LINEAR: 0x2601,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800
});

// Mock performance.now
const mockPerformanceNow = () => {
  let time = 0;
  return vi.fn(() => {
    time += 16.67; // Simulate 60 FPS
    return time;
  });
};

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  let mockNow: ReturnType<typeof mockPerformanceNow>;
  
  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    mockNow = mockPerformanceNow();
    vi.spyOn(performance, 'now').mockImplementation(mockNow);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  it('should maintain 60 FPS target', () => {
    // Simulate 60 FPS frames
    for (let i = 0; i < 60; i++) {
      performanceMonitor.startFrame();
      performanceMonitor.endFrame();
    }
    
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.fps).toBeCloseTo(60, 1);
    expect(metrics.frameTime).toBeCloseTo(16.67, 1);
  });
  
  it('should detect frame drops and reduce quality', () => {
    let qualityChanged = false;
    let newQuality: GraphicsQuality | null = null;
    
    performanceMonitor.setQualityChangeCallback((quality) => {
      qualityChanged = true;
      newQuality = quality;
    });
    
    // Simulate frame drops (33ms = 30 FPS)
    vi.spyOn(performance, 'now').mockImplementation(() => {
      const time = mockNow();
      return time * 2; // Double the time to simulate slow frames
    });
    
    // First, build up some frame history with normal frames
    for (let i = 0; i < 15; i++) {
      performanceMonitor.startFrame();
      performanceMonitor.endFrame();
    }
    
    // Now simulate frame drops (33ms = 30 FPS)
    vi.spyOn(performance, 'now').mockImplementation(() => {
      const time = mockNow();
      return time * 2; // Double the time to simulate slow frames
    });
    
    // Trigger multiple slow frames to exceed the frame drop threshold
    for (let i = 0; i < 15; i++) {
      performanceMonitor.startFrame();
      performanceMonitor.endFrame();
    }
    
    expect(qualityChanged).toBe(true);
    expect(newQuality).toBeTruthy();
    if (newQuality) {
      expect(
        newQuality.shadowQuality === 'medium' || 
        newQuality.shadowQuality === 'low' ||
        newQuality.particleQuality === 'medium' ||
        newQuality.particleQuality === 'low'
      ).toBe(true);
    }
  });
  
  it('should increase quality when performance improves', () => {
    // Start with reduced quality
    performanceMonitor.setQuality({
      particleQuality: 'low',
      lightingQuality: 'low',
      shadowQuality: 'low'
    });
    
    let qualityChanged = false;
    performanceMonitor.setQualityChangeCallback(() => {
      qualityChanged = true;
    });
    
    // Simulate excellent performance (faster than 60 FPS)
    vi.spyOn(performance, 'now').mockImplementation(() => {
      const time = mockNow();
      return time * 0.8; // 20% faster frames
    });
    
    // Run many frames with good performance
    for (let i = 0; i < 100; i++) {
      performanceMonitor.startFrame();
      performanceMonitor.endFrame();
    }
    
    expect(qualityChanged).toBe(true);
  });
  
  it('should track memory usage', () => {
    // Mock performance.memory
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50 MB
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
      },
      configurable: true
    });
    
    const memoryUsage = performanceMonitor.getMemoryUsage();
    expect(memoryUsage).toBe(50); // 50 MB
  });
});

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let mockGL: any;
  
  beforeEach(() => {
    mockGL = createMockWebGLContext();
    memoryManager = new MemoryManager(mockGL);
  });
  
  it('should create and manage object pools', () => {
    interface TestParticle {
      x: number;
      y: number;
      active: boolean;
    }
    
    const createParticle = (): TestParticle => ({
      x: 0,
      y: 0,
      active: false
    });
    
    const resetParticle = (particle: TestParticle) => {
      particle.x = 0;
      particle.y = 0;
      particle.active = false;
    };
    
    const pool = memoryManager.createParticlePool('test', createParticle, resetParticle, 100);
    
    expect(pool).toBeTruthy();
    expect(pool.size()).toBe(0);
    expect(pool.activeCount()).toBe(0);
    
    // Test pool operations
    const particle1 = pool.acquire();
    expect(particle1).toBeTruthy();
    expect(pool.activeCount()).toBe(1);
    
    const particle2 = pool.acquire();
    expect(pool.activeCount()).toBe(2);
    
    pool.release(particle1);
    expect(pool.activeCount()).toBe(1);
    expect(pool.size()).toBe(1); // One item back in pool
    
    // Reuse pooled item
    const particle3 = pool.acquire();
    expect(particle3).toBe(particle1); // Should reuse the released particle
    expect(pool.size()).toBe(0);
    expect(pool.activeCount()).toBe(2);
  });
  
  it('should manage texture memory efficiently', () => {
    const textureManager = memoryManager.getTextureManager();
    
    // Create mock image
    const mockImage = {
      width: 256,
      height: 256
    } as HTMLImageElement;
    
    const texture = textureManager.loadTexture('test-texture', mockImage);
    expect(texture).toBeTruthy();
    expect(mockGL.createTexture).toHaveBeenCalled();
    expect(mockGL.texImage2D).toHaveBeenCalled();
    
    const memoryUsage = textureManager.getMemoryUsage();
    expect(memoryUsage).toBe(256 * 256 * 4); // RGBA bytes
    
    // Test texture reuse
    const sameTexture = textureManager.getTexture('test-texture');
    expect(sameTexture).toBe(texture);
    
    // Test cleanup
    textureManager.deleteTexture('test-texture');
    expect(mockGL.deleteTexture).toHaveBeenCalled();
    expect(textureManager.getMemoryUsage()).toBe(0);
  });
  
  it('should enforce memory limits', () => {
    const textureManager = new TextureManager(mockGL, 1); // 1 MB limit
    
    // Try to load a texture that exceeds the limit
    const largeImage = {
      width: 1024,
      height: 1024
    } as HTMLImageElement;
    
    const texture = textureManager.loadTexture('large-texture', largeImage);
    expect(texture).toBeNull(); // Should fail due to memory limit
  });
  
  it('should provide accurate memory statistics', () => {
    const stats = memoryManager.getMemoryStats();
    expect(stats).toHaveProperty('textureMemory');
    expect(stats).toHaveProperty('textureCount');
    expect(stats).toHaveProperty('particlePoolCount');
    expect(stats).toHaveProperty('audioBufferCount');
    
    expect(typeof stats.textureMemory).toBe('number');
    expect(typeof stats.textureCount).toBe('number');
    expect(typeof stats.particlePoolCount).toBe('number');
    expect(typeof stats.audioBufferCount).toBe('number');
  });
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  
  beforeEach(() => {
    errorHandler = new ErrorHandler();
    // Clear any existing error listeners
    vi.clearAllMocks();
  });
  
  it('should handle WebGL errors gracefully', () => {
    let fallbackTriggered = false;
    let fallbackState: FallbackState | null = null;
    
    errorHandler.setFallbackChangeCallback((state) => {
      fallbackTriggered = true;
      fallbackState = state;
    });
    
    errorHandler.handleError({
      type: 'webgl',
      message: 'WebGL context lost',
      timestamp: Date.now(),
      severity: 'high'
    });
    
    expect(fallbackTriggered).toBe(true);
    expect(fallbackState?.webglFallback).toBe(true);
    expect(fallbackState?.reducedEffects).toBe(true);
  });
  
  it('should handle audio errors gracefully', () => {
    let fallbackTriggered = false;
    let fallbackState: FallbackState | null = null;
    
    errorHandler.setFallbackChangeCallback((state) => {
      fallbackTriggered = true;
      fallbackState = state;
    });
    
    errorHandler.handleError({
      type: 'audio',
      message: 'Audio context creation failed',
      timestamp: Date.now(),
      severity: 'medium'
    });
    
    expect(fallbackTriggered).toBe(true);
    expect(fallbackState?.audioFallback).toBe(true);
  });
  
  it('should check WebGL support', () => {
    const mockGL = createMockWebGLContext();
    const isSupported = errorHandler.checkWebGLSupport(mockGL);
    expect(isSupported).toBe(true);
    expect(mockGL.createTexture).toHaveBeenCalled();
    expect(mockGL.deleteTexture).toHaveBeenCalled();
  });
  
  it('should handle WebGL support check failure', () => {
    const result = errorHandler.checkWebGLSupport(null);
    expect(result).toBe(false);
    
    const errors = errorHandler.getErrorsByType('webgl');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('WebGL context is null');
  });
  
  it('should wrap async operations safely', async () => {
    const failingOperation = async () => {
      throw new Error('Test error');
    };
    
    const result = await errorHandler.wrapAsyncOperation(
      failingOperation,
      'general',
      { test: true }
    );
    
    expect(result).toBeNull();
    
    const errors = errorHandler.getErrorsByType('general');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Test error');
  });
  
  it('should wrap sync operations safely', () => {
    const failingOperation = () => {
      throw new Error('Sync test error');
    };
    
    const result = errorHandler.wrapSyncOperation(
      failingOperation,
      'general',
      { test: true },
      'fallback'
    );
    
    expect(result).toBe('fallback');
    
    const errors = errorHandler.getErrorsByType('general');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Sync test error');
  });
});

describe('AssetLoader', () => {
  let assetLoader: AssetLoader;
  let mockAudioContext: any;
  
  beforeEach(() => {
    mockAudioContext = {
      createBuffer: vi.fn(() => ({})),
      decodeAudioData: vi.fn(() => Promise.resolve({}))
    };
    
    assetLoader = new AssetLoader(mockAudioContext);
    
    // Mock fetch
    global.fetch = vi.fn();
    
    // Mock FontFace
    global.FontFace = vi.fn().mockImplementation(() => ({
      load: vi.fn(() => Promise.resolve())
    }));
    
    // Mock document.fonts
    Object.defineProperty(document, 'fonts', {
      value: {
        add: vi.fn()
      },
      configurable: true
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  it('should load textures with fallback', async () => {
    // Mock Image constructor
    const mockImage = {
      onload: null as any,
      onerror: null as any,
      complete: false,
      src: '',
      crossOrigin: ''
    };
    
    const originalImage = global.Image;
    global.Image = vi.fn(() => mockImage) as any;
    
    const loadPromise = assetLoader['loadTexture']('test', 'test.png');
    
    // Simulate successful load
    mockImage.complete = true;
    if (mockImage.onload) {
      mockImage.onload();
    }
    
    const result = await loadPromise;
    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(false);
    
    global.Image = originalImage;
  });
  
  it('should create fallback texture on load failure', async () => {
    // Mock canvas and context
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        fillStyle: '',
        fillRect: vi.fn()
      })),
      toDataURL: vi.fn(() => 'data:image/png;base64,test')
    };
    
    const mockImage = {
      onload: null as any,
      onerror: null as any,
      complete: false,
      src: '',
      crossOrigin: ''
    };
    
    const originalImage = global.Image;
    const originalCreateElement = document.createElement;
    
    global.Image = vi.fn(() => mockImage) as any;
    document.createElement = vi.fn((tag) => {
      if (tag === 'canvas') return mockCanvas;
      return originalCreateElement.call(document, tag);
    }) as any;
    
    const loadPromise = assetLoader['loadTexture']('test', 'invalid.png');
    
    // Simulate load failure
    if (mockImage.onerror) {
      mockImage.onerror();
    }
    
    // Simulate fallback image load
    setTimeout(() => {
      if (mockImage.onload) {
        mockImage.onload();
      }
    }, 0);
    
    const result = await loadPromise;
    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    
    global.Image = originalImage;
    document.createElement = originalCreateElement;
  });
  
  it('should load audio with silent fallback', async () => {
    // Mock successful audio loading
    (global.fetch as any).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    });
    
    const result = await assetLoader['loadAudio']('test', 'test.mp3');
    expect(result.success).toBe(true);
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
  });
  
  it('should create silent fallback on audio load failure', async () => {
    // Mock failed audio loading
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    
    const result = await assetLoader['loadAudio']('test', 'invalid.mp3');
    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(mockAudioContext.createBuffer).toHaveBeenCalled();
  });
  
  it('should track loading progress', async () => {
    const progressUpdates: any[] = [];
    assetLoader.setProgressCallback((progress) => {
      progressUpdates.push({ ...progress });
    });
    
    const manifest = {
      textures: { 'tex1': 'tex1.png' },
      audio: { 'audio1': 'audio1.mp3' },
      fonts: { 'font1': 'font1.woff' }
    };
    
    // Mock all loading operations to succeed immediately
    const mockImage = { onload: null as any, onerror: null as any };
    global.Image = vi.fn(() => mockImage) as any;
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    });
    
    const loadPromise = assetLoader.loadAssets(manifest);
    
    // Simulate immediate success for all assets
    setTimeout(() => {
      if (mockImage.onload) mockImage.onload();
    }, 0);
    
    await loadPromise;
    
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].phase).toBe('complete');
    expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
  });
});

describe('Performance Integration', () => {
  it('should maintain 60 FPS under maximum load', async () => {
    const performanceMonitor = new PerformanceMonitor();
    const mockGL = createMockWebGLContext();
    const memoryManager = new MemoryManager(mockGL);
    
    // Create particle pool for stress testing
    const particlePool = memoryManager.createParticlePool(
      'stress-test',
      () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 1 }),
      (p) => { p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.life = 1; },
      10000
    );
    
    // Simulate maximum particle load
    const particles = [];
    for (let i = 0; i < 5000; i++) {
      particles.push(particlePool.acquire());
    }
    
    // Simulate game loop under load
    const frameCount = 120; // 2 seconds at 60 FPS
    const frameStartTime = performance.now();
    
    for (let frame = 0; frame < frameCount; frame++) {
      performanceMonitor.startFrame();
      
      // Simulate particle updates (CPU intensive)
      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.01;
      });
      
      // Simulate rendering calls
      performanceMonitor.updateMetrics({
        particleCount: particles.length,
        renderCalls: Math.ceil(particles.length / 100)
      });
      
      performanceMonitor.endFrame();
      
      // Simulate frame timing
      await new Promise(resolve => setTimeout(resolve, 16)); // ~60 FPS
    }
    
    const totalTime = performance.now() - frameStartTime;
    const avgFrameTime = totalTime / frameCount;
    const avgFPS = 1000 / avgFrameTime;
    
    // Should maintain at least 45 FPS under maximum load
    expect(avgFPS).toBeGreaterThan(45);
    
    // Clean up
    particles.forEach(particle => particlePool.release(particle));
  });
  
  it('should handle memory pressure gracefully', () => {
    const mockGL = createMockWebGLContext();
    const memoryManager = new MemoryManager(mockGL);
    const textureManager = memoryManager.getTextureManager();
    
    // Try to load many textures to trigger memory management
    const textures = [];
    for (let i = 0; i < 100; i++) {
      const mockImage = {
        width: 256,
        height: 256
      } as HTMLImageElement;
      
      const texture = textureManager.loadTexture(`texture-${i}`, mockImage);
      if (texture) {
        textures.push(`texture-${i}`);
      }
    }
    
    expect(textures.length).toBeGreaterThan(0);
    
    // Force cleanup
    memoryManager.performGarbageCollection();
    
    // Memory usage should be reasonable
    const stats = memoryManager.getMemoryStats();
    expect(stats.textureMemory).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
  });
});