import { describe, test, expect, beforeEach, vi } from 'vitest';
import { LightingSystem, LightType } from '../core/LightingSystem';

// Mock WebGL context with performance tracking
const createMockWebGLContext = () => {
  let drawCallCount = 0;
  let uniformCallCount = 0;
  
  const mockGL = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    COLOR_ATTACHMENT0: 36064,
    FRAMEBUFFER_COMPLETE: 36053,
    FRAMEBUFFER: 36160,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    LINEAR: 9729,
    CLAMP_TO_EDGE: 33071,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    TRIANGLE_STRIP: 5,
    COLOR_BUFFER_BIT: 16384,
    POINTS: 0,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,

    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    getAttribLocation: vi.fn(() => 0),
    uniform1f: vi.fn(() => { uniformCallCount++; }),
    uniform1i: vi.fn(() => { uniformCallCount++; }),
    uniform2f: vi.fn(() => { uniformCallCount++; }),
    uniform3fv: vi.fn(() => { uniformCallCount++; }),
    uniform1fv: vi.fn(() => { uniformCallCount++; }),
    uniform2fv: vi.fn(() => { uniformCallCount++; }),
    uniform1iv: vi.fn(() => { uniformCallCount++; }),
    uniformMatrix3fv: vi.fn(() => { uniformCallCount++; }),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    drawArrays: vi.fn(() => { drawCallCount++; }),
    createFramebuffer: vi.fn(() => ({})),
    bindFramebuffer: vi.fn(),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    framebufferTexture2D: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 36053),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    deleteFramebuffer: vi.fn(),
    deleteTexture: vi.fn(),
    deleteBuffer: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    canvas: { width: 800, height: 600 },
    
    // Performance tracking methods
    getDrawCallCount: () => drawCallCount,
    getUniformCallCount: () => uniformCallCount,
    resetCounters: () => { drawCallCount = 0; uniformCallCount = 0; }
  };

  return mockGL as unknown as WebGLRenderingContext & {
    getDrawCallCount: () => number;
    getUniformCallCount: () => number;
    resetCounters: () => void;
  };
};

const createMockCanvas = () => ({
  width: 800,
  height: 600,
  getContext: vi.fn(() => createMockWebGLContext())
});

describe('LightingSystem Performance Tests', () => {
  let lightingSystem: LightingSystem;
  let mockGL: WebGLRenderingContext & {
    getDrawCallCount: () => number;
    getUniformCallCount: () => number;
    resetCounters: () => void;
  };
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    mockCanvas = createMockCanvas() as unknown as HTMLCanvasElement;
    lightingSystem = new LightingSystem(mockGL, mockCanvas, {
      maxLights: 32,
      performanceMode: false
    });
    mockGL.resetCounters();
  });

  describe('Light Count Performance', () => {
    test('should handle large numbers of lights efficiently', () => {
      const startTime = performance.now();
      
      // Add 100 lights
      for (let i = 0; i < 100; i++) {
        lightingSystem.addLight({
          id: `light_${i}`,
          position: { x: i * 10, y: i * 10 },
          color: [Math.random(), Math.random(), Math.random()],
          intensity: Math.random(),
          radius: 50 + Math.random() * 50,
          type: LightType.Static,
          isActive: true
        });
      }
      
      const addTime = performance.now() - startTime;
      expect(addTime).toBeLessThan(100); // Should complete in less than 100ms
      
      const metrics = lightingSystem.getPerformanceMetrics();
      expect(metrics.lightCount).toBe(100);
    });

    test('should update many lights efficiently', () => {
      // Add 50 lights
      for (let i = 0; i < 50; i++) {
        lightingSystem.addLight({
          id: `light_${i}`,
          position: { x: i * 10, y: i * 10 },
          color: [1.0, 1.0, 1.0],
          intensity: 1.0,
          radius: 50,
          type: LightType.Pulsing,
          isActive: true,
          lifetime: 5.0
        });
      }

      const startTime = performance.now();
      
      // Update multiple times
      for (let frame = 0; frame < 60; frame++) {
        lightingSystem.update(16.67); // 60 FPS
      }
      
      const updateTime = performance.now() - startTime;
      expect(updateTime).toBeLessThan(50); // Should complete 60 updates in less than 50ms
    });

    test('should render many lights within performance budget', () => {
      // Add maximum number of lights
      for (let i = 0; i < 32; i++) {
        lightingSystem.addLight({
          id: `light_${i}`,
          position: { x: i * 25, y: i * 25 },
          color: [Math.random(), Math.random(), Math.random()],
          intensity: Math.random(),
          radius: 50 + Math.random() * 100,
          type: i % 2 === 0 ? LightType.Pulsing : LightType.Flickering,
          isActive: true
        });
      }

      const startTime = performance.now();
      
      // Render multiple frames
      for (let frame = 0; frame < 60; frame++) {
        lightingSystem.render(frame * 16.67);
      }
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render 60 frames in less than 100ms
    });
  });

  describe('Memory Management', () => {
    test('should clean up expired lights efficiently', () => {
      // Add lights with short lifetimes
      for (let i = 0; i < 20; i++) {
        lightingSystem.addLight({
          id: `temp_light_${i}`,
          position: { x: i * 10, y: i * 10 },
          color: [1.0, 1.0, 1.0],
          intensity: 1.0,
          radius: 50,
          type: LightType.Static,
          isActive: true,
          lifetime: 0.1 // Very short lifetime
        });
      }

      expect(lightingSystem.getPerformanceMetrics().lightCount).toBe(20);

      const startTime = performance.now();
      
      // Update to expire all lights
      lightingSystem.update(200); // 200ms should expire all lights
      
      const cleanupTime = performance.now() - startTime;
      expect(cleanupTime).toBeLessThan(10); // Cleanup should be very fast
      expect(lightingSystem.getPerformanceMetrics().lightCount).toBe(0);
    });

    test('should handle rapid light creation and destruction', () => {
      const startTime = performance.now();
      
      // Rapidly create and destroy lights
      for (let cycle = 0; cycle < 10; cycle++) {
        // Create 10 lights
        for (let i = 0; i < 10; i++) {
          lightingSystem.addLight({
            id: `cycle_${cycle}_light_${i}`,
            position: { x: i * 10, y: cycle * 10 },
            color: [1.0, 1.0, 1.0],
            intensity: 1.0,
            radius: 50,
            type: LightType.Static,
            isActive: true,
            lifetime: 0.05 // Very short
          });
        }
        
        // Update to clean them up
        lightingSystem.update(60);
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(50); // Should handle 100 light cycles quickly
      expect(lightingSystem.getPerformanceMetrics().lightCount).toBe(0);
    });
  });

  describe('Rendering Performance', () => {
    test('should minimize WebGL calls for efficient rendering', () => {
      // Add several lights
      for (let i = 0; i < 10; i++) {
        lightingSystem.addLight({
          id: `light_${i}`,
          position: { x: i * 50, y: i * 50 },
          color: [1.0, 1.0, 1.0],
          intensity: 1.0,
          radius: 50,
          type: LightType.Static,
          isActive: true
        });
      }

      mockGL.resetCounters();
      
      // Single render call
      lightingSystem.render(0);
      
      const drawCalls = mockGL.getDrawCallCount();
      const uniformCalls = mockGL.getUniformCallCount();
      
      // Should use minimal draw calls (ideally just 1 for the fullscreen quad)
      expect(drawCalls).toBeLessThanOrEqual(2);
      
      // Uniform calls should be reasonable (not excessive)
      expect(uniformCalls).toBeLessThan(50);
    });

    test('should handle different light types efficiently', () => {
      const lightTypes = [
        LightType.Static,
        LightType.Flickering,
        LightType.Pulsing,
        LightType.Glowing,
        LightType.Mystical,
        LightType.Fire,
        LightType.Lightning
      ];

      // Add one light of each type
      lightTypes.forEach((type, index) => {
        lightingSystem.addLight({
          id: `${type}_light`,
          position: { x: index * 100, y: index * 100 },
          color: [1.0, 1.0, 1.0],
          intensity: 1.0,
          radius: 50,
          type,
          isActive: true,
          flickerSpeed: 10.0,
          flickerIntensity: 0.3,
          pulseSpeed: 3.0,
          pulseIntensity: 0.4
        });
      });

      const startTime = performance.now();
      
      // Render multiple frames with different light types
      for (let frame = 0; frame < 30; frame++) {
        lightingSystem.render(frame * 16.67);
      }
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(50); // Should handle all light types efficiently
    });
  });

  describe('Performance Mode', () => {
    test('should automatically enable performance mode under high load', () => {
      // Create lighting system with lower max lights to trigger performance mode
      const performanceLightingSystem = new LightingSystem(mockGL, mockCanvas, {
        maxLights: 10,
        performanceMode: false
      });

      // Add lights to exceed 80% of max (should trigger performance mode)
      for (let i = 0; i < 9; i++) {
        performanceLightingSystem.addLight({
          id: `load_light_${i}`,
          position: { x: i * 50, y: i * 50 },
          color: [1.0, 1.0, 1.0],
          intensity: 1.0,
          radius: 50,
          type: LightType.Static,
          isActive: true
        });
      }

      // Update to trigger performance check (need to wait for check interval)
      performanceLightingSystem.update(1100); // Slightly over 1 second

      const metrics = performanceLightingSystem.getPerformanceMetrics();
      expect(metrics.performanceMode).toBe(true);
    });

    test('should disable performance mode when load decreases', () => {
      const performanceLightingSystem = new LightingSystem(mockGL, mockCanvas, {
        maxLights: 20,
        performanceMode: true // Start in performance mode
      });

      // Add only a few lights (under 50% of max)
      for (let i = 0; i < 5; i++) {
        performanceLightingSystem.addLight({
          id: `light_light_${i}`,
          position: { x: i * 50, y: i * 50 },
          color: [1.0, 1.0, 1.0],
          intensity: 1.0,
          radius: 50,
          type: LightType.Static,
          isActive: true
        });
      }

      // Update to trigger performance check
      performanceLightingSystem.update(1100);

      const metrics = performanceLightingSystem.getPerformanceMetrics();
      expect(metrics.performanceMode).toBe(false);
    });
  });

  describe('Frame Time Tracking', () => {
    test('should track frame time accurately', () => {
      const initialMetrics = lightingSystem.getPerformanceMetrics();
      const initialFrameTime = initialMetrics.frameTime;

      // Update with specific delta time
      lightingSystem.update(16.67); // ~60 FPS
      lightingSystem.update(16.67);
      lightingSystem.update(16.67);

      const updatedMetrics = lightingSystem.getPerformanceMetrics();
      expect(updatedMetrics.frameTime).toBeGreaterThan(initialFrameTime);
      expect(updatedMetrics.frameTime - initialFrameTime).toBeCloseTo(50, 0); // 3 * 16.67ms
    });
  });

  describe('Stress Testing', () => {
    test('should handle maximum light capacity without crashing', () => {
      const maxLights = 32;
      
      // Add maximum number of lights
      for (let i = 0; i < maxLights; i++) {
        lightingSystem.addLight({
          id: `stress_light_${i}`,
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          color: [Math.random(), Math.random(), Math.random()],
          intensity: Math.random(),
          radius: 20 + Math.random() * 100,
          type: Object.values(LightType)[Math.floor(Math.random() * Object.values(LightType).length)],
          isActive: true,
          flickerSpeed: 5 + Math.random() * 10,
          flickerIntensity: Math.random() * 0.5,
          pulseSpeed: 1 + Math.random() * 5,
          pulseIntensity: Math.random() * 0.6
        });
      }

      expect(() => {
        // Stress test with rapid updates and renders
        for (let i = 0; i < 100; i++) {
          lightingSystem.update(16.67);
          lightingSystem.render(i * 16.67);
        }
      }).not.toThrow();

      const metrics = lightingSystem.getPerformanceMetrics();
      expect(metrics.lightCount).toBe(maxLights);
    });

    test('should maintain performance with complex light animations', () => {
      // Create lights with complex animation patterns
      for (let i = 0; i < 20; i++) {
        lightingSystem.addLight({
          id: `complex_light_${i}`,
          position: { x: i * 40, y: i * 30 },
          color: [Math.random(), Math.random(), Math.random()],
          intensity: 0.5 + Math.random() * 0.5,
          radius: 30 + Math.random() * 70,
          type: i % 3 === 0 ? LightType.Mystical : 
                i % 3 === 1 ? LightType.Fire : LightType.Lightning,
          isActive: true,
          flickerSpeed: 8 + Math.random() * 12,
          flickerIntensity: 0.2 + Math.random() * 0.3,
          pulseSpeed: 2 + Math.random() * 4,
          pulseIntensity: 0.3 + Math.random() * 0.4
        });
      }

      const startTime = performance.now();
      
      // Simulate 2 seconds of gameplay at 60 FPS
      for (let frame = 0; frame < 120; frame++) {
        lightingSystem.update(16.67);
        lightingSystem.render(frame * 16.67);
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(200); // Should complete in reasonable time
    });
  });

  describe('Resource Cleanup Performance', () => {
    test('should dispose resources quickly', () => {
      // Add many lights
      for (let i = 0; i < 50; i++) {
        lightingSystem.addLight({
          id: `disposal_light_${i}`,
          position: { x: i * 10, y: i * 10 },
          color: [1.0, 1.0, 1.0],
          intensity: 1.0,
          radius: 50,
          type: LightType.Static,
          isActive: true
        });
      }

      const startTime = performance.now();
      
      lightingSystem.dispose();
      
      const disposeTime = performance.now() - startTime;
      expect(disposeTime).toBeLessThan(10); // Disposal should be very fast
      
      // Verify all lights are cleaned up
      const metrics = lightingSystem.getPerformanceMetrics();
      expect(metrics.lightCount).toBe(0);
    });
  });
});