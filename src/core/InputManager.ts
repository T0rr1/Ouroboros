import { Vector2, InputKey, InputState } from '../types/game';
import { PowerType } from './EvolutionSystem';
import { TouchInputManager } from './TouchInputManager';
import { BrowserCompatibility } from './BrowserCompatibility';

export class InputManager {
  private inputState: InputState;
  private keyDownHandler: (event: KeyboardEvent) => void;
  private keyUpHandler: (event: KeyboardEvent) => void;
  private mouseClickHandler: (event: MouseEvent) => void;
  private touchStartHandler: (event: TouchEvent) => void;
  private lastDirection: Vector2;
  private lastSpaceState: boolean;
  private lastPowerKeyStates: Map<string, boolean>;
  private canvas?: HTMLCanvasElement;
  private touchInputManager?: TouchInputManager;
  private browserCompatibility: BrowserCompatibility;
  private isTouchDevice: boolean;
  
  // Callbacks
  public onDirectionChange?: (direction: Vector2) => void;
  public onPause?: () => void;
  public onPowerActivate?: (powerType: PowerType) => void;
  public onTailClick?: (position: Vector2) => void;

  constructor(canvas?: HTMLCanvasElement) {
    this.inputState = {
      pressedKeys: new Set<string>(),
      currentDirection: { x: 0, y: 0 }
    };
    
    this.lastDirection = { x: 0, y: 0 };
    this.lastSpaceState = false;
    this.lastPowerKeyStates = new Map();
    this.canvas = canvas;
    this.browserCompatibility = new BrowserCompatibility();
    this.isTouchDevice = this.browserCompatibility.getFeatures().touchEvents;

    // Bind event handlers
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.keyUpHandler = this.handleKeyUp.bind(this);
    this.mouseClickHandler = this.handleMouseClick.bind(this);
    this.touchStartHandler = this.handleTouchStart.bind(this);

    this.attachEventListeners();
    this.setupTouchInput();
  }

  private attachEventListeners(): void {
    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHandler);
    
    // Add click listeners for desktop
    if (this.canvas && typeof this.canvas.addEventListener === 'function' && !this.isTouchDevice) {
      this.canvas.addEventListener('click', this.mouseClickHandler);
    }
  }

  private setupTouchInput(): void {
    if (this.canvas && this.isTouchDevice) {
      this.touchInputManager = new TouchInputManager(this.canvas);
      
      // Connect touch input callbacks
      this.touchInputManager.onDirectionChange = (direction: Vector2) => {
        this.inputState.currentDirection = direction;
        if (this.onDirectionChange) {
          this.onDirectionChange(direction);
        }
      };
      
      this.touchInputManager.onTailClick = (position: Vector2) => {
        if (this.onTailClick) {
          this.onTailClick(position);
        }
      };
      
      this.touchInputManager.onPowerActivate = (powerType: PowerType) => {
        if (this.onPowerActivate) {
          this.onPowerActivate(powerType);
        }
      };
      
      this.touchInputManager.onPause = () => {
        if (this.onPause) {
          this.onPause();
        }
      };
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Prevent default browser behavior for game keys
    if (this.isGameKey(event.code)) {
      event.preventDefault();
    }

    this.inputState.pressedKeys.add(event.code);
    this.updateDirection();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.inputState.pressedKeys.delete(event.code);
    this.updateDirection();
  }

  private isGameKey(keyCode: string): boolean {
    return Object.values(InputKey).includes(keyCode as InputKey) || this.isPowerKey(keyCode);
  }

  private isPowerKey(keyCode: string): boolean {
    const powerKeys = ['KeyQ', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'];
    return powerKeys.includes(keyCode);
  }

  private getPowerTypeFromKey(keyCode: string): PowerType | null {
    const keyToPower: Record<string, PowerType> = {
      'KeyQ': PowerType.SpeedBoost,
      'KeyE': PowerType.VenomStrike,
      'KeyR': PowerType.Constrict,
      'KeyT': PowerType.HoodExpansion,
      'KeyY': PowerType.AquaticMovement,
      'KeyU': PowerType.ColorChange,
      'KeyI': PowerType.TimeWarp,
      'KeyO': PowerType.FireBreath,
      'KeyP': PowerType.TailConsumption,
      'BracketLeft': PowerType.PowerCycling,
      'BracketRight': PowerType.RealityManipulation
    };
    return keyToPower[keyCode] || null;
  }

  private updateDirection(): void {
    const keys = this.inputState.pressedKeys;
    let newDirection: Vector2 = { x: 0, y: 0 };

    // Handle WASD keys - only allow 4-directional movement for snake game
    if (keys.has(InputKey.W) || keys.has(InputKey.ArrowUp)) {
      newDirection = { x: 0, y: -1 }; // Up
    } else if (keys.has(InputKey.S) || keys.has(InputKey.ArrowDown)) {
      newDirection = { x: 0, y: 1 };  // Down
    } else if (keys.has(InputKey.A) || keys.has(InputKey.ArrowLeft)) {
      newDirection = { x: -1, y: 0 }; // Left
    } else if (keys.has(InputKey.D) || keys.has(InputKey.ArrowRight)) {
      newDirection = { x: 1, y: 0 };  // Right
    }

    // Only update if direction has changed and is valid
    if ((newDirection.x !== 0 || newDirection.y !== 0) && 
        (newDirection.x !== this.inputState.currentDirection.x || 
         newDirection.y !== this.inputState.currentDirection.y)) {
      this.inputState.currentDirection = newDirection;
    }
  }

  public getCurrentDirection(): Vector2 {
    return { ...this.inputState.currentDirection };
  }

  public isKeyPressed(key: InputKey): boolean {
    return this.inputState.pressedKeys.has(key);
  }

  public isSpacePressed(): boolean {
    return this.inputState.pressedKeys.has(InputKey.Space);
  }

  public getInputState(): InputState {
    return {
      pressedKeys: new Set(this.inputState.pressedKeys),
      currentDirection: { ...this.inputState.currentDirection }
    };
  }

  public update(deltaTime: number): void {
    // Check for direction changes
    const currentDirection = this.inputState.currentDirection;
    if (currentDirection.x !== this.lastDirection.x || currentDirection.y !== this.lastDirection.y) {
      if ((currentDirection.x !== 0 || currentDirection.y !== 0) && this.onDirectionChange) {
        this.onDirectionChange(currentDirection);
      }
      this.lastDirection = { ...currentDirection };
    }
    
    // Check for pause key press
    const currentSpaceState = this.isSpacePressed();
    if (currentSpaceState && !this.lastSpaceState && this.onPause) {
      this.onPause();
    }
    this.lastSpaceState = currentSpaceState;

    // Check for power key presses
    this.checkPowerKeys();
  }

  private checkPowerKeys(): void {
    const powerKeys = ['KeyQ', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'];
    
    for (const keyCode of powerKeys) {
      const currentState = this.inputState.pressedKeys.has(keyCode);
      const lastState = this.lastPowerKeyStates.get(keyCode) || false;
      
      // Trigger on key press (not held)
      if (currentState && !lastState && this.onPowerActivate) {
        const powerType = this.getPowerTypeFromKey(keyCode);
        if (powerType) {
          this.onPowerActivate(powerType);
        }
      }
      
      this.lastPowerKeyStates.set(keyCode, currentState);
    }
  }

  private handleMouseClick(event: MouseEvent): void {
    if (!this.canvas || !this.onTailClick) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Scale coordinates if canvas is scaled
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const worldPosition: Vector2 = {
      x: x * scaleX,
      y: y * scaleY
    };
    
    this.onTailClick(worldPosition);
  }

  private handleTouchStart(event: TouchEvent): void {
    if (!this.canvas || !this.onTailClick) return;
    
    event.preventDefault(); // Prevent default touch behavior
    
    const touch = event.touches[0];
    if (!touch) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Scale coordinates if canvas is scaled
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const worldPosition: Vector2 = {
      x: x * scaleX,
      y: y * scaleY
    };
    
    this.onTailClick(worldPosition);
  }

  public isTouchEnabled(): boolean {
    return this.isTouchDevice;
  }

  public getTouchInputManager(): TouchInputManager | undefined {
    return this.touchInputManager;
  }

  public updateTouchControlPositions(width: number, height: number): void {
    if (this.touchInputManager) {
      this.touchInputManager.updateControlPositions(width, height);
    }
  }

  public showVirtualControls(show: boolean): void {
    if (this.touchInputManager) {
      this.touchInputManager.showVirtualControls(show);
    }
  }

  public destroy(): void {
    document.removeEventListener('keydown', this.keyDownHandler);
    document.removeEventListener('keyup', this.keyUpHandler);
    
    if (this.canvas && typeof this.canvas.removeEventListener === 'function') {
      this.canvas.removeEventListener('click', this.mouseClickHandler);
    }
    
    if (this.touchInputManager) {
      this.touchInputManager.destroy();
    }
  }
}