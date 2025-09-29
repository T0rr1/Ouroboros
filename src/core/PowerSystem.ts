import { Vector2, GameConfig, Obstacle, ObstacleType } from '../types/game';
import { PowerType, PowerState } from './EvolutionSystem';

export interface PowerEffect {
    type: PowerEffectType;
    position: Vector2;
    velocity: Vector2;
    lifetime: number;
    remainingLifetime: number;
    color: string;
    size: number;
    fadeRate: number;
    data?: any; // Additional effect-specific data
}

export enum PowerEffectType {
    SpeedTrail = 'SpeedTrail',
    VenomProjectile = 'VenomProjectile',
    VenomImpact = 'VenomImpact',
    PowerActivation = 'PowerActivation',
    Glow = 'Glow',
    WallPhasing = 'WallPhasing',
    FireBreath = 'FireBreath',
    ObstacleDestruction = 'ObstacleDestruction',
    CrystalShatter = 'CrystalShatter',
    ConstrictGlow = 'ConstrictGlow',
    HoodExpansion = 'HoodExpansion',
    AquaticShimmer = 'AquaticShimmer',
    ColorShift = 'ColorShift',
    InvisibilityShimmer = 'InvisibilityShimmer',
    GoldenAura = 'GoldenAura',
    RegenerationSparkle = 'RegenerationSparkle',
    TimeWarp = 'TimeWarp',
    TailConsumption = 'TailConsumption',
    PowerCycling = 'PowerCycling',
    RealityManipulation = 'RealityManipulation',
    CelestialGlow = 'CelestialGlow',
    DragonicFlames = 'DragonicFlames',
    MysticalRunes = 'MysticalRunes',
    FoodAttraction = 'FoodAttraction',
    HeatVision = 'HeatVision'
}

export interface PowerActivationResult {
    success: boolean;
    powerType: PowerType;
    effects: PowerEffect[];
    message?: string;
    environmentalInteractions?: EnvironmentalInteraction[];
}

export interface EnvironmentalInteraction {
    type: 'destroy' | 'damage' | 'phase' | 'activate';
    obstacleId: string;
    powerType: PowerType;
    damage?: number;
    effects: PowerEffect[];
}

export interface PowerVisualState {
    activePowers: PowerType[];
    effects: PowerEffect[];
    cooldowns: Map<PowerType, number>;
    durations: Map<PowerType, number>;
}

export class PowerSystem {
    private config: GameConfig;
    private activePowers: Map<PowerType, PowerState>;
    private activeEffects: PowerEffect[];
    private powerDefinitions: Map<PowerType, PowerDefinition> = new Map();
    private nextEffectId: number = 0;

    constructor(config: GameConfig) {
        this.config = config;
        this.activePowers = new Map();
        this.activeEffects = [];
        this.initializePowerDefinitions();
    }

    private initializePowerDefinitions(): void {
        this.powerDefinitions = new Map();

        // Speed Boost - Garden Snake (Level 2)
        this.powerDefinitions.set(PowerType.SpeedBoost, {
            type: PowerType.SpeedBoost,
            name: 'Speed Boost',
            description: 'Increases movement speed for a short duration',
            cooldown: 8000, // 8 seconds
            duration: 3000, // 3 seconds
            energyCost: 0,
            visualEffect: PowerEffectType.SpeedTrail,
            audioEffect: 'speedboost_activate',
            speedMultiplier: 2.0,
            color: '#FFEB3B', // Yellow
            glowIntensity: 0.8,
            environmentalInteractions: ['WallPhasing'] // Can phase through magic barriers
        });

        // Venom Strike - Viper (Level 3)
        this.powerDefinitions.set(PowerType.VenomStrike, {
            type: PowerType.VenomStrike,
            name: 'Venom Strike',
            description: 'Launches a venomous projectile that can shatter obstacles',
            cooldown: 5000, // 5 seconds
            duration: 0, // Instant
            energyCost: 0,
            visualEffect: PowerEffectType.VenomProjectile,
            audioEffect: 'venom_strike',
            projectileSpeed: 800, // pixels per second
            projectileRange: 350, // pixels
            color: '#4CAF50', // Green
            glowIntensity: 0.6,
            environmentalInteractions: ['CrystalDestruction'] // Can destroy crystal formations
        });

        // Constrict - Python (Level 4)
        this.powerDefinitions.set(PowerType.Constrict, {
            type: PowerType.Constrict,
            name: 'Constrict',
            description: 'Squeezes through narrow passages and activates pressure plates',
            cooldown: 10000, // 10 seconds
            duration: 2000, // 2 seconds
            energyCost: 0,
            visualEffect: PowerEffectType.PowerActivation,
            audioEffect: 'constrict_activate',
            color: '#8D6E63', // Brown
            glowIntensity: 0.7,
            environmentalInteractions: ['PressurePlateActivation', 'NarrowPassage'],
            specialEffects: ['DoubleFoodValue'] // Double food value for 5 seconds
        });

        // Hood Expansion - Cobra (Level 5)
        this.powerDefinitions.set(PowerType.HoodExpansion, {
            type: PowerType.HoodExpansion,
            name: 'Hood Expansion',
            description: 'Provides invincibility and intimidates harmful creatures',
            cooldown: 15000, // 15 seconds
            duration: 3000, // 3 seconds
            energyCost: 0,
            visualEffect: PowerEffectType.PowerActivation,
            audioEffect: 'hood_expansion',
            color: '#FFC107', // Golden
            glowIntensity: 0.9,
            environmentalInteractions: ['Intimidation'],
            specialEffects: ['Invincibility', 'CreatureIntimidation']
        });

        // Aquatic Movement - Anaconda (Level 6)
        this.powerDefinitions.set(PowerType.AquaticMovement, {
            type: PowerType.AquaticMovement,
            name: 'Aquatic Movement',
            description: 'Allows crossing water pools and underwater navigation',
            cooldown: 0, // Passive ability
            duration: 0, // Passive
            energyCost: 0,
            visualEffect: PowerEffectType.PowerActivation,
            audioEffect: 'aquatic_movement',
            color: '#2E7D32', // Dark green
            glowIntensity: 0.5,
            environmentalInteractions: ['WaterTraversal', 'UnderwaterTunnels'],
            specialEffects: ['Regeneration', 'BreathHolding']
        });

        // Color Change - Rainbow Serpent (Level 7)
        this.powerDefinitions.set(PowerType.ColorChange, {
            type: PowerType.ColorChange,
            name: 'Color Change',
            description: 'Provides invisibility and camouflage abilities',
            cooldown: 12000, // 12 seconds
            duration: 5000, // 5 seconds
            energyCost: 0,
            visualEffect: PowerEffectType.PowerActivation,
            audioEffect: 'color_change',
            color: '#E91E63', // Pink/magenta
            glowIntensity: 0.8,
            environmentalInteractions: ['Invisibility', 'PoisonGasCamouflage'],
            specialEffects: ['Invisibility', 'ConsumeAnyFood']
        });

        // Time Warp - Celestial Serpent (Level 8)
        this.powerDefinitions.set(PowerType.TimeWarp, {
            type: PowerType.TimeWarp,
            name: 'Time Warp',
            description: 'Slows down moving hazards and provides temporal dodge',
            cooldown: 20000, // 20 seconds
            duration: 4000, // 4 seconds
            energyCost: 0,
            visualEffect: PowerEffectType.TimeWarp,
            audioEffect: 'time_warp',
            color: '#3F51B5', // Indigo blue
            glowIntensity: 0.9,
            environmentalInteractions: ['HazardSlowing', 'TemporalDodge'],
            specialEffects: ['FoodAttraction', 'TimeSlowing']
        });

        // Fire Breath - Ancient Dragon Serpent (Level 9)
        this.powerDefinitions.set(PowerType.FireBreath, {
            type: PowerType.FireBreath,
            name: 'Fire Breath',
            description: 'Breathes fire to destroy multiple obstacle types',
            cooldown: 8000, // 8 seconds
            duration: 1500, // 1.5 seconds of continuous fire
            energyCost: 0,
            visualEffect: PowerEffectType.FireBreath,
            audioEffect: 'fire_breath',
            range: 200, // pixels
            damage: 100, // High damage to destroy most obstacles
            color: '#FF5722', // Orange-red
            glowIntensity: 1.0,
            environmentalInteractions: ['IceWallDestruction', 'ThornBushDestruction', 'WoodenBarrierDestruction', 'FlameGeyserDestruction', 'PoisonGasDestruction', 'EnemySpawnerDestruction']
        });

        // Tail Consumption - Ouroboros (Level 10)
        this.powerDefinitions.set(PowerType.TailConsumption, {
            type: PowerType.TailConsumption,
            name: 'Tail Consumption',
            description: 'Strategically consume tail segments for navigation and bonuses',
            cooldown: 3000, // 3 seconds
            duration: 0, // Instant
            energyCost: 0,
            visualEffect: PowerEffectType.TailConsumption,
            audioEffect: 'tail_consumption',
            color: '#FFD700', // Golden
            glowIntensity: 1.0,
            environmentalInteractions: [],
            specialEffects: ['StrategicLengthManagement', 'BonusPoints']
        });

        // Power Cycling - Ouroboros (Level 10)
        this.powerDefinitions.set(PowerType.PowerCycling, {
            type: PowerType.PowerCycling,
            name: 'Power Cycling',
            description: 'Activate any previous evolution abilities with cooldown',
            cooldown: 25000, // 25 seconds
            duration: 0, // Instant activation
            energyCost: 0,
            visualEffect: PowerEffectType.PowerCycling,
            audioEffect: 'power_cycling',
            color: '#FFD700', // Golden
            glowIntensity: 1.0,
            environmentalInteractions: [],
            specialEffects: ['AccessAllPreviousPowers']
        });

        // Reality Manipulation - Ouroboros (Level 10)
        this.powerDefinitions.set(PowerType.RealityManipulation, {
            type: PowerType.RealityManipulation,
            name: 'Reality Manipulation',
            description: 'Reshape small environment sections and bend reality',
            cooldown: 30000, // 30 seconds
            duration: 6000, // 6 seconds
            energyCost: 0,
            visualEffect: PowerEffectType.RealityManipulation,
            audioEffect: 'reality_manipulation',
            range: 150, // pixels
            color: '#FFD700', // Golden
            glowIntensity: 1.0,
            environmentalInteractions: ['EnvironmentReshaping', 'ObstacleCreation', 'PathCreation'],
            specialEffects: ['RealityBending', 'EnvironmentControl']
        });
    }

    public update(deltaTime: number): void {
        // Update power cooldowns and durations
        this.updatePowerStates(deltaTime);

        // Update visual effects
        this.updateEffects(deltaTime);
    }

    private updatePowerStates(deltaTime: number): void {
        this.activePowers.forEach((powerState, powerType) => {
            // Update cooldown
            if (powerState.cooldownRemaining > 0) {
                powerState.cooldownRemaining = Math.max(0, powerState.cooldownRemaining - deltaTime);
            }

            // Update active duration
            if (powerState.isActive && powerState.remainingDuration !== undefined && powerState.remainingDuration > 0) {
                powerState.remainingDuration = Math.max(0, powerState.remainingDuration - deltaTime);

                if (powerState.remainingDuration <= 0) {
                    this.deactivatePower(powerType);
                }
            }
        });
    }

    private updateEffects(deltaTime: number): void {
        // Update all active effects
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];

            effect.remainingLifetime -= deltaTime;

            // Update effect position based on velocity
            effect.position.x += effect.velocity.x * (deltaTime / 1000);
            effect.position.y += effect.velocity.y * (deltaTime / 1000);

            // Handle effect-specific updates
            this.updateSpecificEffect(effect, deltaTime);

            // Remove expired effects
            if (effect.remainingLifetime <= 0) {
                this.activeEffects.splice(i, 1);
            }
        }
    }

    private updateSpecificEffect(effect: PowerEffect, deltaTime: number): void {
        switch (effect.type) {
            case PowerEffectType.VenomProjectile:
                // Check if projectile has traveled its maximum range
                if (effect.data && effect.data.distanceTraveled) {
                    const distance = Math.sqrt(
                        Math.pow(effect.velocity.x * (effect.lifetime - effect.remainingLifetime) / 1000, 2) +
                        Math.pow(effect.velocity.y * (effect.lifetime - effect.remainingLifetime) / 1000, 2)
                    );

                    if (distance >= effect.data.maxRange) {
                        effect.remainingLifetime = 0; // Mark for removal
                    }
                }
                break;

            case PowerEffectType.SpeedTrail:
                // Fade out speed trail over time
                effect.size *= (1 - effect.fadeRate * deltaTime / 1000);
                break;
        }
    }

    public activatePower(powerType: PowerType, snakePosition: Vector2, snakeDirection: Vector2, obstacles?: Obstacle[]): PowerActivationResult {
        const powerDef = this.powerDefinitions.get(powerType);
        if (!powerDef) {
            return {
                success: false,
                powerType,
                effects: [],
                message: 'Power not found'
            };
        }

        const powerState = this.activePowers.get(powerType);
        if (!powerState) {
            return {
                success: false,
                powerType,
                effects: [],
                message: 'Power not available'
            };
        }

        // Check if power is on cooldown
        if (powerState.cooldownRemaining > 0) {
            return {
                success: false,
                powerType,
                effects: [],
                message: `Power on cooldown: ${Math.ceil(powerState.cooldownRemaining / 1000)}s`
            };
        }

        // Check if power is already active (for duration-based powers)
        if (powerState.isActive && powerDef.duration > 0) {
            return {
                success: false,
                powerType,
                effects: [],
                message: 'Power already active'
            };
        }

        // Activate the power
        powerState.isActive = powerDef.duration > 0; // Only set active if it has duration
        powerState.remainingDuration = powerDef.duration;
        powerState.cooldownRemaining = powerDef.cooldown;
        powerState.lastActivated = performance.now();

        // Create visual effects
        const effects = this.createPowerEffects(powerType, snakePosition, snakeDirection, powerDef);

        // Check for environmental interactions
        const environmentalInteractions = obstacles ?
            this.checkEnvironmentalInteractions(powerType, snakePosition, snakeDirection, obstacles, powerDef) : [];

        return {
            success: true,
            powerType,
            effects,
            environmentalInteractions,
            message: `${powerDef.name} activated!`
        };
    }

    private createPowerEffects(
        powerType: PowerType,
        position: Vector2,
        direction: Vector2,
        powerDef: PowerDefinition
    ): PowerEffect[] {
        const effects: PowerEffect[] = [];

        switch (powerType) {
            case PowerType.SpeedBoost:
                // Create activation glow effect
                effects.push({
                    type: PowerEffectType.PowerActivation,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: 500,
                    remainingLifetime: 500,
                    color: powerDef.color,
                    size: this.config.cellSize * 2,
                    fadeRate: 2.0
                });
                break;

            case PowerType.VenomStrike:
                // Create venom projectile
                const projectileSpeed = powerDef.projectileSpeed || 800;
                const projectileRange = powerDef.projectileRange || 350;

                effects.push({
                    type: PowerEffectType.VenomProjectile,
                    position: { ...position },
                    velocity: {
                        x: direction.x * projectileSpeed,
                        y: direction.y * projectileSpeed
                    },
                    lifetime: (projectileRange / projectileSpeed) * 1000, // Convert to milliseconds
                    remainingLifetime: (projectileRange / projectileSpeed) * 1000,
                    color: powerDef.color,
                    size: this.config.cellSize * 0.8,
                    fadeRate: 0.5,
                    data: {
                        maxRange: projectileRange,
                        distanceTraveled: 0
                    }
                });
                break;

            case PowerType.Constrict:
                // Create constricting glow effect around snake
                effects.push({
                    type: PowerEffectType.ConstrictGlow,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: powerDef.duration,
                    remainingLifetime: powerDef.duration,
                    color: powerDef.color,
                    size: this.config.cellSize * 3,
                    fadeRate: 0.5,
                    data: { pulseSpeed: 2.0 }
                });
                break;

            case PowerType.HoodExpansion:
                // Create golden aura effect
                effects.push({
                    type: PowerEffectType.GoldenAura,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: powerDef.duration,
                    remainingLifetime: powerDef.duration,
                    color: powerDef.color,
                    size: this.config.cellSize * 4,
                    fadeRate: 0.3,
                    data: {
                        intensity: powerDef.glowIntensity,
                        expandRate: 1.5
                    }
                });
                break;

            case PowerType.AquaticMovement:
                // Create aquatic shimmer effect
                effects.push({
                    type: PowerEffectType.AquaticShimmer,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: 2000, // Visual feedback duration
                    remainingLifetime: 2000,
                    color: powerDef.color,
                    size: this.config.cellSize * 2.5,
                    fadeRate: 1.0,
                    data: {
                        waveSpeed: 3.0,
                        shimmerIntensity: 0.7
                    }
                });
                break;

            case PowerType.ColorChange:
                // Create color shifting effect
                effects.push({
                    type: PowerEffectType.ColorShift,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: powerDef.duration,
                    remainingLifetime: powerDef.duration,
                    color: powerDef.color,
                    size: this.config.cellSize * 2,
                    fadeRate: 0.2,
                    data: {
                        colorCycleSpeed: 2.0,
                        shimmerEffect: true
                    }
                });

                // Add invisibility shimmer effect
                effects.push({
                    type: PowerEffectType.InvisibilityShimmer,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: powerDef.duration,
                    remainingLifetime: powerDef.duration,
                    color: '#FFFFFF',
                    size: this.config.cellSize * 1.5,
                    fadeRate: 0.1,
                    data: {
                        alpha: 0.3,
                        shimmerRate: 4.0
                    }
                });
                break;

            case PowerType.TimeWarp:
                // Create time distortion effect
                effects.push({
                    type: PowerEffectType.TimeWarp,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: powerDef.duration,
                    remainingLifetime: powerDef.duration,
                    color: powerDef.color,
                    size: this.config.cellSize * 6, // Large area effect
                    fadeRate: 0.2,
                    data: {
                        intensity: 0.8,
                        rippleSpeed: 2.0,
                        timeSlowFactor: 0.3 // Slow time to 30% speed
                    }
                });

                // Add celestial glow effect
                effects.push({
                    type: PowerEffectType.CelestialGlow,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: powerDef.duration,
                    remainingLifetime: powerDef.duration,
                    color: '#E8EAF6', // Light blue
                    size: this.config.cellSize * 3,
                    fadeRate: 0.3,
                    data: {
                        starIntensity: 0.9,
                        twinkleSpeed: 3.0
                    }
                });
                break;

            case PowerType.FireBreath:
                // Create fire breath cone effect
                const fireRange = powerDef.range || 200;
                const fireDuration = powerDef.duration || 1500;

                // Create multiple fire particles in a cone
                for (let i = 0; i < 10; i++) {
                    const angle = (i - 5) * 0.15; // Spread fire in a cone
                    const fireDirection = {
                        x: direction.x * Math.cos(angle) - direction.y * Math.sin(angle),
                        y: direction.x * Math.sin(angle) + direction.y * Math.cos(angle)
                    };

                    effects.push({
                        type: PowerEffectType.DragonicFlames,
                        position: {
                            x: position.x + direction.x * this.config.cellSize,
                            y: position.y + direction.y * this.config.cellSize
                        },
                        velocity: {
                            x: fireDirection.x * 400, // Fire particle speed
                            y: fireDirection.y * 400
                        },
                        lifetime: fireDuration,
                        remainingLifetime: fireDuration,
                        color: i % 3 === 0 ? '#D32F2F' : (i % 3 === 1 ? '#FF5722' : '#FFC107'), // Red, orange, yellow
                        size: this.config.cellSize * (0.6 + Math.random() * 0.6),
                        fadeRate: 1.2,
                        data: {
                            maxRange: fireRange,
                            damage: powerDef.damage || 100,
                            intensity: 0.9
                        }
                    });
                }
                break;

            case PowerType.TailConsumption:
                // Create mystical spiral effect
                effects.push({
                    type: PowerEffectType.TailConsumption,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: 1000, // Visual feedback duration
                    remainingLifetime: 1000,
                    color: powerDef.color,
                    size: this.config.cellSize * 2,
                    fadeRate: 1.0,
                    data: {
                        spiralSpeed: 4.0,
                        mysticalIntensity: 1.0,
                        goldParticles: true
                    }
                });
                break;

            case PowerType.PowerCycling:
                // Create power cycling aura effect
                effects.push({
                    type: PowerEffectType.PowerCycling,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: 2000, // Visual feedback duration
                    remainingLifetime: 2000,
                    color: powerDef.color,
                    size: this.config.cellSize * 4,
                    fadeRate: 0.5,
                    data: {
                        cycleSpeed: 2.5,
                        powerAura: true,
                        colorShift: true
                    }
                });
                break;

            case PowerType.RealityManipulation:
                // Create reality distortion effect
                const manipulationRange = powerDef.range || 150;

                effects.push({
                    type: PowerEffectType.RealityManipulation,
                    position: { ...position },
                    velocity: { x: 0, y: 0 },
                    lifetime: powerDef.duration,
                    remainingLifetime: powerDef.duration,
                    color: powerDef.color,
                    size: manipulationRange * 2, // Area of effect
                    fadeRate: 0.1,
                    data: {
                        distortionIntensity: 1.0,
                        realityWaveSpeed: 1.5,
                        manipulationRange: manipulationRange
                    }
                });

                // Add mystical runes effect
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * 2 * Math.PI;
                    const runeDistance = this.config.cellSize * 2;

                    effects.push({
                        type: PowerEffectType.MysticalRunes,
                        position: {
                            x: position.x + Math.cos(angle) * runeDistance,
                            y: position.y + Math.sin(angle) * runeDistance
                        },
                        velocity: { x: 0, y: 0 },
                        lifetime: powerDef.duration,
                        remainingLifetime: powerDef.duration,
                        color: '#FFF8E1', // Light gold
                        size: this.config.cellSize * 0.8,
                        fadeRate: 0.2,
                        data: {
                            runeType: i,
                            rotationSpeed: 1.0,
                            glowPulse: true
                        }
                    });
                }
                break;
        }

        // Add effects to active effects list
        this.activeEffects.push(...effects);

        return effects;
    }

    private deactivatePower(powerType: PowerType): void {
        const powerState = this.activePowers.get(powerType);
        if (powerState) {
            powerState.isActive = false;
            if (powerState.remainingDuration !== undefined) {
                powerState.remainingDuration = 0;
            }
        }
    }

    public isPowerActive(powerType: PowerType): boolean {
        const powerState = this.activePowers.get(powerType);
        return powerState ? powerState.isActive : false;
    }

    public getPowerCooldown(powerType: PowerType): number {
        const powerState = this.activePowers.get(powerType);
        return powerState ? powerState.cooldownRemaining : 0;
    }

    public getPowerDuration(powerType: PowerType): number {
        const powerState = this.activePowers.get(powerType);
        return powerState && powerState.remainingDuration !== undefined ? powerState.remainingDuration : 0;
    }

    public getSpeedMultiplier(): number {
        if (this.isPowerActive(PowerType.SpeedBoost)) {
            const speedBoostDef = this.powerDefinitions.get(PowerType.SpeedBoost);
            return speedBoostDef?.speedMultiplier || 1.0;
        }
        return 1.0;
    }

    public getActiveEffects(): PowerEffect[] {
        return [...this.activeEffects];
    }

    public getVisualState(): PowerVisualState {
        const activePowers: PowerType[] = [];
        const cooldowns = new Map<PowerType, number>();
        const durations = new Map<PowerType, number>();

        this.activePowers.forEach((powerState, powerType) => {
            if (powerState.isActive) {
                activePowers.push(powerType);
            }
            cooldowns.set(powerType, powerState.cooldownRemaining);
            durations.set(powerType, powerState.remainingDuration || 0);
        });

        return {
            activePowers,
            effects: [...this.activeEffects],
            cooldowns,
            durations
        };
    }

    public initializePower(powerType: PowerType): void {
        if (!this.activePowers.has(powerType)) {
            const powerDef = this.powerDefinitions.get(powerType);
            if (powerDef) {
                this.activePowers.set(powerType, {
                    type: powerType,
                    isUnlocked: true,
                    isActive: false,
                    cooldownRemaining: 0,
                    duration: powerDef.duration,
                    level: 1,
                    remainingDuration: 0,
                    lastActivated: 0
                });
            }
        }
    }

    public removePower(powerType: PowerType): void {
        this.activePowers.delete(powerType);
    }

    public reset(): void {
        this.activePowers.clear();
        this.activeEffects = [];
    }

    // Specialized ability methods for advanced evolution levels

    public canActivatePressurePlate(): boolean {
        return this.isPowerActive(PowerType.Constrict);
    }

    public isRegenerationActive(): boolean {
        // Aquatic Movement is a passive ability, so check if the power is available
        return this.activePowers.has(PowerType.AquaticMovement);
    }

    public isInvisible(): boolean {
        return this.isPowerActive(PowerType.ColorChange);
    }

    public isInvincible(): boolean {
        return this.isPowerActive(PowerType.HoodExpansion);
    }

    public canTraverseWater(): boolean {
        // Aquatic Movement is a passive ability for Anaconda level
        const powerState = this.activePowers.get(PowerType.AquaticMovement);
        return powerState !== undefined; // Available if power exists
    }

    public canConsumeAnyFood(): boolean {
        return this.isPowerActive(PowerType.ColorChange);
    }

    public getDoubleFoodValueMultiplier(): number {
        if (this.isPowerActive(PowerType.Constrict)) {
            return 2.0; // Double food value during Constrict
        }
        return 1.0;
    }

    public getRegenerationRate(): number {
        if (this.isRegenerationActive()) {
            return 0.1; // Regenerate 0.1 segments per second
        }
        return 0.0;
    }

    public getInvisibilityAlpha(): number {
        if (this.isInvisible()) {
            return 0.3; // 30% opacity when invisible
        }
        return 1.0; // Fully opaque
    }

    public createRegenerationEffect(position: Vector2): PowerEffect[] {
        if (!this.isRegenerationActive()) {
            return [];
        }

        const effects: PowerEffect[] = [];

        // Create sparkle effects for regeneration
        for (let i = 0; i < 3; i++) {
            effects.push({
                type: PowerEffectType.RegenerationSparkle,
                position: {
                    x: position.x + (Math.random() - 0.5) * this.config.cellSize,
                    y: position.y + (Math.random() - 0.5) * this.config.cellSize
                },
                velocity: {
                    x: (Math.random() - 0.5) * 50,
                    y: (Math.random() - 0.5) * 50
                },
                lifetime: 1000,
                remainingLifetime: 1000,
                color: '#4CAF50', // Green sparkles
                size: this.config.cellSize * 0.2,
                fadeRate: 2.0
            });
        }

        this.activeEffects.push(...effects);
        return effects;
    }

    public activateSpecialAbility(abilityType: string, position: Vector2): boolean {
        switch (abilityType) {
            case 'PressurePlateActivation':
                return this.canActivatePressurePlate();

            case 'Regeneration':
                if (this.isRegenerationActive()) {
                    this.createRegenerationEffect(position);
                    return true;
                }
                return false;

            case 'Invisibility':
                return this.isInvisible();

            case 'Invincibility':
                return this.isInvincible();

            case 'WaterTraversal':
                return this.canTraverseWater();

            default:
                return false;
        }
    }

    // Method for checking projectile collisions with obstacles
    public checkProjectileCollisions(obstacles: any[]): PowerEffect[] {
        const impactEffects: PowerEffect[] = [];

        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];

            if (effect.type === PowerEffectType.VenomProjectile) {
                // Check collision with obstacles (simplified collision detection)
                for (const obstacle of obstacles) {
                    if (this.isProjectileCollidingWithObstacle(effect, obstacle)) {
                        // Create impact effect
                        const impactEffect: PowerEffect = {
                            type: PowerEffectType.VenomImpact,
                            position: { ...effect.position },
                            velocity: { x: 0, y: 0 },
                            lifetime: 300,
                            remainingLifetime: 300,
                            color: '#FF5722', // Orange impact
                            size: this.config.cellSize * 1.5,
                            fadeRate: 3.0
                        };

                        impactEffects.push(impactEffect);
                        this.activeEffects.push(impactEffect);

                        // Remove the projectile
                        this.activeEffects.splice(i, 1);
                        break;
                    }
                }
            }
        }

        return impactEffects;
    }

    private isProjectileCollidingWithObstacle(projectile: PowerEffect, obstacle: any): boolean {
        // Simplified collision detection - would be more sophisticated in a real implementation
        const distance = Math.sqrt(
            Math.pow(projectile.position.x - obstacle.x, 2) +
            Math.pow(projectile.position.y - obstacle.y, 2)
        );

        const collisionRadius = (projectile.size + obstacle.size) / 2;
        return distance <= collisionRadius;
    }

    private checkEnvironmentalInteractions(
        powerType: PowerType,
        position: Vector2,
        direction: Vector2,
        obstacles: Obstacle[],
        powerDef: PowerDefinition
    ): EnvironmentalInteraction[] {
        const interactions: EnvironmentalInteraction[] = [];

        switch (powerType) {
            case PowerType.VenomStrike:
                // Check for crystal formations in projectile path
                const projectileRange = powerDef.projectileRange || 350;
                const crystalTargets = this.getObstaclesInPath(position, direction, projectileRange, obstacles)
                    .filter(obs => obs.type === ObstacleType.CrystalFormation && obs.isDestructible);

                crystalTargets.forEach(crystal => {
                    interactions.push({
                        type: 'destroy',
                        obstacleId: crystal.id,
                        powerType,
                        effects: this.createCrystalShatterEffect(crystal.position)
                    });
                });
                break;

            case PowerType.SpeedBoost:
                // Wall phasing - check for magic barriers in immediate vicinity
                const nearbyBarriers = obstacles.filter(obs =>
                    obs.type === ObstacleType.MagicBarrier &&
                    this.isObstacleNearPosition(obs, position, this.config.cellSize * 2)
                );

                nearbyBarriers.forEach(barrier => {
                    interactions.push({
                        type: 'phase',
                        obstacleId: barrier.id,
                        powerType,
                        effects: this.createWallPhasingEffect(barrier.position)
                    });
                });
                break;

            case PowerType.Constrict:
                // Check for pressure plates in immediate vicinity
                // Note: This should check InteractiveFeatures instead of obstacles
                // For now, we'll skip this check until InteractiveFeatures are passed to this method
                const nearbyPressurePlates: any[] = [];

                nearbyPressurePlates.forEach(plate => {
                    interactions.push({
                        type: 'activate',
                        obstacleId: plate.id,
                        powerType,
                        effects: this.createPressurePlateActivationEffect(plate.position)
                    });
                });
                break;

            case PowerType.HoodExpansion:
                // Intimidation effect - affects nearby harmful creatures/elements
                const intimidatableElements = obstacles.filter(obs =>
                    this.canIntimidateElement(obs.type) &&
                    this.isObstacleNearPosition(obs, position, this.config.cellSize * 3)
                );

                intimidatableElements.forEach(element => {
                    interactions.push({
                        type: 'activate',
                        obstacleId: element.id,
                        powerType,
                        effects: this.createIntimidationEffect(element.position)
                    });
                });
                break;

            case PowerType.AquaticMovement:
                // Water traversal - no direct interaction, but enables passage
                // This is handled passively in collision detection
                break;

            case PowerType.ColorChange:
                // Invisibility - affects detection by mystical guardians and poison gas
                // This is handled in the game logic rather than environmental interactions
                break;

            case PowerType.FireBreath:
                // Check for destructible obstacles in fire breath cone
                const fireRange = powerDef.range || 200;
                const destructibleTargets = this.getObstaclesInCone(position, direction, fireRange, obstacles)
                    .filter(obs => this.canFireBreathDestroy(obs.type) && obs.isDestructible);

                destructibleTargets.forEach(target => {
                    interactions.push({
                        type: 'destroy',
                        obstacleId: target.id,
                        powerType,
                        damage: powerDef.damage || 100,
                        effects: this.createObstacleDestructionEffect(target.position, target.type)
                    });
                });
                break;
        }

        return interactions;
    }

    private getObstaclesInPath(
        startPos: Vector2,
        direction: Vector2,
        range: number,
        obstacles: Obstacle[]
    ): Obstacle[] {
        const pathObstacles: Obstacle[] = [];
        const cellSize = this.config.cellSize;

        // Check obstacles along the projectile path
        for (let distance = 0; distance < range; distance += cellSize / 2) {
            const checkPos = {
                x: startPos.x + direction.x * distance,
                y: startPos.y + direction.y * distance
            };

            const gridX = Math.floor(checkPos.x / cellSize);
            const gridY = Math.floor(checkPos.y / cellSize);

            const obstacle = obstacles.find(obs =>
                obs.isActive &&
                gridX >= obs.position.x && gridX < obs.position.x + obs.size.x &&
                gridY >= obs.position.y && gridY < obs.position.y + obs.size.y
            );

            if (obstacle && !pathObstacles.includes(obstacle)) {
                pathObstacles.push(obstacle);
            }
        }

        return pathObstacles;
    }

    private getObstaclesInCone(
        startPos: Vector2,
        direction: Vector2,
        range: number,
        obstacles: Obstacle[]
    ): Obstacle[] {
        const coneObstacles: Obstacle[] = [];
        const cellSize = this.config.cellSize;
        const coneAngle = Math.PI / 4; // 45 degree cone

        obstacles.forEach(obstacle => {
            if (!obstacle.isActive) return;

            // Calculate distance and angle to obstacle
            const obstacleCenter = {
                x: (obstacle.position.x + obstacle.size.x / 2) * cellSize,
                y: (obstacle.position.y + obstacle.size.y / 2) * cellSize
            };

            const dx = obstacleCenter.x - startPos.x;
            const dy = obstacleCenter.y - startPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > range) return;

            // Check if obstacle is within cone angle
            const obstacleAngle = Math.atan2(dy, dx);
            const directionAngle = Math.atan2(direction.y, direction.x);
            const angleDiff = Math.abs(obstacleAngle - directionAngle);

            if (angleDiff <= coneAngle / 2 || angleDiff >= 2 * Math.PI - coneAngle / 2) {
                coneObstacles.push(obstacle);
            }
        });

        return coneObstacles;
    }

    private isObstacleNearPosition(obstacle: Obstacle, position: Vector2, radius: number): boolean {
        const obstacleCenter = {
            x: (obstacle.position.x + obstacle.size.x / 2) * this.config.cellSize,
            y: (obstacle.position.y + obstacle.size.y / 2) * this.config.cellSize
        };

        const distance = Math.sqrt(
            Math.pow(position.x - obstacleCenter.x, 2) +
            Math.pow(position.y - obstacleCenter.y, 2)
        );

        return distance <= radius;
    }

    private canFireBreathDestroy(obstacleType: ObstacleType): boolean {
        return [
            ObstacleType.IceWall,
            ObstacleType.ThornBush,
            // Add more destructible types as needed
        ].includes(obstacleType);
    }

    // Advanced evolution level abilities (8-10)

    public isTimeWarpActive(): boolean {
        return this.isPowerActive(PowerType.TimeWarp);
    }

    public getTimeSlowFactor(): number {
        if (this.isTimeWarpActive()) {
            return 0.3; // Slow time to 30% speed
        }
        return 1.0; // Normal time
    }

    public canAttractFood(): boolean {
        // Food attraction is available for Celestial Serpent (Level 8+)
        return this.activePowers.has(PowerType.TimeWarp);
    }

    public getFoodAttractionRadius(): number {
        if (this.canAttractFood()) {
            return this.config.cellSize * 5; // 5-cell radius
        }
        return 0;
    }

    public hasHeatVision(): boolean {
        // Heat vision is available for Ancient Dragon Serpent (Level 9+)
        return this.activePowers.has(PowerType.FireBreath);
    }

    public isEnvironmentallyImmune(): boolean {
        // Environmental immunity for Ancient Dragon Serpent (Level 9+)
        return this.activePowers.has(PowerType.FireBreath);
    }

    public canConsumeTail(): boolean {
        // Tail consumption is available for Ouroboros (Level 10)
        return this.activePowers.has(PowerType.TailConsumption);
    }

    public canCyclePowers(): boolean {
        // Power cycling is available for Ouroboros (Level 10)
        return this.activePowers.has(PowerType.PowerCycling);
    }

    public canManipulateReality(): boolean {
        // Reality manipulation is available for Ouroboros (Level 10)
        return this.activePowers.has(PowerType.RealityManipulation);
    }

    public activateTailConsumption(segmentCount: number): boolean {
        if (!this.canConsumeTail()) {
            return false;
        }

        const powerState = this.activePowers.get(PowerType.TailConsumption);
        if (!powerState || powerState.cooldownRemaining > 0) {
            return false;
        }

        // Activate cooldown
        powerState.cooldownRemaining = this.getPowerCooldown(PowerType.TailConsumption);
        powerState.lastActivated = performance.now();

        return true;
    }

    public cycleToPower(targetPowerType: PowerType): boolean {
        if (!this.canCyclePowers()) {
            return false;
        }

        const powerCyclingState = this.activePowers.get(PowerType.PowerCycling);
        if (!powerCyclingState || powerCyclingState.cooldownRemaining > 0) {
            return false;
        }

        // Check if target power is from a previous evolution level
        const availablePreviousPowers = [
            PowerType.SpeedBoost,
            PowerType.VenomStrike,
            PowerType.Constrict,
            PowerType.HoodExpansion,
            PowerType.AquaticMovement,
            PowerType.ColorChange,
            PowerType.TimeWarp,
            PowerType.FireBreath
        ];

        if (!availablePreviousPowers.includes(targetPowerType)) {
            return false;
        }

        // Activate the target power temporarily
        const targetPowerState = this.activePowers.get(targetPowerType);
        if (targetPowerState) {
            targetPowerState.isActive = true;
            if (targetPowerState.remainingDuration !== undefined) {
                targetPowerState.remainingDuration = this.getPowerDuration(targetPowerType);
            }
            targetPowerState.cooldownRemaining = 0; // No cooldown when cycled
        }

        // Set power cycling cooldown
        powerCyclingState.cooldownRemaining = this.getPowerCooldown(PowerType.PowerCycling);
        powerCyclingState.lastActivated = performance.now();

        return true;
    }

    public manipulateEnvironment(position: Vector2, manipulationType: string): boolean {
        if (!this.canManipulateReality()) {
            return false;
        }

        const powerState = this.activePowers.get(PowerType.RealityManipulation);
        if (!powerState || !powerState.isActive) {
            return false;
        }

        // Different types of reality manipulation
        switch (manipulationType) {
            case 'createPath':
                // Create a temporary path through obstacles
                return true;
            case 'removeObstacle':
                // Temporarily remove an obstacle
                return true;
            case 'createBarrier':
                // Create a temporary barrier
                return true;
            default:
                return false;
        }
    }

    public createFoodAttractionEffect(position: Vector2): PowerEffect[] {
        if (!this.canAttractFood()) {
            return [];
        }

        const effects: PowerEffect[] = [];
        const attractionRadius = this.getFoodAttractionRadius();

        // Create attraction wave effect
        effects.push({
            type: PowerEffectType.FoodAttraction,
            position: { ...position },
            velocity: { x: 0, y: 0 },
            lifetime: 2000,
            remainingLifetime: 2000,
            color: '#E8EAF6', // Light blue
            size: attractionRadius * 2,
            fadeRate: 0.5,
            data: {
                attractionRadius: attractionRadius,
                pulseSpeed: 2.0
            }
        });

        this.activeEffects.push(...effects);
        return effects;
    }

    public createHeatVisionEffect(position: Vector2, direction: Vector2): PowerEffect[] {
        if (!this.hasHeatVision()) {
            return [];
        }

        const effects: PowerEffect[] = [];
        const visionRange = this.config.cellSize * 8; // 8-cell range

        // Create heat vision beam effect
        effects.push({
            type: PowerEffectType.HeatVision,
            position: { ...position },
            velocity: {
                x: direction.x * 200,
                y: direction.y * 200
            },
            lifetime: 1000,
            remainingLifetime: 1000,
            color: '#FF5722', // Orange-red
            size: this.config.cellSize * 0.5,
            fadeRate: 1.0,
            data: {
                visionRange: visionRange,
                heatIntensity: 0.8
            }
        });

        this.activeEffects.push(...effects);
        return effects;
    }

    private createCrystalShatterEffect(position: Vector2): PowerEffect[] {
        const effects: PowerEffect[] = [];

        // Create multiple crystal shard particles
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * 2 * Math.PI;
            effects.push({
                type: PowerEffectType.CrystalShatter,
                position: {
                    x: position.x * this.config.cellSize,
                    y: position.y * this.config.cellSize
                },
                velocity: {
                    x: Math.cos(angle) * 150,
                    y: Math.sin(angle) * 150
                },
                lifetime: 800,
                remainingLifetime: 800,
                color: '#E1F5FE', // Light blue crystal color
                size: this.config.cellSize * 0.3,
                fadeRate: 1.5
            });
        }

        return effects;
    }

    private createWallPhasingEffect(position: Vector2): PowerEffect[] {
        return [{
            type: PowerEffectType.WallPhasing,
            position: {
                x: position.x * this.config.cellSize,
                y: position.y * this.config.cellSize
            },
            velocity: { x: 0, y: 0 },
            lifetime: 1000,
            remainingLifetime: 1000,
            color: '#FFEB3B', // Yellow phasing effect
            size: this.config.cellSize * 1.5,
            fadeRate: 1.0,
            data: { alpha: 0.5 } // Semi-transparent effect
        }];
    }

    private createObstacleDestructionEffect(position: Vector2, obstacleType: ObstacleType): PowerEffect[] {
        const effects: PowerEffect[] = [];
        let color = '#FF5722'; // Default fire color
        let particleCount = 8;

        switch (obstacleType) {
            case ObstacleType.IceWall:
                color = '#81D4FA'; // Light blue for ice
                particleCount = 10;
                break;
            case ObstacleType.ThornBush:
                color = '#4CAF50'; // Green for thorns
                particleCount = 12;
                break;
        }

        // Create destruction particles
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * 2 * Math.PI;
            effects.push({
                type: PowerEffectType.ObstacleDestruction,
                position: {
                    x: position.x * this.config.cellSize,
                    y: position.y * this.config.cellSize
                },
                velocity: {
                    x: Math.cos(angle) * (100 + Math.random() * 100),
                    y: Math.sin(angle) * (100 + Math.random() * 100)
                },
                lifetime: 1000 + Math.random() * 500,
                remainingLifetime: 1000 + Math.random() * 500,
                color,
                size: this.config.cellSize * (0.2 + Math.random() * 0.3),
                fadeRate: 1.2
            });
        }

        return effects;
    }

    private createPressurePlateActivationEffect(position: Vector2): PowerEffect[] {
        return [{
            type: PowerEffectType.PowerActivation,
            position: {
                x: position.x * this.config.cellSize,
                y: position.y * this.config.cellSize
            },
            velocity: { x: 0, y: 0 },
            lifetime: 800,
            remainingLifetime: 800,
            color: '#8D6E63', // Brown activation effect
            size: this.config.cellSize * 2,
            fadeRate: 1.5,
            data: { activationType: 'pressure_plate' }
        }];
    }

    private createIntimidationEffect(position: Vector2): PowerEffect[] {
        const effects: PowerEffect[] = [];

        // Create intimidation wave effect
        for (let i = 0; i < 4; i++) {
            effects.push({
                type: PowerEffectType.PowerActivation,
                position: {
                    x: position.x * this.config.cellSize,
                    y: position.y * this.config.cellSize
                },
                velocity: { x: 0, y: 0 },
                lifetime: 1200 + i * 200,
                remainingLifetime: 1200 + i * 200,
                color: '#FFC107', // Golden intimidation effect
                size: this.config.cellSize * (2 + i * 0.5),
                fadeRate: 0.8,
                data: {
                    intimidationWave: true,
                    waveIndex: i
                }
            });
        }

        return effects;
    }

    private canIntimidateElement(obstacleType: ObstacleType | string): boolean {
        // Define which elements can be intimidated by Hood Expansion
        const intimidatableTypes = [
            'HarmfulCreature',
            'MysticalGuardian',
            'PoisonGasCloud' // Can scare away some gas clouds
        ];

        return intimidatableTypes.includes(obstacleType as string);
    }
}

interface PowerDefinition {
    type: PowerType;
    name: string;
    description: string;
    cooldown: number;
    duration: number;
    energyCost: number;
    visualEffect: PowerEffectType;
    audioEffect: string;
    color: string;
    glowIntensity: number;
    speedMultiplier?: number;
    projectileSpeed?: number;
    projectileRange?: number;
    range?: number;
    damage?: number;
    environmentalInteractions?: string[];
    specialEffects?: string[];
}