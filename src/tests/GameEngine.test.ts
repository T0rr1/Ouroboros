import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../core/GameEngine';

// Mock HTMLCanvasElement and WebGL context
const mockCanvas = {
  width: 0,
  height: 0,
  style: {},
  getContext: vi.fn()
} as unknown as HTMLCanvasElement;

const mockGL = {
  // Basic WebGL constants
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
  TEXTURE_2D: 3553,
  RGBA: 6408,
  UNSIGNED_BYTE: 5121,
  LINEAR: 9729,
  CLAMP_TO_EDGE: 33071,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_MAG_FILTER: 10240,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  FRAMEBUFFER: 36160,
  COLOR_ATTACHMENT0: 36064,
  FRAMEBUFFER_COMPLETE: 36053,
  POINTS: 0,
  DYNAMIC_DRAW: 35048,
  
  // Canvas properties
  canvas: { width: 800, height: 600 },
  
  // WebGL methods
  viewport: vi.fn(),
  clearColor: vi.fn(),
  enable: vi.fn(),
  blendFunc: vi.fn(),
  clear: vi.fn(),
  createShader: vi.fn(() => ({})),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ''),
  deleteShader: vi.fn(),
  createProgram: vi.fn(() => ({})),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn(() => true),
  getProgramInfoLog: vi.fn(() => ''),
  deleteProgram: vi.fn(),
  useProgram: vi.fn(),
  createBuffer: vi.fn(() => ({})),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  deleteBuffer: vi.fn(),
  getAttribLocation: vi.fn(() => 0),
  getUniformLocation: vi.fn(() => ({})),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform1i: vi.fn(),
  uniform2fv: vi.fn(),
  uniform3fv: vi.fn(),
  uniform1fv: vi.fn(),
  uniform1iv: vi.fn(),
  uniformMatrix3fv: vi.fn(),
  createTexture: vi.fn(() => ({})),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  deleteTexture: vi.fn(),
  createFramebuffer: vi.fn(() => ({})),
  bindFramebuffer: vi.fn(),
  framebufferTexture2D: vi.fn(),
  checkFramebufferStatus: vi.fn(() => 36053), // FRAMEBUFFER_COMPLETE
  deleteFramebuffer: vi.fn(),
  drawArrays: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform1f: vi.fn(),
  uniform1i: vi.fn(),
  uniform2fv: vi.fn(),
  uniformMatrix3fv: vi.fn(),
  drawArrays: vi.fn(),
  deleteProgram: vi.fn(),
  deleteBuffer: vi.fn()
} as unknown as WebGLRenderingContext;

describe('GameEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockCanvas.getContext as any).mockReturnValue(mockGL);
  });

  it('should initialize with correct grid dimensions', () => {
    const engine = new GameEngine(mockCanvas);
    const config = engine.getConfig();
    
    expect(config.gridWidth).toBe(50);
    expect(config.gridHeight).toBe(35);
    expect(config.cellSize).toBe(35);
    expect(config.targetFPS).toBe(60);
  });

  it('should set canvas dimensions correctly', () => {
    new GameEngine(mockCanvas);
    
    expect(mockCanvas.width).toBe(1750); // 50 * 35
    expect(mockCanvas.height).toBe(1225); // 35 * 35
  });

  it('should initialize WebGL context', () => {
    new GameEngine(mockCanvas);
    
    expect(mockGL.viewport).toHaveBeenCalledWith(0, 0, 1750, 1225);
    expect(mockGL.clearColor).toHaveBeenCalledWith(0.1, 0.1, 0.18, 1.0);
    expect(mockGL.enable).toHaveBeenCalledWith(mockGL.BLEND);
  });

  it('should start and stop game loop', () => {
    const engine = new GameEngine(mockCanvas);
    const initialState = engine.getState();
    
    expect(initialState.isRunning).toBe(false);
    
    engine.start();
    const runningState = engine.getState();
    expect(runningState.isRunning).toBe(true);
    
    engine.stop();
    const stoppedState = engine.getState();
    expect(stoppedState.isRunning).toBe(false);
  });

  it('should toggle pause state', () => {
    const engine = new GameEngine(mockCanvas);
    const initialState = engine.getState();
    
    expect(initialState.isPaused).toBe(false);
    
    engine.pause();
    const pausedState = engine.getState();
    expect(pausedState.isPaused).toBe(true);
    
    engine.pause();
    const unpausedState = engine.getState();
    expect(unpausedState.isPaused).toBe(false);
  });

  it('should throw error when WebGL is not supported', () => {
    (mockCanvas.getContext as any).mockReturnValue(null);
    
    expect(() => new GameEngine(mockCanvas)).toThrow('WebGL not supported');
  });
});