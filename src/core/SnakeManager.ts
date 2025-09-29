import { Vector2, SnakeSegment, SnakeState, Direction, BezierCurve, MovementPath, GameConfig, EvolutionResult, TailConsumptionResult, StrategicAdvantage, ClickableSegmentInfo } from '../types/game';
import { CollisionSystem, CollisionResult, CollisionType } from './CollisionSystem';
import { EvolutionSystem, PowerType } from './EvolutionSystem';
import { PowerSystem, PowerActivationResult, PowerVisualState } from './PowerSystem';

export class SnakeManager {
  private snake: SnakeState;
  private movementQueue: Vector2[];
  private config: GameConfig;
  private segmentPaths: MovementPath[];
  private collisionSystem: CollisionSystem;
  private evolutionSystem: EvolutionSystem;
  private powerSystem: PowerSystem;
  private previousHeadPosition: Vector2;
  private readonly SEGMENT_FOLLOW_DELAY = 150; // milliseconds
  private readonly CURVE_SMOOTHNESS = 0.3; // Control point distance factor
  private readonly BREATHING_AMPLITUDE = 0.05; // Scale variation for breathing
  private readonly BREATHING_FREQUENCY = 2; // Breathing cycles per second
  
  // Tail consumption properties
  private lastTailConsumptionTime?: number;
  private tailConsumptionCount?: number;

  constructor(config: GameConfig, startPosition?: Vector2) {
    this.config = config;
    this.movementQueue = [];
    this.segmentPaths = [];
    this.collisionSystem = new CollisionSystem(config);
    this.evolutionSystem = new EvolutionSystem(config);
    this.powerSystem = new PowerSystem(config);

    const initialPosition = startPosition || {
      x: Math.floor(config.gridWidth / 2),
      y: Math.floor(config.gridHeight / 2)
    };

    this.previousHeadPosition = { ...initialPosition };

    // Initialize snake with 3 segments (hatchling level)
    this.snake = {
      segments: [],
      head: {
        x: initialPosition.x,
        y: initialPosition.y,
        rotation: 0,
        scale: 1.0,
        interpolatedX: initialPosition.x,
        interpolatedY: initialPosition.y
      },
      direction: { x: 1, y: 0 }, // Start moving right
      targetDirection: { x: 1, y: 0 },
      speed: 1.0,
      evolutionLevel: 1,
      isAlive: true,
      lastMoveTime: 0,
      moveInterval: 200, // 5 moves per second initially
      isMoving: false
    };

    // Create initial segments behind the head
    for (let i = 1; i < 3; i++) {
      this.snake.segments.push({
        x: initialPosition.x - i,
        y: initialPosition.y,
        rotation: 0,
        scale: 1.0,
        interpolatedX: initialPosition.x - i,
        interpolatedY: initialPosition.y
      });
    }

    // Initialize movement paths for each segment
    this.initializeSegmentPaths();

    // Update collision system with initial snake position
    this.updateCollisionGrid();
  }

  private initializeSegmentPaths(): void {
    this.segmentPaths = [];
    for (let i = 0; i < this.snake.segments.length; i++) {
      this.segmentPaths.push({
        curve: this.createStraightCurve(this.snake.segments[i]),
        progress: 1.0, // Start with completed paths
        duration: this.SEGMENT_FOLLOW_DELAY
      });
    }
  }

  private createStraightCurve(segment: SnakeSegment): BezierCurve {
    const start = { x: segment.x, y: segment.y };
    return {
      startPoint: start,
      controlPoint1: start,
      controlPoint2: start,
      endPoint: start
    };
  }

  public update(deltaTime: number): void {
    if (!this.snake.isAlive) return;

    const currentTime = performance.now();

    // Update evolution system
    this.evolutionSystem.update(deltaTime);

    // Update power system
    this.powerSystem.update(deltaTime);

    // Update breathing animation when idle
    if (!this.snake.isMoving) {
      this.updateBreathingAnimation(currentTime);
    }

    // Check if it's time to move
    if (currentTime - this.snake.lastMoveTime >= this.snake.moveInterval) {
      this.move();
      this.snake.lastMoveTime = currentTime;
    }

    // Update segment interpolation
    this.updateSegmentInterpolation(deltaTime);
  }

  private updateBreathingAnimation(currentTime: number): void {
    // Only apply breathing when not moving
    if (this.snake.isMoving) return;

    const breathingPhase = (currentTime * this.BREATHING_FREQUENCY * 2 * Math.PI) / 1000;
    const breathingScale = 1.0 + Math.sin(breathingPhase) * this.BREATHING_AMPLITUDE;

    this.snake.head.scale = breathingScale;

    // Apply subtle breathing to body segments with decreasing intensity
    for (let i = 0; i < this.snake.segments.length; i++) {
      const intensity = Math.max(0.3, 1.0 - (i * 0.1));
      this.snake.segments[i].scale = 1.0 + Math.sin(breathingPhase - i * 0.2) * this.BREATHING_AMPLITUDE * intensity;
    }
  }

  private updateSegmentInterpolation(deltaTime: number): void {
    const interpolationSpeed = deltaTime / this.snake.moveInterval;

    // Update each segment's movement along its curve
    for (let i = 0; i < this.segmentPaths.length; i++) {
      const path = this.segmentPaths[i];

      if (path.progress < 1.0) {
        path.progress = Math.min(1.0, path.progress + interpolationSpeed);

        // Calculate position along Bézier curve
        const position = this.evaluateBezierCurve(path.curve, path.progress);

        if (i < this.snake.segments.length) {
          this.snake.segments[i].interpolatedX = position.x;
          this.snake.segments[i].interpolatedY = position.y;

          // Update rotation based on movement direction
          this.updateSegmentRotation(i, path.curve, path.progress);
        }
      }
    }

    // Update head interpolation
    this.updateHeadInterpolation(interpolationSpeed);
  }

  private updateHeadInterpolation(interpolationSpeed: number): void {
    if (this.snake.isMoving) {
      // Smooth interpolation towards target position
      const targetX = this.snake.head.x;
      const targetY = this.snake.head.y;

      if (this.snake.head.interpolatedX !== undefined && this.snake.head.interpolatedY !== undefined) {
        this.snake.head.interpolatedX += (targetX - this.snake.head.interpolatedX) * interpolationSpeed;
        this.snake.head.interpolatedY += (targetY - this.snake.head.interpolatedY) * interpolationSpeed;
      } else {
        this.snake.head.interpolatedX = targetX;
        this.snake.head.interpolatedY = targetY;
      }

      // Update head rotation based on direction
      this.snake.head.rotation = Math.atan2(this.snake.direction.y, this.snake.direction.x);
    }
  }

  private updateSegmentRotation(segmentIndex: number, curve: BezierCurve, progress: number): void {
    // Calculate tangent direction at current progress
    const tangent = this.getBezierTangent(curve, progress);
    this.snake.segments[segmentIndex].rotation = Math.atan2(tangent.y, tangent.x);
  }

  private evaluateBezierCurve(curve: BezierCurve, t: number): Vector2 {
    const { startPoint, controlPoint1, controlPoint2, endPoint } = curve;
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const oneMinusTCubed = oneMinusTSquared * oneMinusT;
    const tSquared = t * t;
    const tCubed = tSquared * t;

    return {
      x: oneMinusTCubed * startPoint.x +
        3 * oneMinusTSquared * t * controlPoint1.x +
        3 * oneMinusT * tSquared * controlPoint2.x +
        tCubed * endPoint.x,
      y: oneMinusTCubed * startPoint.y +
        3 * oneMinusTSquared * t * controlPoint1.y +
        3 * oneMinusT * tSquared * controlPoint2.y +
        tCubed * endPoint.y
    };
  }

  private getBezierTangent(curve: BezierCurve, t: number): Vector2 {
    const { startPoint, controlPoint1, controlPoint2, endPoint } = curve;
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const tSquared = t * t;

    const tangent = {
      x: -3 * oneMinusTSquared * startPoint.x +
        3 * oneMinusTSquared * controlPoint1.x -
        6 * oneMinusT * t * controlPoint1.x +
        6 * oneMinusT * t * controlPoint2.x -
        3 * tSquared * controlPoint2.x +
        3 * tSquared * endPoint.x,
      y: -3 * oneMinusTSquared * startPoint.y +
        3 * oneMinusTSquared * controlPoint1.y -
        6 * oneMinusT * t * controlPoint1.y +
        6 * oneMinusT * t * controlPoint2.y -
        3 * tSquared * controlPoint2.y +
        3 * tSquared * endPoint.y
    };

    // Normalize tangent
    const magnitude = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);
    if (magnitude > 0) {
      tangent.x /= magnitude;
      tangent.y /= magnitude;
    }

    return tangent;
  }

  public queueDirection(direction: Vector2): void {
    // Prevent immediate direction reversal
    if (this.isOppositeDirection(direction, this.snake.direction)) {
      return;
    }

    // Add to movement queue if different from current target
    if (direction.x !== this.snake.targetDirection.x || direction.y !== this.snake.targetDirection.y) {
      this.movementQueue.push({ ...direction });
    }
  }

  private processMovementQueue(): void {
    if (this.movementQueue.length > 0) {
      const nextDirection = this.movementQueue.shift()!;

      // Only change direction if it's not opposite to current direction
      if (!this.isOppositeDirection(nextDirection, this.snake.direction)) {
        this.snake.targetDirection = nextDirection;
        // Apply direction change immediately for responsive controls
        this.snake.direction = { ...this.snake.targetDirection };
      }
    }
  }

  private isOppositeDirection(dir1: Vector2, dir2: Vector2): boolean {
    return (dir1.x === -dir2.x && dir1.y === -dir2.y) &&
      (Math.abs(dir1.x) > 0 || Math.abs(dir1.y) > 0);
  }

  public move(): void {
    if (!this.snake.isAlive) return;

    this.snake.isMoving = true;

    // Process any queued direction changes first
    this.processMovementQueue();

    // Store previous head position for collision detection and segment following
    this.previousHeadPosition = { x: this.snake.head.x, y: this.snake.head.y };

    // Move head to new position
    this.snake.head.x += this.snake.direction.x;
    this.snake.head.y += this.snake.direction.y;

    // Update collision system with new snake position
    this.updateCollisionGrid();

    // Create curved path for segments to follow
    this.updateSegmentPaths(this.previousHeadPosition, true);

    // Reset movement flag after a short delay
    setTimeout(() => {
      this.snake.isMoving = false;
    }, this.snake.moveInterval * 0.7);
  }

  private updateSegmentPaths(previousHeadPosition: Vector2, directionChanged: boolean): void {
    // Store previous positions for each segment
    const previousPositions: Vector2[] = [];
    for (let i = 0; i < this.snake.segments.length; i++) {
      previousPositions.push({ x: this.snake.segments[i].x, y: this.snake.segments[i].y });
    }

    // Update segment positions - each follows the one in front
    for (let i = 0; i < this.snake.segments.length; i++) {
      const targetPosition = i === 0 ? previousHeadPosition : previousPositions[i - 1];

      // Create curved path for natural movement
      const curve = this.createCurvedPath(
        { x: this.snake.segments[i].x, y: this.snake.segments[i].y },
        targetPosition,
        directionChanged && i < 3 // Apply curves to first few segments when turning
      );

      // Update segment target position
      this.snake.segments[i].x = targetPosition.x;
      this.snake.segments[i].y = targetPosition.y;

      // Create new movement path with delay
      if (i < this.segmentPaths.length) {
        this.segmentPaths[i] = {
          curve: curve,
          progress: 0.0,
          duration: this.SEGMENT_FOLLOW_DELAY + (i * 20) // Stagger segment movement
        };
      }
    }
  }

  private createCurvedPath(start: Vector2, end: Vector2, useCurve: boolean): BezierCurve {
    if (!useCurve || (start.x === end.x && start.y === end.y)) {
      // Straight line for no movement or when curves are disabled
      return {
        startPoint: start,
        controlPoint1: start,
        controlPoint2: end,
        endPoint: end
      };
    }

    // Create curved path using Bézier curve
    const midPoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    };

    // Calculate perpendicular offset for curve control points
    const direction = { x: end.x - start.x, y: end.y - start.y };
    const perpendicular = { x: -direction.y, y: direction.x };
    const curveIntensity = this.CURVE_SMOOTHNESS;

    const controlPoint1 = {
      x: start.x + direction.x * 0.25 + perpendicular.x * curveIntensity,
      y: start.y + direction.y * 0.25 + perpendicular.y * curveIntensity
    };

    const controlPoint2 = {
      x: end.x - direction.x * 0.25 + perpendicular.x * curveIntensity,
      y: end.y - direction.y * 0.25 + perpendicular.y * curveIntensity
    };

    return {
      startPoint: start,
      controlPoint1: controlPoint1,
      controlPoint2: controlPoint2,
      endPoint: end
    };
  }

  public grow(segments: number = 1): void {
    const lastSegment = this.snake.segments[this.snake.segments.length - 1];

    for (let i = 0; i < segments; i++) {
      const newSegment: SnakeSegment = {
        x: lastSegment.x,
        y: lastSegment.y,
        rotation: lastSegment.rotation,
        scale: 1.0,
        interpolatedX: lastSegment.x,
        interpolatedY: lastSegment.y
      };

      this.snake.segments.push(newSegment);

      // Add corresponding movement path
      this.segmentPaths.push({
        curve: this.createStraightCurve(newSegment),
        progress: 1.0,
        duration: this.SEGMENT_FOLLOW_DELAY
      });
    }

    // Update collision grid after growing
    this.updateCollisionGrid();
  }

  private updateCollisionGrid(): void {
    this.collisionSystem.updateSnakeGrid(this.snake.head, this.snake.segments);
  }

  public checkSelfCollision(): CollisionResult {
    return this.collisionSystem.checkSelfCollision(this.snake.head, this.snake.segments);
  }

  public checkWallCollision(): boolean {
    const head = this.snake.head;
    return head.x < 0 || head.x >= this.config.gridWidth || 
           head.y < 0 || head.y >= this.config.gridHeight;
  }

  public checkBoundaryCollision(): CollisionResult {
    return this.collisionSystem.checkBoundaryCollision(this.snake.head);
  }

  public checkContinuousBodyCollision(): CollisionResult {
    return this.collisionSystem.checkContinuousBodyCollision(
      this.snake.head,
      this.snake.segments,
      this.previousHeadPosition
    );
  }

  public performOptimizedCollisionCheck(): CollisionResult {
    return this.collisionSystem.performOptimizedCollisionCheck(
      this.snake.head,
      this.snake.segments,
      this.previousHeadPosition
    );
  }

  // Legacy methods for backward compatibility
  public checkSelfCollisionLegacy(): boolean {
    const result = this.checkSelfCollision();
    return result.hasCollision;
  }

  public checkBoundaryCollisionLegacy(): boolean {
    const result = this.checkBoundaryCollision();
    return result.hasCollision;
  }

  public getHeadPosition(): Vector2 {
    return {
      x: this.snake.head.interpolatedX || this.snake.head.x,
      y: this.snake.head.interpolatedY || this.snake.head.y
    };
  }

  public getSegments(): SnakeSegment[] {
    return [...this.snake.segments];
  }

  public getHead(): SnakeSegment {
    return { ...this.snake.head };
  }

  public getLength(): number {
    return this.snake.segments.length + 1; // +1 for head
  }

  public getDirection(): Vector2 {
    return { ...this.snake.direction };
  }

  public isAlive(): boolean {
    return this.snake.isAlive;
  }

  public kill(): void {
    this.snake.isAlive = false;
    this.snake.isMoving = false;
  }

  public setSpeed(speed: number): void {
    // Apply power system speed multiplier
    const speedMultiplier = this.powerSystem.getSpeedMultiplier();
    const effectiveSpeed = speed * speedMultiplier;

    this.snake.speed = Math.max(0.1, Math.min(3.0, effectiveSpeed));
    this.snake.moveInterval = 200 / this.snake.speed; // Adjust move interval based on speed
  }

  public getSpeed(): number {
    return this.snake.speed;
  }

  public reset(startPosition?: Vector2): void {
    const initialPosition = startPosition || {
      x: Math.floor(this.config.gridWidth / 2),
      y: Math.floor(this.config.gridHeight / 2)
    };

    this.previousHeadPosition = { ...initialPosition };
    this.movementQueue = [];
    this.segmentPaths = [];

    // Reset snake to initial state
    this.snake = {
      segments: [],
      head: {
        x: initialPosition.x,
        y: initialPosition.y,
        rotation: 0,
        scale: 1.0,
        interpolatedX: initialPosition.x,
        interpolatedY: initialPosition.y
      },
      direction: { x: 1, y: 0 }, // Start moving right
      targetDirection: { x: 1, y: 0 },
      speed: 200, // milliseconds between moves
      evolutionLevel: 1,
      isAlive: true,
      lastMoveTime: 0,
      moveInterval: 200,
      isMoving: false
    };

    // Initialize with 3 segments for hatchling
    for (let i = 1; i <= 3; i++) {
      this.snake.segments.push({
        x: initialPosition.x - i,
        y: initialPosition.y,
        rotation: 0,
        scale: 1.0,
        interpolatedX: initialPosition.x - i,
        interpolatedY: initialPosition.y
      });
    }

    // Reset systems
    this.evolutionSystem.reset();
    this.powerSystem.reset();
    this.collisionSystem.reset();

    // Reset tail consumption tracking
    this.lastTailConsumptionTime = undefined;
    this.tailConsumptionCount = undefined;
  }

  public getEvolutionLevel(): number {
    return this.snake.evolutionLevel;
  }

  public setEvolutionLevel(level: number): void {
    this.snake.evolutionLevel = Math.max(1, Math.min(10, level));
  }

  // Ouroboros tail consumption mechanics
  public consumeTail(segments: number): TailConsumptionResult {
    if (this.snake.evolutionLevel < 10) {
      return {
        success: false,
        segmentsConsumed: 0,
        message: 'Tail consumption only available at Ouroboros level (10)',
        strategicAdvantage: null
      };
    }

    if (segments <= 0) {
      return {
        success: false,
        segmentsConsumed: 0,
        message: 'Invalid number of segments to consume',
        strategicAdvantage: null
      };
    }

    // Minimum length enforcement - keep at least 5 segments for game balance
    const minLength = 5;
    const maxConsumable = Math.max(0, this.snake.segments.length - (minLength - 1)); // -1 because head is not in segments array
    const segmentsToRemove = Math.min(segments, maxConsumable);

    if (segmentsToRemove <= 0) {
      return {
        success: false,
        segmentsConsumed: 0,
        message: 'Cannot consume tail - minimum length reached',
        strategicAdvantage: null
      };
    }

    // Apply consumption cooldown to prevent exploitation
    const currentTime = performance.now();
    const cooldownPeriod = 2000; // 2 seconds between tail consumptions
    
    if (this.lastTailConsumptionTime !== undefined && (currentTime - this.lastTailConsumptionTime) < cooldownPeriod) {
      const remainingCooldown = Math.ceil((cooldownPeriod - (currentTime - this.lastTailConsumptionTime)) / 1000);
      return {
        success: false,
        segmentsConsumed: 0,
        message: `Tail consumption on cooldown (${remainingCooldown}s remaining)`,
        strategicAdvantage: null
      };
    }

    // Remove segments from the tail
    const consumedSegments = this.snake.segments.splice(-segmentsToRemove, segmentsToRemove);
    this.segmentPaths.splice(-segmentsToRemove, segmentsToRemove);

    // Update collision grid after tail consumption
    this.updateCollisionGrid();

    // Calculate strategic advantages
    const strategicAdvantage = this.calculateStrategicAdvantage(segmentsToRemove);

    // Record consumption time for cooldown
    this.lastTailConsumptionTime = currentTime;

    // Increment consumption counter for balance tracking
    this.tailConsumptionCount = (this.tailConsumptionCount || 0) + 1;

    return {
      success: true,
      segmentsConsumed: segmentsToRemove,
      message: `Consumed ${segmentsToRemove} tail segment${segmentsToRemove > 1 ? 's' : ''}`,
      strategicAdvantage,
      consumedSegmentPositions: consumedSegments.map(seg => ({ x: seg.x, y: seg.y }))
    };
  }

  private calculateStrategicAdvantage(segmentsConsumed: number): StrategicAdvantage {
    const basePointsPerSegment = 50;
    const bonusPoints = segmentsConsumed * basePointsPerSegment;
    
    // Calculate navigation bonus based on length reduction
    const navigationBonus = segmentsConsumed >= 3 ? 'significant' : segmentsConsumed >= 2 ? 'moderate' : 'minor';
    
    // Temporary speed boost after tail consumption
    const speedBoostDuration = 3000; // 3 seconds
    const speedMultiplier = 1.2 + (segmentsConsumed * 0.1); // 20% base + 10% per segment
    
    return {
      bonusPoints,
      navigationBonus,
      speedBoost: {
        multiplier: speedMultiplier,
        duration: speedBoostDuration
      },
      mysticalEnergy: segmentsConsumed * 10 // For future power cycling mechanics
    };
  }

  public canConsumeTailSegment(segmentIndex: number): boolean {
    if (this.snake.evolutionLevel < 10) return false;
    if (segmentIndex < 0 || segmentIndex >= this.snake.segments.length) return false;
    
    // Only allow consumption of tail segments (last 70% of the snake)
    const tailStartIndex = Math.floor(this.snake.segments.length * 0.3);
    return segmentIndex >= tailStartIndex;
  }

  public getClickableSegmentInfo(worldPosition: Vector2): ClickableSegmentInfo | null {
    if (this.snake.evolutionLevel < 10) return null;

    // Convert world position to grid position
    const gridX = Math.floor(worldPosition.x / this.config.cellSize);
    const gridY = Math.floor(worldPosition.y / this.config.cellSize);

    // Find all segments at this position and prioritize the most consumable one
    let bestMatch: ClickableSegmentInfo | null = null;
    
    for (let i = 0; i < this.snake.segments.length; i++) {
      const segment = this.snake.segments[i];
      
      if (segment.x === gridX && segment.y === gridY) {
        const isConsumable = this.canConsumeTailSegment(i);
        const segmentInfo: ClickableSegmentInfo = {
          segmentIndex: i,
          position: { x: segment.x, y: segment.y },
          isConsumable,
          segmentsToTail: this.snake.segments.length - i,
          estimatedAdvantage: isConsumable ? this.calculateStrategicAdvantage(this.snake.segments.length - i) : null
        };
        
        // Prioritize consumable segments, and among consumable segments, prefer the one closer to tail
        if (!bestMatch || (isConsumable && !bestMatch.isConsumable) || 
            (isConsumable && bestMatch.isConsumable && i > bestMatch.segmentIndex)) {
          bestMatch = segmentInfo;
        }
      }
    }

    return bestMatch;
  }

  public consumeTailFromSegment(segmentIndex: number): TailConsumptionResult {
    if (!this.canConsumeTailSegment(segmentIndex)) {
      return {
        success: false,
        segmentsConsumed: 0,
        message: 'Cannot consume this segment',
        strategicAdvantage: null
      };
    }

    const segmentsToConsume = this.snake.segments.length - segmentIndex;
    return this.consumeTail(segmentsToConsume);
  }

  public getTailConsumptionCooldown(): number {
    if (this.lastTailConsumptionTime === undefined) return 0;
    
    const currentTime = performance.now();
    const cooldownPeriod = 2000;
    const elapsed = currentTime - this.lastTailConsumptionTime;
    
    return Math.max(0, cooldownPeriod - elapsed);
  }

  public getTailConsumptionCount(): number {
    return this.tailConsumptionCount || 0;
  }

  // Legacy method for backward compatibility
  public consumeTailLegacy(segments: number): boolean {
    const result = this.consumeTail(segments);
    return result.success;
  }

  public getSnakeState(): SnakeState {
    return {
      ...this.snake,
      segments: [...this.snake.segments],
      head: { ...this.snake.head },
      direction: { ...this.snake.direction },
      targetDirection: { ...this.snake.targetDirection }
    };
  }

  public getCollisionSystem(): CollisionSystem {
    return this.collisionSystem;
  }

  public getPreviousHeadPosition(): Vector2 {
    return { ...this.previousHeadPosition };
  }

  public checkFoodCollision(foodPositions: Vector2[]): CollisionResult {
    return this.collisionSystem.checkFoodCollision(this.snake.head, foodPositions);
  }

  public checkObstacleCollision(obstaclePositions: Vector2[]): CollisionResult {
    return this.collisionSystem.checkObstacleCollision(this.snake.head, obstaclePositions);
  }

  // Food consumption integration with evolution
  public consumeFood(segmentsToGrow: number, foodPoints: number = 0): EvolutionResult {
    if (segmentsToGrow > 0) {
      this.grow(segmentsToGrow);
    }

    // Process evolution based on food points
    const evolutionResult = this.evolutionSystem.addFoodProgress(foodPoints);

    // Update snake's evolution level if evolved
    if (evolutionResult.evolved) {
      this.snake.evolutionLevel = evolutionResult.newLevel;

      // Update visual appearance based on new evolution level
      this.updateVisualAppearance(evolutionResult.visualChanges);

      // Adjust snake properties based on evolution level
      this.adjustEvolutionProperties(evolutionResult.newLevel);
    }

    return evolutionResult;
  }

  private updateVisualAppearance(visualPattern: any): void {
    // This method will be expanded in later tasks when implementing visual rendering
    // For now, we just store the pattern information
    // The actual visual updates will be handled by the rendering system
  }

  private adjustEvolutionProperties(level: number): void {
    const levelData = this.evolutionSystem.getEvolutionLevel(level);
    if (!levelData) return;

    // Initialize powers for this level
    this.initializePowersForLevel(level);

    // Adjust speed based on evolution level
    const speedMultiplier = 1.0 + (level - 1) * 0.1; // 10% speed increase per level
    this.setSpeed(this.snake.speed * speedMultiplier);

    // Ensure minimum segment count for evolution level
    const currentLength = this.getLength();
    const requiredLength = levelData.segmentCount;

    if (currentLength < requiredLength) {
      this.grow(requiredLength - currentLength);
    }
  }

  public getAllPositions(): Vector2[] {
    const positions: Vector2[] = [
      { x: this.snake.head.x, y: this.snake.head.y }
    ];

    this.snake.segments.forEach(segment => {
      positions.push({ x: segment.x, y: segment.y });
    });

    return positions;
  }

  // Evolution system integration methods
  public getEvolutionSystem(): EvolutionSystem {
    return this.evolutionSystem;
  }

  public getCurrentEvolutionLevel(): number {
    return this.evolutionSystem.getCurrentLevel();
  }

  public getEvolutionProgress(): number {
    return this.evolutionSystem.getProgressToNextLevel();
  }

  public getFoodProgress(): number {
    return this.evolutionSystem.getFoodProgress();
  }

  public isTransforming(): boolean {
    return this.evolutionSystem.isTransformationInProgress();
  }

  public getTransformationProgress(): number {
    return this.evolutionSystem.getTransformationProgress();
  }

  public getAvailablePowers(): PowerType[] {
    return this.evolutionSystem.getAvailablePowers();
  }

  // Power system integration methods
  public getPowerSystem(): PowerSystem {
    return this.powerSystem;
  }

  public activatePower(powerType: PowerType): PowerActivationResult {
    const headPosition = this.getHeadPosition();
    const direction = this.getDirection();

    // Activate power through power system
    const result = this.powerSystem.activatePower(powerType, headPosition, direction);

    // If power was successfully activated, also activate it in evolution system for tracking
    if (result.success) {
      this.evolutionSystem.activatePower(powerType);
    }

    return result;
  }

  public isPowerActive(powerType: PowerType): boolean {
    return this.powerSystem.isPowerActive(powerType);
  }

  public getPowerCooldown(powerType: PowerType): number {
    return this.powerSystem.getPowerCooldown(powerType);
  }

  public getPowerDuration(powerType: PowerType): number {
    return this.powerSystem.getPowerDuration(powerType);
  }

  public getPowerVisualState(): PowerVisualState {
    return this.powerSystem.getVisualState();
  }

  public initializePowersForLevel(level: number): void {
    const levelData = this.evolutionSystem.getEvolutionLevel(level);
    if (levelData) {
      // Initialize powers in power system when they become available
      levelData.powers.forEach(powerType => {
        this.powerSystem.initializePower(powerType);
      });
    }
  }
}