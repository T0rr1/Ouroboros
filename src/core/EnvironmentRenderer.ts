import { Obstacle, ObstacleType, DynamicElement, DynamicElementType, InteractiveFeature, InteractiveFeatureType } from '../types/game';
import { buildProgram } from './gl/ShaderUtils';

export interface EnvironmentRenderContext {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
}

export class EnvironmentRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private cellSize: number;
  private shaderProgram: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;

  constructor(context: EnvironmentRenderContext) {
    this.gl = context.gl;
    this.canvas = context.canvas;
    this.cellSize = context.cellSize;

    this.initializeShaders();
    this.initializeBuffers();
  }

  private initializeShaders(): void {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      console.warn('WebGL context not available - skipping environment shader initialization');
      return;
    }

    // Vertex shader source
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      
      uniform vec2 u_resolution;
      
      varying vec4 v_color;
      
      void main() {
        // Convert from pixels to clip space
        vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_color = a_color;
      }
    `;

    // Fragment shader source
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `;

    // Create and compile shaders using robust cross-browser compiler
    try {
      this.shaderProgram = buildProgram(gl, vertexShaderSource, fragmentShaderSource, {
        name: 'EnvironmentRenderer',
        target: 'auto',
        forcePrecision: 'mediump'
      });
    } catch (e: any) {
      console.error('EnvironmentRenderer shader build failed:', e?.message || e);
      throw new Error(`Failed to build environment shader program: ${e?.message || e}`);
    }
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return null;
    }
    const shader = gl.createShader(type);
    
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      console.error(`Shader compilation error: ${error}`);
      return null;
    }

    return shader;
  }

  private initializeBuffers(): void {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      console.warn('WebGL context not available - skipping environment buffer initialization');
      return;
    }
    
    this.vertexBuffer = gl.createBuffer();
    this.colorBuffer = gl.createBuffer();
  }

  public render(obstacles: Obstacle[], dynamicElements: DynamicElement[] = [], interactiveFeatures: InteractiveFeature[] = []): void {
    if (!this.shaderProgram || !this.vertexBuffer || !this.colorBuffer) {
      return;
    }

    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return;
    }
    
    // Use our shader program
    gl.useProgram(this.shaderProgram);

    // Set resolution uniform
    const resolutionLocation = gl.getUniformLocation(this.shaderProgram, 'u_resolution');
    gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);

    // Prepare vertex and color data for all obstacles
    const vertices: number[] = [];
    const colors: number[] = [];

    // Render obstacles
    obstacles.forEach(obstacle => {
      if (!obstacle.isActive) return;

      const obstacleVertices = this.getObstacleVertices(obstacle);
      const obstacleColors = this.getObstacleColors(obstacle);

      vertices.push(...obstacleVertices);
      colors.push(...obstacleColors);
    });

    // Render dynamic elements
    dynamicElements.forEach(element => {
      if (!element.isActive) return;

      const elementVertices = this.getDynamicElementVertices(element);
      const elementColors = this.getDynamicElementColors(element);

      vertices.push(...elementVertices);
      colors.push(...elementColors);
    });

    // Render interactive features
    interactiveFeatures.forEach(feature => {
      if (!feature.isActive) return;

      const featureVertices = this.getInteractiveFeatureVertices(feature);
      const featureColors = this.getInteractiveFeatureColors(feature);

      vertices.push(...featureVertices);
      colors.push(...featureColors);
    });

    if (vertices.length === 0) return;

    // Bind and set vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    const positionLocation = gl.getAttribLocation(this.shaderProgram, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Bind and set color data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);

    const colorLocation = gl.getAttribLocation(this.shaderProgram, 'a_color');
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

    // Draw all obstacles
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
  }

  private getObstacleVertices(obstacle: Obstacle): number[] {
    const x = obstacle.position.x * this.cellSize;
    const y = obstacle.position.y * this.cellSize;
    const width = obstacle.size.x * this.cellSize;
    const height = obstacle.size.y * this.cellSize;

    // Create two triangles to form a rectangle
    return [
      // First triangle
      x, y,
      x + width, y,
      x, y + height,
      
      // Second triangle
      x + width, y,
      x + width, y + height,
      x, y + height
    ];
  }

  private getObstacleColors(obstacle: Obstacle): number[] {
    let color: [number, number, number, number];

    switch (obstacle.type) {
      case ObstacleType.StonePillar:
        color = [0.4, 0.4, 0.4, 1.0]; // Gray
        break;
      case ObstacleType.CrystalFormation:
        color = [0.6, 0.8, 1.0, 0.8]; // Light blue with transparency
        break;
      case ObstacleType.IceWall:
        color = [0.8, 0.9, 1.0, 0.9]; // Light cyan
        break;
      case ObstacleType.ThornBush:
        color = [0.2, 0.6, 0.2, 1.0]; // Dark green
        break;
      case ObstacleType.MagicBarrier:
        color = [0.8, 0.4, 0.8, 0.6]; // Purple with transparency
        break;
      default:
        color = [0.5, 0.5, 0.5, 1.0]; // Default gray
    }

    // Apply damage-based color modification
    if (obstacle.health !== undefined && obstacle.health < 100) {
      const healthRatio = obstacle.health / 100;
      color[0] = Math.min(1.0, color[0] + (1.0 - healthRatio) * 0.3); // Add red tint when damaged
    }

    // Return color for all 6 vertices (2 triangles)
    return [
      ...color, ...color, ...color,
      ...color, ...color, ...color
    ];
  }

  private getDynamicElementVertices(element: DynamicElement): number[] {
    const x = element.position.x * this.cellSize;
    const y = element.position.y * this.cellSize;
    const width = element.size.x * this.cellSize;
    const height = element.size.y * this.cellSize;

    // Create two triangles to form a rectangle
    return [
      // First triangle
      x, y,
      x + width, y,
      x, y + height,
      
      // Second triangle
      x + width, y,
      x + width, y + height,
      x, y + height
    ];
  }

  private getDynamicElementColors(element: DynamicElement): number[] {
    let baseColor: [number, number, number, number];
    let intensity = 1.0;

    // Get base color for element type
    switch (element.type) {
      case DynamicElementType.WaterPool:
        baseColor = [0.29, 0.56, 0.89, 0.7]; // Blue with transparency
        break;
      case DynamicElementType.FlameGeyser:
        baseColor = [1.0, 0.27, 0.0, 1.0]; // Orange-red
        break;
      case DynamicElementType.MovingStoneBlock:
        baseColor = [0.55, 0.27, 0.07, 1.0]; // Brown
        break;
      case DynamicElementType.PoisonGasCloud:
        baseColor = [0.6, 0.2, 0.8, 0.6]; // Purple with transparency
        break;
      case DynamicElementType.LightningStrike:
        baseColor = [1.0, 1.0, 0.0, 1.0]; // Yellow
        break;
      default:
        baseColor = [0.5, 0.5, 0.5, 1.0]; // Default gray
    }

    // Apply phase-based visual effects
    switch (element.currentPhase) {
      case 'warning':
        // Pulsing effect for warning phase
        const pulseIntensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
        intensity = pulseIntensity;
        // Add red tint for warning
        baseColor[0] = Math.min(1.0, baseColor[0] + 0.3);
        break;
        
      case 'active':
        // Full intensity for active phase
        intensity = element.visualData?.intensity || 1.0;
        break;
        
      case 'cooldown':
        // Dimmed for cooldown
        intensity = 0.3;
        break;
        
      case 'inactive':
        // Very dim for inactive
        intensity = 0.1;
        break;
    }

    // Apply intensity to color
    const finalColor: [number, number, number, number] = [
      baseColor[0] * intensity,
      baseColor[1] * intensity,
      baseColor[2] * intensity,
      baseColor[3]
    ];

    // Special effects for certain elements
    if (element.type === DynamicElementType.LightningStrike && element.currentPhase === 'active') {
      // Lightning should be very bright
      finalColor[0] = 1.0;
      finalColor[1] = 1.0;
      finalColor[2] = 1.0;
      finalColor[3] = 1.0;
    }

    if (element.type === DynamicElementType.FlameGeyser && element.currentPhase === 'active') {
      // Flame should flicker
      const flicker = 0.8 + 0.2 * Math.sin(Date.now() * 0.02);
      finalColor[0] *= flicker;
      finalColor[1] *= flicker;
    }

    // Return color for all 6 vertices (2 triangles)
    return [
      ...finalColor, ...finalColor, ...finalColor,
      ...finalColor, ...finalColor, ...finalColor
    ];
  }

  public update(_deltaTime: number): void {
    // Update any animation or visual effects
    // For now, this is a placeholder for future enhancements
  }

  private getInteractiveFeatureVertices(feature: InteractiveFeature): number[] {
    const x = feature.position.x * this.cellSize;
    const y = feature.position.y * this.cellSize;
    const width = feature.size.x * this.cellSize;
    const height = feature.size.y * this.cellSize;

    // Create rectangle vertices (two triangles)
    return [
      x, y,
      x + width, y,
      x, y + height,
      
      x + width, y,
      x + width, y + height,
      x, y + height
    ];
  }

  private getInteractiveFeatureColors(feature: InteractiveFeature): number[] {
    let color: [number, number, number, number];
    
    // Determine color based on feature type and state
    if (feature.isActivated) {
      // Use activated color when feature is active
      const activatedColor = this.hexToRgb(feature.visualData.activatedColor);
      color = [activatedColor.r / 255, activatedColor.g / 255, activatedColor.b / 255, 1.0];
    } else {
      // Use base color with glow intensity
      const baseColor = this.hexToRgb(feature.visualData.baseColor);
      const intensity = feature.visualData.glowIntensity;
      color = [
        (baseColor.r / 255) * intensity,
        (baseColor.g / 255) * intensity,
        (baseColor.b / 255) * intensity,
        0.8 // Slightly transparent for interactive features
      ];
    }

    // Add visual effects based on feature type
    switch (feature.type) {
      case InteractiveFeatureType.PressurePlate:
        // Add metallic sheen for pressure plates
        color[0] = Math.min(1.0, color[0] + 0.1);
        color[1] = Math.min(1.0, color[1] + 0.1);
        color[2] = Math.min(1.0, color[2] + 0.05);
        break;
        
      case InteractiveFeatureType.AncientSwitch:
        // Add stone-like appearance for ancient switches
        color[0] = Math.max(0.2, color[0] - 0.1);
        color[1] = Math.max(0.2, color[1] - 0.1);
        color[2] = Math.max(0.2, color[2] - 0.1);
        break;
        
      case InteractiveFeatureType.MysticalPortal:
        // Add mystical glow for portals
        const time = Date.now() * 0.001;
        const pulse = 0.5 + 0.3 * Math.sin(time * feature.visualData.pulseSpeed);
        color[0] = Math.min(1.0, color[0] * pulse);
        color[1] = Math.min(1.0, color[1] * pulse);
        color[2] = Math.min(1.0, color[2] * pulse);
        color[3] = 0.9; // More opaque for portals
        break;
    }

    // Return color for all 6 vertices (2 triangles)
    return [
      ...color, ...color, ...color,
      ...color, ...color, ...color
    ];
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
  
  public setQuality(quality: any): void {
    // Adjust rendering quality based on performance settings
    console.log('Setting environment render quality:', quality);
  }

  public dispose(): void {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return;
    }
    
    if (this.shaderProgram) {
      gl.deleteProgram(this.shaderProgram);
      this.shaderProgram = null;
    }
    
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }
    
    if (this.colorBuffer) {
      gl.deleteBuffer(this.colorBuffer);
      this.colorBuffer = null;
    }
  }
}