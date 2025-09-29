import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SnakeManager } from '../core/SnakeManager';
import { SnakeRenderer, RenderContext } from '../core/SnakeRenderer';
import { VisualPatternManager } from '../core/VisualPatternManager';
import { GameConfig } from '../types/game';

// Mock WebGL context for testing
const createMockWebGLContext = () => {
  const mockGL = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLE_STRIP: 5,
    COLOR_BUFFER_BIT: 16384,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2fv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    drawArrays: vi.fn(),
    deleteProgram: vi.fn(),
    deleteBuffer: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    clear: vi.fn()
  };
  
  return mockGL as any;
};

describe('Visual Rendering Integration', () => {
  let snakeManager: SnakeManager;
  let snakeRenderer: SnakeRenderer;
  let visualPatternManager: VisualPatternManager;
  let mockGL: any;
  let config: GameConfig;
  let mockTime: number;

  beforeEach(() => {
    // Setup game configuration
    config = {
      gridWidth: 50,
      gridHeight: 35,
      cellSize: 35,
      targetFPS: 60
    };

    // Setup mock time
    mockTime = 0;
    const getMockTime = () => mockTime;

    // Initialize systems
    snakeManager = new SnakeManager(config);
    visualPatternManager = new VisualPatternManager(getMockTime);

    // Setup mock WebGL context
    mockGL = createMockWebGLContext();
    const mockCanvas = {
      width: 1750,
      height: 1225,
      getContext: vi.fn(() => mockGL)
    } as any;

    const renderContext: RenderContext = {
      gl: mockGL,
      canvas: mockCanvas,
      cellSize: config.cellSize,
      gridWidth: config.gridWidth,
      gridHeight: config.gridHeight
    };

    snakeRenderer = new SnakeRenderer(renderContext);
  });

  test('should render snake with correct initial visual pattern', () => {
    const snakeState = snakeManager.getSnakeState();
    const evolutionSystem = snakeManager.getEvolutionSystem();
    
    // Get pattern for level 1 (Hatchling)
    const currentPattern = visualPatternManager.getCurrentPattern(1);
    
    // Verify initial pattern is correct
    expect(currentPattern.baseColor).toBe('#4CAF50');
    expect(currentPattern.patternType).toBe('solid');
    expect(currentPattern.glowIntensity).toBe(0.0);
    
    // Create visual state and render
    const visualState = snakeRenderer.createVisualState(
      snakeState.head,
      snakeState.segments,
      snakeState.evolutionLevel,
      currentPattern,
      evolutionSystem.isTransformationInProgress(),
      evolutionSystem.getTransformationProgress(),
      !snakeState.isMoving
    );
    
    expect(() => snakeRenderer.render(visualState)).not.toThrow();
    expect(mockGL.drawArrays).toHaveBeenCalled();
  });

  test('should handle evolution visual transitions', () => {
    const evolutionSystem = snakeManager.getEvolutionSystem();
    
    // Force evolution to level 2
    evolutionSystem.setLevel(2);
    
    // Start visual transition
    visualPatternManager.startTransition(1, 2);
    
    // Verify transition started
    expect(visualPatternManager.isTransitioning()).toBe(true);
    
    // Advance time to middle of transition
    mockTime = 1000; // Halfway through 2000ms transition
    visualPatternManager.update(16);
    
    const currentPattern = visualPatternManager.getCurrentPattern(2);
    
    // Should be transitioning between patterns
    expect(currentPattern.baseColor).toBeDefined();
    expect(currentPattern.secondaryColor).toBeDefined();
    
    // Create visual state with transition
    const snakeState = snakeManager.getSnakeState();
    const visualState = snakeRenderer.createVisualState(
      snakeState.head,
      snakeState.segments,
      2, // Level 2
      currentPattern,
      true, // isTransforming
      0.5   // transformationProgress
    );
    
    expect(visualState.isTransforming).toBe(true);
    expect(visualState.transformationProgress).toBe(0.5);
    expect(() => snakeRenderer.render(visualState)).not.toThrow();
  });

  test('should render different patterns for different evolution levels', () => {
    const levels = [1, 2, 3];
    const expectedPatterns = ['solid', 'stripes', 'diamond'];
    
    levels.forEach((level, index) => {
      const pattern = visualPatternManager.getPatternForLevel(level);
      expect(pattern.patternType).toBe(expectedPatterns[index]);
      
      // Set snake to this level
      const evolutionSystem = snakeManager.getEvolutionSystem();
      evolutionSystem.setLevel(level);
      
      const snakeState = snakeManager.getSnakeState();
      const visualState = snakeRenderer.createVisualState(
        snakeState.head,
        snakeState.segments,
        level,
        pattern
      );
      
      expect(() => snakeRenderer.render(visualState)).not.toThrow();
    });
  });

  test('should handle breathing animation for idle snake', () => {
    const snakeState = snakeManager.getSnakeState();
    const currentPattern = visualPatternManager.getCurrentPattern(1);
    
    // Create visual state with idle snake
    const visualState = snakeRenderer.createVisualState(
      snakeState.head,
      snakeState.segments,
      1,
      currentPattern,
      false,
      0,
      true // isIdle
    );
    
    expect(visualState.isIdle).toBe(true);
    expect(visualState.breathingPhase).toBeTypeOf('number');
    
    // Update renderer to advance breathing animation
    snakeRenderer.update(16.67); // ~60 FPS
    
    expect(() => snakeRenderer.render(visualState)).not.toThrow();
  });

  test('should handle snake movement with visual interpolation', () => {
    // Move snake to trigger interpolation
    snakeManager.queueDirection({ x: 1, y: 0 });
    snakeManager.update(16.67);
    
    const snakeState = snakeManager.getSnakeState();
    const currentPattern = visualPatternManager.getCurrentPattern(1);
    
    // Verify interpolated positions exist
    expect(snakeState.head.interpolatedX).toBeDefined();
    expect(snakeState.head.interpolatedY).toBeDefined();
    
    const visualState = snakeRenderer.createVisualState(
      snakeState.head,
      snakeState.segments,
      1,
      currentPattern,
      false,
      0,
      false // not idle, moving
    );
    
    expect(visualState.isIdle).toBe(false);
    expect(() => snakeRenderer.render(visualState)).not.toThrow();
  });

  test('should handle snake growth with visual consistency', () => {
    const initialLength = snakeManager.getLength();
    
    // Grow snake
    snakeManager.grow(2);
    
    const newLength = snakeManager.getLength();
    expect(newLength).toBe(initialLength + 2);
    
    const snakeState = snakeManager.getSnakeState();
    const currentPattern = visualPatternManager.getCurrentPattern(1);
    
    // Verify all segments can be rendered
    expect(snakeState.segments.length).toBe(newLength - 1); // -1 for head
    
    const visualState = snakeRenderer.createVisualState(
      snakeState.head,
      snakeState.segments,
      1,
      currentPattern
    );
    
    expect(() => snakeRenderer.render(visualState)).not.toThrow();
    
    // Verify rendering calls were made for all segments
    expect(mockGL.drawArrays).toHaveBeenCalled();
  });

  test('should handle complete evolution progression visually', () => {
    const evolutionSystem = snakeManager.getEvolutionSystem();
    
    // Test evolution from level 1 to 3
    for (let level = 1; level <= 3; level++) {
      evolutionSystem.setLevel(level);
      
      const pattern = visualPatternManager.getPatternForLevel(level);
      const snakeState = snakeManager.getSnakeState();
      
      const visualState = snakeRenderer.createVisualState(
        snakeState.head,
        snakeState.segments,
        level,
        pattern
      );
      
      expect(visualState.evolutionLevel).toBe(level);
      expect(visualState.visualPattern).toEqual(pattern);
      expect(() => snakeRenderer.render(visualState)).not.toThrow();
    }
  });

  test('should handle visual system updates in sync', () => {
    const deltaTime = 16.67; // ~60 FPS
    
    // Update all systems
    snakeManager.update(deltaTime);
    visualPatternManager.update(deltaTime);
    snakeRenderer.update(deltaTime);
    
    // Should not throw errors
    expect(() => {
      const snakeState = snakeManager.getSnakeState();
      const evolutionSystem = snakeManager.getEvolutionSystem();
      const currentPattern = visualPatternManager.getCurrentPattern(snakeState.evolutionLevel);
      
      const visualState = snakeRenderer.createVisualState(
        snakeState.head,
        snakeState.segments,
        snakeState.evolutionLevel,
        currentPattern,
        evolutionSystem.isTransformationInProgress(),
        evolutionSystem.getTransformationProgress(),
        !snakeState.isMoving
      );
      
      snakeRenderer.render(visualState);
    }).not.toThrow();
  });

  test('should properly dispose of visual resources', () => {
    // Dispose of renderer
    snakeRenderer.dispose();
    
    // Verify cleanup calls were made
    expect(mockGL.deleteProgram).toHaveBeenCalled();
    expect(mockGL.deleteBuffer).toHaveBeenCalled();
  });
});