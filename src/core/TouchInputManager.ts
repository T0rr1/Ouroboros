import { Vector2 } from '../types/game';
import { PowerType } from './EvolutionSystem';

export interface TouchGesture {
  type: 'tap' | 'swipe' | 'hold' | 'pinch';
  startPosition: Vector2;
  currentPosition: Vector2;
  deltaPosition: Vector2;
  duration: number;
  distance: number;
}

export interface SwipeDirection {
  direction: Vector2;
  strength: number;
}

export class TouchInputManager {
  private canvas: HTMLCanvasElement;
  private activeTouches: Map<number, Touch> = new Map();
  private gestureStartTime: number = 0;
  private lastTapTime: number = 0;
  private swipeThreshold: number = 50; // Minimum distance for swipe
  private tapThreshold: number = 10; // Maximum movement for tap
  private holdThreshold: number = 500; // Minimum time for hold
  private doubleTapThreshold: number = 300; // Maximum time between taps
  
  // Touch event handlers
  private touchStartHandler: (event: TouchEvent) => void;
  private touchMoveHandler: (event: TouchEvent) => void;
  private touchEndHandler: (event: TouchEvent) => void;
  private touchCancelHandler: (event: TouchEvent) => void;
  
  // Callbacks
  public onDirectionChange?: (direction: Vector2) => void;
  public onTailClick?: (position: Vector2) => void;
  public onPowerActivate?: (powerType: PowerType) => void;
  public onPause?: () => void;
  
  // Virtual controls for mobile
  private virtualControls: {
    dpad: { center: Vector2; radius: number; visible: boolean };
    powerButtons: { position: Vector2; radius: number; powerType: PowerType }[];
    pauseButton: { position: Vector2; radius: number };
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Initialize virtual controls
    this.virtualControls = {
      dpad: { center: { x: 100, y: 100 }, radius: 60, visible: false },
      powerButtons: [],
      pauseButton: { position: { x: 50, y: 50 }, radius: 25 }
    };
    
    // Bind event handlers
    this.touchStartHandler = this.handleTouchStart.bind(this);
    this.touchMoveHandler = this.handleTouchMove.bind(this);
    this.touchEndHandler = this.handleTouchEnd.bind(this);
    this.touchCancelHandler = this.handleTouchCancel.bind(this);
    
    this.attachEventListeners();
    this.setupVirtualControls();
  }

  private attachEventListeners(): void {
    // Check if canvas has addEventListener method (for test environments)
    if (typeof this.canvas.addEventListener !== 'function') {
      console.warn('Canvas does not support addEventListener - running in test mode');
      return;
    }

    // Prevent default touch behaviors
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });
    this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    this.canvas.addEventListener('touchend', this.touchEndHandler, { passive: false });
    this.canvas.addEventListener('touchcancel', this.touchCancelHandler, { passive: false });
    
    // Prevent context menu on long press
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setupVirtualControls(): void {
    // Check if canvas has getBoundingClientRect method (for test environments)
    if (typeof this.canvas.getBoundingClientRect !== 'function') {
      // Use default dimensions for test environments
      this.virtualControls.dpad.center = { x: 100, y: 400 };
      this.virtualControls.pauseButton.position = { x: 450, y: 50 };
      this.setupPowerButtons();
      return;
    }

    // Position virtual controls based on canvas size
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // D-pad in bottom left
    this.virtualControls.dpad.center = {
      x: canvasRect.width * 0.15,
      y: canvasRect.height * 0.85
    };
    
    // Pause button in top right
    this.virtualControls.pauseButton.position = {
      x: canvasRect.width * 0.9,
      y: canvasRect.height * 0.1
    };
    
    // Power buttons along right side
    this.setupPowerButtons();
  }

  private setupPowerButtons(): void {
    const powerTypes = [
      PowerType.SpeedBoost,
      PowerType.VenomStrike,
      PowerType.Constrict,
      PowerType.HoodExpansion,
      PowerType.AquaticMovement
    ];
    
    // Check if canvas has getBoundingClientRect method (for test environments)
    if (typeof this.canvas.getBoundingClientRect !== 'function') {
      // Use default positions for test environments
      this.virtualControls.powerButtons = powerTypes.map((powerType, index) => ({
        position: { x: 450, y: 150 + index * 50 },
        radius: 20,
        powerType
      }));
      return;
    }

    const canvasRect = this.canvas.getBoundingClientRect();
    this.virtualControls.powerButtons = powerTypes.map((powerType, index) => ({
      position: {
        x: canvasRect.width * 0.9,
        y: canvasRect.height * (0.3 + index * 0.1)
      },
      radius: 20,
      powerType
    }));
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    const touches = Array.from(event.changedTouches);
    this.gestureStartTime = Date.now();
    
    for (const touch of touches) {
      this.activeTouches.set(touch.identifier, touch);
      
      const position = this.getTouchPosition(touch);
      this.handleTouchInteraction(position, 'start');
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    const touches = Array.from(event.changedTouches);
    
    for (const touch of touches) {
      if (this.activeTouches.has(touch.identifier)) {
        this.activeTouches.set(touch.identifier, touch);
        
        const position = this.getTouchPosition(touch);
        this.handleTouchInteraction(position, 'move');
      }
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    
    const touches = Array.from(event.changedTouches);
    const touchDuration = Date.now() - this.gestureStartTime;
    
    for (const touch of touches) {
      if (this.activeTouches.has(touch.identifier)) {
        const startTouch = this.activeTouches.get(touch.identifier)!;
        const endPosition = this.getTouchPosition(touch);
        const startPosition = this.getTouchPosition(startTouch);
        
        const gesture = this.analyzeGesture(startPosition, endPosition, touchDuration);
        this.handleGesture(gesture);
        
        this.activeTouches.delete(touch.identifier);
      }
    }
  }

  private handleTouchCancel(event: TouchEvent): void {
    event.preventDefault();
    
    const touches = Array.from(event.changedTouches);
    for (const touch of touches) {
      this.activeTouches.delete(touch.identifier);
    }
  }

  private getTouchPosition(touch: Touch): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  private handleTouchInteraction(position: Vector2, phase: 'start' | 'move' | 'end'): void {
    // Check virtual control interactions
    if (this.isInsideCircle(position, this.virtualControls.dpad.center, this.virtualControls.dpad.radius)) {
      if (phase === 'start' || phase === 'move') {
        this.handleDpadInteraction(position);
      }
    }
    
    // Check power button interactions
    for (const powerButton of this.virtualControls.powerButtons) {
      if (this.isInsideCircle(position, powerButton.position, powerButton.radius)) {
        if (phase === 'start' && this.onPowerActivate) {
          this.onPowerActivate(powerButton.powerType);
        }
      }
    }
    
    // Check pause button
    if (this.isInsideCircle(position, this.virtualControls.pauseButton.position, this.virtualControls.pauseButton.radius)) {
      if (phase === 'start' && this.onPause) {
        this.onPause();
      }
    }
  }

  private handleDpadInteraction(position: Vector2): void {
    const center = this.virtualControls.dpad.center;
    const deltaX = position.x - center.x;
    const deltaY = position.y - center.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > 20) { // Dead zone
      // Normalize to get direction
      const normalizedX = deltaX / distance;
      const normalizedY = deltaY / distance;
      
      // Convert to 4-directional movement
      let direction: Vector2 = { x: 0, y: 0 };
      
      if (Math.abs(normalizedX) > Math.abs(normalizedY)) {
        direction.x = normalizedX > 0 ? 1 : -1;
      } else {
        direction.y = normalizedY > 0 ? 1 : -1;
      }
      
      if (this.onDirectionChange) {
        this.onDirectionChange(direction);
      }
    }
  }

  private analyzeGesture(startPos: Vector2, endPos: Vector2, duration: number): TouchGesture {
    const deltaX = endPos.x - startPos.x;
    const deltaY = endPos.y - startPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let gestureType: 'tap' | 'swipe' | 'hold' | 'pinch' = 'tap';
    
    if (duration > this.holdThreshold && distance < this.tapThreshold) {
      gestureType = 'hold';
    } else if (distance > this.swipeThreshold) {
      gestureType = 'swipe';
    } else if (distance < this.tapThreshold) {
      gestureType = 'tap';
    }
    
    return {
      type: gestureType,
      startPosition: startPos,
      currentPosition: endPos,
      deltaPosition: { x: deltaX, y: deltaY },
      duration,
      distance
    };
  }

  private handleGesture(gesture: TouchGesture): void {
    switch (gesture.type) {
      case 'tap':
        this.handleTap(gesture);
        break;
      case 'swipe':
        this.handleSwipe(gesture);
        break;
      case 'hold':
        this.handleHold(gesture);
        break;
      case 'pinch':
        // Handle pinch gesture if needed in the future
        break;
    }
  }

  private handleTap(gesture: TouchGesture): void {
    const currentTime = Date.now();
    const isDoubleTap = currentTime - this.lastTapTime < this.doubleTapThreshold;
    
    if (isDoubleTap && this.onPause) {
      // Double tap to pause
      this.onPause();
    } else if (this.onTailClick) {
      // Single tap for tail consumption
      this.onTailClick(gesture.startPosition);
    }
    
    this.lastTapTime = currentTime;
  }

  private handleSwipe(gesture: TouchGesture): void {
    const swipeDirection = this.getSwipeDirection(gesture);
    
    if (this.onDirectionChange && swipeDirection.strength > 0.5) {
      this.onDirectionChange(swipeDirection.direction);
    }
  }

  private handleHold(gesture: TouchGesture): void {
    // Hold gesture could be used for special actions
    // For now, treat as pause
    if (this.onPause) {
      this.onPause();
    }
  }

  private getSwipeDirection(gesture: TouchGesture): SwipeDirection {
    const { deltaPosition, distance } = gesture;
    const normalizedX = deltaPosition.x / distance;
    const normalizedY = deltaPosition.y / distance;
    
    // Convert to 4-directional movement
    let direction: Vector2 = { x: 0, y: 0 };
    let strength = 0;
    
    if (Math.abs(normalizedX) > Math.abs(normalizedY)) {
      direction.x = normalizedX > 0 ? 1 : -1;
      strength = Math.abs(normalizedX);
    } else {
      direction.y = normalizedY > 0 ? 1 : -1;
      strength = Math.abs(normalizedY);
    }
    
    return { direction, strength };
  }

  private isInsideCircle(point: Vector2, center: Vector2, radius: number): boolean {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return (dx * dx + dy * dy) <= (radius * radius);
  }

  public showVirtualControls(show: boolean): void {
    this.virtualControls.dpad.visible = show;
  }

  public updateControlPositions(canvasWidth: number, canvasHeight: number): void {
    // Update virtual control positions when canvas resizes
    this.virtualControls.dpad.center = {
      x: canvasWidth * 0.15,
      y: canvasHeight * 0.85
    };
    
    this.virtualControls.pauseButton.position = {
      x: canvasWidth * 0.9,
      y: canvasHeight * 0.1
    };
    
    // Update power button positions
    this.virtualControls.powerButtons.forEach((button, index) => {
      button.position = {
        x: canvasWidth * 0.9,
        y: canvasHeight * (0.3 + index * 0.1)
      };
    });
  }

  public getVirtualControls() {
    return this.virtualControls;
  }

  public destroy(): void {
    // Check if canvas has removeEventListener method (for test environments)
    if (typeof this.canvas.removeEventListener !== 'function') {
      return;
    }

    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
    this.canvas.removeEventListener('touchend', this.touchEndHandler);
    this.canvas.removeEventListener('touchcancel', this.touchCancelHandler);
  }
}