import { Vector2, SnakeSegment, GameConfig } from '../types/game';

export interface CollisionResult {
  hasCollision: boolean;
  collisionPoint?: Vector2;
  collisionType?: CollisionType;
  collisionData?: any;
}

export enum CollisionType {
  SELF_COLLISION = 'SELF_COLLISION',
  BOUNDARY_COLLISION = 'BOUNDARY_COLLISION',
  FOOD_COLLISION = 'FOOD_COLLISION',
  OBSTACLE_COLLISION = 'OBSTACLE_COLLISION'
}

export interface GridCell {
  x: number;
  y: number;
  occupied: boolean;
  occupiedBy?: 'snake' | 'food' | 'obstacle';
  segmentIndex?: number;
}

export class CollisionSystem {
  private config: GameConfig;
  private grid: GridCell[][];
  private readonly COLLISION_TOLERANCE = 0.1; // Tolerance for floating point comparisons
  private readonly SAFE_SEGMENT_COUNT = 4; // Number of segments from head that are safe from self-collision

  constructor(config: GameConfig) {
    this.config = config;
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.grid = [];
    for (let x = 0; x < this.config.gridWidth; x++) {
      this.grid[x] = [];
      for (let y = 0; y < this.config.gridHeight; y++) {
        this.grid[x][y] = {
          x,
          y,
          occupied: false
        };
      }
    }
  }

  public reset(): void {
    this.initializeGrid();
  }

  public updateSnakeGrid(head: SnakeSegment, segments: SnakeSegment[]): void {
    // Clear previous snake positions
    this.clearSnakeFromGrid();

    // Mark head position
    const headGridPos = this.worldToGrid(head.x, head.y);
    if (this.isValidGridPosition(headGridPos.x, headGridPos.y)) {
      this.grid[headGridPos.x][headGridPos.y] = {
        x: headGridPos.x,
        y: headGridPos.y,
        occupied: true,
        occupiedBy: 'snake',
        segmentIndex: -1 // -1 indicates head
      };
    }

    // Mark segment positions
    segments.forEach((segment, index) => {
      const gridPos = this.worldToGrid(segment.x, segment.y);
      if (this.isValidGridPosition(gridPos.x, gridPos.y)) {
        this.grid[gridPos.x][gridPos.y] = {
          x: gridPos.x,
          y: gridPos.y,
          occupied: true,
          occupiedBy: 'snake',
          segmentIndex: index
        };
      }
    });
  }

  private clearSnakeFromGrid(): void {
    for (let x = 0; x < this.config.gridWidth; x++) {
      for (let y = 0; y < this.config.gridHeight; y++) {
        if (this.grid[x][y].occupiedBy === 'snake') {
          this.grid[x][y] = {
            x,
            y,
            occupied: false
          };
        }
      }
    }
  }

  public checkSelfCollision(head: SnakeSegment, segments: SnakeSegment[]): CollisionResult {
    const headPos = { x: head.x, y: head.y };

    // Check collision with body segments, skipping the first few segments to allow turning
    for (let i = this.SAFE_SEGMENT_COUNT; i < segments.length; i++) {
      const segment = segments[i];
      const segmentPos = { x: segment.x, y: segment.y };

      if (this.arePositionsEqual(headPos, segmentPos)) {
        return {
          hasCollision: true,
          collisionPoint: segmentPos,
          collisionType: CollisionType.SELF_COLLISION,
          collisionData: { segmentIndex: i }
        };
      }
    }

    return { hasCollision: false };
  }

  public checkBoundaryCollision(head: SnakeSegment): CollisionResult {
    const x = head.x;
    const y = head.y;

    // Check if head is outside grid boundaries
    if (x < 0 || x >= this.config.gridWidth || y < 0 || y >= this.config.gridHeight) {
      return {
        hasCollision: true,
        collisionPoint: { x, y },
        collisionType: CollisionType.BOUNDARY_COLLISION,
        collisionData: {
          boundary: this.getBoundaryType(x, y)
        }
      };
    }

    return { hasCollision: false };
  }

  private getBoundaryType(x: number, y: number): string {
    if (x < 0) return 'left';
    if (x >= this.config.gridWidth) return 'right';
    if (y < 0) return 'top';
    if (y >= this.config.gridHeight) return 'bottom';
    return 'unknown';
  }

  public checkContinuousBodyCollision(
    head: SnakeSegment,
    segments: SnakeSegment[],
    previousHeadPosition: Vector2
  ): CollisionResult {
    // For continuous collision detection, we need to check the path between
    // the previous position and current position
    const currentPos = { x: head.x, y: head.y };
    
    // If the snake moved more than one cell, check intermediate positions
    const distance = Math.abs(currentPos.x - previousHeadPosition.x) + 
                    Math.abs(currentPos.y - previousHeadPosition.y);
    
    if (distance > 1) {
      // Check intermediate positions along the path
      const steps = Math.ceil(distance);
      for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        const intermediatePos = {
          x: Math.round(previousHeadPosition.x + (currentPos.x - previousHeadPosition.x) * t),
          y: Math.round(previousHeadPosition.y + (currentPos.y - previousHeadPosition.y) * t)
        };

        // Check if this intermediate position collides with any segment
        for (let i = this.SAFE_SEGMENT_COUNT; i < segments.length; i++) {
          const segment = segments[i];
          if (this.arePositionsEqual(intermediatePos, { x: segment.x, y: segment.y })) {
            return {
              hasCollision: true,
              collisionPoint: intermediatePos,
              collisionType: CollisionType.SELF_COLLISION,
              collisionData: { 
                segmentIndex: i,
                continuous: true,
                step: step
              }
            };
          }
        }
      }
    }

    // Fall back to standard collision check
    return this.checkSelfCollision(head, segments);
  }

  public checkFoodCollision(head: SnakeSegment, foodPositions: Vector2[]): CollisionResult {
    const headPos = { x: head.x, y: head.y };

    for (let i = 0; i < foodPositions.length; i++) {
      const foodPos = foodPositions[i];
      if (this.arePositionsEqual(headPos, foodPos)) {
        return {
          hasCollision: true,
          collisionPoint: foodPos,
          collisionType: CollisionType.FOOD_COLLISION,
          collisionData: { foodIndex: i }
        };
      }
    }

    return { hasCollision: false };
  }

  public checkObstacleCollision(head: SnakeSegment, obstaclePositions: Vector2[]): CollisionResult {
    const headPos = { x: head.x, y: head.y };

    for (let i = 0; i < obstaclePositions.length; i++) {
      const obstaclePos = obstaclePositions[i];
      if (this.arePositionsEqual(headPos, obstaclePos)) {
        return {
          hasCollision: true,
          collisionPoint: obstaclePos,
          collisionType: CollisionType.OBSTACLE_COLLISION,
          collisionData: { obstacleIndex: i }
        };
      }
    }

    return { hasCollision: false };
  }

  private arePositionsEqual(pos1: Vector2, pos2: Vector2): boolean {
    return Math.abs(pos1.x - pos2.x) < this.COLLISION_TOLERANCE &&
           Math.abs(pos1.y - pos2.y) < this.COLLISION_TOLERANCE;
  }

  private worldToGrid(x: number, y: number): Vector2 {
    return {
      x: Math.floor(x),
      y: Math.floor(y)
    };
  }

  private isValidGridPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.config.gridWidth && y >= 0 && y < this.config.gridHeight;
  }

  public getGridCell(x: number, y: number): GridCell | null {
    if (!this.isValidGridPosition(x, y)) {
      return null;
    }
    return this.grid[x][y];
  }

  public isPositionOccupied(x: number, y: number): boolean {
    const cell = this.getGridCell(x, y);
    return cell ? cell.occupied : false;
  }

  public findEmptyPositions(): Vector2[] {
    const emptyPositions: Vector2[] = [];
    
    for (let x = 0; x < this.config.gridWidth; x++) {
      for (let y = 0; y < this.config.gridHeight; y++) {
        if (!this.grid[x][y].occupied) {
          emptyPositions.push({ x, y });
        }
      }
    }
    
    return emptyPositions;
  }

  public getRandomEmptyPosition(): Vector2 | null {
    const emptyPositions = this.findEmptyPositions();
    
    if (emptyPositions.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * emptyPositions.length);
    return emptyPositions[randomIndex];
  }

  public markPosition(x: number, y: number, occupiedBy: 'food' | 'obstacle'): boolean {
    if (!this.isValidGridPosition(x, y) || this.grid[x][y].occupied) {
      return false;
    }

    this.grid[x][y] = {
      x,
      y,
      occupied: true,
      occupiedBy
    };

    return true;
  }

  public clearPosition(x: number, y: number): void {
    if (this.isValidGridPosition(x, y)) {
      this.grid[x][y] = {
        x,
        y,
        occupied: false
      };
    }
  }

  public getConfig(): GameConfig {
    return { ...this.config };
  }

  public getGridDimensions(): { width: number; height: number } {
    return {
      width: this.config.gridWidth,
      height: this.config.gridHeight
    };
  }

  public getCellSize(): number {
    return this.config.cellSize;
  }

  // Optimized collision detection for high-performance scenarios
  public performOptimizedCollisionCheck(
    head: SnakeSegment,
    segments: SnakeSegment[],
    previousHeadPosition?: Vector2
  ): CollisionResult {
    // First, check boundary collision (fastest check)
    const boundaryResult = this.checkBoundaryCollision(head);
    if (boundaryResult.hasCollision) {
      return boundaryResult;
    }

    // Then check self-collision with optimization for continuous movement
    if (previousHeadPosition) {
      return this.checkContinuousBodyCollision(head, segments, previousHeadPosition);
    } else {
      return this.checkSelfCollision(head, segments);
    }
  }
}