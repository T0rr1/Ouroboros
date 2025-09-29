import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputManager } from '../core/InputManager';
import { InputKey } from '../types/game';

// Mock document event listeners
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
});

Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true
});

describe('InputManager', () => {
  let inputManager: InputManager;

  beforeEach(() => {
    vi.clearAllMocks();
    inputManager = new InputManager();
  });

  it('should attach event listeners on initialization', () => {
    expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
  });

  it('should detect WASD key presses', () => {
    const keyDownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )[1];
    const keyUpHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keyup'
    )[1];

    // Test direction change callback
    let lastDirection = { x: 0, y: 0 };
    inputManager.onDirectionChange = (direction) => {
      lastDirection = direction;
    };

    // Simulate W key press (up)
    keyDownHandler({ code: InputKey.W, preventDefault: vi.fn() });
    inputManager.update(16); // Trigger update to process direction change
    expect(lastDirection.y).toBe(-1);
    expect(lastDirection.x).toBe(0);

    // Release W and press A key (left)
    keyUpHandler({ code: InputKey.W });
    keyDownHandler({ code: InputKey.A, preventDefault: vi.fn() });
    inputManager.update(16);
    expect(lastDirection.x).toBe(-1);
    expect(lastDirection.y).toBe(0);

    // Release A and press S key (down)
    keyUpHandler({ code: InputKey.A });
    keyDownHandler({ code: InputKey.S, preventDefault: vi.fn() });
    inputManager.update(16);
    expect(lastDirection.y).toBe(1);
    expect(lastDirection.x).toBe(0);

    // Release S and press D key (right)
    keyUpHandler({ code: InputKey.S });
    keyDownHandler({ code: InputKey.D, preventDefault: vi.fn() });
    inputManager.update(16);
    expect(lastDirection.x).toBe(1);
    expect(lastDirection.y).toBe(0);
  });

  it('should detect arrow key presses', () => {
    const keyDownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )[1];
    const keyUpHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keyup'
    )[1];

    // Test direction change callback
    let lastDirection = { x: 0, y: 0 };
    inputManager.onDirectionChange = (direction) => {
      lastDirection = direction;
    };

    // Simulate Arrow Up
    keyDownHandler({ code: InputKey.ArrowUp, preventDefault: vi.fn() });
    inputManager.update(16);
    expect(lastDirection.y).toBe(-1);
    expect(lastDirection.x).toBe(0);

    // Release Arrow Up and press Arrow Left
    keyUpHandler({ code: InputKey.ArrowUp });
    keyDownHandler({ code: InputKey.ArrowLeft, preventDefault: vi.fn() });
    inputManager.update(16);
    expect(lastDirection.x).toBe(-1);
    expect(lastDirection.y).toBe(0);
  });

  it('should detect space key press', () => {
    const keyDownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )[1];

    expect(inputManager.isSpacePressed()).toBe(false);

    keyDownHandler({ code: InputKey.Space, preventDefault: vi.fn() });
    expect(inputManager.isSpacePressed()).toBe(true);
  });

  it('should prevent default for game keys', () => {
    const keyDownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )[1];

    const mockPreventDefault = vi.fn();
    keyDownHandler({ code: InputKey.W, preventDefault: mockPreventDefault });
    
    expect(mockPreventDefault).toHaveBeenCalled();
  });

  it('should remove event listeners on destroy', () => {
    inputManager.destroy();
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
  });

  it('should handle key release', () => {
    const keyDownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )[1];
    const keyUpHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keyup'
    )[1];

    // Press W key
    keyDownHandler({ code: InputKey.W, preventDefault: vi.fn() });
    expect(inputManager.isKeyPressed(InputKey.W)).toBe(true);

    // Release W key
    keyUpHandler({ code: InputKey.W });
    expect(inputManager.isKeyPressed(InputKey.W)).toBe(false);
  });
});