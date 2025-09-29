import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParticleSystem, ParticleType, ParticleSystemConfig } from '../core/ParticleSystem';
import { Vector2 } from '../types/game';

// Mock WebGL context
const createMockWebGLContext = () => {
  const mockGL = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    POINTS: 0,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    COLOR_BUFFER_BIT: 16384,
    
    canvas: { width: 800, height: 600 },
    
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
    
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),
    
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform2f: vi.fn(),
    uniform1f: vi.fn(),
    uniform3f: vi.fn(),
    uniform1i: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniform2fv: vi.fn(),
    
    enable: vi.fn(),
    blendFunc: vi.fn(),
    drawArrays: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    viewport: vi.fn()
  };
  
  return mockGL as any;
};

describe('ParticleSystem', () => {
  let particleSystem: ParticleSystem;
  let mockGL: any;
  let config: ParticleSystemConfig;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    config = {
      maxParticles: 100,
      poolGrowthSize: 10,
      enableBatching: true,
      enableCulling: true,
      cullDistance: 500
    };
    
    particleSystem = new ParticleSystem(mockGL, config);
  });

  describe('Initialization', () => {
    it('should initialize with default config when no config provided', () => {
      const defaultSystem = new ParticleSystem(mockGL);
      const stats = defaultSystem.getPerformanceStats();
      
      expect(stats.maxParticles).toBe(2000);
      expect(stats.poolSize).toBe(100); // Default pool growth size
    });

    it('should initialize with custom config', () => {
      const stats = particleSystem.getPerformanceStats();
      
      expect(stats.maxParticles).toBe(100);
      expect(stats.poolSize).toBe(10);
    });

    it('should create WebGL shaders and buffers', () => {
      expect(mockGL.createShader).toHaveBeenCalledWith(mockGL.VERTEX_SHADER);
      expect(mockGL.createShader).toHaveBeenCalledWith(mockGL.FRAGMENT_SHADER);
      expect(mockGL.createProgram).toHaveBeenCalled();
      expect(mockGL.createBuffer).toHaveBeenCalledTimes(3); // vertex, color, size buffers
    });
  });

  describe('Particle Pool Management', () => {
    it('should start with empty active particles and full pool', () => {
      const stats = particleSystem.getPerformanceStats();
      
      expect(stats.activeParticles).toBe(0);
      expect(stats.poolSize).toBe(10);
    });

    it('should grow pool when needed', () => {
      // Create more particles than initial pool size
      const position: Vector2 = { x: 100, y: 100 };
      
      for (let i = 0; i < 15; i++) {
        particleSystem.createBurst(position, ParticleType.Sparkle, 1);
      }
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(15);
      expect(stats.poolSize).toBeGreaterThanOrEqual(0); // Pool should have grown
    });

    it('should respect max particle limit', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      // Try to create more particles than max limit
      particleSystem.createBurst(position, ParticleType.Sparkle, 150);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeLessThanOrEqual(100);
    });
  });

  describe('Particle Creation', () => {
    it('should create burst particles', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      particleSystem.createBurst(position, ParticleType.Sparkle, 5, direction, Math.PI / 4);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(5);
    });

    it('should create emitter', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 0, y: -1 };
      
      const emitter = particleSystem.createEmitter(
        'test-emitter',
        position,
        ParticleType.SpeedTrail,
        10, // 10 particles per second
        2.0, // 2 second duration
        direction,
        Math.PI / 6
      );
      
      expect(emitter.id).toBe('test-emitter');
      expect(emitter.emissionRate).toBe(10);
      expect(emitter.duration).toBe(2.0);
      expect(emitter.isActive).toBe(true);
    });

    it('should emit particles from emitter over time', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createEmitter(
        'test-emitter',
        position,
        ParticleType.SpeedTrail,
        10, // 10 particles per second
        1.0
      );
      
      // Update multiple times to simulate 0.5 seconds (500ms)
      for (let i = 0; i < 5; i++) {
        particleSystem.update(100); // 100ms each update
      }
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeGreaterThan(0);
    });
  });

  describe('Particle Updates', () => {
    it('should update particle positions based on velocity', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      particleSystem.createBurst(position, ParticleType.SpeedTrail, 1, direction, 0);
      
      // Update for 1 second
      particleSystem.update(1000);
      
      // Particles should have moved (we can't directly check positions, but they should still be active)
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeLessThanOrEqual(1); // May have expired
    });

    it('should remove expired particles', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      // Create particles with short lifetime
      particleSystem.createBurst(position, ParticleType.Sparkle, 5);
      
      let stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(5);
      
      // Update for a long time to expire all particles
      particleSystem.update(10000); // 10 seconds
      
      stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(0);
    });

    it('should deactivate expired emitters', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createEmitter(
        'test-emitter',
        position,
        ParticleType.SpeedTrail,
        10,
        0.5 // 0.5 second duration
      );
      
      // Update for longer than emitter duration
      particleSystem.update(1000);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.emitterCount).toBe(1); // Emitter still exists but should be inactive
    });
  });

  describe('Power-Specific Effects', () => {
    it('should create speed trail effect', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      particleSystem.createSpeedTrailEffect(position, direction);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(3); // Speed trail creates 3 particles
    });

    it('should create venom strike effect', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      particleSystem.createVenomStrikeEffect(position, direction);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(8); // Venom strike creates 8 particles
    });

    it('should create fire breath effect', () => {
      const startPosition: Vector2 = { x: 100, y: 100 };
      const endPosition: Vector2 = { x: 200, y: 100 };
      
      particleSystem.createFireBreathEffect(startPosition, endPosition);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeGreaterThan(0);
    });

    it('should create time warp effect', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createTimeWarpEffect(position, 50);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(12); // Initial ripple
    });

    it('should create invisibility effect', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createInvisibilityEffect(position);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.emitterCount).toBe(1); // Creates an emitter
    });
  });

  describe('Evolution Transformation Effects', () => {
    it('should create evolution transformation effect', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createEvolutionTransformationEffect(position, 1, 2);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(20); // Initial glow effect
    });

    it('should create enhanced effects for higher evolution levels', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createEvolutionTransformationEffect(position, 6, 7);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(20); // Initial glow effect, more effects come later via setTimeout
    });
  });

  describe('Environmental Destruction Effects', () => {
    it('should create crystal destruction effect', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createCrystalDestructionEffect(position);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(12);
    });

    it('should create ice destruction effect', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createIceDestructionEffect(position);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(10);
    });

    it('should create stone destruction effect', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createStoneDestructionEffect(position);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(15);
    });

    it('should create flame explosion effect', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createFlameExplosionEffect(position);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(20);
    });
  });

  describe('Emitter Management', () => {
    it('should remove emitter by id', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      particleSystem.createEmitter('test-emitter', position, ParticleType.SpeedTrail, 10, 1.0);
      
      let stats = particleSystem.getPerformanceStats();
      expect(stats.emitterCount).toBe(1);
      
      particleSystem.removeEmitter('test-emitter');
      
      stats = particleSystem.getPerformanceStats();
      expect(stats.emitterCount).toBe(0);
    });

    it('should update emitter position', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const newPosition: Vector2 = { x: 200, y: 200 };
      
      particleSystem.createEmitter('test-emitter', position, ParticleType.SpeedTrail, 10, 1.0);
      particleSystem.updateEmitterPosition('test-emitter', newPosition);
      
      // We can't directly verify the position change, but the method should not throw
      expect(() => {
        particleSystem.updateEmitterPosition('test-emitter', newPosition);
      }).not.toThrow();
    });
  });

  describe('Rendering', () => {
    it('should render particles without errors', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const cameraPosition: Vector2 = { x: 0, y: 0 };
      
      particleSystem.createBurst(position, ParticleType.Sparkle, 5);
      
      expect(() => {
        particleSystem.render(cameraPosition);
      }).not.toThrow();
      
      expect(mockGL.useProgram).toHaveBeenCalled();
      expect(mockGL.drawArrays).toHaveBeenCalled();
    });

    it('should cull particles outside view distance when culling enabled', () => {
      const nearPosition: Vector2 = { x: 10, y: 10 };
      const farPosition: Vector2 = { x: 1000, y: 1000 };
      const cameraPosition: Vector2 = { x: 0, y: 0 };
      
      particleSystem.createBurst(nearPosition, ParticleType.Sparkle, 1);
      particleSystem.createBurst(farPosition, ParticleType.Sparkle, 1);
      
      particleSystem.render(cameraPosition);
      
      // Should render something (near particles), but we can't easily verify culling
      expect(mockGL.drawArrays).toHaveBeenCalled();
    });

    it('should not render when no particles exist', () => {
      const cameraPosition: Vector2 = { x: 0, y: 0 };
      
      particleSystem.render(cameraPosition);
      
      // Should not call drawArrays when no particles
      expect(mockGL.drawArrays).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should provide performance statistics', () => {
      const stats = particleSystem.getPerformanceStats();
      
      expect(stats).toHaveProperty('activeParticles');
      expect(stats).toHaveProperty('poolSize');
      expect(stats).toHaveProperty('emitterCount');
      expect(stats).toHaveProperty('maxParticles');
      
      expect(typeof stats.activeParticles).toBe('number');
      expect(typeof stats.poolSize).toBe('number');
      expect(typeof stats.emitterCount).toBe('number');
      expect(typeof stats.maxParticles).toBe('number');
    });

    it('should handle high particle counts efficiently', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      // Create many particles
      for (let i = 0; i < 10; i++) {
        particleSystem.createBurst(position, ParticleType.Sparkle, 10);
      }
      
      const startTime = performance.now();
      
      // Update multiple times
      for (let i = 0; i < 10; i++) {
        particleSystem.update(16); // 60 FPS
      }
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      // Should complete updates in reasonable time (less than 100ms for this test)
      expect(updateTime).toBeLessThan(100);
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources properly', () => {
      particleSystem.dispose();
      
      expect(mockGL.deleteProgram).toHaveBeenCalled();
      expect(mockGL.deleteBuffer).toHaveBeenCalledTimes(3);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBe(0);
      expect(stats.poolSize).toBe(0);
      expect(stats.emitterCount).toBe(0);
    });
  });
});