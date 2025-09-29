import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TouchInputManager } from '../core/TouchInputManager';
import { PowerType } from '../core/EvolutionSystem';

// Mock canvas and touch events
const mockCanvas = () => {
  const canvas = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600
    })
  };
  
  return canvas as unknown as HTMLCanvasElement;
};

const createMockTouch = (id: number, clientX: number, clientY: number): Touch => {
  return {
    identifier: id,
    clientX,
    clientY,
    pageX: clientX,
    pageY: clientY,
    screenX: clientX,
    screenY: clientY,
    radiusX: 10,
    radiusY: 10,
    rotationAngle: 0,
    force: 1,
    target: null as any
  };
};

const createMockTouchEvent = (type: string, touches: Touch[], changedTouches: Touch[] = touches): TouchEvent => {
  const event = {
    type,
    touches: Array.from(touches),
    changedTouches: Array.from(changedTouches),
    targetTouches: Array.from(touches),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  };
  
  return event as unknown as TouchEvent;
};

describe('TouchInputManager', () => {
  let touchInputManager: TouchInputManager;
  let canvas: HTMLCanvasElement;
  let onDirectionChange: ReturnType<typeof vi.fn>;
  let onTailClick: ReturnType<typeof vi.fn>;
  let onPowerActivate: ReturnType<typeof vi.fn>;
  let onPause: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    canvas = mockCanvas();
    touchInputManager = new TouchInputManager(canvas);
    
    // Setup callbacks
    onDirectionChange = vi.fn();
    onTailClick = vi.fn();
    onPowerActivate = vi.fn();
    onPause = vi.fn();
    
    touchInputManager.onDirectionChange = onDirectionChange;
    touchInputManager.onTailClick = onTailClick;
    touchInputManager.onPowerActivate = onPowerActivate;
    touchInputManager.onPause = onPause;
    
    // Mock Date.now for consistent timing
    vi.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    touchInputManager.destroy();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should attach touch event listeners to canvas', () => {
      expect(canvas.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
      expect(canvas.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
      expect(canvas.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });
      expect(canvas.addEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function), { passive: false });
      expect(canvas.addEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
    });

    it('should setup virtual controls with correct positions', () => {
      const controls = touchInputManager.getVirtualControls();
      
      expect(controls.dpad.center.x).toBeGreaterThan(0);
      expect(controls.dpad.center.y).toBeGreaterThan(0);
      expect(controls.pauseButton.position.x).toBeGreaterThan(0);
      expect(controls.pauseButton.position.y).toBeGreaterThan(0);
      expect(controls.powerButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Touch Event Handling', () => {
    it('should handle touchstart events', () => {
      const touch = createMockTouch(1, 100, 100);
      const event = createMockTouchEvent('touchstart', [touch]);
      
      // Simulate touchstart
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      
      expect(() => touchStartHandler(event)).not.toThrow();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle touchmove events', () => {
      const startTouch = createMockTouch(1, 100, 100);
      const moveTouch = createMockTouch(1, 150, 100);
      
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      const moveEvent = createMockTouchEvent('touchmove', [moveTouch], [moveTouch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchMoveHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchmove')[1];
      
      touchStartHandler(startEvent);
      expect(() => touchMoveHandler(moveEvent)).not.toThrow();
      expect(moveEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle touchend events', () => {
      const touch = createMockTouch(1, 100, 100);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      const endEvent = createMockTouchEvent('touchend', [], [touch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchEndHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchend')[1];
      
      touchStartHandler(startEvent);
      expect(() => touchEndHandler(endEvent)).not.toThrow();
      expect(endEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Gesture Recognition', () => {
    it('should recognize tap gestures', () => {
      const touch = createMockTouch(1, 100, 100);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      const endEvent = createMockTouchEvent('touchend', [], [touch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchEndHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchend')[1];
      
      // Start touch
      vi.spyOn(Date, 'now').mockReturnValue(1000);
      touchStartHandler(startEvent);
      
      // End touch quickly (tap)
      vi.spyOn(Date, 'now').mockReturnValue(1100); // 100ms later
      touchEndHandler(endEvent);
      
      // Should trigger tail click for tap
      expect(onTailClick).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should recognize swipe gestures', () => {
      const startTouch = createMockTouch(1, 100, 300);
      const endTouch = createMockTouch(1, 200, 300); // Swipe right
      
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      const endEvent = createMockTouchEvent('touchend', [], [endTouch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchEndHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchend')[1];
      
      // Start touch
      vi.spyOn(Date, 'now').mockReturnValue(1000);
      touchStartHandler(startEvent);
      
      // End touch with significant movement (swipe)
      vi.spyOn(Date, 'now').mockReturnValue(1200); // 200ms later
      touchEndHandler(endEvent);
      
      // Should trigger direction change for swipe
      expect(onDirectionChange).toHaveBeenCalledWith({ x: 1, y: 0 }); // Right
    });

    it('should recognize hold gestures', () => {
      const touch = createMockTouch(1, 100, 100);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      const endEvent = createMockTouchEvent('touchend', [], [touch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchEndHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchend')[1];
      
      // Start touch
      vi.spyOn(Date, 'now').mockReturnValue(1000);
      touchStartHandler(startEvent);
      
      // End touch after long duration (hold)
      vi.spyOn(Date, 'now').mockReturnValue(1600); // 600ms later (> 500ms threshold)
      touchEndHandler(endEvent);
      
      // Should trigger pause for hold
      expect(onPause).toHaveBeenCalled();
    });

    it('should recognize double tap gestures', () => {
      const touch = createMockTouch(1, 100, 100);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      const endEvent = createMockTouchEvent('touchend', [], [touch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchEndHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchend')[1];
      
      // First tap
      vi.spyOn(Date, 'now').mockReturnValue(1000);
      touchStartHandler(startEvent);
      vi.spyOn(Date, 'now').mockReturnValue(1100);
      touchEndHandler(endEvent);
      
      // Second tap quickly
      vi.spyOn(Date, 'now').mockReturnValue(1200);
      touchStartHandler(startEvent);
      vi.spyOn(Date, 'now').mockReturnValue(1300);
      touchEndHandler(endEvent);
      
      // Should trigger pause for double tap
      expect(onPause).toHaveBeenCalled();
    });
  });

  describe('Virtual Controls', () => {
    it('should handle D-pad interactions', () => {
      const controls = touchInputManager.getVirtualControls();
      const dpadCenter = controls.dpad.center;
      
      // Touch right side of D-pad
      const touch = createMockTouch(1, dpadCenter.x + 30, dpadCenter.y);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      const moveEvent = createMockTouchEvent('touchmove', [touch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchMoveHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchmove')[1];
      
      touchStartHandler(startEvent);
      touchMoveHandler(moveEvent);
      
      // Should trigger right direction
      expect(onDirectionChange).toHaveBeenCalledWith({ x: 1, y: 0 });
    });

    it('should handle power button interactions', () => {
      const controls = touchInputManager.getVirtualControls();
      const powerButton = controls.powerButtons[0];
      
      const touch = createMockTouch(1, powerButton.position.x, powerButton.position.y);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      
      touchStartHandler(startEvent);
      
      // Should trigger power activation
      expect(onPowerActivate).toHaveBeenCalledWith(powerButton.powerType);
    });

    it('should handle pause button interactions', () => {
      const controls = touchInputManager.getVirtualControls();
      const pauseButton = controls.pauseButton;
      
      const touch = createMockTouch(1, pauseButton.position.x, pauseButton.position.y);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      
      touchStartHandler(startEvent);
      
      // Should trigger pause
      expect(onPause).toHaveBeenCalled();
    });

    it('should update control positions when canvas resizes', () => {
      const initialControls = touchInputManager.getVirtualControls();
      const initialDpadX = initialControls.dpad.center.x;
      
      touchInputManager.updateControlPositions(1600, 1200);
      
      const updatedControls = touchInputManager.getVirtualControls();
      const updatedDpadX = updatedControls.dpad.center.x;
      
      // D-pad position should change with canvas size
      expect(updatedDpadX).not.toBe(initialDpadX);
    });

    it('should show/hide virtual controls', () => {
      touchInputManager.showVirtualControls(true);
      let controls = touchInputManager.getVirtualControls();
      expect(controls.dpad.visible).toBe(true);
      
      touchInputManager.showVirtualControls(false);
      controls = touchInputManager.getVirtualControls();
      expect(controls.dpad.visible).toBe(false);
    });
  });

  describe('Swipe Direction Detection', () => {
    const testSwipeDirection = (startX: number, startY: number, endX: number, endY: number, expectedDirection: { x: number, y: number }) => {
      const startTouch = createMockTouch(1, startX, startY);
      const endTouch = createMockTouch(1, endX, endY);
      
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      const endEvent = createMockTouchEvent('touchend', [], [endTouch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchEndHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchend')[1];
      
      vi.spyOn(Date, 'now').mockReturnValue(1000);
      touchStartHandler(startEvent);
      vi.spyOn(Date, 'now').mockReturnValue(1200);
      touchEndHandler(endEvent);
      
      expect(onDirectionChange).toHaveBeenCalledWith(expectedDirection);
    };

    it('should detect right swipe', () => {
      testSwipeDirection(100, 300, 200, 300, { x: 1, y: 0 });
    });

    it('should detect left swipe', () => {
      testSwipeDirection(200, 300, 100, 300, { x: -1, y: 0 });
    });

    it('should detect up swipe', () => {
      testSwipeDirection(300, 200, 300, 100, { x: 0, y: -1 });
    });

    it('should detect down swipe', () => {
      testSwipeDirection(300, 100, 300, 200, { x: 0, y: 1 });
    });

    it('should prioritize stronger axis for diagonal swipes', () => {
      // Diagonal swipe with stronger horizontal component
      testSwipeDirection(100, 100, 200, 120, { x: 1, y: 0 });
      
      // Diagonal swipe with stronger vertical component
      testSwipeDirection(100, 100, 120, 200, { x: 0, y: 1 });
    });
  });

  describe('Multi-touch Handling', () => {
    it('should handle multiple simultaneous touches', () => {
      const touch1 = createMockTouch(1, 100, 100);
      const touch2 = createMockTouch(2, 200, 200);
      
      const startEvent = createMockTouchEvent('touchstart', [touch1, touch2]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      
      expect(() => touchStartHandler(startEvent)).not.toThrow();
    });

    it('should handle touch cancellation', () => {
      const touch = createMockTouch(1, 100, 100);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      const cancelEvent = createMockTouchEvent('touchcancel', [], [touch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchCancelHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchcancel')[1];
      
      touchStartHandler(startEvent);
      expect(() => touchCancelHandler(cancelEvent)).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on destroy', () => {
      touchInputManager.destroy();
      
      expect(canvas.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function));
    });
  });

  describe('Edge Cases', () => {
    it('should handle touches outside virtual controls', () => {
      const touch = createMockTouch(1, 50, 50); // Outside any control area
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      const endEvent = createMockTouchEvent('touchend', [], [touch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchEndHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchend')[1];
      
      vi.spyOn(Date, 'now').mockReturnValue(1000);
      touchStartHandler(startEvent);
      vi.spyOn(Date, 'now').mockReturnValue(1100);
      touchEndHandler(endEvent);
      
      // Should still trigger tail click for taps outside controls
      expect(onTailClick).toHaveBeenCalledWith({ x: 50, y: 50 });
    });

    it('should handle very short swipes', () => {
      const startTouch = createMockTouch(1, 100, 100);
      const endTouch = createMockTouch(1, 110, 100); // Very short swipe
      
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      const endEvent = createMockTouchEvent('touchend', [], [endTouch]);
      
      const touchStartHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchstart')[1];
      const touchEndHandler = (canvas.addEventListener as any).mock.calls
        .find((call: any) => call[0] === 'touchend')[1];
      
      vi.spyOn(Date, 'now').mockReturnValue(1000);
      touchStartHandler(startEvent);
      vi.spyOn(Date, 'now').mockReturnValue(1200);
      touchEndHandler(endEvent);
      
      // Should be treated as tap, not swipe
      expect(onTailClick).toHaveBeenCalled();
      expect(onDirectionChange).not.toHaveBeenCalled();
    });
  });
});