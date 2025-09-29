import { SnakeSegment, Vector2 } from '../types/game';
import { VisualPattern } from './EvolutionSystem';
import { buildProgram } from './gl/ShaderUtils';

export interface RenderContext {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
}

export interface SnakeVisualState {
  head: SnakeSegment;
  segments: SnakeSegment[];
  evolutionLevel: number;
  visualPattern: VisualPattern;
  isTransforming: boolean;
  transformationProgress: number;
  isIdle: boolean;
  breathingPhase: number;
}

export interface HeadFeatures {
  eyePositions: Vector2[];
  tonguePosition: Vector2;
  tongueExtension: number;
  tongueAngle: number;
  eyeScale: number;
}

export class SnakeRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private cellSize: number;

  // Shader programs
  private segmentShaderProgram: WebGLProgram | null = null;
  private headShaderProgram: WebGLProgram | null = null;

  // Buffers
  private segmentVertexBuffer: WebGLBuffer | null = null;
  private headVertexBuffer: WebGLBuffer | null = null;

  // Animation state
  private tongueAnimationTime = 0;
  private breathingTime = 0;
  private transformationEffectTime = 0;

  // Visual constants
  private readonly SEGMENT_RADIUS = 0.4; // Relative to cell size
  private readonly HEAD_SCALE_MULTIPLIER = 1.2;
  private readonly TONGUE_FLICK_FREQUENCY = 0.5; // Hz
  private readonly TONGUE_FLICK_DURATION = 0.3; // seconds
  private readonly BREATHING_FREQUENCY = 2.0; // Hz
  private readonly BREATHING_AMPLITUDE = 0.05;

  constructor(context: RenderContext) {
    this.gl = context.gl;
    this.canvas = context.canvas;
    this.cellSize = context.cellSize;

    this.initializeShaders();
    this.initializeBuffers();
  }

  private initializeShaders(): void {
    // Handle test environments where WebGL context might be null
    if (!this.gl) {
      console.warn('WebGL context not available - skipping shader initialization');
      return;
    }
    // Vertex shader for snake segments
    const segmentVertexShaderSource = `
      precision mediump float;
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      uniform mat3 u_transform;
      uniform vec2 u_resolution;
      uniform float u_scale;
      
      varying vec2 v_texCoord;
      varying vec2 v_position;
      
      void main() {
        vec3 position = u_transform * vec3(a_position * u_scale, 1.0);
        
        // Convert to clip space
        vec2 clipSpace = ((position.xy / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        
        v_texCoord = a_texCoord;
        v_position = position.xy;
      }
    `;

    // Fragment shader for snake segments with pattern support
    const segmentFragmentShaderSource = `
      precision mediump float;
      
      uniform vec3 u_baseColor;
      uniform vec3 u_secondaryColor;
      uniform float u_glowIntensity;
      uniform float u_time;
      uniform int u_patternType;
      uniform float u_transformationProgress;
      uniform vec2 u_segmentCenter;
      
      varying vec2 v_texCoord;
      varying vec2 v_position;
      
      // Pattern generation functions
      float generateStripePattern(vec2 coord) {
        float stripeWidth = 0.15;
        float stripeSpacing = 0.3;
        return step(mod(coord.y, stripeSpacing), stripeWidth);
      }
      
      float generateDiamondPattern(vec2 coord) {
        vec2 center = vec2(0.5, 0.5);
        vec2 offset = abs(coord - center);
        float diamond = max(offset.x, offset.y);
        return step(diamond, 0.2) * (1.0 - step(diamond, 0.15));
      }
      
      float generateScalePattern(vec2 coord) {
        vec2 scaled = coord * 8.0;
        vec2 grid = fract(scaled);
        float scale = length(grid - 0.5);
        return smoothstep(0.3, 0.4, scale);
      }
      
      void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = length(v_texCoord - center);
        
        // Base circular shape with smooth edges
        float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
        
        if (alpha < 0.01) {
          discard;
        }
        
        vec3 color = u_baseColor;
        
        // Apply pattern based on type
        if (u_patternType == 1) { // Stripes
          float pattern = generateStripePattern(v_texCoord);
          color = mix(u_baseColor, u_secondaryColor, pattern);
        } else if (u_patternType == 2) { // Diamond
          float pattern = generateDiamondPattern(v_texCoord);
          color = mix(u_baseColor, u_secondaryColor, pattern);
        } else if (u_patternType == 3) { // Scales
          float pattern = generateScalePattern(v_texCoord);
          color = mix(u_baseColor, u_secondaryColor, pattern * 0.3);
        }
        
        // Add subtle gradient for 3D effect
        float gradient = 1.0 - (dist * 0.3);
        color *= gradient;
        
        // Add glow effect
        if (u_glowIntensity > 0.0) {
          float glow = exp(-dist * 3.0) * u_glowIntensity;
          color += vec3(glow * 0.2, glow * 0.3, glow * 0.5);
        }
        
        // Transformation effect
        if (u_transformationProgress > 0.0) {
          float transformGlow = sin(u_time * 10.0) * 0.5 + 0.5;
          color += vec3(transformGlow * u_transformationProgress * 0.5);
          alpha += transformGlow * u_transformationProgress * 0.3;
        }
        
        gl_FragColor = vec4(color, alpha);
      }
    `;

    // Head-specific vertex shader
    const headVertexShaderSource = `
      precision mediump float;
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      uniform mat3 u_transform;
      uniform vec2 u_resolution;
      uniform float u_scale;
      uniform float u_headScale;
      
      varying vec2 v_texCoord;
      varying vec2 v_position;
      
      void main() {
        vec3 position = u_transform * vec3(a_position * u_scale * u_headScale, 1.0);
        
        vec2 clipSpace = ((position.xy / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        
        v_texCoord = a_texCoord;
        v_position = position.xy;
      }
    `;

    // Head-specific fragment shader with eye and tongue rendering
    const headFragmentShaderSource = `
      precision mediump float;
      
      uniform vec3 u_baseColor;
      uniform vec3 u_secondaryColor;
      uniform float u_glowIntensity;
      uniform float u_time;
      uniform int u_patternType;
      uniform float u_transformationProgress;
      uniform float u_tongueExtension;
      uniform vec2 u_eyePositions[2];
      uniform float u_eyeScale;
      
      varying vec2 v_texCoord;
      varying vec2 v_position;
      
      void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = length(v_texCoord - center);
        
        // Head shape (slightly elongated)
        vec2 headCoord = (v_texCoord - center) * vec2(1.2, 1.0) + center;
        float headDist = length(headCoord - center);
        float alpha = 1.0 - smoothstep(0.35, 0.5, headDist);
        
        if (alpha < 0.01) {
          discard;
        }
        
        vec3 color = u_baseColor;
        
        // Apply same patterns as body
        if (u_patternType == 1) { // Stripes
          float stripeWidth = 0.12;
          float stripeSpacing = 0.25;
          float pattern = step(mod(v_texCoord.y, stripeSpacing), stripeWidth);
          color = mix(u_baseColor, u_secondaryColor, pattern);
        } else if (u_patternType == 2) { // Diamond
          vec2 offset = abs(v_texCoord - center);
          float diamond = max(offset.x, offset.y);
          float pattern = step(diamond, 0.15) * (1.0 - step(diamond, 0.1));
          color = mix(u_baseColor, u_secondaryColor, pattern);
        }
        
        // Render eyes
        for (int i = 0; i < 2; i++) {
          vec2 eyePos = u_eyePositions[i];
          float eyeDist = length(v_texCoord - eyePos);
          float eyeRadius = 0.08 * u_eyeScale;
          
          if (eyeDist < eyeRadius) {
            // Eye white
            color = mix(color, vec3(0.9, 0.9, 0.8), 1.0 - smoothstep(eyeRadius * 0.7, eyeRadius, eyeDist));
            
            // Pupil
            float pupilRadius = eyeRadius * 0.4;
            if (eyeDist < pupilRadius) {
              color = mix(color, vec3(0.1, 0.1, 0.1), 1.0 - smoothstep(pupilRadius * 0.5, pupilRadius, eyeDist));
            }
          }
        }
        
        // Render forked tongue if extended
        if (u_tongueExtension > 0.0) {
          vec2 tongueStart = vec2(0.5, 0.7); // Front of head
          vec2 tongueDir = vec2(0.0, 1.0);
          
          // Main tongue body
          vec2 tongueEnd = tongueStart + tongueDir * (0.3 * u_tongueExtension);
          float tongueWidth = 0.02;
          
          // Distance to tongue line
          vec2 toPoint = v_texCoord - tongueStart;
          vec2 tongueVec = tongueEnd - tongueStart;
          float tongueLength = length(tongueVec);
          
          if (tongueLength > 0.0) {
            float t = clamp(dot(toPoint, tongueVec) / (tongueLength * tongueLength), 0.0, 1.0);
            vec2 projection = tongueStart + t * tongueVec;
            float distToTongue = length(v_texCoord - projection);
            
            if (distToTongue < tongueWidth && t > 0.0 && t < 1.0) {
              color = mix(color, vec3(0.8, 0.2, 0.3), 0.8); // Red tongue
            }
            
            // Forked tip
            if (t > 0.8) {
              vec2 fork1 = tongueEnd + vec2(-0.05, 0.05) * u_tongueExtension;
              vec2 fork2 = tongueEnd + vec2(0.05, 0.05) * u_tongueExtension;
              
              float distToFork1 = length(v_texCoord - fork1);
              float distToFork2 = length(v_texCoord - fork2);
              
              if (distToFork1 < tongueWidth * 0.7 || distToFork2 < tongueWidth * 0.7) {
                color = mix(color, vec3(0.8, 0.2, 0.3), 0.8);
              }
            }
          }
        }
        
        // Add gradient and glow effects
        float gradient = 1.0 - (headDist * 0.2);
        color *= gradient;
        
        if (u_glowIntensity > 0.0) {
          float glow = exp(-headDist * 2.5) * u_glowIntensity;
          color += vec3(glow * 0.3, glow * 0.4, glow * 0.6);
        }
        
        // Transformation effect
        if (u_transformationProgress > 0.0) {
          float transformGlow = sin(u_time * 12.0) * 0.5 + 0.5;
          color += vec3(transformGlow * u_transformationProgress * 0.7);
          alpha += transformGlow * u_transformationProgress * 0.4;
        }
        
        gl_FragColor = vec4(color, alpha);
      }
    `;

    // Compile and link shaders
    this.segmentShaderProgram = this.createShaderProgram(segmentVertexShaderSource, segmentFragmentShaderSource);
    this.headShaderProgram = this.createShaderProgram(headVertexShaderSource, headFragmentShaderSource);
  }

  private createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      console.warn('WebGL context not available - running in test mode');
      return null;
    }

    try {
      // Use the robust shader compiler with cross-browser compatibility
      return buildProgram(gl, vertexSource, fragmentSource, {
        name: 'SnakeRenderer',
        target: 'auto',
        forcePrecision: 'mediump'
      });
    } catch (e: any) {
      console.error('SnakeRenderer shader build failed:', e?.message || e);
      // Surface to error handler for fallback UI
      if (this.errorHandler) {
        this.errorHandler.handleError({
          type: 'webgl',
          message: 'Snake shader build failed: ' + (e?.message || e),
          timestamp: Date.now(),
          severity: 'high',
        });
      }
      return null;
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return null;
    }
    const shader = gl.createShader(type);

    if (!shader) {
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private initializeBuffers(): void {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      console.warn('WebGL context not available - skipping buffer initialization');
      return;
    }

    // Create quad vertices for segments (will be transformed per segment)
    const segmentVertices = new Float32Array([
      // Position  // TexCoord
      -0.5, -0.5, 0.0, 0.0,
      0.5, -0.5, 1.0, 0.0,
      -0.5, 0.5, 0.0, 1.0,
      0.5, 0.5, 1.0, 1.0
    ]);

    this.segmentVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.segmentVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, segmentVertices, gl.STATIC_DRAW);

    // Head uses the same geometry but with different shader
    this.headVertexBuffer = this.segmentVertexBuffer;
  }

  public update(deltaTime: number): void {
    this.tongueAnimationTime += deltaTime / 1000;
    this.breathingTime += deltaTime / 1000;
    this.transformationEffectTime += deltaTime / 1000;
  }

  public render(visualState: SnakeVisualState): void {
    if (!this.segmentShaderProgram || !this.headShaderProgram) {
      return;
    }

    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return;
    }

    // Render body segments first
    this.renderSegments(visualState);

    // Render head last (on top)
    this.renderHead(visualState);
  }

  private renderSegments(visualState: SnakeVisualState): void {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return;
    }
    const program = this.segmentShaderProgram!;

    gl.useProgram(program);

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.segmentVertexBuffer);

    // Set up attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    gl.enableVertexAttribArray(positionLocation);
    gl.enableVertexAttribArray(texCoordLocation);

    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

    // Set uniforms
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const baseColorLocation = gl.getUniformLocation(program, 'u_baseColor');
    const secondaryColorLocation = gl.getUniformLocation(program, 'u_secondaryColor');
    const glowIntensityLocation = gl.getUniformLocation(program, 'u_glowIntensity');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const patternTypeLocation = gl.getUniformLocation(program, 'u_patternType');
    const transformationProgressLocation = gl.getUniformLocation(program, 'u_transformationProgress');
    const transformLocation = gl.getUniformLocation(program, 'u_transform');
    const scaleLocation = gl.getUniformLocation(program, 'u_scale');

    gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);

    // Set pattern-specific uniforms
    const baseColor = this.hexToRgb(visualState.visualPattern.baseColor);
    const secondaryColor = this.hexToRgb(visualState.visualPattern.secondaryColor);

    gl.uniform3f(baseColorLocation, baseColor.r, baseColor.g, baseColor.b);
    gl.uniform3f(secondaryColorLocation, secondaryColor.r, secondaryColor.g, secondaryColor.b);
    gl.uniform1f(glowIntensityLocation, visualState.visualPattern.glowIntensity);
    gl.uniform1f(timeLocation, this.transformationEffectTime);
    gl.uniform1i(patternTypeLocation, this.getPatternTypeId(visualState.visualPattern.patternType));
    gl.uniform1f(transformationProgressLocation, visualState.isTransforming ? visualState.transformationProgress : 0.0);

    // Render each segment
    visualState.segments.forEach((segment, index) => {
      const worldX = (segment.interpolatedX ?? segment.x) * this.cellSize + this.cellSize / 2;
      const worldY = (segment.interpolatedY ?? segment.y) * this.cellSize + this.cellSize / 2;

      // Calculate breathing effect
      let segmentScale = segment.scale;
      if (visualState.isIdle) {
        const breathingIntensity = Math.max(0.3, 1.0 - (index * 0.1));
        const breathingOffset = Math.sin(visualState.breathingPhase - index * 0.2) * this.BREATHING_AMPLITUDE * breathingIntensity;
        segmentScale *= (1.0 + breathingOffset);
      }

      // Create transformation matrix
      const transform = this.createTransformMatrix(worldX, worldY, segment.rotation);
      gl.uniformMatrix3fv(transformLocation, false, transform);
      gl.uniform1f(scaleLocation, this.cellSize * this.SEGMENT_RADIUS * segmentScale);

      // Draw segment
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
  }

  private renderHead(visualState: SnakeVisualState): void {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return;
    }
    const program = this.headShaderProgram!;

    gl.useProgram(program);

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.headVertexBuffer);

    // Set up attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    gl.enableVertexAttribArray(positionLocation);
    gl.enableVertexAttribArray(texCoordLocation);

    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

    // Calculate head features
    const headFeatures = this.calculateHeadFeatures(visualState);

    // Set uniforms
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const baseColorLocation = gl.getUniformLocation(program, 'u_baseColor');
    const secondaryColorLocation = gl.getUniformLocation(program, 'u_secondaryColor');
    const glowIntensityLocation = gl.getUniformLocation(program, 'u_glowIntensity');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const patternTypeLocation = gl.getUniformLocation(program, 'u_patternType');
    const transformationProgressLocation = gl.getUniformLocation(program, 'u_transformationProgress');
    const transformLocation = gl.getUniformLocation(program, 'u_transform');
    const scaleLocation = gl.getUniformLocation(program, 'u_scale');
    const headScaleLocation = gl.getUniformLocation(program, 'u_headScale');
    const tongueExtensionLocation = gl.getUniformLocation(program, 'u_tongueExtension');
    const eyePositionsLocation = gl.getUniformLocation(program, 'u_eyePositions');
    const eyeScaleLocation = gl.getUniformLocation(program, 'u_eyeScale');

    gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);

    const baseColor = this.hexToRgb(visualState.visualPattern.baseColor);
    const secondaryColor = this.hexToRgb(visualState.visualPattern.secondaryColor);

    gl.uniform3f(baseColorLocation, baseColor.r, baseColor.g, baseColor.b);
    gl.uniform3f(secondaryColorLocation, secondaryColor.r, secondaryColor.g, secondaryColor.b);
    gl.uniform1f(glowIntensityLocation, visualState.visualPattern.glowIntensity);
    gl.uniform1f(timeLocation, this.transformationEffectTime);
    gl.uniform1i(patternTypeLocation, this.getPatternTypeId(visualState.visualPattern.patternType));
    gl.uniform1f(transformationProgressLocation, visualState.isTransforming ? visualState.transformationProgress : 0.0);

    // Head-specific uniforms
    gl.uniform1f(tongueExtensionLocation, headFeatures.tongueExtension);
    gl.uniform2fv(eyePositionsLocation, [
      headFeatures.eyePositions[0].x, headFeatures.eyePositions[0].y,
      headFeatures.eyePositions[1].x, headFeatures.eyePositions[1].y
    ]);
    gl.uniform1f(eyeScaleLocation, headFeatures.eyeScale);

    // Calculate head position and scale
    const head = visualState.head;
    const worldX = (head.interpolatedX ?? head.x) * this.cellSize + this.cellSize / 2;
    const worldY = (head.interpolatedY ?? head.y) * this.cellSize + this.cellSize / 2;

    let headScale = head.scale * this.HEAD_SCALE_MULTIPLIER;
    if (visualState.isIdle) {
      const breathingOffset = Math.sin(visualState.breathingPhase) * this.BREATHING_AMPLITUDE;
      headScale *= (1.0 + breathingOffset);
    }

    // Create transformation matrix
    const transform = this.createTransformMatrix(worldX, worldY, head.rotation);
    gl.uniformMatrix3fv(transformLocation, false, transform);
    gl.uniform1f(scaleLocation, this.cellSize * this.SEGMENT_RADIUS);
    gl.uniform1f(headScaleLocation, headScale);

    // Draw head
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private calculateHeadFeatures(visualState: SnakeVisualState): HeadFeatures {
    // Calculate tongue flicking animation
    const tongueFlickCycle = this.tongueAnimationTime * this.TONGUE_FLICK_FREQUENCY;
    const tongueFlickPhase = tongueFlickCycle - Math.floor(tongueFlickCycle);

    let tongueExtension = 0;
    if (tongueFlickPhase < this.TONGUE_FLICK_DURATION) {
      const t = tongueFlickPhase / this.TONGUE_FLICK_DURATION;
      // Smooth in-out animation
      tongueExtension = Math.sin(t * Math.PI);
    }

    // Eye positions relative to head center
    const eyeOffset = 0.15;
    const eyePositions: Vector2[] = [
      { x: 0.5 - eyeOffset, y: 0.35 }, // Left eye
      { x: 0.5 + eyeOffset, y: 0.35 }  // Right eye
    ];

    // Scale eyes based on evolution level
    const eyeScale = Math.min(1.5, 1.0 + (visualState.evolutionLevel - 1) * 0.1);

    return {
      eyePositions,
      tonguePosition: { x: 0.5, y: 0.7 },
      tongueExtension,
      tongueAngle: 0,
      eyeScale
    };
  }

  private createTransformMatrix(x: number, y: number, rotation: number): Float32Array {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    return new Float32Array([
      cos, -sin, x,
      sin, cos, y,
      0, 0, 1
    ]);
  }

  private getPatternTypeId(patternType: string): number {
    switch (patternType) {
      case 'solid': return 0;
      case 'stripes': return 1;
      case 'diamond': return 2;
      case 'scales': return 3;
      default: return 0;
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  }

  public createVisualState(
    head: SnakeSegment,
    segments: SnakeSegment[],
    evolutionLevel: number,
    visualPattern: VisualPattern,
    isTransforming: boolean = false,
    transformationProgress: number = 0,
    isIdle: boolean = false
  ): SnakeVisualState {
    return {
      head,
      segments,
      evolutionLevel,
      visualPattern,
      isTransforming,
      transformationProgress,
      isIdle,
      breathingPhase: this.breathingTime * this.BREATHING_FREQUENCY * 2 * Math.PI
    };
  }

  public setQuality(quality: any): void {
    // Adjust rendering quality based on performance settings
    // This could affect texture resolution, shader complexity, etc.
    console.log('Setting render quality:', quality);
  }

  public dispose(): void {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return;
    }

    if (this.segmentShaderProgram) {
      gl.deleteProgram(this.segmentShaderProgram);
    }
    if (this.headShaderProgram) {
      gl.deleteProgram(this.headShaderProgram);
    }
    if (this.segmentVertexBuffer) {
      gl.deleteBuffer(this.segmentVertexBuffer);
    }
  }
}