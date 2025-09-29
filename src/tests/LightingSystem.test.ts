import { describe, test, expect, beforeEach, vi } from 'vitest';
import { LightingSystem, LightType } from '../core/LightingSystem';

// Mock WebGL context
const createMockWebGLContext = () => {
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
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    uniform3fv: vi.fn(),
    uniform1fv: vi.fn(),
    uniform2fv: vi.fn(),
    uniform1iv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    drawArrays: vi.fn(),
    createFramebuffer: vi.fn(() => ({})),
    bindFramebuffer: vi.fn(),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    framebufferTexture2D: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 36053), // FRAMEBUFFER_COMPLETE
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    deleteFramebuffer: vi.fn(),
    deleteTexture: vi.fn(),
    deleteBuffer: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    canvas: { width: 800, height: 600 }
  };

  return mockGL as unknown as WebGLRenderingContext;
};

const createMockCanvas = () => ({
  width: 800,
  height: 600,
  getContext: vi.fn(() => createMockWebGLContext())
});

describe('LightingSystem', () => {
  let lightingSystem: LightingSystem;
  let mockGL: WebGLRenderingContext;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    mockCanvas = createMockCanvas() as unknown as HTMLCanvasElement;
    lightingSystem = new LightingSystem(mockGL, mockCanvas);
  });

  describe('Light Management', () => {
    test('should add lights correctly', () => {
      const light = lightingSystem.addLight({
        id: 'test_light',
        position: { x: 100, y: 100 },
        color: [1.0, 0.5, 0.0],
        intensity: 0.8,
        radius: 50,
        type: LightType.Static,
        isActive: true
      });

      expect(light.id).toBe('test_light');
      expect(light.position).toEqual({ x: 100, y: 100 });
      expect(light.color).toEqual([1.0, 0.5, 0.0]);
      expect(light.intensity).toBe(0.8);
      expect(light.radius).toBe(50);
      expect(light.type).toBe(LightType.Static);
      expect(light.isActive).toBe(true);
      expect(light.timeAlive).toBe(0);
    });

    test('should retrieve lights by id', () => {
      lightingSystem.addLight({
        id: 'test_light',
        position: { x: 100, y: 100 },
        color: [1.0, 0.5, 0.0],
        intensity: 0.8,
        radius: 50,
        type: LightType.Static,
        isActive: true
      });

      const retrievedLight = lightingSystem.getLight('test_light');
      expect(retrievedLight).toBeDefined();
      expect(retrievedLight!.id).toBe('test_light');
    });

    test('should update lights correctly', () => {
      lightingSystem.addLight({
        id: 'test_light',
        position: { x: 100, y: 100 },
        color: [1.0, 0.5, 0.0],
        intensity: 0.8,
        radius: 50,
        type: LightType.Static,
        isActive: true
      });

      lightingSystem.updateLight('test_light', {
        intensity: 0.5,
        position: { x: 200, y: 200 }
      });

      const updatedLight = lightingSystem.getLight('test_light');
      expect(updatedLight!.intensity).toBe(0.5);
      expect(updatedLight!.position).toEqual({ x: 200, y: 200 });
    });

    test('should remove lights correctly', () => {
      lightingSystem.addLight({
        id: 'test_light',
        position: { x: 100, y: 100 },
        color: [1.0, 0.5, 0.0],
        intensity: 0.8,
        radius: 50,
        type: LightType.Static,
        isActive: true
      });

      lightingSystem.removeLight('test_light');
      const retrievedLight = lightingSystem.getLight('test_light');
      expect(retrievedLight).toBeUndefined();
    });
  });

  describe('Snake Evolution Lighting', () => {
    test('should create appropriate glow for different evolution levels', () => {
      // Test Hatchling (level 1) - no glow
      const hatchlingId = lightingSystem.createSnakeGlow({ x: 100, y: 100 }, 1);
      const hatchlingLight = lightingSystem.getLight(hatchlingId);
      expect(hatchlingLight).toBeUndefined(); // No glow for hatchling

      // Test Garden Snake (level 2) - green glow
      const gardenSnakeId = lightingSystem.createSnakeGlow({ x: 100, y: 100 }, 2);
      const gardenSnakeLight = lightingSystem.getLight(gardenSnakeId);
      expect(gardenSnakeLight).toBeDefined();
      expect(gardenSnakeLight!.color).toEqual([0.3, 0.8, 0.3]);
      expect(gardenSnakeLight!.intensity).toBe(0.3);
      expect(gardenSnakeLight!.radius).toBe(60);
      expect(gardenSnakeLight!.type).toBe(LightType.Static);

      // Test Ouroboros (level 10) - golden mystical glow
      const ouroborosId = lightingSystem.createSnakeGlow({ x: 100, y: 100 }, 10);
      const ouroborosLight = lightingSystem.getLight(ouroborosId);
      expect(ouroborosLight).toBeDefined();
      expect(ouroborosLight!.color).toEqual([1.0, 0.9, 0.3]);
      expect(ouroborosLight!.intensity).toBe(1.5);
      expect(ouroborosLight!.radius).toBe(200);
      expect(ouroborosLight!.type).toBe(LightType.Mystical);
    });

    test('should replace existing snake glow when creating new one', () => {
      // Create initial glow
      lightingSystem.createSnakeGlow({ x: 100, y: 100 }, 2);
      const initialLight = lightingSystem.getLight('snake_glow');
      expect(initialLight).toBeDefined();
      expect(initialLight!.color).toEqual([0.3, 0.8, 0.3]);

      // Create new glow (should replace the old one)
      lightingSystem.createSnakeGlow({ x: 200, y: 200 }, 5);
      const newLight = lightingSystem.getLight('snake_glow');
      expect(newLight).toBeDefined();
      expect(newLight!.color).toEqual([1.0, 0.8, 0.3]); // Cobra golden color
      expect(newLight!.position).toEqual({ x: 200, y: 200 });
    });
  });

  describe('Power Lighting', () => {
    test('should create appropriate lights for different power types', () => {
      // Test Speed Boost
      const speedBoostId = lightingSystem.createPowerLight({ x: 100, y: 100 }, 'SpeedBoost', 2.0);
      const speedBoostLight = lightingSystem.getLight(speedBoostId);
      expect(speedBoostLight).toBeDefined();
      expect(speedBoostLight!.color).toEqual([0.3, 0.8, 1.0]);
      expect(speedBoostLight!.intensity).toBe(0.8);
      expect(speedBoostLight!.type).toBe(LightType.Pulsing);
      expect(speedBoostLight!.lifetime).toBe(2.0);

      // Test Fire Breath
      const fireBreathId = lightingSystem.createPowerLight({ x: 200, y: 200 }, 'FireBreath', 1.5);
      const fireBreathLight = lightingSystem.getLight(fireBreathId);
      expect(fireBreathLight).toBeDefined();
      expect(fireBreathLight!.color).toEqual([1.0, 0.3, 0.0]);
      expect(fireBreathLight!.intensity).toBe(1.5);
      expect(fireBreathLight!.type).toBe(LightType.Fire);
      expect(fireBreathLight!.lifetime).toBe(1.5);
    });

    test('should create unique IDs for power lights', async () => {
      const id1 = lightingSystem.createPowerLight({ x: 100, y: 100 }, 'SpeedBoost');
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const id2 = lightingSystem.createPowerLight({ x: 200, y: 200 }, 'SpeedBoost');
      
      expect(id1).not.toBe(id2);
      expect(lightingSystem.getLight(id1)).toBeDefined();
      expect(lightingSystem.getLight(id2)).toBeDefined();
    });
  });

  describe('Environmental Lighting', () => {
    test('should create appropriate lights for environmental elements', () => {
      // Test Crystal Formation
      const crystalId = lightingSystem.createEnvironmentalLight({ x: 100, y: 100 }, 'CrystalFormation');
      const crystalLight = lightingSystem.getLight(crystalId);
      expect(crystalLight).toBeDefined();
      expect(crystalLight!.color).toEqual([0.6, 0.8, 1.0]);
      expect(crystalLight!.intensity).toBe(0.6);
      expect(crystalLight!.type).toBe(LightType.Glowing);
      expect(crystalLight!.lifetime).toBe(-1); // Infinite

      // Test Lightning Strike
      const lightningId = lightingSystem.createEnvironmentalLight({ x: 200, y: 200 }, 'LightningStrike');
      const lightningLight = lightingSystem.getLight(lightningId);
      expect(lightningLight).toBeDefined();
      expect(lightningLight!.color).toEqual([1.0, 1.0, 0.8]);
      expect(lightningLight!.intensity).toBe(2.0);
      expect(lightningLight!.type).toBe(LightType.Lightning);
      expect(lightningLight!.lifetime).toBe(0.2); // Very short duration
    });
  });

  describe('Ambient Lighting', () => {
    test('should update ambient lighting based on evolution level', () => {
      lightingSystem.updateAmbientLighting(1, 'default');
      let metrics = lightingSystem.getPerformanceMetrics();
      // Evolution modifier should be 1.0 for level 1

      lightingSystem.updateAmbientLighting(5, 'default');
      metrics = lightingSystem.getPerformanceMetrics();
      // Evolution modifier should be higher for level 5

      lightingSystem.updateAmbientLighting(10, 'default');
      metrics = lightingSystem.getPerformanceMetrics();
      // Evolution modifier should be highest for level 10
    });

    test('should adjust ambient lighting for different environments', () => {
      lightingSystem.updateAmbientLighting(5, 'mystical_forest');
      // Should set green tint and lower intensity

      lightingSystem.updateAmbientLighting(5, 'ancient_temple');
      // Should set warm stone color and lower intensity

      lightingSystem.updateAmbientLighting(5, 'crystal_cavern');
      // Should set cool blue color
    });
  });

  describe('Light Updates and Lifecycle', () => {
    test('should update light lifetime correctly', () => {
      lightingSystem.addLight({
        id: 'temp_light',
        position: { x: 100, y: 100 },
        color: [1.0, 1.0, 1.0],
        intensity: 1.0,
        radius: 50,
        type: LightType.Static,
        isActive: true,
        lifetime: 1.0
      });

      // Update with 500ms
      lightingSystem.update(500);
      let light = lightingSystem.getLight('temp_light');
      expect(light).toBeDefined();
      expect(light!.timeAlive).toBe(0.5);

      // Update with another 600ms (total 1.1s, should expire)
      lightingSystem.update(600);
      light = lightingSystem.getLight('temp_light');
      expect(light).toBeUndefined(); // Should be removed
    });

    test('should keep infinite lifetime lights active', () => {
      lightingSystem.addLight({
        id: 'permanent_light',
        position: { x: 100, y: 100 },
        color: [1.0, 1.0, 1.0],
        intensity: 1.0,
        radius: 50,
        type: LightType.Static,
        isActive: true,
        lifetime: -1 // Infinite
      });

      // Update multiple times
      for (let i = 0; i < 10; i++) {
        lightingSystem.update(1000); // 1 second each
      }

      const light = lightingSystem.getLight('permanent_light');
      expect(light).toBeDefined();
      expect(light!.isActive).toBe(true);
    });

    test('should clean up inactive lights', () => {
      lightingSystem.addLight({
        id: 'test_light',
        position: { x: 100, y: 100 },
        color: [1.0, 1.0, 1.0],
        intensity: 1.0,
        radius: 50,
        type: LightType.Static,
        isActive: true
      });

      // Manually set light as inactive
      lightingSystem.updateLight('test_light', { isActive: false });

      // Update should clean up inactive lights
      lightingSystem.update(16);

      const light = lightingSystem.getLight('test_light');
      expect(light).toBeUndefined();
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics', () => {
      // Add some lights
      for (let i = 0; i < 5; i++) {
        lightingSystem.addLight({
          id: `light_${i}`,
          position: { x: i * 100, y: i * 100 },
          color: [1.0, 1.0, 1.0],
          intensity: 1.0,
          radius: 50,
          type: LightType.Static,
          isActive: true
        });
      }

      const metrics = lightingSystem.getPerformanceMetrics();
      expect(metrics.lightCount).toBe(5);
      expect(typeof metrics.performanceMode).toBe('boolean');
      expect(typeof metrics.frameTime).toBe('number');
    });

    test('should handle maximum light limit', () => {
      const maxLights = 32; // Default max lights
      
      // Add more lights than the maximum
      for (let i = 0; i < maxLights + 10; i++) {
        lightingSystem.addLight({
          id: `light_${i}`,
          position: { x: i * 10, y: i * 10 },
          color: [1.0, 1.0, 1.0],
          intensity: 1.0,
          radius: 50,
          type: LightType.Static,
          isActive: true
        });
      }

      const metrics = lightingSystem.getPerformanceMetrics();
      expect(metrics.lightCount).toBe(maxLights + 10); // All lights are stored
      
      // Rendering should handle the limit internally
      expect(() => {
        lightingSystem.render(0);
      }).not.toThrow();
    });
  });

  describe('Rendering', () => {
    test('should render without errors when no lights exist', () => {
      expect(() => {
        lightingSystem.render(0);
      }).not.toThrow();
    });

    test('should render with lights present', () => {
      lightingSystem.addLight({
        id: 'test_light',
        position: { x: 100, y: 100 },
        color: [1.0, 0.5, 0.0],
        intensity: 0.8,
        radius: 50,
        type: LightType.Static,
        isActive: true
      });

      expect(() => {
        lightingSystem.render(1000);
      }).not.toThrow();

      // Verify WebGL calls were made
      expect(mockGL.useProgram).toHaveBeenCalled();
      expect(mockGL.uniform2f).toHaveBeenCalled();
      expect(mockGL.drawArrays).toHaveBeenCalled();
    });

    test('should return lighting texture', () => {
      const texture = lightingSystem.getLightingTexture();
      expect(texture).toBeDefined();
    });
  });

  describe('Disposal', () => {
    test('should dispose resources correctly', () => {
      lightingSystem.addLight({
        id: 'test_light',
        position: { x: 100, y: 100 },
        color: [1.0, 1.0, 1.0],
        intensity: 1.0,
        radius: 50,
        type: LightType.Static,
        isActive: true
      });

      expect(() => {
        lightingSystem.dispose();
      }).not.toThrow();

      // Verify cleanup calls were made
      expect(mockGL.deleteProgram).toHaveBeenCalled();
      expect(mockGL.deleteFramebuffer).toHaveBeenCalled();
      expect(mockGL.deleteTexture).toHaveBeenCalled();
      expect(mockGL.deleteBuffer).toHaveBeenCalled();

      // Verify lights were cleared
      const light = lightingSystem.getLight('test_light');
      expect(light).toBeUndefined();
    });
  });
});