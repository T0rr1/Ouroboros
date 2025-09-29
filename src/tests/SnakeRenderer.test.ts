import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SnakeRenderer, RenderContext, SnakeVisualState } from '../core/SnakeRenderer';
import { VisualPattern } from '../core/EvolutionSystem';
import { SnakeSegment } from '../types/game';

// Mock WebGL context
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

describe('SnakeRenderer', () => {
  let renderer: SnakeRenderer;
  let mockCanvas: HTMLCanvasElement;
  let mockGL: any;
  let renderContext: RenderContext;

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = {
      width: 1750,
      height: 1225,
      getContext: vi.fn()
    } as any;

    // Create mock WebGL context
    mockGL = createMockWebGLContext();
    mockCanvas.getContext = vi.fn(() => mockGL);

    // Create render context
    renderContext = {
      gl: mockGL,
      canvas: mockCanvas,
      cellSize: 35,
      gridWidth: 50,
      gridHeight: 35
    };

    // Create renderer
    renderer = new SnakeRenderer(renderContext);
  });

  test('should initialize without errors', () => {
    expect(renderer).toBeDefined();
    expect(mockGL.createShader).toHaveBeenCalled();
    expect(mockGL.createProgram).toHaveBeenCalled();
    expect(mockGL.createBuffer).toHaveBeenCalled();
  });

  test('should create visual state correctly', () => {
    const head: SnakeSegment = {
      x: 25,
      y: 17,
      rotation: 0,
      scale: 1.0,
      interpolatedX: 25,
      interpolatedY: 17
    };

    const segments: SnakeSegment[] = [
      { x: 24, y: 17, rotation: 0, scale: 1.0, interpolatedX: 24, interpolatedY: 17 },
      { x: 23, y: 17, rotation: 0, scale: 1.0, interpolatedX: 23, interpolatedY: 17 }
    ];

    const visualPattern: VisualPattern = {
      baseColor: '#4CAF50',
      secondaryColor: '#66BB6A',
      patternType: 'solid',
      glowIntensity: 0.0,
      scaleTexture: 'basic',
      animationSpeed: 1.0
    };

    const visualState = renderer.createVisualState(
      head,
      segments,
      1,
      visualPattern,
      false,
      0,
      true
    );

    expect(visualState.head).toEqual(head);
    expect(visualState.segments).toEqual(segments);
    expect(visualState.evolutionLevel).toBe(1);
    expect(visualState.visualPattern).toEqual(visualPattern);
    expect(visualState.isTransforming).toBe(false);
    expect(visualState.transformationProgress).toBe(0);
    expect(visualState.isIdle).toBe(true);
    expect(visualState.breathingPhase).toBeTypeOf('number');
  });

  test('should update animation time', () => {
    const initialTime = performance.now();
    
    renderer.update(16.67); // ~60 FPS frame time
    
    // We can't directly test internal time values, but we can verify update doesn't throw
    expect(() => renderer.update(16.67)).not.toThrow();
  });

  test('should render without errors', () => {
    const head: SnakeSegment = {
      x: 25,
      y: 17,
      rotation: 0,
      scale: 1.0,
      interpolatedX: 25,
      interpolatedY: 17
    };

    const segments: SnakeSegment[] = [
      { x: 24, y: 17, rotation: 0, scale: 1.0, interpolatedX: 24, interpolatedY: 17 }
    ];

    const visualPattern: VisualPattern = {
      baseColor: '#4CAF50',
      secondaryColor: '#66BB6A',
      patternType: 'solid',
      glowIntensity: 0.0,
      scaleTexture: 'basic',
      animationSpeed: 1.0
    };

    const visualState = renderer.createVisualState(
      head,
      segments,
      1,
      visualPattern
    );

    expect(() => renderer.render(visualState)).not.toThrow();
    
    // Verify WebGL calls were made
    expect(mockGL.useProgram).toHaveBeenCalled();
    expect(mockGL.drawArrays).toHaveBeenCalled();
  });

  test('should handle different pattern types', () => {
    const head: SnakeSegment = {
      x: 25,
      y: 17,
      rotation: 0,
      scale: 1.0
    };

    const segments: SnakeSegment[] = [];

    const patterns = [
      { patternType: 'solid', expectedId: 0 },
      { patternType: 'stripes', expectedId: 1 },
      { patternType: 'diamond', expectedId: 2 },
      { patternType: 'scales', expectedId: 3 }
    ];

    patterns.forEach(({ patternType }) => {
      const visualPattern: VisualPattern = {
        baseColor: '#4CAF50',
        secondaryColor: '#66BB6A',
        patternType,
        glowIntensity: 0.0,
        scaleTexture: 'basic',
        animationSpeed: 1.0
      };

      const visualState = renderer.createVisualState(
        head,
        segments,
        1,
        visualPattern
      );

      expect(() => renderer.render(visualState)).not.toThrow();
    });
  });

  test('should handle transformation effects', () => {
    const head: SnakeSegment = {
      x: 25,
      y: 17,
      rotation: 0,
      scale: 1.0
    };

    const segments: SnakeSegment[] = [];

    const visualPattern: VisualPattern = {
      baseColor: '#4CAF50',
      secondaryColor: '#66BB6A',
      patternType: 'solid',
      glowIntensity: 0.5,
      scaleTexture: 'basic',
      animationSpeed: 1.0
    };

    const visualState = renderer.createVisualState(
      head,
      segments,
      2,
      visualPattern,
      true,  // isTransforming
      0.5    // transformationProgress
    );

    expect(() => renderer.render(visualState)).not.toThrow();
    expect(visualState.isTransforming).toBe(true);
    expect(visualState.transformationProgress).toBe(0.5);
  });

  test('should dispose resources properly', () => {
    renderer.dispose();
    
    expect(mockGL.deleteProgram).toHaveBeenCalled();
    expect(mockGL.deleteBuffer).toHaveBeenCalled();
  });

  test('should handle breathing animation for idle snake', () => {
    const head: SnakeSegment = {
      x: 25,
      y: 17,
      rotation: 0,
      scale: 1.0
    };

    const segments: SnakeSegment[] = [
      { x: 24, y: 17, rotation: 0, scale: 1.0 },
      { x: 23, y: 17, rotation: 0, scale: 1.0 }
    ];

    const visualPattern: VisualPattern = {
      baseColor: '#4CAF50',
      secondaryColor: '#66BB6A',
      patternType: 'solid',
      glowIntensity: 0.0,
      scaleTexture: 'basic',
      animationSpeed: 1.0
    };

    const visualState = renderer.createVisualState(
      head,
      segments,
      1,
      visualPattern,
      false,
      0,
      true  // isIdle
    );

    expect(() => renderer.render(visualState)).not.toThrow();
    expect(visualState.isIdle).toBe(true);
  });

  test('should handle different evolution levels', () => {
    const head: SnakeSegment = {
      x: 25,
      y: 17,
      rotation: 0,
      scale: 1.0
    };

    const segments: SnakeSegment[] = [];

    const visualPattern: VisualPattern = {
      baseColor: '#795548',
      secondaryColor: '#FF5722',
      patternType: 'diamond',
      glowIntensity: 0.2,
      scaleTexture: 'diamond',
      animationSpeed: 1.2
    };

    // Test level 3 (Viper)
    const visualState = renderer.createVisualState(
      head,
      segments,
      3,
      visualPattern
    );

    expect(() => renderer.render(visualState)).not.toThrow();
    expect(visualState.evolutionLevel).toBe(3);
    expect(visualState.visualPattern.patternType).toBe('diamond');
  });
});