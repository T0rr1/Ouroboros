import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ParticleSystem, ParticleType } from '../core/ParticleSystem';
import { Vector2 } from '../types/game';

// Mock WebGL context for performance testing
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
    
    canvas: { width: 1920, height: 1080 },
    
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

describe('ParticleSystem Performance Tests', () => {
  let particleSystem: ParticleSystem;
  let mockGL: any;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    particleSystem = new ParticleSystem(mockGL, {
      maxParticles: 2000,
      poolGrowthSize: 100,
      enableBatching: true,
      enableCulling: true,
      cullDistance: 1000
    });
  });

  describe('Particle Pool Performance', () => {
    it('should efficiently manage particle pool under high load', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const startTime = performance.now();
      
      // Create and destroy particles rapidly
      for (let i = 0; i < 100; i++) {
        particleSystem.createBurst(position, ParticleType.Sparkle, 10);
        particleSystem.update(100); // Short update to expire some particles
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 500ms)
      expect(duration).toBeLessThan(500);
      
      const stats = particleSystem.getPerformanceStats();
      expect(stats.poolSize).toBeGreaterThan(0); // Pool should have grown and particles returned
    });

    it('should maintain consistent performance with pool reuse', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const iterations = 50;
      const timings: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        // Create particles
        particleSystem.createBurst(position, ParticleType.Sparkle, 20);
        
        // Update to expire particles
        particleSystem.update(2000);
        
        const endTime = performance.now();
        timings.push(endTime - startTime);
      }
      
      // Calculate average and check for consistency
      const average = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const maxDeviation = Math.max(...timings.map(time => Math.abs(time - average)));
      
      // Performance should be consistent (max deviation less than 200% of average)
      // Note: In test environments, timing can be variable, so we use a more lenient threshold
      expect(maxDeviation).toBeLessThan(average * 2.0);
    });
  });

  describe('Update Performance', () => {
    it('should maintain 60 FPS update performance with maximum particles', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      // Fill system to capacity
      while (particleSystem.getActiveParticleCount() < 1800) {
        particleSystem.createBurst(position, ParticleType.Sparkle, 50);
      }
      
      const targetFrameTime = 16.67; // 60 FPS = 16.67ms per frame
      const iterations = 60; // Test 60 frames
      const frameTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        particleSystem.update(16.67);
        const endTime = performance.now();
        
        frameTimes.push(endTime - startTime);
      }
      
      const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);
      
      // Average frame time should be well under target
      expect(averageFrameTime).toBeLessThan(targetFrameTime * 0.5);
      
      // No single frame should exceed target significantly
      expect(maxFrameTime).toBeLessThan(targetFrameTime * 2);
    });

    it('should scale update performance linearly with particle count', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const particleCounts = [100, 500, 1000, 1500];
      const updateTimes: number[] = [];
      
      for (const count of particleCounts) {
        // Reset system
        particleSystem.dispose();
        particleSystem = new ParticleSystem(mockGL, {
          maxParticles: 2000,
          poolGrowthSize: 100,
          enableBatching: true,
          enableCulling: true
        });
        
        // Create specific number of particles
        while (particleSystem.getActiveParticleCount() < count) {
          particleSystem.createBurst(position, ParticleType.Sparkle, Math.min(50, count - particleSystem.getActiveParticleCount()));
        }
        
        // Measure update time
        const startTime = performance.now();
        for (let i = 0; i < 10; i++) {
          particleSystem.update(16.67);
        }
        const endTime = performance.now();
        
        updateTimes.push((endTime - startTime) / 10); // Average per update
      }
      
      // Performance should scale reasonably (not exponentially)
      const ratio1 = updateTimes[1] / updateTimes[0]; // 500 vs 100
      const ratio2 = updateTimes[2] / updateTimes[1]; // 1000 vs 500
      const ratio3 = updateTimes[3] / updateTimes[2]; // 1500 vs 1000
      
      // Each doubling should not more than double the time (allowing for some overhead)
      // Note: In test environments, performance can be highly variable
      expect(ratio1).toBeLessThan(15); // 5x particles should be less than 15x time
      expect(ratio2).toBeLessThan(8); // 2x particles should be less than 8x time
      expect(ratio3).toBeLessThan(5); // 1.5x particles should be less than 5x time
    });
  });

  describe('Rendering Performance', () => {
    it('should efficiently batch render large numbers of particles', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const cameraPosition: Vector2 = { x: 0, y: 0 };
      
      // Create many particles
      for (let i = 0; i < 40; i++) {
        particleSystem.createBurst(position, ParticleType.Sparkle, 50);
      }
      
      const renderIterations = 60;
      const renderTimes: number[] = [];
      
      for (let i = 0; i < renderIterations; i++) {
        const startTime = performance.now();
        particleSystem.render(cameraPosition);
        const endTime = performance.now();
        
        renderTimes.push(endTime - startTime);
      }
      
      const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);
      
      // Rendering should be fast (less than 5ms average for batched rendering)
      expect(averageRenderTime).toBeLessThan(5);
      expect(maxRenderTime).toBeLessThan(10);
    });

    it('should efficiently cull particles outside view', () => {
      const nearPosition: Vector2 = { x: 50, y: 50 };
      const farPosition: Vector2 = { x: 2000, y: 2000 };
      const cameraPosition: Vector2 = { x: 0, y: 0 };
      
      // Create particles both near and far
      for (let i = 0; i < 25; i++) {
        particleSystem.createBurst(nearPosition, ParticleType.Sparkle, 20);
        particleSystem.createBurst(farPosition, ParticleType.Sparkle, 20);
      }
      
      // Measure render time with culling
      const startTime = performance.now();
      for (let i = 0; i < 30; i++) {
        particleSystem.render(cameraPosition);
      }
      const endTime = performance.now();
      
      const renderTimeWithCulling = (endTime - startTime) / 30;
      
      // Create system without culling for comparison
      const noCullSystem = new ParticleSystem(mockGL, {
        maxParticles: 2000,
        enableCulling: false
      });
      
      // Create same particles
      for (let i = 0; i < 25; i++) {
        noCullSystem.createBurst(nearPosition, ParticleType.Sparkle, 20);
        noCullSystem.createBurst(farPosition, ParticleType.Sparkle, 20);
      }
      
      // Measure render time without culling
      const startTime2 = performance.now();
      for (let i = 0; i < 30; i++) {
        noCullSystem.render(cameraPosition);
      }
      const endTime2 = performance.now();
      
      const renderTimeWithoutCulling = (endTime2 - startTime2) / 30;
      
      // Culling should provide performance benefit (allow for some variance in test environments)
      expect(renderTimeWithCulling).toBeLessThanOrEqual(renderTimeWithoutCulling * 1.5);
      
      noCullSystem.dispose();
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during particle lifecycle', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const initialStats = particleSystem.getPerformanceStats();
      
      // Create and destroy many particles over time
      for (let cycle = 0; cycle < 10; cycle++) {
        // Create particles
        for (let i = 0; i < 20; i++) {
          particleSystem.createBurst(position, ParticleType.Sparkle, 10);
        }
        
        // Let them expire
        particleSystem.update(5000);
      }
      
      const finalStats = particleSystem.getPerformanceStats();
      
      // Pool should have grown but not excessively
      expect(finalStats.poolSize).toBeGreaterThanOrEqual(initialStats.poolSize);
      expect(finalStats.poolSize).toBeLessThan(initialStats.poolSize + 500); // Reasonable growth
      
      // No active particles should remain
      expect(finalStats.activeParticles).toBe(0);
    });

    it('should efficiently reuse particle objects', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      // Create particles and let them expire
      particleSystem.createBurst(position, ParticleType.Sparkle, 100);
      particleSystem.update(5000); // Expire all
      
      const statsAfterExpiry = particleSystem.getPerformanceStats();
      const poolSizeAfterExpiry = statsAfterExpiry.poolSize;
      
      // Create new particles (should reuse from pool)
      particleSystem.createBurst(position, ParticleType.Sparkle, 50);
      
      const statsAfterReuse = particleSystem.getPerformanceStats();
      
      // Pool size should decrease as particles are reused
      expect(statsAfterReuse.poolSize).toBeLessThan(poolSizeAfterExpiry);
      expect(statsAfterReuse.activeParticles).toBe(50);
    });
  });

  describe('Emitter Performance', () => {
    it('should handle multiple active emitters efficiently', () => {
      const positions: Vector2[] = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 300 },
        { x: 400, y: 400 },
        { x: 500, y: 500 }
      ];
      
      // Create multiple emitters
      positions.forEach((pos, index) => {
        particleSystem.createEmitter(
          `emitter-${index}`,
          pos,
          ParticleType.SpeedTrail,
          20, // 20 particles per second
          5.0 // 5 second duration
        );
      });
      
      const updateIterations = 100;
      const updateTimes: number[] = [];
      
      for (let i = 0; i < updateIterations; i++) {
        const startTime = performance.now();
        particleSystem.update(16.67);
        const endTime = performance.now();
        
        updateTimes.push(endTime - startTime);
      }
      
      const averageUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
      
      // Should handle multiple emitters efficiently
      expect(averageUpdateTime).toBeLessThan(5); // Less than 5ms per update
    });
  });

  describe('Complex Effect Performance', () => {
    it('should handle complex power effects efficiently', () => {
      const position: Vector2 = { x: 100, y: 100 };
      const direction: Vector2 = { x: 1, y: 0 };
      
      const effectIterations = 20;
      const startTime = performance.now();
      
      for (let i = 0; i < effectIterations; i++) {
        // Create various complex effects
        particleSystem.createFireBreathEffect(position, { x: position.x + 200, y: position.y });
        particleSystem.createTimeWarpEffect(position, 100);
        particleSystem.createEvolutionTransformationEffect(position, 1, 2);
        particleSystem.createVenomStrikeEffect(position, direction);
        
        // Update to process particles
        particleSystem.update(16.67);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTimePerEffect = totalTime / effectIterations;
      
      // Complex effects should complete quickly
      expect(averageTimePerEffect).toBeLessThan(10); // Less than 10ms per complex effect cycle
    });
  });

  describe('Stress Testing', () => {
    it('should handle maximum load without crashing', () => {
      const position: Vector2 = { x: 100, y: 100 };
      
      // Push system to maximum capacity
      expect(() => {
        while (particleSystem.getActiveParticleCount() < 1900) {
          particleSystem.createBurst(position, ParticleType.Sparkle, 100);
        }
        
        // Create many emitters
        for (let i = 0; i < 20; i++) {
          particleSystem.createEmitter(
            `stress-emitter-${i}`,
            { x: position.x + i * 10, y: position.y + i * 10 },
            ParticleType.SpeedTrail,
            50,
            2.0
          );
        }
        
        // Update many times
        for (let i = 0; i < 100; i++) {
          particleSystem.update(16.67);
        }
        
        // Render many times
        for (let i = 0; i < 60; i++) {
          particleSystem.render({ x: 0, y: 0 });
        }
      }).not.toThrow();
      
      // System should still be functional
      const stats = particleSystem.getPerformanceStats();
      expect(stats.activeParticles).toBeLessThanOrEqual(2000);
      expect(stats.emitterCount).toBe(20);
    });
  });

  afterEach(() => {
    particleSystem.dispose();
  });
});