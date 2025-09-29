import { Vector2 } from '../types/game';

export enum ParticleType {
    // Power-specific particles
    SpeedTrail = 'SpeedTrail',
    VenomSpark = 'VenomSpark',
    FireBreath = 'FireBreath',
    TimeWarpRipple = 'TimeWarpRipple',
    InvisibilityShimmer = 'InvisibilityShimmer',

    // Evolution transformation particles
    EvolutionGlow = 'EvolutionGlow',
    TransformationSparkle = 'TransformationSparkle',
    MysticalRune = 'MysticalRune',

    // Environmental destruction particles
    CrystalShard = 'CrystalShard',
    IceFragment = 'IceFragment',
    StoneDust = 'StoneDust',
    FlameExplosion = 'FlameExplosion',

    // General effects
    Sparkle = 'Sparkle',
    Glow = 'Glow',
    Smoke = 'Smoke',
    Magic = 'Magic',
    Explosion = 'Explosion',
    Poison = 'Poison',

    // Tail consumption effects
    TailConsumptionSpiral = 'TailConsumptionSpiral',
    MysticalDissolve = 'MysticalDissolve',
    OuroborosRune = 'OuroborosRune',

    // Weather and environmental particles
    MysticalMist = 'MysticalMist',
    FloatingDust = 'FloatingDust',
    FallingLeaves = 'FallingLeaves',
    AncientRunes = 'AncientRunes',
    CrystalGlimmer = 'CrystalGlimmer',
    TempleEmbers = 'TempleEmbers'
}

export interface ParticleDefinition {
    type: ParticleType;
    lifetime: number;
    size: number;
    sizeVariation: number;
    speed: number;
    speedVariation: number;
    color: [number, number, number, number];
    colorVariation: [number, number, number, number];
    gravity: number;
    fadeRate: number;
    scaleRate: number;
    rotationSpeed: number;
    blendMode: 'normal' | 'additive' | 'multiply';
}

export interface Particle {
    id: number;
    type: ParticleType;
    position: Vector2;
    velocity: Vector2;
    size: number;
    color: [number, number, number, number];
    lifetime: number;
    maxLifetime: number;
    rotation: number;
    rotationSpeed: number;
    gravity: number;
    fadeRate: number;
    scaleRate: number;
    isActive: boolean;
}

export interface ParticleEmitter {
    id: string;
    position: Vector2;
    type: ParticleType;
    emissionRate: number; // particles per second
    burstCount?: number; // for one-time bursts
    duration: number; // -1 for infinite
    direction: Vector2;
    spread: number; // angle spread in radians
    isActive: boolean;
    timeActive: number;
    lastEmissionTime: number;
}

export interface ParticleSystemConfig {
    maxParticles: number;
    poolGrowthSize: number;
    enableBatching: boolean;
    enableCulling: boolean;
    cullDistance: number;
}

export class ParticleSystem {
    private particles: Particle[] = [];
    private particlePool: Particle[] = [];
    private emitters: Map<string, ParticleEmitter> = new Map();
    private particleDefinitions: Map<ParticleType, ParticleDefinition> = new Map();
    private config: ParticleSystemConfig;
    private nextParticleId = 0;
    private activeParticleCount = 0;

    // WebGL rendering resources
    private gl: WebGLRenderingContext;
    private shaderProgram: WebGLProgram | null = null;
    private vertexBuffer: WebGLBuffer | null = null;
    private colorBuffer: WebGLBuffer | null = null;
    private sizeBuffer: WebGLBuffer | null = null;

    // Batch rendering data
    private vertexData: Float32Array;
    private colorData: Float32Array;
    private sizeData: Float32Array;
    private maxBatchSize: number;

    constructor(gl: WebGLRenderingContext, config: Partial<ParticleSystemConfig> = {}) {
        this.gl = gl;
        this.config = {
            maxParticles: config.maxParticles || 2000,
            poolGrowthSize: config.poolGrowthSize || 100,
            enableBatching: config.enableBatching !== false,
            enableCulling: config.enableCulling !== false,
            cullDistance: config.cullDistance || 1000
        };

        this.maxBatchSize = this.config.maxParticles;
        this.vertexData = new Float32Array(this.maxBatchSize * 2); // x, y per particle
        this.colorData = new Float32Array(this.maxBatchSize * 4); // r, g, b, a per particle
        this.sizeData = new Float32Array(this.maxBatchSize); // size per particle

        this.initializeParticleDefinitions();
        this.initializeWebGL();
        this.initializeParticlePool();
    }

    private initializeParticleDefinitions(): void {
        // Power-specific particle definitions
        this.particleDefinitions.set(ParticleType.SpeedTrail, {
            type: ParticleType.SpeedTrail,
            lifetime: 0.5,
            size: 8,
            sizeVariation: 2,
            speed: 50,
            speedVariation: 20,
            color: [0.3, 0.8, 1.0, 0.8],
            colorVariation: [0.1, 0.1, 0.1, 0.2],
            gravity: 0,
            fadeRate: 2.0,
            scaleRate: -1.5,
            rotationSpeed: 0,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.VenomSpark, {
            type: ParticleType.VenomSpark,
            lifetime: 0.8,
            size: 6,
            sizeVariation: 3,
            speed: 80,
            speedVariation: 30,
            color: [0.6, 0.2, 0.8, 1.0],
            colorVariation: [0.2, 0.1, 0.1, 0.0],
            gravity: -20,
            fadeRate: 1.5,
            scaleRate: -0.8,
            rotationSpeed: 5,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.FireBreath, {
            type: ParticleType.FireBreath,
            lifetime: 1.2,
            size: 12,
            sizeVariation: 6,
            speed: 120,
            speedVariation: 40,
            color: [1.0, 0.4, 0.1, 0.9],
            colorVariation: [0.0, 0.3, 0.2, 0.1],
            gravity: -10,
            fadeRate: 1.0,
            scaleRate: 0.5,
            rotationSpeed: 2,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.TimeWarpRipple, {
            type: ParticleType.TimeWarpRipple,
            lifetime: 2.0,
            size: 20,
            sizeVariation: 5,
            speed: 30,
            speedVariation: 10,
            color: [0.8, 0.9, 1.0, 0.6],
            colorVariation: [0.1, 0.1, 0.0, 0.2],
            gravity: 0,
            fadeRate: 0.8,
            scaleRate: 2.0,
            rotationSpeed: 1,
            blendMode: 'normal'
        });

        this.particleDefinitions.set(ParticleType.InvisibilityShimmer, {
            type: ParticleType.InvisibilityShimmer,
            lifetime: 0.6,
            size: 4,
            sizeVariation: 2,
            speed: 20,
            speedVariation: 15,
            color: [1.0, 1.0, 1.0, 0.4],
            colorVariation: [0.0, 0.0, 0.0, 0.2],
            gravity: 0,
            fadeRate: 2.5,
            scaleRate: 0,
            rotationSpeed: 8,
            blendMode: 'additive'
        });

        // Evolution transformation particles
        this.particleDefinitions.set(ParticleType.EvolutionGlow, {
            type: ParticleType.EvolutionGlow,
            lifetime: 3.0,
            size: 15,
            sizeVariation: 8,
            speed: 40,
            speedVariation: 20,
            color: [1.0, 0.8, 0.3, 0.8],
            colorVariation: [0.0, 0.2, 0.3, 0.1],
            gravity: -5,
            fadeRate: 0.5,
            scaleRate: 1.2,
            rotationSpeed: 1.5,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.TransformationSparkle, {
            type: ParticleType.TransformationSparkle,
            lifetime: 2.5,
            size: 8,
            sizeVariation: 4,
            speed: 60,
            speedVariation: 30,
            color: [0.9, 0.9, 1.0, 1.0],
            colorVariation: [0.1, 0.1, 0.0, 0.0],
            gravity: 0,
            fadeRate: 1.0,
            scaleRate: -0.5,
            rotationSpeed: 10,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.MysticalRune, {
            type: ParticleType.MysticalRune,
            lifetime: 4.0,
            size: 25,
            sizeVariation: 5,
            speed: 15,
            speedVariation: 8,
            color: [0.7, 0.3, 0.9, 0.7],
            colorVariation: [0.2, 0.1, 0.1, 0.1],
            gravity: 0,
            fadeRate: 0.3,
            scaleRate: 0.8,
            rotationSpeed: 0.5,
            blendMode: 'additive'
        });

        // Environmental destruction particles
        this.particleDefinitions.set(ParticleType.CrystalShard, {
            type: ParticleType.CrystalShard,
            lifetime: 2.0,
            size: 10,
            sizeVariation: 5,
            speed: 100,
            speedVariation: 50,
            color: [0.6, 0.8, 1.0, 0.9],
            colorVariation: [0.1, 0.1, 0.0, 0.1],
            gravity: 150,
            fadeRate: 1.2,
            scaleRate: -0.3,
            rotationSpeed: 15,
            blendMode: 'normal'
        });

        this.particleDefinitions.set(ParticleType.IceFragment, {
            type: ParticleType.IceFragment,
            lifetime: 1.8,
            size: 8,
            sizeVariation: 4,
            speed: 90,
            speedVariation: 40,
            color: [0.8, 0.9, 1.0, 0.8],
            colorVariation: [0.1, 0.1, 0.0, 0.1],
            gravity: 120,
            fadeRate: 1.5,
            scaleRate: -0.5,
            rotationSpeed: 12,
            blendMode: 'normal'
        });

        this.particleDefinitions.set(ParticleType.StoneDust, {
            type: ParticleType.StoneDust,
            lifetime: 1.5,
            size: 6,
            sizeVariation: 3,
            speed: 70,
            speedVariation: 35,
            color: [0.5, 0.4, 0.3, 0.7],
            colorVariation: [0.1, 0.1, 0.1, 0.1],
            gravity: 80,
            fadeRate: 1.8,
            scaleRate: -0.8,
            rotationSpeed: 8,
            blendMode: 'normal'
        });

        this.particleDefinitions.set(ParticleType.FlameExplosion, {
            type: ParticleType.FlameExplosion,
            lifetime: 1.0,
            size: 18,
            sizeVariation: 8,
            speed: 150,
            speedVariation: 60,
            color: [1.0, 0.3, 0.0, 1.0],
            colorVariation: [0.0, 0.4, 0.2, 0.0],
            gravity: -30,
            fadeRate: 2.0,
            scaleRate: 1.5,
            rotationSpeed: 3,
            blendMode: 'additive'
        });

        // General effects
        this.particleDefinitions.set(ParticleType.Sparkle, {
            type: ParticleType.Sparkle,
            lifetime: 1.5,
            size: 6,
            sizeVariation: 3,
            speed: 40,
            speedVariation: 20,
            color: [1.0, 1.0, 0.8, 1.0],
            colorVariation: [0.0, 0.0, 0.2, 0.0],
            gravity: 0,
            fadeRate: 1.0,
            scaleRate: 0,
            rotationSpeed: 5,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.Glow, {
            type: ParticleType.Glow,
            lifetime: 2.0,
            size: 12,
            sizeVariation: 4,
            speed: 20,
            speedVariation: 10,
            color: [0.8, 0.9, 1.0, 0.6],
            colorVariation: [0.1, 0.1, 0.0, 0.1],
            gravity: 0,
            fadeRate: 0.8,
            scaleRate: 0.5,
            rotationSpeed: 1,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.Smoke, {
            type: ParticleType.Smoke,
            lifetime: 3.0,
            size: 16,
            sizeVariation: 8,
            speed: 30,
            speedVariation: 15,
            color: [0.4, 0.4, 0.4, 0.5],
            colorVariation: [0.1, 0.1, 0.1, 0.1],
            gravity: -20,
            fadeRate: 0.6,
            scaleRate: 1.0,
            rotationSpeed: 0.5,
            blendMode: 'normal'
        });

        this.particleDefinitions.set(ParticleType.Magic, {
            type: ParticleType.Magic,
            lifetime: 2.5,
            size: 10,
            sizeVariation: 5,
            speed: 50,
            speedVariation: 25,
            color: [0.9, 0.5, 1.0, 0.8],
            colorVariation: [0.1, 0.2, 0.0, 0.1],
            gravity: -10,
            fadeRate: 1.2,
            scaleRate: 0.3,
            rotationSpeed: 8,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.Explosion, {
            type: ParticleType.Explosion,
            lifetime: 1.5,
            size: 15,
            sizeVariation: 8,
            speed: 120,
            speedVariation: 50,
            color: [1.0, 0.6, 0.2, 1.0],
            colorVariation: [0.0, 0.2, 0.3, 0.0],
            gravity: 20,
            fadeRate: 1.8,
            scaleRate: 1.2,
            rotationSpeed: 10,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.Poison, {
            type: ParticleType.Poison,
            lifetime: 2.0,
            size: 8,
            sizeVariation: 4,
            speed: 40,
            speedVariation: 20,
            color: [0.4, 0.8, 0.2, 0.8],
            colorVariation: [0.2, 0.1, 0.1, 0.1],
            gravity: -15,
            fadeRate: 1.5,
            scaleRate: 0.5,
            rotationSpeed: 6,
            blendMode: 'additive'
        });

        // Tail consumption particle definitions
        this.particleDefinitions.set(ParticleType.TailConsumptionSpiral, {
            type: ParticleType.TailConsumptionSpiral,
            lifetime: 3.0,
            size: 12,
            sizeVariation: 4,
            speed: 80,
            speedVariation: 20,
            color: [1.0, 0.8, 0.2, 0.9], // Golden mystical color
            colorVariation: [0.0, 0.1, 0.1, 0.1],
            gravity: 0,
            fadeRate: 1.5,
            scaleRate: 0.8,
            rotationSpeed: 12,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.MysticalDissolve, {
            type: ParticleType.MysticalDissolve,
            lifetime: 2.0,
            size: 8,
            sizeVariation: 3,
            speed: 30,
            speedVariation: 15,
            color: [0.8, 0.9, 1.0, 0.7], // Ethereal blue-white
            colorVariation: [0.1, 0.1, 0.0, 0.2],
            gravity: -20,
            fadeRate: 2.0,
            scaleRate: 0.5,
            rotationSpeed: 6,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.OuroborosRune, {
            type: ParticleType.OuroborosRune,
            lifetime: 4.0,
            size: 15,
            sizeVariation: 5,
            speed: 20,
            speedVariation: 10,
            color: [1.0, 0.9, 0.3, 1.0], // Bright golden
            colorVariation: [0.0, 0.1, 0.2, 0.0],
            gravity: 0,
            fadeRate: 0.8,
            scaleRate: 1.2,
            rotationSpeed: 3,
            blendMode: 'additive'
        });

        // Weather and environmental particle definitions
        this.particleDefinitions.set(ParticleType.MysticalMist, {
            type: ParticleType.MysticalMist,
            lifetime: 8.0,
            size: 20,
            sizeVariation: 10,
            speed: 15,
            speedVariation: 8,
            color: [0.7, 0.8, 0.9, 0.3], // Soft blue-white mist
            colorVariation: [0.1, 0.1, 0.1, 0.1],
            gravity: -5,
            fadeRate: 0.4,
            scaleRate: 0.8,
            rotationSpeed: 0.5,
            blendMode: 'normal'
        });

        this.particleDefinitions.set(ParticleType.FloatingDust, {
            type: ParticleType.FloatingDust,
            lifetime: 12.0,
            size: 3,
            sizeVariation: 2,
            speed: 8,
            speedVariation: 5,
            color: [0.8, 0.7, 0.6, 0.4], // Warm dust color
            colorVariation: [0.1, 0.1, 0.1, 0.1],
            gravity: -2,
            fadeRate: 0.3,
            scaleRate: 0.2,
            rotationSpeed: 1,
            blendMode: 'normal'
        });

        this.particleDefinitions.set(ParticleType.FallingLeaves, {
            type: ParticleType.FallingLeaves,
            lifetime: 6.0,
            size: 8,
            sizeVariation: 4,
            speed: 25,
            speedVariation: 15,
            color: [0.4, 0.6, 0.2, 0.8], // Green leaf color
            colorVariation: [0.2, 0.2, 0.1, 0.1],
            gravity: 30,
            fadeRate: 0.8,
            scaleRate: -0.2,
            rotationSpeed: 4,
            blendMode: 'normal'
        });

        this.particleDefinitions.set(ParticleType.AncientRunes, {
            type: ParticleType.AncientRunes,
            lifetime: 10.0,
            size: 12,
            sizeVariation: 6,
            speed: 10,
            speedVariation: 5,
            color: [0.9, 0.7, 0.3, 0.6], // Ancient golden color
            colorVariation: [0.1, 0.1, 0.1, 0.1],
            gravity: 0,
            fadeRate: 0.5,
            scaleRate: 0.3,
            rotationSpeed: 1,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.CrystalGlimmer, {
            type: ParticleType.CrystalGlimmer,
            lifetime: 3.0,
            size: 6,
            sizeVariation: 3,
            speed: 20,
            speedVariation: 10,
            color: [0.8, 0.9, 1.0, 0.9], // Crystal blue-white
            colorVariation: [0.1, 0.1, 0.0, 0.1],
            gravity: 0,
            fadeRate: 1.5,
            scaleRate: 0.5,
            rotationSpeed: 8,
            blendMode: 'additive'
        });

        this.particleDefinitions.set(ParticleType.TempleEmbers, {
            type: ParticleType.TempleEmbers,
            lifetime: 5.0,
            size: 4,
            sizeVariation: 2,
            speed: 12,
            speedVariation: 8,
            color: [1.0, 0.6, 0.2, 0.7], // Warm ember glow
            colorVariation: [0.0, 0.2, 0.1, 0.1],
            gravity: -15,
            fadeRate: 1.0,
            scaleRate: -0.3,
            rotationSpeed: 2,
            blendMode: 'additive'
        });
    }

    private initializeWebGL(): void {
        const gl = this.gl;

        // Handle test environments where WebGL context might be null
        if (!gl) {
            console.warn('WebGL context not available - skipping particle system WebGL initialization');
            return;
        }

        // Vertex shader for point sprites
        const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      attribute float a_size;
      
      uniform vec2 u_resolution;
      
      varying vec4 v_color;
      
      void main() {
        vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        gl_PointSize = a_size;
        v_color = a_color;
      }
    `;

        // Fragment shader for particles
        const fragmentShaderSource = `
      precision mediump float;
      
      varying vec4 v_color;
      
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5, 0.5);
        float dist = length(center);
        
        // Create circular particle with soft edges
        float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
        
        if (alpha < 0.01) {
          discard;
        }
        
        gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
      }
    `;

        // Compile and link shaders
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            throw new Error('Failed to compile particle shaders');
        }

        this.shaderProgram = gl.createProgram();
        if (!this.shaderProgram) {
            throw new Error('Failed to create particle shader program');
        }

        gl.attachShader(this.shaderProgram, vertexShader);
        gl.attachShader(this.shaderProgram, fragmentShader);
        gl.linkProgram(this.shaderProgram);

        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(this.shaderProgram);
            gl.deleteProgram(this.shaderProgram);
            throw new Error(`Failed to link particle shader program: ${error}`);
        }

        // Create buffers
        this.vertexBuffer = gl.createBuffer();
        this.colorBuffer = gl.createBuffer();
        this.sizeBuffer = gl.createBuffer();
    }

    private compileShader(type: number, source: string): WebGLShader | null {
        const gl = this.gl;

        // Handle test environments where WebGL context might be null
        if (!gl) {
            return null;
        }
        const shader = gl.createShader(type);

        if (!shader) return null;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            console.error(`Particle shader compilation error: ${error}`);
            return null;
        }

        return shader;
    }

    private initializeParticlePool(): void {
        // Pre-allocate particle pool
        for (let i = 0; i < this.config.poolGrowthSize; i++) {
            this.particlePool.push(this.createParticle());
        }
    }

    private createParticle(): Particle {
        return {
            id: this.nextParticleId++,
            type: ParticleType.Sparkle,
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            size: 1,
            color: [1, 1, 1, 1],
            lifetime: 0,
            maxLifetime: 1,
            rotation: 0,
            rotationSpeed: 0,
            gravity: 0,
            fadeRate: 1,
            scaleRate: 0,
            isActive: false
        };
    }

    private getParticleFromPool(): Particle | null {
        if (this.particlePool.length === 0) {
            // Grow pool if needed
            if (this.activeParticleCount < this.config.maxParticles) {
                for (let i = 0; i < this.config.poolGrowthSize; i++) {
                    this.particlePool.push(this.createParticle());
                }
            } else {
                return null; // Pool exhausted
            }
        }

        return this.particlePool.pop() || null;
    }

    private returnParticleToPool(particle: Particle): void {
        particle.isActive = false;
        this.particlePool.push(particle);
        this.activeParticleCount--;
    }

    public createEmitter(
        id: string,
        position: Vector2,
        type: ParticleType,
        emissionRate: number,
        duration: number = -1,
        direction: Vector2 = { x: 0, y: -1 },
        spread: number = Math.PI / 4
    ): ParticleEmitter {
        const emitter: ParticleEmitter = {
            id,
            position: { ...position },
            type,
            emissionRate,
            duration,
            direction: { ...direction },
            spread,
            isActive: true,
            timeActive: 0,
            lastEmissionTime: 0
        };

        this.emitters.set(id, emitter);
        return emitter;
    }

    public createBurst(
        position: Vector2,
        type: ParticleType,
        count: number,
        direction: Vector2 = { x: 0, y: -1 },
        spread: number = Math.PI * 2
    ): void {
        const definition = this.particleDefinitions.get(type);
        if (!definition) return;

        for (let i = 0; i < count; i++) {
            const particle = this.getParticleFromPool();
            if (!particle) break;

            this.initializeParticle(particle, position, type, direction, spread, definition);
            this.particles.push(particle);
            this.activeParticleCount++;
        }
    }

    private initializeParticle(
        particle: Particle,
        position: Vector2,
        type: ParticleType,
        direction: Vector2,
        spread: number,
        definition: ParticleDefinition
    ): void {
        particle.type = type;
        particle.position = { ...position };
        particle.isActive = true;

        // Calculate velocity with spread
        const angle = Math.atan2(direction.y, direction.x) + (Math.random() - 0.5) * spread;
        const speed = definition.speed + (Math.random() - 0.5) * definition.speedVariation;

        particle.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };

        // Initialize properties with variation
        particle.size = definition.size + (Math.random() - 0.5) * definition.sizeVariation;
        particle.lifetime = definition.lifetime;
        particle.maxLifetime = definition.lifetime;
        particle.rotation = Math.random() * Math.PI * 2;
        particle.rotationSpeed = definition.rotationSpeed + (Math.random() - 0.5) * definition.rotationSpeed * 0.5;
        particle.gravity = definition.gravity;
        particle.fadeRate = definition.fadeRate;
        particle.scaleRate = definition.scaleRate;

        // Initialize color with variation
        particle.color = [
            Math.max(0, Math.min(1, definition.color[0] + (Math.random() - 0.5) * definition.colorVariation[0])),
            Math.max(0, Math.min(1, definition.color[1] + (Math.random() - 0.5) * definition.colorVariation[1])),
            Math.max(0, Math.min(1, definition.color[2] + (Math.random() - 0.5) * definition.colorVariation[2])),
            Math.max(0, Math.min(1, definition.color[3] + (Math.random() - 0.5) * definition.colorVariation[3]))
        ];
    }

    public update(deltaTime: number): void {
        const dt = deltaTime / 1000; // Convert to seconds

        // Update emitters
        this.updateEmitters(dt);

        // Update particles
        this.updateParticles(dt);

        // Clean up dead particles
        this.cleanupParticles();
    }

    private updateEmitters(deltaTime: number): void {
        for (const [id, emitter] of this.emitters) {
            if (!emitter.isActive) continue;

            emitter.timeActive += deltaTime;

            // Check if emitter should expire
            if (emitter.duration > 0 && emitter.timeActive >= emitter.duration) {
                emitter.isActive = false;
                continue;
            }

            // Emit particles based on emission rate
            const timeSinceLastEmission = emitter.timeActive - emitter.lastEmissionTime;
            const emissionInterval = 1.0 / emitter.emissionRate;

            if (timeSinceLastEmission >= emissionInterval) {
                const particlesToEmit = Math.floor(timeSinceLastEmission / emissionInterval);

                for (let i = 0; i < particlesToEmit; i++) {
                    const particle = this.getParticleFromPool();
                    if (!particle) break;

                    const definition = this.particleDefinitions.get(emitter.type);
                    if (definition) {
                        this.initializeParticle(particle, emitter.position, emitter.type, emitter.direction, emitter.spread, definition);
                        this.particles.push(particle);
                        this.activeParticleCount++;
                    }
                }

                emitter.lastEmissionTime = emitter.timeActive;
            }
        }
    }

    private updateParticles(deltaTime: number): void {
        for (const particle of this.particles) {
            if (!particle.isActive) continue;

            // Update lifetime
            particle.lifetime -= deltaTime;
            if (particle.lifetime <= 0) {
                particle.isActive = false;
                continue;
            }

            // Update position
            particle.position.x += particle.velocity.x * deltaTime;
            particle.position.y += particle.velocity.y * deltaTime;

            // Apply gravity
            particle.velocity.y += particle.gravity * deltaTime;

            // Update rotation
            particle.rotation += particle.rotationSpeed * deltaTime;

            // Update size
            particle.size += particle.scaleRate * deltaTime;
            particle.size = Math.max(0, particle.size);

            // Update alpha based on lifetime and fade rate
            const lifetimeRatio = particle.lifetime / particle.maxLifetime;
            const fadeAlpha = Math.pow(lifetimeRatio, particle.fadeRate);
            particle.color[3] = particle.color[3] * fadeAlpha;
        }
    }

    private cleanupParticles(): void {
        // Remove inactive particles and return them to pool
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (!particle.isActive) {
                this.particles.splice(i, 1);
                this.returnParticleToPool(particle);
            }
        }
    }

    public render(cameraPosition: Vector2 = { x: 0, y: 0 }): void {
        if (!this.shaderProgram || this.particles.length === 0) return;

        const gl = this.gl;

        // Handle test environments where WebGL context might be null
        if (!gl) {
            return;
        }

        // Prepare batch data
        let batchIndex = 0;
        const cullDistanceSquared = this.config.cullDistance * this.config.cullDistance;

        for (const particle of this.particles) {
            if (!particle.isActive || batchIndex >= this.maxBatchSize) continue;

            // Cull particles outside view distance
            if (this.config.enableCulling) {
                const dx = particle.position.x - cameraPosition.x;
                const dy = particle.position.y - cameraPosition.y;
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared > cullDistanceSquared) continue;
            }

            // Add to batch
            const vertexIndex = batchIndex * 2;
            const colorIndex = batchIndex * 4;

            this.vertexData[vertexIndex] = particle.position.x;
            this.vertexData[vertexIndex + 1] = particle.position.y;

            this.colorData[colorIndex] = particle.color[0];
            this.colorData[colorIndex + 1] = particle.color[1];
            this.colorData[colorIndex + 2] = particle.color[2];
            this.colorData[colorIndex + 3] = particle.color[3];

            this.sizeData[batchIndex] = particle.size;

            batchIndex++;
        }

        if (batchIndex === 0) return;

        // Render batch
        gl.useProgram(this.shaderProgram);

        // Set resolution uniform
        const resolutionLocation = gl.getUniformLocation(this.shaderProgram, 'u_resolution');
        gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

        // Bind vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.subarray(0, batchIndex * 2), gl.DYNAMIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.shaderProgram, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Bind color data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.colorData.subarray(0, batchIndex * 4), gl.DYNAMIC_DRAW);

        const colorLocation = gl.getAttribLocation(this.shaderProgram, 'a_color');
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

        // Bind size data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.sizeData.subarray(0, batchIndex), gl.DYNAMIC_DRAW);

        const sizeLocation = gl.getAttribLocation(this.shaderProgram, 'a_size');
        gl.enableVertexAttribArray(sizeLocation);
        gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0);

        // Enable point sprites and render
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.drawArrays(gl.POINTS, 0, batchIndex);
    }

    // Power-specific effect methods
    public createSpeedTrailEffect(position: Vector2, direction: Vector2): void {
        this.createBurst(position, ParticleType.SpeedTrail, 3, direction, Math.PI / 6);
    }

    public createVenomStrikeEffect(position: Vector2, direction: Vector2): void {
        this.createBurst(position, ParticleType.VenomSpark, 8, direction, Math.PI / 3);
    }

    public createFireBreathEffect(startPosition: Vector2, endPosition: Vector2): void {
        const direction = {
            x: endPosition.x - startPosition.x,
            y: endPosition.y - startPosition.y
        };
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);

        if (length > 0) {
            direction.x /= length;
            direction.y /= length;

            // Create multiple bursts along the breath path
            const steps = Math.floor(length / 20);
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const pos = {
                    x: startPosition.x + direction.x * length * t,
                    y: startPosition.y + direction.y * length * t
                };
                this.createBurst(pos, ParticleType.FireBreath, 5, direction, Math.PI / 4);
            }
        }
    }

    public createTimeWarpEffect(position: Vector2, radius: number): void {
        // Create initial ripple immediately
        this.createBurst(position, ParticleType.TimeWarpRipple, 12, { x: 0, y: 0 }, Math.PI * 2);

        // Create expanding ripples with delays
        for (let i = 1; i < 3; i++) {
            setTimeout(() => {
                this.createBurst(position, ParticleType.TimeWarpRipple, 12, { x: 0, y: 0 }, Math.PI * 2);
            }, i * 200);
        }
    }

    public createInvisibilityEffect(position: Vector2): void {
        const emitterId = `invisibility_${Date.now()}`;
        this.createEmitter(emitterId, position, ParticleType.InvisibilityShimmer, 15, 2.0);
    }

    // Evolution transformation effects
    public createEvolutionTransformationEffect(position: Vector2, fromLevel: number, toLevel: number): void {
        // Main glow effect
        this.createBurst(position, ParticleType.EvolutionGlow, 20, { x: 0, y: 0 }, Math.PI * 2);

        // Sparkles
        setTimeout(() => {
            this.createBurst(position, ParticleType.TransformationSparkle, 15, { x: 0, y: 0 }, Math.PI * 2);
        }, 500);

        // Mystical runes for higher levels
        if (toLevel >= 7) {
            setTimeout(() => {
                this.createBurst(position, ParticleType.MysticalRune, 8, { x: 0, y: 0 }, Math.PI * 2);
            }, 1000);
        }
    }

    // Environmental destruction effects
    public createCrystalDestructionEffect(position: Vector2): void {
        this.createBurst(position, ParticleType.CrystalShard, 12, { x: 0, y: -1 }, Math.PI);
    }

    public createIceDestructionEffect(position: Vector2): void {
        this.createBurst(position, ParticleType.IceFragment, 10, { x: 0, y: -1 }, Math.PI);
    }

    public createStoneDestructionEffect(position: Vector2): void {
        this.createBurst(position, ParticleType.StoneDust, 15, { x: 0, y: -1 }, Math.PI);
    }

    public createFlameExplosionEffect(position: Vector2): void {
        this.createBurst(position, ParticleType.FlameExplosion, 20, { x: 0, y: 0 }, Math.PI * 2);
    }

    // Tail consumption effects
    public createTailConsumptionEffect(position: Vector2, segmentsConsumed: number): void {
        // Create mystical spiral effect
        const spiralParticles = Math.min(30, segmentsConsumed * 8);

        // Create spiral pattern
        for (let i = 0; i < spiralParticles; i++) {
            const angle = (i / spiralParticles) * Math.PI * 4; // 2 full rotations
            const radius = 20 + (i / spiralParticles) * 60; // Expanding spiral

            const spiralPosition = {
                x: position.x + Math.cos(angle) * radius,
                y: position.y + Math.sin(angle) * radius
            };

            const direction = {
                x: Math.cos(angle + Math.PI / 2), // Tangent to spiral
                y: Math.sin(angle + Math.PI / 2)
            };

            setTimeout(() => {
                this.createBurst(spiralPosition, ParticleType.TailConsumptionSpiral, 1, direction, 0);
            }, i * 50); // Stagger the spiral creation
        }

        // Central mystical explosion
        this.createBurst(position, ParticleType.OuroborosRune, 8, { x: 0, y: 0 }, Math.PI * 2);

        // Additional mystical energy burst based on segments consumed
        const energyBursts = Math.min(5, Math.ceil(segmentsConsumed / 2));
        for (let i = 0; i < energyBursts; i++) {
            setTimeout(() => {
                this.createBurst(position, ParticleType.Magic, 6, { x: 0, y: 0 }, Math.PI * 2);
            }, i * 300);
        }
    }

    public createMysticalDissolveEffect(position: Vector2): void {
        // Create dissolving effect for consumed segments
        this.createBurst(position, ParticleType.MysticalDissolve, 8, { x: 0, y: 0 }, Math.PI * 2);

        // Add some sparkles for extra mystical feel
        setTimeout(() => {
            this.createBurst(position, ParticleType.Sparkle, 4, { x: 0, y: 0 }, Math.PI * 2);
        }, 200);
    }

    public createDeathEffect(position: Vector2, deathReason: string): void {
        // Create death explosion effect based on death reason
        switch (deathReason) {
            case 'SelfCollision':
                this.createBurst(position, ParticleType.Explosion, 15, { x: 0, y: 0 }, Math.PI * 2);
                break;
            case 'WallCollision':
                this.createBurst(position, ParticleType.StoneDust, 12, { x: 0, y: -1 }, Math.PI);
                break;
            case 'ObstacleCollision':
                this.createBurst(position, ParticleType.CrystalShard, 10, { x: 0, y: -1 }, Math.PI);
                break;
            case 'EnvironmentalHazard':
                this.createBurst(position, ParticleType.FlameExplosion, 18, { x: 0, y: 0 }, Math.PI * 2);
                break;
            case 'PoisonEffect':
                this.createBurst(position, ParticleType.Poison, 12, { x: 0, y: 0 }, Math.PI * 2);
                break;
            default:
                this.createBurst(position, ParticleType.Explosion, 15, { x: 0, y: 0 }, Math.PI * 2);
        }

        // Add some sparkles for dramatic effect
        setTimeout(() => {
            this.createBurst(position, ParticleType.Sparkle, 8, { x: 0, y: 0 }, Math.PI * 2);
        }, 300);
    }

    // Weather and environmental particle effects
    public createWeatherEffect(environmentType: string, bounds: { width: number; height: number }): string {
        const emitterId = `weather_${environmentType}_${Date.now()}`;
        
        switch (environmentType) {
            case 'mystical_forest':
                // Create floating mist and falling leaves
                this.createEmitter(
                    `${emitterId}_mist`,
                    { x: Math.random() * bounds.width, y: -20 },
                    ParticleType.MysticalMist,
                    2, // 2 particles per second
                    -1, // Infinite duration
                    { x: 0, y: 1 },
                    Math.PI / 8
                );
                
                this.createEmitter(
                    `${emitterId}_leaves`,
                    { x: Math.random() * bounds.width, y: -20 },
                    ParticleType.FallingLeaves,
                    1, // 1 leaf per second
                    -1,
                    { x: 0.2, y: 1 }, // Slight horizontal drift
                    Math.PI / 6
                );
                break;
                
            case 'ancient_temple':
                // Create floating dust and ancient runes
                this.createEmitter(
                    `${emitterId}_dust`,
                    { x: Math.random() * bounds.width, y: bounds.height + 20 },
                    ParticleType.FloatingDust,
                    3, // 3 dust particles per second
                    -1,
                    { x: 0, y: -1 },
                    Math.PI / 4
                );
                
                this.createEmitter(
                    `${emitterId}_runes`,
                    { x: Math.random() * bounds.width, y: Math.random() * bounds.height },
                    ParticleType.AncientRunes,
                    0.5, // 1 rune every 2 seconds
                    -1,
                    { x: 0, y: -1 },
                    Math.PI * 2
                );
                
                this.createEmitter(
                    `${emitterId}_embers`,
                    { x: Math.random() * bounds.width, y: bounds.height + 20 },
                    ParticleType.TempleEmbers,
                    1.5, // 1.5 embers per second
                    -1,
                    { x: 0, y: -1 },
                    Math.PI / 3
                );
                break;
                
            case 'crystal_cavern':
                // Create crystal glimmers and mystical mist
                this.createEmitter(
                    `${emitterId}_glimmer`,
                    { x: Math.random() * bounds.width, y: Math.random() * bounds.height },
                    ParticleType.CrystalGlimmer,
                    2, // 2 glimmers per second
                    -1,
                    { x: 0, y: 0 },
                    Math.PI * 2
                );
                
                this.createEmitter(
                    `${emitterId}_mist`,
                    { x: Math.random() * bounds.width, y: bounds.height + 20 },
                    ParticleType.MysticalMist,
                    1, // 1 mist particle per second
                    -1,
                    { x: 0, y: -1 },
                    Math.PI / 6
                );
                break;
                
            default:
                // Default mystical environment
                this.createEmitter(
                    `${emitterId}_dust`,
                    { x: Math.random() * bounds.width, y: bounds.height + 20 },
                    ParticleType.FloatingDust,
                    2,
                    -1,
                    { x: 0, y: -1 },
                    Math.PI / 4
                );
        }
        
        return emitterId;
    }

    public stopWeatherEffect(emitterId: string): void {
        // Stop all emitters associated with this weather effect
        for (const [id, emitter] of this.emitters) {
            if (id.startsWith(emitterId)) {
                emitter.isActive = false;
            }
        }
    }

    public createAmbientParticles(bounds: { width: number; height: number }): void {
        // Create subtle ambient particles that enhance the mystical atmosphere
        const ambientEmitterId = `ambient_${Date.now()}`;
        
        // Floating dust motes
        this.createEmitter(
            `${ambientEmitterId}_dust`,
            { x: Math.random() * bounds.width, y: Math.random() * bounds.height },
            ParticleType.FloatingDust,
            0.5, // Very sparse
            -1,
            { x: 0, y: -1 },
            Math.PI * 2
        );
        
        // Occasional mystical sparkles
        this.createEmitter(
            `${ambientEmitterId}_sparkles`,
            { x: Math.random() * bounds.width, y: Math.random() * bounds.height },
            ParticleType.Sparkle,
            0.2, // Very rare
            -1,
            { x: 0, y: 0 },
            Math.PI * 2
        );
    }

    // Utility methods
    public removeEmitter(id: string): void {
        this.emitters.delete(id);
    }

    public updateEmitterPosition(id: string, position: Vector2): void {
        const emitter = this.emitters.get(id);
        if (emitter) {
            emitter.position = { ...position };
        }
    }

    public getActiveParticleCount(): number {
        return this.activeParticleCount;
    }

    public getPoolSize(): number {
        return this.particlePool.length;
    }

    public getPerformanceStats(): {
        activeParticles: number;
        poolSize: number;
        emitterCount: number;
        maxParticles: number;
    } {
        return {
            activeParticles: this.activeParticleCount,
            poolSize: this.particlePool.length,
            emitterCount: this.emitters.size,
            maxParticles: this.config.maxParticles
        };
    }

    public clear(): void {
        // Clear all active particles
        this.particles.forEach(particle => {
            this.returnParticleToPool(particle);
        });
        this.particles = [];
        this.activeParticleCount = 0;
        
        // Clear all emitters
        this.emitters.clear();
    }
    
    // Performance optimization methods
    public setMaxParticles(maxParticles: number): void {
        if (maxParticles !== this.config.maxParticles) {
            this.config.maxParticles = maxParticles;
            this.maxBatchSize = maxParticles;
            
            // Resize buffers
            this.vertexData = new Float32Array(this.maxBatchSize * 2);
            this.colorData = new Float32Array(this.maxBatchSize * 4);
            this.sizeData = new Float32Array(this.maxBatchSize);
            
            // Remove excess particles if needed
            if (this.particles.length > maxParticles) {
                const excessParticles = this.particles.splice(maxParticles);
                this.particlePool.push(...excessParticles);
                this.activeParticleCount = Math.min(this.activeParticleCount, maxParticles);
            }
        }
    }
    
    public setEffectsEnabled(enabled: boolean): void {
        if (!enabled) {
            // Clear all particles when effects are disabled
            this.clear();
        }
    }
    
    public getMaxParticles(): number {
        return this.config.maxParticles;
    }
    
    public getMemoryUsage(): number {
        const particleSize = 32; // Approximate bytes per particle
        const bufferSize = this.vertexData.byteLength + this.colorData.byteLength + this.sizeData.byteLength;
        return (this.particles.length + this.particlePool.length) * particleSize + bufferSize;
    }
    
    public optimizeMemory(): void {
        // Remove excess pooled particles
        const targetPoolSize = Math.min(this.config.poolGrowthSize * 2, this.config.maxParticles / 4);
        if (this.particlePool.length > targetPoolSize) {
            this.particlePool.splice(targetPoolSize);
        }
        
        // Compact particle array if needed
        if (this.particles.length > this.activeParticleCount * 1.5) {
            this.particles = this.particles.filter(p => p.isActive);
        }
    }

    public dispose(): void {
        const gl = this.gl;

        // Handle test environments where WebGL context might be null
        if (!gl) {
            return;
        }

        if (this.shaderProgram) {
            gl.deleteProgram(this.shaderProgram);
            this.shaderProgram = null;
        }

        if (this.vertexBuffer) {
            gl.deleteBuffer(this.vertexBuffer);
            this.vertexBuffer = null;
        }

        if (this.colorBuffer) {
            gl.deleteBuffer(this.colorBuffer);
            this.colorBuffer = null;
        }

        if (this.sizeBuffer) {
            gl.deleteBuffer(this.sizeBuffer);
            this.sizeBuffer = null;
        }

        this.particles.length = 0;
        this.particlePool.length = 0;
        this.emitters.clear();
    }
}