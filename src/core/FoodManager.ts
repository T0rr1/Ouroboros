import { 
    Vector2, 
    GameConfig, 
    Food, 
    FoodType, 
    FoodEffect, 
    EffectType, 
    ConsumptionResult, 
    FoodState,
    FoodDefinition,
    FoodCombination,
    BonusMultiplier
} from '../types/game';

export class FoodManager {
    private state: FoodState;
    private config: GameConfig;
    private occupiedPositions: Set<string>;
    private foodDefinitions: Map<FoodType, FoodDefinition> = new Map();
    private foodCombinations: FoodCombination[] = [];

    constructor(config: GameConfig) {
        this.config = config;
        this.occupiedPositions = new Set();
        this.initializeFoodDefinitions();
        this.initializeFoodCombinations();

        this.state = {
            activeFoods: [],
            spawnTimer: 0,
            lastSpawnTime: 0,
            spawnInterval: 2000, // 2 seconds between spawn attempts
            maxSimultaneousFoods: 6,
            minSimultaneousFoods: 3,
            recentConsumptions: [],
            activeEffects: []
        };
    }

    private initializeFoodDefinitions(): void {
        this.foodDefinitions = new Map();

        // Level 1-2 Foods (Hatchling, Garden Snake)
        this.foodDefinitions.set(FoodType.BasicBerry, {
            type: FoodType.BasicBerry,
            name: 'Basic Berry',
            evolutionLevel: 1,
            basePoints: 10,
            spawnWeight: 100,
            effects: [
                { type: EffectType.Growth, duration: 0, magnitude: 1 }
            ],
            visualData: {
                color: '#FF6B6B',
                pattern: 'solid'
            }
        });

        this.foodDefinitions.set(FoodType.WildMushroom, {
            type: FoodType.WildMushroom,
            name: 'Wild Mushroom',
            evolutionLevel: 2,
            basePoints: 15,
            spawnWeight: 80,
            effects: [
                { type: EffectType.Growth, duration: 0, magnitude: 1 },
                { type: EffectType.SpeedBoost, duration: 3000, magnitude: 1.2 }
            ],
            negativeEffects: [
                { type: EffectType.Poison, duration: 2000, magnitude: 1 }
            ],
            visualData: {
                color: '#8B4513',
                secondaryColor: '#DEB887',
                pattern: 'spotted'
            }
        });

        // Level 3-4 Foods (Viper, Python)
        this.foodDefinitions.set(FoodType.CrystalFruit, {
            type: FoodType.CrystalFruit,
            name: 'Crystal Fruit',
            evolutionLevel: 3,
            basePoints: 25,
            spawnWeight: 60,
            effects: [
                { type: EffectType.Growth, duration: 0, magnitude: 2 },
                { type: EffectType.PowerCooldownReduction, duration: 5000, magnitude: 0.5 }
            ],
            negativeEffects: [
                { type: EffectType.SlowDown, duration: 3000, magnitude: 0.7 },
                { type: EffectType.BlurredVision, duration: 2000, magnitude: 1 }
            ],
            visualData: {
                color: '#87CEEB',
                secondaryColor: '#E0FFFF',
                pattern: 'crystalline',
                glowIntensity: 0.8
            }
        });

        this.foodDefinitions.set(FoodType.VenomousFlower, {
            type: FoodType.VenomousFlower,
            name: 'Venomous Flower',
            evolutionLevel: 4,
            basePoints: 30,
            spawnWeight: 50,
            effects: [
                { type: EffectType.Growth, duration: 0, magnitude: 2 },
                { type: EffectType.EvolutionBoost, duration: 0, magnitude: 1.5 }
            ],
            negativeEffects: [
                { type: EffectType.Poison, duration: 4000, magnitude: 2 },
                { type: EffectType.SegmentLoss, duration: 0, magnitude: 1 }
            ],
            visualData: {
                color: '#9932CC',
                secondaryColor: '#FF1493',
                pattern: 'petaled'
            }
        });

        // Level 5-6 Foods (Cobra, Anaconda)
        this.foodDefinitions.set(FoodType.AquaticPlant, {
            type: FoodType.AquaticPlant,
            name: 'Aquatic Plant',
            evolutionLevel: 5,
            basePoints: 40,
            spawnWeight: 40,
            effects: [
                { type: EffectType.Growth, duration: 0, magnitude: 3 },
                { type: EffectType.Regeneration, duration: 10000, magnitude: 1 }
            ],
            negativeEffects: [
                { type: EffectType.ReversedControls, duration: 5000, magnitude: 1 },
                { type: EffectType.SlowDown, duration: 4000, magnitude: 0.6 }
            ],
            visualData: {
                color: '#20B2AA',
                secondaryColor: '#00CED1',
                pattern: 'flowing'
            }
        });

        this.foodDefinitions.set(FoodType.RainbowNectar, {
            type: FoodType.RainbowNectar,
            name: 'Rainbow Nectar',
            evolutionLevel: 6,
            basePoints: 50,
            spawnWeight: 30,
            effects: [
                { type: EffectType.Growth, duration: 0, magnitude: 3 },
                { type: EffectType.DoublePoints, duration: 8000, magnitude: 2 }
            ],
            negativeEffects: [
                { type: EffectType.DisablePowers, duration: 6000, magnitude: 1 },
                { type: EffectType.BlurredVision, duration: 3000, magnitude: 1 }
            ],
            visualData: {
                color: '#FF69B4',
                secondaryColor: '#FFD700',
                pattern: 'rainbow',
                glowIntensity: 1.0
            }
        });

        // Level 7-8 Foods (Rainbow Serpent, Celestial Serpent)
        this.foodDefinitions.set(FoodType.StardustBerry, {
            type: FoodType.StardustBerry,
            name: 'Stardust Berry',
            evolutionLevel: 7,
            basePoints: 75,
            spawnWeight: 20,
            effects: [
                { type: EffectType.Growth, duration: 0, magnitude: 4 },
                { type: EffectType.TimeWarp, duration: 5000, magnitude: 0.5 }
            ],
            negativeEffects: [
                { type: EffectType.Poison, duration: 6000, magnitude: 3 },
                { type: EffectType.SegmentLoss, duration: 0, magnitude: 2 }
            ],
            visualData: {
                color: '#4B0082',
                secondaryColor: '#FFD700',
                pattern: 'starry',
                glowIntensity: 1.2
            }
        });

        this.foodDefinitions.set(FoodType.DragonScale, {
            type: FoodType.DragonScale,
            name: 'Dragon Scale',
            evolutionLevel: 8,
            basePoints: 100,
            spawnWeight: 15,
            effects: [
                { type: EffectType.Growth, duration: 0, magnitude: 5 },
                { type: EffectType.Invincibility, duration: 3000, magnitude: 1 }
            ],
            negativeEffects: [
                { type: EffectType.ReversedControls, duration: 8000, magnitude: 1 },
                { type: EffectType.DisablePowers, duration: 10000, magnitude: 1 },
                { type: EffectType.SegmentLoss, duration: 0, magnitude: 3 }
            ],
            visualData: {
                color: '#DC143C',
                secondaryColor: '#FFD700',
                pattern: 'scaled',
                glowIntensity: 1.5
            }
        });

        // Level 9-10 Foods (Ancient Dragon Serpent, Ouroboros)
        this.foodDefinitions.set(FoodType.EternalOrb, {
            type: FoodType.EternalOrb,
            name: 'Eternal Orb',
            evolutionLevel: 9,
            basePoints: 150,
            spawnWeight: 10,
            effects: [
                { type: EffectType.Growth, duration: 0, magnitude: 6 },
                { type: EffectType.EvolutionBoost, duration: 0, magnitude: 2.0 },
                { type: EffectType.PowerCooldownReduction, duration: 15000, magnitude: 0.3 }
            ],
            negativeEffects: [
                { type: EffectType.Poison, duration: 10000, magnitude: 4 },
                { type: EffectType.ReversedControls, duration: 12000, magnitude: 1 },
                { type: EffectType.SegmentLoss, duration: 0, magnitude: 4 }
            ],
            visualData: {
                color: '#FFD700',
                secondaryColor: '#FFFFFF',
                pattern: 'orb',
                glowIntensity: 2.0
            }
        });

        this.foodDefinitions.set(FoodType.OuroborosEssence, {
            type: FoodType.OuroborosEssence,
            name: 'Ouroboros Essence',
            evolutionLevel: 10,
            basePoints: 200,
            spawnWeight: 5,
            effects: [
                { type: EffectType.Growth, duration: 0, magnitude: 8 },
                { type: EffectType.Transformation, duration: 0, magnitude: 1 },
                { type: EffectType.DoublePoints, duration: 20000, magnitude: 3 }
            ],
            negativeEffects: [
                { type: EffectType.Poison, duration: 15000, magnitude: 5 },
                { type: EffectType.ReversedControls, duration: 15000, magnitude: 1 },
                { type: EffectType.DisablePowers, duration: 20000, magnitude: 1 },
                { type: EffectType.SegmentLoss, duration: 0, magnitude: 5 }
            ],
            visualData: {
                color: '#800080',
                secondaryColor: '#FFD700',
                pattern: 'mystical',
                glowIntensity: 3.0
            }
        });
    }

    private initializeFoodCombinations(): void {
        this.foodCombinations = [
            {
                name: 'Nature\'s Bounty',
                foods: [FoodType.BasicBerry, FoodType.WildMushroom],
                bonusMultiplier: 1.5,
                specialEffect: { type: EffectType.Regeneration, duration: 5000, magnitude: 1 }
            },
            {
                name: 'Crystal Power',
                foods: [FoodType.CrystalFruit, FoodType.VenomousFlower],
                bonusMultiplier: 2.0,
                specialEffect: { type: EffectType.PowerCooldownReduction, duration: 8000, magnitude: 0.4 }
            },
            {
                name: 'Aquatic Harmony',
                foods: [FoodType.AquaticPlant, FoodType.RainbowNectar],
                bonusMultiplier: 2.5,
                specialEffect: { type: EffectType.SpeedBoost, duration: 10000, magnitude: 1.3 }
            },
            {
                name: 'Celestial Feast',
                foods: [FoodType.StardustBerry, FoodType.DragonScale],
                bonusMultiplier: 3.0,
                specialEffect: { type: EffectType.Invincibility, duration: 5000, magnitude: 1 }
            },
            {
                name: 'Divine Transcendence',
                foods: [FoodType.EternalOrb, FoodType.OuroborosEssence],
                bonusMultiplier: 5.0,
                specialEffect: { type: EffectType.Transformation, duration: 0, magnitude: 2 }
            },
            {
                name: 'Evolution Chain',
                foods: [FoodType.BasicBerry, FoodType.CrystalFruit, FoodType.StardustBerry],
                bonusMultiplier: 4.0,
                specialEffect: { type: EffectType.EvolutionBoost, duration: 0, magnitude: 3.0 }
            }
        ];
    }

    public update(deltaTime: number, snakePositions: Vector2[], obstaclePositions: Vector2[] = [], snakeEvolutionLevel: number = 1): void {
        this.state.spawnTimer += deltaTime;

        // Update occupied positions for collision avoidance
        this.updateOccupiedPositions(snakePositions, obstaclePositions);

        // Update active effects
        this.updateActiveEffects(deltaTime);

        // Clean up old consumption history
        this.cleanupConsumptionHistory();

        // Check if we need to spawn food
        if (this.shouldSpawnFood()) {
            this.spawnFood(snakeEvolutionLevel);
            this.state.lastSpawnTime = performance.now();
            this.state.spawnTimer = 0;
        }

        // Remove expired food
        this.removeExpiredFood();
    }

    private updateActiveEffects(deltaTime: number): void {
        this.state.activeEffects = this.state.activeEffects.filter(effect => {
            if (effect.duration > 0) {
                effect.duration -= deltaTime;
                return effect.duration > 0;
            }
            return false; // Remove instant effects
        });
    }

    private cleanupConsumptionHistory(): void {
        const currentTime = performance.now();
        const maxAge = 10000; // Keep consumption history for 10 seconds
        
        this.state.recentConsumptions = this.state.recentConsumptions.filter(
            consumption => (currentTime - consumption.timestamp) < maxAge
        );
    }

    private shouldSpawnFood(): boolean {
        const currentTime = performance.now();
        const timeSinceLastSpawn = currentTime - this.state.lastSpawnTime;

        // Spawn if we have fewer than minimum foods or enough time has passed
        return (this.state.activeFoods.length < this.state.minSimultaneousFoods) ||
            (this.state.activeFoods.length < this.state.maxSimultaneousFoods &&
                timeSinceLastSpawn >= this.state.spawnInterval);
    }

    private spawnFood(snakeEvolutionLevel: number = 1): void {
        const currentFoodCount = this.state.activeFoods.length;
        const maxNewFoods = this.state.maxSimultaneousFoods - currentFoodCount;

        if (maxNewFoods <= 0) return;

        // Determine how many foods to spawn (1-3 new foods per spawn)
        const foodsToSpawn = Math.min(
            Math.floor(Math.random() * 3) + 1,
            maxNewFoods
        );

        for (let i = 0; i < foodsToSpawn; i++) {
            const position = this.findValidSpawnPosition();
            if (position) {
                const foodType = this.selectFoodType(snakeEvolutionLevel);
                const food = this.createFood(position, foodType);
                this.state.activeFoods.push(food);
            }
        }
    }

    private selectFoodType(snakeEvolutionLevel: number): FoodType {
        // Create weighted list based on snake evolution level
        const availableFoods: Array<{ type: FoodType; weight: number }> = [];

        this.foodDefinitions.forEach((definition, foodType) => {
            let weight = definition.spawnWeight;

            // Adjust weight based on evolution level appropriateness
            const levelDifference = Math.abs(definition.evolutionLevel - snakeEvolutionLevel);
            
            if (levelDifference === 0) {
                // Perfect match - highest weight
                weight *= 3;
            } else if (levelDifference === 1) {
                // Close match - good weight
                weight *= 2;
            } else if (levelDifference === 2) {
                // Acceptable - normal weight
                weight *= 1;
            } else if (levelDifference <= 4) {
                // Challenging - reduced weight
                weight *= 0.3;
            } else {
                // Very challenging - very low weight
                weight *= 0.1;
            }

            // Ensure higher level foods are rarer
            if (definition.evolutionLevel > snakeEvolutionLevel + 2) {
                weight *= 0.2;
            }

            availableFoods.push({ type: foodType, weight });
        });

        // Select food based on weighted random
        const totalWeight = availableFoods.reduce((sum, food) => sum + food.weight, 0);
        let random = Math.random() * totalWeight;

        for (const food of availableFoods) {
            random -= food.weight;
            if (random <= 0) {
                return food.type;
            }
        }

        // Fallback to BasicBerry
        return FoodType.BasicBerry;
    }

    private findValidSpawnPosition(): Vector2 | null {
        const maxAttempts = 50;
        let attempts = 0;

        while (attempts < maxAttempts) {
            const position = {
                x: Math.floor(Math.random() * this.config.gridWidth),
                y: Math.floor(Math.random() * this.config.gridHeight)
            };

            const positionKey = `${position.x},${position.y}`;

            // Check if position is not occupied
            if (!this.occupiedPositions.has(positionKey) &&
                !this.isFoodAtPosition(position)) {
                return position;
            }

            attempts++;
        }

        return null; // Could not find valid position
    }

    private createFood(position: Vector2, foodType: FoodType = FoodType.BasicBerry): Food {
        const currentTime = performance.now();
        const definition = this.foodDefinitions.get(foodType);

        if (!definition) {
            throw new Error(`Food definition not found for type: ${foodType}`);
        }

        const food: Food = {
            id: `food_${currentTime}_${Math.random().toString(36).substring(2, 9)}`,
            type: foodType,
            position: { ...position },
            evolutionLevel: definition.evolutionLevel,
            points: definition.basePoints,
            effects: definition.effects.map(effect => ({ ...effect })),
            spawnTime: currentTime,
            isSpecial: definition.evolutionLevel >= 7 // High-level foods are special
        };

        return food;
    }

    private updateOccupiedPositions(snakePositions: Vector2[], obstaclePositions: Vector2[]): void {
        this.occupiedPositions.clear();

        // Add snake positions
        snakePositions.forEach(pos => {
            this.occupiedPositions.add(`${Math.floor(pos.x)},${Math.floor(pos.y)}`);
        });

        // Add obstacle positions
        obstaclePositions.forEach(pos => {
            this.occupiedPositions.add(`${Math.floor(pos.x)},${Math.floor(pos.y)}`);
        });
    }

    private isFoodAtPosition(position: Vector2): boolean {
        return this.state.activeFoods.some(food =>
            food.position.x === position.x && food.position.y === position.y
        );
    }

    private removeExpiredFood(): void {
        // For basic implementation, food doesn't expire
        // This method is prepared for future enhancements where food might have expiration times
        const currentTime = performance.now();
        const maxFoodAge = 30000; // 30 seconds (for future use)

        this.state.activeFoods = this.state.activeFoods.filter(food => {
            return (currentTime - food.spawnTime) < maxFoodAge;
        });
    }

    public consumeFood(foodId: string, snakeEvolutionLevel: number): ConsumptionResult {
        const foodIndex = this.state.activeFoods.findIndex(food => food.id === foodId);

        if (foodIndex === -1) {
            return {
                success: false,
                pointsAwarded: 0,
                segmentsToGrow: 0,
                effects: [],
                evolutionProgress: 0
            };
        }

        const food = this.state.activeFoods[foodIndex];

        // Remove food from active list
        this.state.activeFoods.splice(foodIndex, 1);

        // Add to consumption history
        this.state.recentConsumptions.push({
            type: food.type,
            timestamp: performance.now()
        });

        // Calculate consumption result based on food type and snake evolution level
        const result = this.calculateConsumptionResult(food, snakeEvolutionLevel);

        // Check for combination bonuses
        const bonusMultiplier = this.checkFoodCombinations();
        if (bonusMultiplier.multiplier > 1) {
            result.pointsAwarded = Math.floor(result.pointsAwarded * bonusMultiplier.multiplier);
            result.evolutionProgress = Math.floor(result.evolutionProgress * bonusMultiplier.multiplier);
            
            if (bonusMultiplier.specialEffect) {
                result.effects.push(bonusMultiplier.specialEffect);
            }
        }

        // Add effects to active effects list
        result.effects.forEach(effect => {
            if (effect.duration > 0) {
                this.state.activeEffects.push({ ...effect });
            }
        });

        return result;
    }

    private calculateConsumptionResult(food: Food, snakeEvolutionLevel: number): ConsumptionResult {
        const definition = this.foodDefinitions.get(food.type);
        if (!definition) {
            return {
                success: false,
                pointsAwarded: 0,
                segmentsToGrow: 0,
                effects: [],
                evolutionProgress: 0
            };
        }

        const levelDifference = Math.abs(definition.evolutionLevel - snakeEvolutionLevel);
        const isAppropriateLevel = this.isFoodAppropriateForLevel(food.type, snakeEvolutionLevel);

        let pointsAwarded = definition.basePoints;
        let segmentsToGrow = 0;
        let evolutionProgress = 0;
        let effects: FoodEffect[] = [];

        if (isAppropriateLevel) {
            // Appropriate level consumption - full benefits
            effects = [...definition.effects];
            segmentsToGrow = definition.effects.find(effect => effect.type === EffectType.Growth)?.magnitude || 0;
            evolutionProgress = pointsAwarded;

            // Bonus for exact level match
            if (levelDifference === 0) {
                pointsAwarded = Math.floor(pointsAwarded * 1.2);
                evolutionProgress = Math.floor(evolutionProgress * 1.2);
            }
        } else {
            // Inappropriate level consumption - negative effects
            if (definition.negativeEffects) {
                effects = [...definition.negativeEffects];
            }

            // Reduced benefits
            pointsAwarded = Math.floor(pointsAwarded * 0.3);
            evolutionProgress = Math.floor(pointsAwarded * 0.1);

            // Potential segment loss instead of growth
            const segmentLossEffect = effects.find(effect => effect.type === EffectType.SegmentLoss);
            if (segmentLossEffect) {
                segmentsToGrow = -segmentLossEffect.magnitude;
            }
        }

        return {
            success: true,
            pointsAwarded,
            segmentsToGrow,
            effects,
            evolutionProgress
        };
    }

    private isFoodAppropriateForLevel(foodType: FoodType, snakeEvolutionLevel: number): boolean {
        const definition = this.foodDefinitions.get(foodType);
        if (!definition) return false;

        const levelDifference = Math.abs(definition.evolutionLevel - snakeEvolutionLevel);
        
        // Allow foods within 2 levels of snake's current level
        // But foods more than 3 levels higher are always inappropriate
        if (definition.evolutionLevel > snakeEvolutionLevel + 3) {
            return false;
        }

        return levelDifference <= 2;
    }

    private checkFoodCombinations(): BonusMultiplier {
        const recentFoodTypes = this.state.recentConsumptions
            .slice(-5) // Check last 5 consumptions
            .map(consumption => consumption.type);

        for (const combination of this.foodCombinations) {
            if (this.hasFoodCombination(recentFoodTypes, combination.foods)) {
                return {
                    multiplier: combination.bonusMultiplier,
                    reason: combination.name,
                    specialEffect: combination.specialEffect
                };
            }
        }

        return { multiplier: 1, reason: 'No combination' };
    }

    private hasFoodCombination(recentFoods: FoodType[], requiredFoods: FoodType[]): boolean {
        const foodCounts = new Map<FoodType, number>();
        
        // Count recent food types
        recentFoods.forEach(foodType => {
            foodCounts.set(foodType, (foodCounts.get(foodType) || 0) + 1);
        });

        // Check if all required foods are present
        return requiredFoods.every(requiredFood => {
            const requiredCount = requiredFoods.filter(f => f === requiredFood).length;
            const actualCount = foodCounts.get(requiredFood) || 0;
            return actualCount >= requiredCount;
        });
    }

    public getFoodAtPosition(position: Vector2): Food | null {
        return this.state.activeFoods.find(food =>
            food.position.x === Math.floor(position.x) &&
            food.position.y === Math.floor(position.y)
        ) || null;
    }

    public getActiveFoods(): Food[] {
        return [...this.state.activeFoods];
    }

    public getFoodCount(): number {
        return this.state.activeFoods.length;
    }

    public clearAllFood(): void {
        this.state.activeFoods = [];
    }

    public setSpawnInterval(interval: number): void {
        this.state.spawnInterval = Math.max(500, interval); // Minimum 0.5 seconds
    }

    public setMaxSimultaneousFoods(max: number): void {
        this.state.maxSimultaneousFoods = Math.max(1, Math.min(20, max));
    }

    public setMinSimultaneousFoods(min: number): void {
        this.state.minSimultaneousFoods = Math.max(1, Math.min(this.state.maxSimultaneousFoods, min));
    }

    public getFoodState(): FoodState {
        return {
            ...this.state,
            activeFoods: [...this.state.activeFoods]
        };
    }

    public getActiveEffects(): FoodEffect[] {
        return [...this.state.activeEffects];
    }

    public getFoodDefinition(foodType: FoodType): FoodDefinition | undefined {
        return this.foodDefinitions.get(foodType);
    }

    public getAllFoodDefinitions(): FoodDefinition[] {
        return Array.from(this.foodDefinitions.values());
    }

    public getFoodCombinations(): FoodCombination[] {
        return [...this.foodCombinations];
    }

    public getRecentConsumptions(): Array<{ type: FoodType; timestamp: number }> {
        return [...this.state.recentConsumptions];
    }

    public clearActiveEffects(): void {
        this.state.activeEffects = [];
    }

    public clearConsumptionHistory(): void {
        this.state.recentConsumptions = [];
    }

    public hasActiveEffect(effectType: EffectType): boolean {
        return this.state.activeEffects.some(effect => effect.type === effectType);
    }

    public getActiveEffectMagnitude(effectType: EffectType): number {
        const effect = this.state.activeEffects.find(effect => effect.type === effectType);
        return effect ? effect.magnitude : 0;
    }

    // Method to force spawn food for testing purposes
    public forceSpawnFood(position?: Vector2, foodType?: FoodType): Food | null {
        const spawnPosition = position || this.findValidSpawnPosition();
        if (spawnPosition) {
            const selectedFoodType = foodType || FoodType.BasicBerry;
            const food = this.createFood(spawnPosition, selectedFoodType);
            this.state.activeFoods.push(food);
            return food;
        }
        return null;
    }

    // Method to simulate food consumption for testing
    public simulateConsumption(foodType: FoodType, snakeEvolutionLevel: number): ConsumptionResult {
        const definition = this.foodDefinitions.get(foodType);
        if (!definition) {
            return {
                success: false,
                pointsAwarded: 0,
                segmentsToGrow: 0,
                effects: [],
                evolutionProgress: 0
            };
        }

        const mockFood: Food = {
            id: 'test_food',
            type: foodType,
            position: { x: 0, y: 0 },
            evolutionLevel: definition.evolutionLevel,
            points: definition.basePoints,
            effects: [...definition.effects],
            spawnTime: performance.now(),
            isSpecial: definition.evolutionLevel >= 7
        };

        return this.calculateConsumptionResult(mockFood, snakeEvolutionLevel);
    }
}