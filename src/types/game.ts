export interface Vector2 {
  x: number;
  y: number;
}

export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  targetFPS: number;
}

export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  lastFrameTime: number;
  deltaTime: number;
  fps: number;
}

export enum InputKey {
  W = 'KeyW',
  A = 'KeyA',
  S = 'KeyS',
  D = 'KeyD',
  ArrowUp = 'ArrowUp',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  Space = 'Space'
}

export interface InputState {
  pressedKeys: Set<string>;
  currentDirection: Vector2;
}

// Snake-related types
export interface SnakeSegment {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  interpolatedX?: number;
  interpolatedY?: number;
}

export interface SnakeState {
  segments: SnakeSegment[];
  head: SnakeSegment;
  direction: Vector2;
  targetDirection: Vector2;
  speed: number;
  evolutionLevel: number;
  isAlive: boolean;
  lastMoveTime: number;
  moveInterval: number; // Time between grid moves in milliseconds
  isMoving: boolean;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface BezierCurve {
  startPoint: Vector2;
  controlPoint1: Vector2;
  controlPoint2: Vector2;
  endPoint: Vector2;
}

export interface MovementPath {
  curve: BezierCurve;
  progress: number;
  duration: number;
}

// Food system types
export enum FoodType {
  // Level 1-2 Foods
  BasicBerry = 'BasicBerry',
  WildMushroom = 'WildMushroom',
  
  // Level 3-4 Foods
  CrystalFruit = 'CrystalFruit',
  VenomousFlower = 'VenomousFlower',
  
  // Level 5-6 Foods
  AquaticPlant = 'AquaticPlant',
  RainbowNectar = 'RainbowNectar',
  
  // Level 7-8 Foods
  StardustBerry = 'StardustBerry',
  DragonScale = 'DragonScale',
  
  // Level 9-10 Foods
  EternalOrb = 'EternalOrb',
  OuroborosEssence = 'OuroborosEssence'
}

export interface Food {
  id: string;
  type: FoodType;
  position: Vector2;
  evolutionLevel: number;
  points: number;
  effects: FoodEffect[];
  spawnTime: number;
  isSpecial: boolean;
}

export interface FoodEffect {
  type: EffectType;
  duration: number;
  magnitude: number;
}

export enum EffectType {
  // Positive Effects
  Growth = 'Growth',
  SpeedBoost = 'SpeedBoost',
  EvolutionBoost = 'EvolutionBoost',
  PowerCooldownReduction = 'PowerCooldownReduction',
  DoublePoints = 'DoublePoints',
  Regeneration = 'Regeneration',
  Invincibility = 'Invincibility',
  
  // Negative Effects
  Poison = 'Poison',
  ReversedControls = 'ReversedControls',
  SlowDown = 'SlowDown',
  SegmentLoss = 'SegmentLoss',
  BlurredVision = 'BlurredVision',
  DisablePowers = 'DisablePowers',
  
  // Special Effects
  Transformation = 'Transformation',
  TimeWarp = 'TimeWarp'
}

export interface ConsumptionResult {
  success: boolean;
  pointsAwarded: number;
  segmentsToGrow: number;
  effects: FoodEffect[];
  evolutionProgress: number;
}

export interface FoodCombination {
  foods: FoodType[];
  bonusMultiplier: number;
  specialEffect?: FoodEffect;
  name: string;
}

export interface BonusMultiplier {
  multiplier: number;
  reason: string;
  specialEffect?: FoodEffect;
}

export interface FoodDefinition {
  type: FoodType;
  name: string;
  evolutionLevel: number;
  basePoints: number;
  spawnWeight: number; // Higher = more common
  effects: FoodEffect[];
  negativeEffects?: FoodEffect[]; // Applied when consumed at wrong evolution level
  visualData: {
    color: string;
    secondaryColor?: string;
    pattern?: string;
    glowIntensity?: number;
  };
}

export interface FoodState {
  activeFoods: Food[];
  spawnTimer: number;
  lastSpawnTime: number;
  spawnInterval: number;
  maxSimultaneousFoods: number;
  minSimultaneousFoods: number;
  recentConsumptions: Array<{ type: FoodType; timestamp: number }>;
  activeEffects: FoodEffect[];
}

// Evolution system types
export type { 
  PowerType, 
  VisualPattern, 
  EvolutionLevel, 
  PowerState, 
  EvolutionState, 
  EvolutionResult 
} from '../core/EvolutionSystem';

// Environment system types
export enum ObstacleType {
  StonePillar = 'StonePillar',
  CrystalFormation = 'CrystalFormation',
  IceWall = 'IceWall',
  ThornBush = 'ThornBush',
  MagicBarrier = 'MagicBarrier'
}

export interface Obstacle {
  id: string;
  type: ObstacleType;
  position: Vector2;
  size: Vector2;
  isDestructible: boolean;
  requiredPower?: string; // PowerType from EvolutionSystem
  isActive: boolean;
  health?: number;
  visualData?: any; // For rendering-specific data
}

// Dynamic environment element types
export enum DynamicElementType {
  WaterPool = 'WaterPool',
  FlameGeyser = 'FlameGeyser',
  MovingStoneBlock = 'MovingStoneBlock',
  PoisonGasCloud = 'PoisonGasCloud',
  LightningStrike = 'LightningStrike'
}

export enum MovementPatternType {
  Static = 'Static',
  Linear = 'Linear',
  Circular = 'Circular',
  PingPong = 'PingPong',
  Random = 'Random'
}

export interface MovementPattern {
  type: MovementPatternType;
  speed: number;
  path?: Vector2[]; // For linear and ping-pong patterns
  center?: Vector2; // For circular patterns
  radius?: number; // For circular patterns
  bounds?: { min: Vector2; max: Vector2 }; // For random patterns
}

export interface TriggerCondition {
  type: 'timer' | 'proximity' | 'evolution_level' | 'power_activation';
  value: number | string;
  range?: number; // For proximity triggers
}

export interface DynamicElement {
  id: string;
  type: DynamicElementType;
  position: Vector2;
  size: Vector2;
  isActive: boolean;
  damage: number;
  movementPattern?: MovementPattern;
  triggerCondition?: TriggerCondition;
  
  // Timing properties
  activationTime: number;
  duration: number; // -1 for permanent
  cooldownTime: number;
  lastActivation: number;
  
  // State properties
  currentPhase: 'inactive' | 'warning' | 'active' | 'cooldown';
  phaseTimer: number;
  
  // Movement state
  currentTarget?: Vector2;
  pathIndex?: number;
  movementTimer?: number;
  
  // Special properties
  requiredEvolutionLevel?: number; // For water pools (Aquatic Movement)
  visualData?: {
    color?: string;
    intensity?: number;
    particleCount?: number;
    animationSpeed?: number;
  };
}

export interface DynamicElementCollisionResult {
  hasCollision: boolean;
  element?: DynamicElement;
  canPass: boolean; // True if snake can pass through (e.g., water with Aquatic Movement)
  damage: number;
  effect?: EffectType;
}

// Interactive feature types
export enum InteractiveFeatureType {
  PressurePlate = 'PressurePlate',
  AncientSwitch = 'AncientSwitch',
  MysticalPortal = 'MysticalPortal'
}

export interface InteractiveFeature {
  id: string;
  type: InteractiveFeatureType;
  position: Vector2;
  size: Vector2;
  isActive: boolean;
  isActivated: boolean;
  
  // Activation requirements
  requiredEvolutionLevel?: number; // For mystical portals
  requiredSnakeLength?: number; // For ancient switches
  requiresConstrictPower?: boolean; // For pressure plates
  requiredWeight?: number; // For pressure plates
  
  // Activation state
  activationProgress: number; // 0-1, for gradual activation
  lastActivationTime: number;
  activationDuration: number; // How long activation lasts
  cooldownTime: number; // Time before can be activated again
  
  // Visual and audio feedback
  visualData: {
    baseColor: string;
    activatedColor: string;
    glowIntensity: number;
    pulseSpeed: number;
    particleEffect?: string;
  };
  
  // Connected elements (what this feature controls)
  connectedElements?: string[]; // IDs of obstacles/elements this controls
  
  // Special properties
  teleportDestination?: Vector2; // For mystical portals
  unlockCondition?: string; // Special unlock requirements
}

export interface InteractiveFeatureActivationResult {
  success: boolean;
  feature: InteractiveFeature;
  message?: string;
  effects?: {
    removeObstacles?: string[];
    addObstacles?: Obstacle[];
    teleportTo?: Vector2;
    grantPower?: string;
    specialEffect?: EffectType;
  };
}

export interface EnvironmentState {
  obstacles: Obstacle[];
  dynamicElements: DynamicElement[];
  interactiveFeatures: InteractiveFeature[];
}

export interface ObstacleCollisionResult {
  hasCollision: boolean;
  obstacle?: Obstacle;
  penetrationDepth?: number;
  collisionNormal?: Vector2;
}

// Tail consumption types (Ouroboros mechanics)
export interface TailConsumptionResult {
  success: boolean;
  segmentsConsumed: number;
  message: string;
  strategicAdvantage: StrategicAdvantage | null;
  consumedSegmentPositions?: Vector2[];
}

export interface StrategicAdvantage {
  bonusPoints: number;
  navigationBonus: 'minor' | 'moderate' | 'significant';
  speedBoost: {
    multiplier: number;
    duration: number;
  };
  mysticalEnergy: number;
}

export interface ClickableSegmentInfo {
  segmentIndex: number;
  position: Vector2;
  isConsumable: boolean;
  segmentsToTail: number;
  estimatedAdvantage: StrategicAdvantage | null;
}

// Scoring system types
export interface ScoreState {
  currentScore: number;
  highScore: number;
  evolutionLevelMultiplier: number;
  comboMultiplier: number;
  comboCount: number;
  lastScoreTime: number;
  totalFoodConsumed: number;
  evolutionBonuses: number;
  powerUsageBonuses: number;
  survivalTimeBonus: number;
  gameStartTime: number;
}

export interface ScoreEvent {
  type: ScoreEventType;
  points: number;
  multiplier: number;
  timestamp: number;
  description: string;
  evolutionLevel: number;
}

export enum ScoreEventType {
  FoodConsumption = 'FoodConsumption',
  Evolution = 'Evolution',
  PowerUsage = 'PowerUsage',
  Combo = 'Combo',
  SurvivalTime = 'SurvivalTime',
  TailConsumption = 'TailConsumption',
  EnvironmentalInteraction = 'EnvironmentalInteraction'
}

export interface HighScoreEntry {
  score: number;
  evolutionLevel: number;
  survivalTime: number;
  foodConsumed: number;
  timestamp: number;
  playerName?: string;
}

export interface GameOverState {
  isGameOver: boolean;
  deathReason: DeathReason;
  finalScore: number;
  finalEvolutionLevel: number;
  survivalTime: number;
  deathAnimation: {
    isPlaying: boolean;
    progress: number;
    duration: number;
  };
}

export enum DeathReason {
  SelfCollision = 'SelfCollision',
  WallCollision = 'WallCollision',
  ObstacleCollision = 'ObstacleCollision',
  EnvironmentalHazard = 'EnvironmentalHazard',
  PoisonEffect = 'PoisonEffect'
}

// Re-export collision types for convenience
export type { CollisionResult, CollisionType } from '../core/CollisionSystem';