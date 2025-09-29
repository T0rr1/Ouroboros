import { 
  Vector2, 
  GameConfig, 
  Obstacle, 
  ObstacleType, 
  EnvironmentState, 
  ObstacleCollisionResult,
  DynamicElement,
  DynamicElementType,
  DynamicElementCollisionResult,
  MovementPattern,
  MovementPatternType,
  TriggerCondition,
  EffectType,
  InteractiveFeature,
  InteractiveFeatureType,
  InteractiveFeatureActivationResult
} from '../types/game';
import { CollisionSystem, CollisionResult } from './CollisionSystem';

export class EnvironmentSystem {
  private config: GameConfig;
  private state: EnvironmentState;
  private collisionSystem: CollisionSystem;

  constructor(config: GameConfig) {
    this.config = config;
    this.collisionSystem = new CollisionSystem(config);
    
    this.state = {
      obstacles: [],
      dynamicElements: [],
      interactiveFeatures: []
    };

    this.initializeBasicObstacles();
    this.initializeDynamicElements();
    this.initializeInteractiveFeatures();
  }

  private initializeBasicObstacles(): void {
    // Create a basic level layout with stone pillars, crystal formations, and ice walls
    this.generateBasicLevel();
  }

  private generateBasicLevel(): void {
    const obstacles: Obstacle[] = [];

    // Add stone pillars around the perimeter and some interior positions
    this.addStonePillars(obstacles);
    
    // Add crystal formations in strategic locations
    this.addCrystalFormations(obstacles);
    
    // Add ice walls to create barriers
    this.addIceWalls(obstacles);
    
    // Add magic barriers for wall phasing
    this.addMagicBarriers(obstacles);

    this.state.obstacles = obstacles;
  }

  private addStonePillars(obstacles: Obstacle[]): void {
    const pillarPositions = [
      // Corner pillars
      { x: 5, y: 5 },
      { x: 44, y: 5 },
      { x: 5, y: 29 },
      { x: 44, y: 29 },
      
      // Interior strategic positions
      { x: 15, y: 12 },
      { x: 35, y: 12 },
      { x: 25, y: 20 },
      { x: 10, y: 25 },
      { x: 40, y: 25 }
    ];

    pillarPositions.forEach((pos, index) => {
      obstacles.push({
        id: `stone_pillar_${index}`,
        type: ObstacleType.StonePillar,
        position: pos,
        size: { x: 1, y: 1 }, // Single cell obstacle
        isDestructible: false,
        isActive: true,
        health: 100
      });
    });
  }

  private addCrystalFormations(obstacles: Obstacle[]): void {
    const crystalPositions = [
      // Crystal clusters
      { x: 20, y: 8 },
      { x: 30, y: 8 },
      { x: 12, y: 18 },
      { x: 38, y: 18 },
      { x: 25, y: 28 }
    ];

    crystalPositions.forEach((pos, index) => {
      obstacles.push({
        id: `crystal_formation_${index}`,
        type: ObstacleType.CrystalFormation,
        position: pos,
        size: { x: 1, y: 1 },
        isDestructible: true,
        requiredPower: 'VenomStrike', // Can be destroyed by Viper's Venom Strike
        isActive: true,
        health: 50
      });
    });
  }

  private addIceWalls(obstacles: Obstacle[]): void {
    const wallSegments = [
      // Horizontal wall segments
      { start: { x: 8, y: 15 }, end: { x: 12, y: 15 } },
      { start: { x: 38, y: 15 }, end: { x: 42, y: 15 } },
      
      // Vertical wall segments
      { start: { x: 25, y: 5 }, end: { x: 25, y: 8 } },
      { start: { x: 25, y: 26 }, end: { x: 25, y: 29 } }
    ];

    let wallId = 0;
    wallSegments.forEach(segment => {
      if (segment.start.x === segment.end.x) {
        // Vertical wall
        for (let y = segment.start.y; y <= segment.end.y; y++) {
          obstacles.push({
            id: `ice_wall_${wallId++}`,
            type: ObstacleType.IceWall,
            position: { x: segment.start.x, y },
            size: { x: 1, y: 1 },
            isDestructible: true,
            requiredPower: 'FireBreath', // Can be destroyed by Ancient Dragon Serpent's Fire Breath
            isActive: true,
            health: 30
          });
        }
      } else {
        // Horizontal wall
        for (let x = segment.start.x; x <= segment.end.x; x++) {
          obstacles.push({
            id: `ice_wall_${wallId++}`,
            type: ObstacleType.IceWall,
            position: { x, y: segment.start.y },
            size: { x: 1, y: 1 },
            isDestructible: true,
            requiredPower: 'FireBreath',
            isActive: true,
            health: 30
          });
        }
      }
    });
  }

  private addMagicBarriers(obstacles: Obstacle[]): void {
    const barrierPositions = [
      // Thin magic barriers that can be phased through
      { x: 18, y: 10 },
      { x: 32, y: 10 },
      { x: 15, y: 22 },
      { x: 35, y: 22 }
    ];

    barrierPositions.forEach((pos, index) => {
      obstacles.push({
        id: `magic_barrier_${index}`,
        type: ObstacleType.MagicBarrier,
        position: pos,
        size: { x: 1, y: 1 },
        isDestructible: false, // Cannot be destroyed, only phased through
        requiredPower: 'SpeedBoost', // Garden Snake can phase through with Speed Boost
        isActive: true,
        health: undefined // Indestructible
      });
    });
  }

  public update(deltaTime: number): void {
    // Update dynamic elements
    this.updateDynamicElements(deltaTime);
    
    // Update interactive features
    this.updateInteractiveFeatures(deltaTime);
    
    // Ensure all obstacles are properly maintained
    this.validateObstacles();
  }

  private validateObstacles(): void {
    // Remove any obstacles that have been destroyed (health <= 0)
    this.state.obstacles = this.state.obstacles.filter(obstacle => 
      obstacle.isActive && (obstacle.health === undefined || obstacle.health > 0)
    );
  }

  public checkObstacleCollision(position: Vector2, size: Vector2 = { x: 1, y: 1 }): ObstacleCollisionResult {
    for (const obstacle of this.state.obstacles) {
      if (!obstacle.isActive) continue;

      // Check if the position overlaps with the obstacle
      const hasCollision = this.checkRectangleOverlap(
        position,
        size,
        obstacle.position,
        obstacle.size
      );

      if (hasCollision) {
        return {
          hasCollision: true,
          obstacle,
          penetrationDepth: 1, // Simple implementation
          collisionNormal: { x: 0, y: -1 } // Simple implementation
        };
      }
    }

    return { hasCollision: false };
  }

  private checkRectangleOverlap(
    pos1: Vector2,
    size1: Vector2,
    pos2: Vector2,
    size2: Vector2
  ): boolean {
    // Check if rectangles overlap using AABB collision detection
    return pos1.x < pos2.x + size2.x &&
           pos1.x + size1.x > pos2.x &&
           pos1.y < pos2.y + size2.y &&
           pos1.y + size1.y > pos2.y;
  }

  public checkSnakeObstacleCollision(snakeHead: Vector2, snakeSegments: Vector2[]): ObstacleCollisionResult {
    // Check head collision first
    const headCollision = this.checkObstacleCollision(snakeHead);
    if (headCollision.hasCollision) {
      return headCollision;
    }

    // Check body segment collisions
    for (const segment of snakeSegments) {
      const segmentCollision = this.checkObstacleCollision(segment);
      if (segmentCollision.hasCollision) {
        return segmentCollision;
      }
    }

    return { hasCollision: false };
  }

  public destroyObstacle(obstacleId: string, powerType?: string): boolean {
    const obstacle = this.state.obstacles.find(obs => obs.id === obstacleId);
    
    if (!obstacle || !obstacle.isActive) {
      return false;
    }

    // Check if the obstacle can be destroyed
    if (!obstacle.isDestructible) {
      return false;
    }

    // Check if the correct power is being used
    if (obstacle.requiredPower && obstacle.requiredPower !== powerType) {
      return false;
    }

    // Destroy the obstacle
    obstacle.isActive = false;
    obstacle.health = 0;

    return true;
  }

  public damageObstacle(obstacleId: string, damage: number, powerType?: string): boolean {
    const obstacle = this.state.obstacles.find(obs => obs.id === obstacleId);
    
    if (!obstacle || !obstacle.isActive || !obstacle.isDestructible) {
      return false;
    }

    // Check if the correct power is being used
    if (obstacle.requiredPower && obstacle.requiredPower !== powerType) {
      return false;
    }

    // Apply damage
    if (obstacle.health !== undefined) {
      obstacle.health -= damage;
      
      if (obstacle.health <= 0) {
        obstacle.isActive = false;
        obstacle.health = 0;
      }
    }

    return true;
  }

  public getObstacles(): Obstacle[] {
    return this.state.obstacles.filter(obstacle => obstacle.isActive);
  }

  public getObstacleById(id: string): Obstacle | undefined {
    return this.state.obstacles.find(obstacle => obstacle.id === id && obstacle.isActive);
  }

  public getObstaclesInArea(topLeft: Vector2, bottomRight: Vector2): Obstacle[] {
    return this.state.obstacles.filter(obstacle => {
      if (!obstacle.isActive) return false;
      
      const obsRight = obstacle.position.x + obstacle.size.x - 1;
      const obsBottom = obstacle.position.y + obstacle.size.y - 1;
      
      return obstacle.position.x <= bottomRight.x &&
             obsRight >= topLeft.x &&
             obstacle.position.y <= bottomRight.y &&
             obsBottom >= topLeft.y;
    });
  }

  public getObstacleAt(position: Vector2): Obstacle | undefined {
    return this.state.obstacles.find(obstacle => {
      if (!obstacle.isActive) return false;
      
      return position.x >= obstacle.position.x &&
             position.x < obstacle.position.x + obstacle.size.x &&
             position.y >= obstacle.position.y &&
             position.y < obstacle.position.y + obstacle.size.y;
    });
  }

  public clearObstacles(): void {
    this.state.obstacles = [];
  }

  public addObstacle(obstacle: Obstacle): void {
    this.state.obstacles.push(obstacle);
  }

  public removeObstacle(obstacleId: string): boolean {
    const index = this.state.obstacles.findIndex(obs => obs.id === obstacleId);
    if (index !== -1) {
      this.state.obstacles.splice(index, 1);
      return true;
    }
    return false;
  }

  public getEnvironmentState(): EnvironmentState {
    return {
      obstacles: [...this.state.obstacles],
      dynamicElements: [...this.state.dynamicElements],
      interactiveFeatures: [...this.state.interactiveFeatures]
    };
  }

  public handlePowerInteraction(interaction: any): boolean {
    const obstacle = this.getObstacleById(interaction.obstacleId);
    if (!obstacle) return false;

    switch (interaction.type) {
      case 'destroy':
        return this.destroyObstacle(interaction.obstacleId, interaction.powerType);
      
      case 'damage':
        return this.damageObstacle(interaction.obstacleId, interaction.damage || 50, interaction.powerType);
      
      case 'phase':
        // For phasing, we temporarily disable collision for the obstacle
        // This would be handled by the collision system during movement
        return obstacle.type === ObstacleType.MagicBarrier;
      
      default:
        return false;
    }
  }

  public canPhaseThrough(obstacleId: string, powerType: string): boolean {
    const obstacle = this.getObstacleById(obstacleId);
    if (!obstacle) return false;

    return obstacle.type === ObstacleType.MagicBarrier && 
           powerType === 'SpeedBoost' && 
           obstacle.requiredPower === 'SpeedBoost';
  }

  private initializeDynamicElements(): void {
    const elements: DynamicElement[] = [];

    // Add water pools
    this.addWaterPools(elements);
    
    // Add flame geysers
    this.addFlameGeysers(elements);
    
    // Add moving stone blocks
    this.addMovingStoneBlocks(elements);
    
    // Add poison gas clouds
    this.addPoisonGasClouds(elements);
    
    // Add lightning strikes
    this.addLightningStrikes(elements);

    this.state.dynamicElements = elements;
  }

  private addWaterPools(elements: DynamicElement[]): void {
    const waterPoolPositions = [
      // Large water pools that require Aquatic Movement (Level 6+)
      { position: { x: 8, y: 8 }, size: { x: 3, y: 3 } },
      { position: { x: 35, y: 8 }, size: { x: 4, y: 2 } },
      { position: { x: 15, y: 25 }, size: { x: 2, y: 3 } },
      { position: { x: 30, y: 22 }, size: { x: 3, y: 4 } }
    ];

    waterPoolPositions.forEach((pool, index) => {
      elements.push({
        id: `water_pool_${index}`,
        type: DynamicElementType.WaterPool,
        position: pool.position,
        size: pool.size,
        isActive: true,
        damage: 0, // Water doesn't damage, just blocks movement
        requiredEvolutionLevel: 6, // Anaconda level for Aquatic Movement
        activationTime: 0,
        duration: -1, // Permanent
        cooldownTime: 0,
        lastActivation: 0,
        currentPhase: 'active',
        phaseTimer: 0,
        visualData: {
          color: '#4A90E2',
          intensity: 0.7,
          animationSpeed: 0.5
        }
      });
    });
  }

  private addFlameGeysers(elements: DynamicElement[]): void {
    const geyserPositions = [
      { x: 12, y: 15 },
      { x: 38, y: 15 },
      { x: 25, y: 10 },
      { x: 20, y: 25 }
    ];

    geyserPositions.forEach((pos, index) => {
      elements.push({
        id: `flame_geyser_${index}`,
        type: DynamicElementType.FlameGeyser,
        position: pos,
        size: { x: 1, y: 1 },
        isActive: true,
        damage: 25,
        activationTime: 2000, // 2 second warning
        duration: 1500, // 1.5 seconds active
        cooldownTime: 4000, // 4 seconds cooldown
        lastActivation: Math.random() * 6500, // Random initial offset
        currentPhase: 'inactive',
        phaseTimer: 0,
        triggerCondition: {
          type: 'timer',
          value: 6500 // Total cycle time
        },
        visualData: {
          color: '#FF4500',
          intensity: 1.0,
          particleCount: 20,
          animationSpeed: 2.0
        }
      });
    });
  }

  private addMovingStoneBlocks(elements: DynamicElement[]): void {
    const movingBlocks = [
      {
        position: { x: 5, y: 12 },
        path: [{ x: 5, y: 12 }, { x: 15, y: 12 }, { x: 5, y: 12 }]
      },
      {
        position: { x: 40, y: 18 },
        path: [{ x: 40, y: 18 }, { x: 30, y: 18 }, { x: 40, y: 18 }]
      },
      {
        position: { x: 25, y: 5 },
        path: [{ x: 25, y: 5 }, { x: 25, y: 15 }, { x: 25, y: 5 }]
      }
    ];

    movingBlocks.forEach((block, index) => {
      elements.push({
        id: `moving_stone_block_${index}`,
        type: DynamicElementType.MovingStoneBlock,
        position: block.position,
        size: { x: 2, y: 2 },
        isActive: true,
        damage: 30,
        activationTime: 0,
        duration: -1, // Permanent movement
        cooldownTime: 0,
        lastActivation: 0,
        currentPhase: 'active',
        phaseTimer: 0,
        movementPattern: {
          type: MovementPatternType.PingPong,
          speed: 0.5, // cells per second
          path: block.path
        },
        currentTarget: block.path[1],
        pathIndex: 0,
        movementTimer: 0,
        visualData: {
          color: '#8B4513',
          intensity: 0.8
        }
      });
    });
  }

  private addPoisonGasClouds(elements: DynamicElement[]): void {
    const gasCloudPositions = [
      { x: 18, y: 20 },
      { x: 32, y: 12 },
      { x: 10, y: 28 }
    ];

    gasCloudPositions.forEach((pos, index) => {
      elements.push({
        id: `poison_gas_cloud_${index}`,
        type: DynamicElementType.PoisonGasCloud,
        position: pos,
        size: { x: 3, y: 3 },
        isActive: true,
        damage: 15,
        activationTime: 1000, // 1 second warning
        duration: 3000, // 3 seconds active
        cooldownTime: 5000, // 5 seconds cooldown
        lastActivation: Math.random() * 9000, // Random initial offset
        currentPhase: 'inactive',
        phaseTimer: 0,
        triggerCondition: {
          type: 'timer',
          value: 9000 // Total cycle time
        },
        movementPattern: {
          type: MovementPatternType.Random,
          speed: 0.2, // Slow drift
          bounds: {
            min: { x: pos.x - 2, y: pos.y - 2 },
            max: { x: pos.x + 2, y: pos.y + 2 }
          }
        },
        visualData: {
          color: '#9932CC',
          intensity: 0.6,
          particleCount: 30,
          animationSpeed: 0.8
        }
      });
    });
  }

  private addLightningStrikes(elements: DynamicElement[]): void {
    const lightningPositions = [
      { x: 22, y: 15 },
      { x: 28, y: 15 },
      { x: 15, y: 8 },
      { x: 35, y: 25 }
    ];

    lightningPositions.forEach((pos, index) => {
      elements.push({
        id: `lightning_strike_${index}`,
        type: DynamicElementType.LightningStrike,
        position: pos,
        size: { x: 1, y: 1 },
        isActive: true,
        damage: 40,
        activationTime: 500, // 0.5 second warning
        duration: 200, // 0.2 seconds active (very brief)
        cooldownTime: 8000, // 8 seconds cooldown
        lastActivation: Math.random() * 8700, // Random initial offset
        currentPhase: 'inactive',
        phaseTimer: 0,
        triggerCondition: {
          type: 'timer',
          value: 8700 // Total cycle time
        },
        visualData: {
          color: '#FFFF00',
          intensity: 1.5,
          particleCount: 15,
          animationSpeed: 5.0
        }
      });
    });
  }

  private updateDynamicElements(deltaTime: number): void {
    for (const element of this.state.dynamicElements) {
      if (!element.isActive) continue;

      // Update phase timing
      this.updateElementPhase(element, deltaTime);
      
      // Update movement if element has movement pattern
      if (element.movementPattern) {
        this.updateElementMovement(element, deltaTime);
      }
    }
  }

  private updateElementPhase(element: DynamicElement, deltaTime: number): void {
    element.phaseTimer += deltaTime;

    switch (element.currentPhase) {
      case 'inactive':
        if (element.triggerCondition?.type === 'timer') {
          const cycleTime = element.triggerCondition.value as number;
          const totalCycleTime = element.activationTime + element.duration + element.cooldownTime;
          
          // Use phase timer to track position in cycle instead of real time
          if (element.phaseTimer >= cycleTime - totalCycleTime) {
            element.currentPhase = 'warning';
            element.phaseTimer = 0;
          }
        }
        break;

      case 'warning':
        if (element.phaseTimer >= element.activationTime) {
          element.currentPhase = 'active';
          element.phaseTimer = 0;
          element.lastActivation = Date.now();
        }
        break;

      case 'active':
        if (element.duration > 0 && element.phaseTimer >= element.duration) {
          element.currentPhase = 'cooldown';
          element.phaseTimer = 0;
        }
        break;

      case 'cooldown':
        if (element.phaseTimer >= element.cooldownTime) {
          element.currentPhase = 'inactive';
          element.phaseTimer = 0;
        }
        break;
    }
  }

  private updateElementMovement(element: DynamicElement, deltaTime: number): void {
    const pattern = element.movementPattern!;
    element.movementTimer = (element.movementTimer || 0) + deltaTime;

    switch (pattern.type) {
      case MovementPatternType.PingPong:
        this.updatePingPongMovement(element, pattern, deltaTime);
        break;

      case MovementPatternType.Circular:
        this.updateCircularMovement(element, pattern, deltaTime);
        break;

      case MovementPatternType.Random:
        this.updateRandomMovement(element, pattern, deltaTime);
        break;

      case MovementPatternType.Linear:
        this.updateLinearMovement(element, pattern, deltaTime);
        break;
    }
  }

  private updatePingPongMovement(element: DynamicElement, pattern: MovementPattern, deltaTime: number): void {
    if (!pattern.path || pattern.path.length < 2) return;

    const moveDistance = pattern.speed * (deltaTime / 1000);
    element.pathIndex = element.pathIndex || 0;
    
    const currentPos = element.position;
    const targetPos = element.currentTarget || pattern.path[1];
    
    // Calculate direction to target
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= moveDistance) {
      // Reached target, move to next point
      element.position = { ...targetPos };
      element.pathIndex = (element.pathIndex + 1) % pattern.path.length;
      element.currentTarget = pattern.path[element.pathIndex];
    } else {
      // Move toward target
      const moveX = (dx / distance) * moveDistance;
      const moveY = (dy / distance) * moveDistance;
      element.position.x += moveX;
      element.position.y += moveY;
    }
  }

  private updateCircularMovement(element: DynamicElement, pattern: MovementPattern, deltaTime: number): void {
    if (!pattern.center || !pattern.radius) return;

    const angularSpeed = pattern.speed / pattern.radius; // radians per second
    const angle = (element.movementTimer / 1000) * angularSpeed;
    
    element.position.x = pattern.center.x + Math.cos(angle) * pattern.radius;
    element.position.y = pattern.center.y + Math.sin(angle) * pattern.radius;
  }

  private updateRandomMovement(element: DynamicElement, pattern: MovementPattern, deltaTime: number): void {
    if (!pattern.bounds) return;

    // Change direction randomly every 2 seconds
    if (element.movementTimer > 2000) {
      element.movementTimer = 0;
      
      const moveDistance = pattern.speed * 2; // Move for 2 seconds
      const randomAngle = Math.random() * Math.PI * 2;
      
      const newX = element.position.x + Math.cos(randomAngle) * moveDistance;
      const newY = element.position.y + Math.sin(randomAngle) * moveDistance;
      
      // Clamp to bounds
      element.currentTarget = {
        x: Math.max(pattern.bounds.min.x, Math.min(pattern.bounds.max.x, newX)),
        y: Math.max(pattern.bounds.min.y, Math.min(pattern.bounds.max.y, newY))
      };
    }
    
    // Move toward current target
    if (element.currentTarget) {
      const moveDistance = pattern.speed * (deltaTime / 1000);
      const dx = element.currentTarget.x - element.position.x;
      const dy = element.currentTarget.y - element.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > moveDistance) {
        const moveX = (dx / distance) * moveDistance;
        const moveY = (dy / distance) * moveDistance;
        element.position.x += moveX;
        element.position.y += moveY;
      }
    }
  }

  private updateLinearMovement(element: DynamicElement, pattern: MovementPattern, deltaTime: number): void {
    if (!pattern.path || pattern.path.length < 2) return;

    const moveDistance = pattern.speed * (deltaTime / 1000);
    element.pathIndex = element.pathIndex || 0;
    
    const currentPos = element.position;
    const targetPos = pattern.path[element.pathIndex];
    
    // Calculate direction to target
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= moveDistance) {
      // Reached target, move to next point
      element.position = { ...targetPos };
      element.pathIndex = (element.pathIndex + 1) % pattern.path.length;
    } else {
      // Move toward target
      const moveX = (dx / distance) * moveDistance;
      const moveY = (dy / distance) * moveDistance;
      element.position.x += moveX;
      element.position.y += moveY;
    }
  }

  public checkDynamicElementCollision(position: Vector2, evolutionLevel: number, size: Vector2 = { x: 1, y: 1 }): DynamicElementCollisionResult {
    for (const element of this.state.dynamicElements) {
      if (!element.isActive) continue;

      // Check if the position overlaps with the element
      const hasCollision = this.checkRectangleOverlap(
        position,
        size,
        element.position,
        element.size
      );

      if (hasCollision) {
        // Check if snake can pass through this element
        let canPass = false;
        let damage = 0;
        let effect: EffectType | undefined;

        switch (element.type) {
          case DynamicElementType.WaterPool:
            // Can pass if snake has Aquatic Movement (Level 6+)
            canPass = evolutionLevel >= (element.requiredEvolutionLevel || 6);
            damage = canPass ? 0 : 0; // Water doesn't damage, just blocks
            break;

          case DynamicElementType.FlameGeyser:
            canPass = false;
            damage = element.currentPhase === 'active' ? element.damage : 0;
            if (damage > 0) effect = EffectType.Poison; // Burn effect
            break;

          case DynamicElementType.MovingStoneBlock:
            canPass = false;
            damage = element.damage;
            break;

          case DynamicElementType.PoisonGasCloud:
            canPass = true; // Can move through but takes damage
            damage = element.currentPhase === 'active' ? element.damage : 0;
            if (damage > 0) effect = EffectType.Poison;
            break;

          case DynamicElementType.LightningStrike:
            canPass = true; // Lightning doesn't block movement
            damage = element.currentPhase === 'active' ? element.damage : 0;
            if (damage > 0) effect = EffectType.SlowDown;
            break;
        }

        return {
          hasCollision: true,
          element,
          canPass,
          damage,
          effect
        };
      }
    }

    return { hasCollision: false, canPass: true, damage: 0 };
  }

  public checkSnakeDynamicElementCollision(snakeHead: Vector2, snakeSegments: Vector2[], evolutionLevel: number): DynamicElementCollisionResult {
    // Check head collision first
    const headCollision = this.checkDynamicElementCollision(snakeHead, evolutionLevel);
    if (headCollision.hasCollision) {
      return headCollision;
    }

    // Check body segment collisions
    for (const segment of snakeSegments) {
      const segmentCollision = this.checkDynamicElementCollision(segment, evolutionLevel);
      if (segmentCollision.hasCollision && !segmentCollision.canPass) {
        return segmentCollision;
      }
    }

    return { hasCollision: false, canPass: true, damage: 0 };
  }

  public getDynamicElements(): DynamicElement[] {
    return this.state.dynamicElements.filter(element => element.isActive);
  }

  public getDynamicElementById(id: string): DynamicElement | undefined {
    return this.state.dynamicElements.find(element => element.id === id && element.isActive);
  }

  public getDynamicElementsInArea(topLeft: Vector2, bottomRight: Vector2): DynamicElement[] {
    return this.state.dynamicElements.filter(element => {
      if (!element.isActive) return false;
      
      const elemRight = element.position.x + element.size.x - 1;
      const elemBottom = element.position.y + element.size.y - 1;
      
      return element.position.x <= bottomRight.x &&
             elemRight >= topLeft.x &&
             element.position.y <= bottomRight.y &&
             elemBottom >= topLeft.y;
    });
  }

  public addDynamicElement(element: DynamicElement): void {
    this.state.dynamicElements.push(element);
  }

  public removeDynamicElement(elementId: string): boolean {
    const index = this.state.dynamicElements.findIndex(elem => elem.id === elementId);
    if (index !== -1) {
      this.state.dynamicElements.splice(index, 1);
      return true;
    }
    return false;
  }

  private initializeInteractiveFeatures(): void {
    const features: InteractiveFeature[] = [];

    // Add pressure plates
    this.addPressurePlates(features);
    
    // Add ancient switches
    this.addAncientSwitches(features);
    
    // Add mystical portals
    this.addMysticalPortals(features);

    this.state.interactiveFeatures = features;
  }

  private addPressurePlates(features: InteractiveFeature[]): void {
    const pressurePlatePositions = [
      // Heavy pressure plates that require Constrict power or significant weight
      { position: { x: 10, y: 10 }, connectedObstacles: ['stone_pillar_4'] },
      { position: { x: 40, y: 10 }, connectedObstacles: ['ice_wall_2', 'ice_wall_3'] },
      { position: { x: 15, y: 20 }, connectedObstacles: ['crystal_formation_2'] },
      { position: { x: 35, y: 20 }, connectedObstacles: ['magic_barrier_1'] }
    ];

    pressurePlatePositions.forEach((plate, index) => {
      features.push({
        id: `pressure_plate_${index}`,
        type: InteractiveFeatureType.PressurePlate,
        position: plate.position,
        size: { x: 1, y: 1 },
        isActive: true,
        isActivated: false,
        requiresConstrictPower: true, // Python level (4) Constrict power
        requiredWeight: 8, // Alternative: snake length of 8+ segments
        activationProgress: 0,
        lastActivationTime: 0,
        activationDuration: 5000, // 5 seconds
        cooldownTime: 2000, // 2 seconds cooldown
        visualData: {
          baseColor: '#8B4513',
          activatedColor: '#FFD700',
          glowIntensity: 0.5,
          pulseSpeed: 1.0,
          particleEffect: 'pressure_activation'
        },
        connectedElements: plate.connectedObstacles
      });
    });
  }

  private addAncientSwitches(features: InteractiveFeature[]): void {
    const ancientSwitchPositions = [
      // Ancient switches that require specific snake lengths
      { position: { x: 5, y: 15 }, requiredLength: 12, connectedObstacles: ['stone_pillar_0', 'stone_pillar_1'] },
      { position: { x: 45, y: 15 }, requiredLength: 18, connectedObstacles: ['ice_wall_8', 'ice_wall_9', 'ice_wall_10'] },
      { position: { x: 25, y: 5 }, requiredLength: 25, connectedObstacles: ['crystal_formation_0', 'crystal_formation_1'] },
      { position: { x: 25, y: 30 }, requiredLength: 30, connectedObstacles: ['magic_barrier_2', 'magic_barrier_3'] }
    ];

    ancientSwitchPositions.forEach((switchData, index) => {
      features.push({
        id: `ancient_switch_${index}`,
        type: InteractiveFeatureType.AncientSwitch,
        position: switchData.position,
        size: { x: 1, y: 1 },
        isActive: true,
        isActivated: false,
        requiredSnakeLength: switchData.requiredLength,
        activationProgress: 0,
        lastActivationTime: 0,
        activationDuration: 10000, // 10 seconds
        cooldownTime: 3000, // 3 seconds cooldown
        visualData: {
          baseColor: '#4A4A4A',
          activatedColor: '#00FFFF',
          glowIntensity: 0.8,
          pulseSpeed: 0.5,
          particleEffect: 'ancient_runes'
        },
        connectedElements: switchData.connectedObstacles
      });
    });
  }

  private addMysticalPortals(features: InteractiveFeature[]): void {
    const portalPairs = [
      // Portal pairs that require certain evolution levels
      {
        portal1: { position: { x: 8, y: 25 }, destination: { x: 42, y: 8 } },
        portal2: { position: { x: 42, y: 8 }, destination: { x: 8, y: 25 } },
        requiredLevel: 7 // Rainbow Serpent level
      },
      {
        portal1: { position: { x: 15, y: 5 }, destination: { x: 35, y: 30 } },
        portal2: { position: { x: 35, y: 30 }, destination: { x: 15, y: 5 } },
        requiredLevel: 8 // Celestial Serpent level
      },
      {
        portal1: { position: { x: 5, y: 30 }, destination: { x: 45, y: 5 } },
        portal2: { position: { x: 45, y: 5 }, destination: { x: 5, y: 30 } },
        requiredLevel: 9 // Ancient Dragon Serpent level
      }
    ];

    portalPairs.forEach((pair, pairIndex) => {
      // Portal 1
      features.push({
        id: `mystical_portal_${pairIndex}_a`,
        type: InteractiveFeatureType.MysticalPortal,
        position: pair.portal1.position,
        size: { x: 2, y: 2 },
        isActive: true,
        isActivated: false,
        requiredEvolutionLevel: pair.requiredLevel,
        activationProgress: 0,
        lastActivationTime: 0,
        activationDuration: 1000, // 1 second teleportation
        cooldownTime: 5000, // 5 seconds cooldown
        visualData: {
          baseColor: '#9932CC',
          activatedColor: '#FF69B4',
          glowIntensity: 1.2,
          pulseSpeed: 2.0,
          particleEffect: 'mystical_swirl'
        },
        teleportDestination: pair.portal1.destination,
        unlockCondition: `evolution_level_${pair.requiredLevel}`
      });

      // Portal 2
      features.push({
        id: `mystical_portal_${pairIndex}_b`,
        type: InteractiveFeatureType.MysticalPortal,
        position: pair.portal2.position,
        size: { x: 2, y: 2 },
        isActive: true,
        isActivated: false,
        requiredEvolutionLevel: pair.requiredLevel,
        activationProgress: 0,
        lastActivationTime: 0,
        activationDuration: 1000, // 1 second teleportation
        cooldownTime: 5000, // 5 seconds cooldown
        visualData: {
          baseColor: '#9932CC',
          activatedColor: '#FF69B4',
          glowIntensity: 1.2,
          pulseSpeed: 2.0,
          particleEffect: 'mystical_swirl'
        },
        teleportDestination: pair.portal2.destination,
        unlockCondition: `evolution_level_${pair.requiredLevel}`
      });
    });
  }

  private updateInteractiveFeatures(deltaTime: number): void {
    for (const feature of this.state.interactiveFeatures) {
      if (!feature.isActive) continue;

      // Update activation progress and timing
      if (feature.isActivated) {
        feature.activationProgress = Math.max(0, feature.activationProgress - deltaTime / feature.activationDuration);
        
        // Check if activation has expired
        if (feature.activationProgress <= 0) {
          feature.isActivated = false;
          feature.lastActivationTime = Date.now();
          
          // Reactivate connected obstacles if they were deactivated
          this.reactivateConnectedElements(feature);
        }
      } else {
        // Handle cooldown
        const timeSinceLastActivation = Date.now() - feature.lastActivationTime;
        if (timeSinceLastActivation < feature.cooldownTime) {
          // Still in cooldown, update visual feedback
          const cooldownProgress = timeSinceLastActivation / feature.cooldownTime;
          feature.visualData.glowIntensity = 0.2 + (0.3 * cooldownProgress);
        } else {
          // Ready for activation
          feature.visualData.glowIntensity = 0.5 + 0.3 * Math.sin(Date.now() * feature.visualData.pulseSpeed * 0.001);
        }
      }
    }
  }

  public checkInteractiveFeatureCollision(position: Vector2, size: Vector2 = { x: 1, y: 1 }): InteractiveFeature | undefined {
    for (const feature of this.state.interactiveFeatures) {
      if (!feature.isActive) continue;

      // Check if the position overlaps with the feature
      const hasCollision = this.checkRectangleOverlap(
        position,
        size,
        feature.position,
        feature.size
      );

      if (hasCollision) {
        return feature;
      }
    }

    return undefined;
  }

  public activateInteractiveFeature(
    featureId: string, 
    snakeLength: number, 
    evolutionLevel: number, 
    hasConstrictPower: boolean
  ): InteractiveFeatureActivationResult {
    const feature = this.state.interactiveFeatures.find(f => f.id === featureId);
    
    if (!feature || !feature.isActive) {
      return { success: false, feature: feature! };
    }

    // Check cooldown
    const timeSinceLastActivation = Date.now() - feature.lastActivationTime;
    if (timeSinceLastActivation < feature.cooldownTime) {
      return { 
        success: false, 
        feature, 
        message: `Feature is on cooldown for ${Math.ceil((feature.cooldownTime - timeSinceLastActivation) / 1000)} seconds` 
      };
    }

    // Check activation requirements based on feature type
    let canActivate = false;
    let message = '';

    switch (feature.type) {
      case InteractiveFeatureType.PressurePlate:
        if (feature.requiresConstrictPower && hasConstrictPower) {
          canActivate = true;
        } else if (feature.requiredWeight && snakeLength >= feature.requiredWeight) {
          canActivate = true;
        } else {
          message = feature.requiresConstrictPower 
            ? 'Requires Constrict power (Python level 4+)' 
            : `Requires snake length of ${feature.requiredWeight}+ segments`;
        }
        break;

      case InteractiveFeatureType.AncientSwitch:
        if (feature.requiredSnakeLength && snakeLength >= feature.requiredSnakeLength) {
          canActivate = true;
        } else {
          message = `Requires snake length of ${feature.requiredSnakeLength}+ segments`;
        }
        break;

      case InteractiveFeatureType.MysticalPortal:
        if (feature.requiredEvolutionLevel && evolutionLevel >= feature.requiredEvolutionLevel) {
          canActivate = true;
        } else {
          message = `Requires evolution level ${feature.requiredEvolutionLevel}+`;
        }
        break;
    }

    if (!canActivate) {
      return { success: false, feature, message };
    }

    // Activate the feature
    feature.isActivated = true;
    feature.activationProgress = 1.0;
    feature.lastActivationTime = Date.now();

    // Apply effects based on feature type
    const effects: InteractiveFeatureActivationResult['effects'] = {};

    switch (feature.type) {
      case InteractiveFeatureType.PressurePlate:
      case InteractiveFeatureType.AncientSwitch:
        // Deactivate connected obstacles
        if (feature.connectedElements) {
          effects.removeObstacles = [...feature.connectedElements];
          this.deactivateConnectedElements(feature);
        }
        break;

      case InteractiveFeatureType.MysticalPortal:
        // Teleport the snake
        if (feature.teleportDestination) {
          effects.teleportTo = { ...feature.teleportDestination };
        }
        break;
    }

    return {
      success: true,
      feature,
      message: `${feature.type} activated!`,
      effects
    };
  }

  private deactivateConnectedElements(feature: InteractiveFeature): void {
    if (!feature.connectedElements) return;

    for (const elementId of feature.connectedElements) {
      // Try to find and deactivate obstacle
      const obstacle = this.state.obstacles.find(obs => obs.id === elementId);
      if (obstacle) {
        obstacle.isActive = false;
      }

      // Try to find and deactivate dynamic element
      const dynamicElement = this.state.dynamicElements.find(elem => elem.id === elementId);
      if (dynamicElement) {
        dynamicElement.isActive = false;
      }
    }
  }

  private reactivateConnectedElements(feature: InteractiveFeature): void {
    if (!feature.connectedElements) return;

    for (const elementId of feature.connectedElements) {
      // Try to find and reactivate obstacle
      const obstacle = this.state.obstacles.find(obs => obs.id === elementId);
      if (obstacle) {
        obstacle.isActive = true;
      }

      // Try to find and reactivate dynamic element
      const dynamicElement = this.state.dynamicElements.find(elem => elem.id === elementId);
      if (dynamicElement) {
        dynamicElement.isActive = true;
      }
    }
  }

  public getInteractiveFeatures(): InteractiveFeature[] {
    return this.state.interactiveFeatures.filter(feature => feature.isActive);
  }

  public getInteractiveFeatureById(id: string): InteractiveFeature | undefined {
    return this.state.interactiveFeatures.find(feature => feature.id === id && feature.isActive);
  }

  public getInteractiveFeaturesInArea(topLeft: Vector2, bottomRight: Vector2): InteractiveFeature[] {
    return this.state.interactiveFeatures.filter(feature => {
      if (!feature.isActive) return false;
      
      const featureRight = feature.position.x + feature.size.x - 1;
      const featureBottom = feature.position.y + feature.size.y - 1;
      
      return feature.position.x <= bottomRight.x &&
             featureRight >= topLeft.x &&
             feature.position.y <= bottomRight.y &&
             featureBottom >= topLeft.y;
    });
  }

  public addInteractiveFeature(feature: InteractiveFeature): void {
    this.state.interactiveFeatures.push(feature);
  }

  public removeInteractiveFeature(featureId: string): boolean {
    const index = this.state.interactiveFeatures.findIndex(feature => feature.id === featureId);
    if (index !== -1) {
      this.state.interactiveFeatures.splice(index, 1);
      return true;
    }
    return false;
  }

  public reset(): void {
    this.state = {
      obstacles: [],
      dynamicElements: [],
      interactiveFeatures: []
    };
    this.initializeBasicObstacles();
    this.initializeDynamicElements();
    this.initializeInteractiveFeatures();
  }
}