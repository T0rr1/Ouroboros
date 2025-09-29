import { Vector2 } from '../types/game';

export interface Light {
  id: string;
  position: Vector2;
  color: [number, number, number]; // RGB values 0-1
  intensity: number; // 0-1
  radius: number; // in pixels
  type: LightType;
  isActive: boolean;
  flickerSpeed?: number;
  flickerIntensity?: number;
  pulseSpeed?: number;
  pulseIntensity?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  lifetime?: number; // -1 for infinite
  timeAlive?: number;
}

export enum LightType {
  Static = 'static',
  Flickering = 'flickering',
  Pulsing = 'pulsing',
  Glowing = 'glowing',
  Mystical = 'mystical',
  Fire = 'fire',
  Lightning = 'lightning'
}

export interface AmbientLighting {
  baseColor: [number, number, number];
  intensity: number;
  evolutionModifier: number; // Multiplier based on snake evolution level
  environmentModifier: number; // Modifier for different environments
}

export interface LightingConfig {
  maxLights: number;
  enableShadows: boolean;
  shadowQuality: 'low' | 'medium' | 'high';
  ambientIntensity: number;
  lightFalloffExponent: number;
  performanceMode: boolean;
}

export class LightingSystem {
  private lights: Map<string, Light> = new Map();
  private ambientLighting: AmbientLighting;
  private config: LightingConfig;
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  
  // WebGL resources
  private lightingShaderProgram: WebGLProgram | null = null;
  private lightingFramebuffer: WebGLFramebuffer | null = null;
  private lightingTexture: WebGLTexture | null = null;
  private quadVertexBuffer: WebGLBuffer | null = null;
  
  // Performance tracking
  private frameTime = 0;
  private lastPerformanceCheck = 0;
  private performanceCheckInterval = 1000; // 1 second
  
  constructor(gl: WebGLRenderingContext, canvas: HTMLCanvasElement, config: Partial<LightingConfig> = {}) {
    this.gl = gl;
    this.canvas = canvas;
    
    this.config = {
      maxLights: config.maxLights || 32,
      enableShadows: config.enableShadows !== false,
      shadowQuality: config.shadowQuality || 'medium',
      ambientIntensity: config.ambientIntensity || 0.3,
      lightFalloffExponent: config.lightFalloffExponent || 2.0,
      performanceMode: config.performanceMode || false
    };
    
    this.ambientLighting = {
      baseColor: [0.2, 0.25, 0.35], // Mystical blue-gray
      intensity: this.config.ambientIntensity,
      evolutionModifier: 1.0,
      environmentModifier: 1.0
    };
    
    this.initializeWebGL();
  }

  private initializeWebGL(): void {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      console.warn('WebGL context not available - skipping lighting system WebGL initialization');
      return;
    }
    
    // Create lighting shader program
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform vec2 u_resolution;
      uniform vec3 u_ambientColor;
      uniform float u_ambientIntensity;
      uniform float u_time;
      
      // Light uniforms (up to 32 lights)
      uniform int u_lightCount;
      uniform vec2 u_lightPositions[32];
      uniform vec3 u_lightColors[32];
      uniform float u_lightIntensities[32];
      uniform float u_lightRadii[32];
      uniform int u_lightTypes[32];
      uniform float u_lightFlickerSpeeds[32];
      uniform float u_lightFlickerIntensities[32];
      uniform float u_lightPulseSpeeds[32];
      uniform float u_lightPulseIntensities[32];
      
      varying vec2 v_texCoord;
      
      float calculateLightContribution(int index, vec2 fragCoord) {
        vec2 lightPos = u_lightPositions[index];
        float lightRadius = u_lightRadii[index];
        float lightIntensity = u_lightIntensities[index];
        int lightType = u_lightTypes[index];
        
        float distance = length(fragCoord - lightPos);
        
        if (distance > lightRadius) {
          return 0.0;
        }
        
        // Base attenuation
        float attenuation = 1.0 - pow(distance / lightRadius, 2.0);
        
        // Apply light type effects
        float finalIntensity = lightIntensity;
        
        if (lightType == 1) { // Flickering
          float flickerSpeed = u_lightFlickerSpeeds[index];
          float flickerIntensity = u_lightFlickerIntensities[index];
          float flicker = sin(u_time * flickerSpeed) * 0.5 + 0.5;
          finalIntensity *= (1.0 - flickerIntensity * 0.5) + (flickerIntensity * flicker);
        } else if (lightType == 2) { // Pulsing
          float pulseSpeed = u_lightPulseSpeeds[index];
          float pulseIntensity = u_lightPulseIntensities[index];
          float pulse = sin(u_time * pulseSpeed) * 0.5 + 0.5;
          finalIntensity *= (1.0 - pulseIntensity * 0.3) + (pulseIntensity * 0.3 * pulse);
        } else if (lightType == 3) { // Glowing
          float glow = sin(u_time * 2.0) * 0.1 + 0.9;
          finalIntensity *= glow;
        } else if (lightType == 4) { // Mystical
          float mystical = sin(u_time * 1.5 + distance * 0.1) * 0.2 + 0.8;
          finalIntensity *= mystical;
        } else if (lightType == 5) { // Fire
          float fire1 = sin(u_time * 8.0 + distance * 0.2) * 0.3;
          float fire2 = sin(u_time * 12.0 + distance * 0.15) * 0.2;
          finalIntensity *= (0.7 + fire1 + fire2);
        } else if (lightType == 6) { // Lightning
          float lightning = step(0.95, sin(u_time * 50.0)) * 2.0;
          finalIntensity *= max(0.1, lightning);
        }
        
        return attenuation * finalIntensity;
      }
      
      void main() {
        vec2 fragCoord = v_texCoord * u_resolution;
        
        // Start with ambient lighting
        vec3 finalColor = u_ambientColor * u_ambientIntensity;
        
        // Add contribution from each light
        for (int i = 0; i < 32; i++) {
          if (i >= u_lightCount) break;
          
          float contribution = calculateLightContribution(i, fragCoord);
          if (contribution > 0.0) {
            finalColor += u_lightColors[i] * contribution;
          }
        }
        
        // Clamp to prevent over-bright areas
        finalColor = min(finalColor, vec3(1.0));
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
    
    this.lightingShaderProgram = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
    
    // Create fullscreen quad for lighting pass
    const quadVertices = new Float32Array([
      // Position  // TexCoord
      -1.0, -1.0,  0.0, 0.0,
       1.0, -1.0,  1.0, 0.0,
      -1.0,  1.0,  0.0, 1.0,
       1.0,  1.0,  1.0, 1.0
    ]);
    
    this.quadVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    
    // Create framebuffer for lighting pass
    this.createLightingFramebuffer();
  }

  private createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return null;
    }
    
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) {
      return null;
    }
    
    const program = gl.createProgram();
    if (!program) {
      return null;
    }
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Lighting shader program linking failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
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
      console.error('Lighting shader compilation failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  private createLightingFramebuffer(): void {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      console.warn('WebGL context not available - skipping lighting framebuffer creation');
      return;
    }
    
    // Create framebuffer
    this.lightingFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightingFramebuffer);
    
    // Create texture for lighting
    this.lightingTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.lightingTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Attach texture to framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.lightingTexture, 0);
    
    // Check framebuffer completeness
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('Lighting framebuffer is not complete');
    }
    
    // Unbind framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  public addLight(light: Omit<Light, 'timeAlive'>): Light {
    const fullLight: Light = {
      ...light,
      timeAlive: 0
    };
    
    this.lights.set(light.id, fullLight);
    return fullLight;
  }

  public removeLight(id: string): void {
    this.lights.delete(id);
  }

  public updateLight(id: string, updates: Partial<Light>): void {
    const light = this.lights.get(id);
    if (light) {
      Object.assign(light, updates);
    }
  }

  public getLight(id: string): Light | undefined {
    return this.lights.get(id);
  }

  // Snake evolution-specific lighting methods
  public createSnakeGlow(snakePosition: Vector2, evolutionLevel: number): string {
    const lightId = 'snake_glow';
    
    // Remove existing snake glow
    this.removeLight(lightId);
    
    // Create new glow based on evolution level
    let color: [number, number, number];
    let intensity: number;
    let radius: number;
    let type: LightType;
    
    switch (evolutionLevel) {
      case 1: // Hatchling - no glow
        return lightId;
        
      case 2: // Garden Snake - subtle green glow
        color = [0.3, 0.8, 0.3];
        intensity = 0.3;
        radius = 60;
        type = LightType.Static;
        break;
        
      case 3: // Viper - purple venom glow
        color = [0.6, 0.2, 0.8];
        intensity = 0.4;
        radius = 70;
        type = LightType.Pulsing;
        break;
        
      case 4: // Python - warm amber glow
        color = [0.8, 0.6, 0.2];
        intensity = 0.5;
        radius = 80;
        type = LightType.Glowing;
        break;
        
      case 5: // Cobra - golden hood glow
        color = [1.0, 0.8, 0.3];
        intensity = 0.6;
        radius = 90;
        type = LightType.Pulsing;
        break;
        
      case 6: // Anaconda - blue-green aquatic glow
        color = [0.2, 0.7, 0.9];
        intensity = 0.7;
        radius = 100;
        type = LightType.Glowing;
        break;
        
      case 7: // Rainbow Serpent - shifting rainbow glow
        color = [0.8, 0.5, 1.0];
        intensity = 0.8;
        radius = 120;
        type = LightType.Mystical;
        break;
        
      case 8: // Celestial Serpent - bright white-blue glow
        color = [0.9, 0.9, 1.0];
        intensity = 1.0;
        radius = 150;
        type = LightType.Mystical;
        break;
        
      case 9: // Ancient Dragon Serpent - fiery orange-red glow
        color = [1.0, 0.4, 0.1];
        intensity = 1.2;
        radius = 180;
        type = LightType.Fire;
        break;
        
      case 10: // Ouroboros - golden mystical glow
        color = [1.0, 0.9, 0.3];
        intensity = 1.5;
        radius = 200;
        type = LightType.Mystical;
        break;
        
      default:
        color = [0.5, 0.5, 0.5];
        intensity = 0.2;
        radius = 50;
        type = LightType.Static;
    }
    
    this.addLight({
      id: lightId,
      position: { ...snakePosition },
      color,
      intensity,
      radius,
      type,
      isActive: true,
      pulseSpeed: 2.0,
      pulseIntensity: 0.3,
      flickerSpeed: 8.0,
      flickerIntensity: 0.2
    });
    
    return lightId;
  }

  public createPowerLight(position: Vector2, powerType: string, duration: number = 2.0): string {
    const lightId = `power_${powerType}_${Date.now()}`;
    
    let color: [number, number, number];
    let intensity: number;
    let radius: number;
    let type: LightType;
    
    switch (powerType) {
      case 'SpeedBoost':
        color = [0.3, 0.8, 1.0];
        intensity = 0.8;
        radius = 100;
        type = LightType.Pulsing;
        break;
        
      case 'VenomStrike':
        color = [0.6, 0.2, 0.8];
        intensity = 1.0;
        radius = 80;
        type = LightType.Flickering;
        break;
        
      case 'FireBreath':
        color = [1.0, 0.3, 0.0];
        intensity = 1.5;
        radius = 150;
        type = LightType.Fire;
        break;
        
      case 'TimeWarp':
        color = [0.8, 0.9, 1.0];
        intensity = 1.2;
        radius = 200;
        type = LightType.Mystical;
        break;
        
      case 'Invisibility':
        color = [1.0, 1.0, 1.0];
        intensity = 0.5;
        radius = 60;
        type = LightType.Flickering;
        break;
        
      default:
        color = [0.8, 0.8, 0.8];
        intensity = 0.6;
        radius = 80;
        type = LightType.Glowing;
    }
    
    this.addLight({
      id: lightId,
      position: { ...position },
      color,
      intensity,
      radius,
      type,
      isActive: true,
      lifetime: duration,
      pulseSpeed: 4.0,
      pulseIntensity: 0.4,
      flickerSpeed: 12.0,
      flickerIntensity: 0.3
    });
    
    return lightId;
  }

  public createEnvironmentalLight(position: Vector2, environmentType: string): string {
    const lightId = `env_${environmentType}_${Date.now()}`;
    
    let color: [number, number, number];
    let intensity: number;
    let radius: number;
    let type: LightType;
    
    switch (environmentType) {
      case 'CrystalFormation':
        color = [0.6, 0.8, 1.0];
        intensity = 0.6;
        radius = 90;
        type = LightType.Glowing;
        break;
        
      case 'FlameGeyser':
        color = [1.0, 0.4, 0.1];
        intensity = 1.0;
        radius = 120;
        type = LightType.Fire;
        break;
        
      case 'MysticalPortal':
        color = [0.8, 0.4, 1.0];
        intensity = 0.8;
        radius = 100;
        type = LightType.Mystical;
        break;
        
      case 'LightningStrike':
        color = [1.0, 1.0, 0.8];
        intensity = 2.0;
        radius = 200;
        type = LightType.Lightning;
        break;
        
      default:
        color = [0.5, 0.5, 0.6];
        intensity = 0.4;
        radius = 70;
        type = LightType.Static;
    }
    
    this.addLight({
      id: lightId,
      position: { ...position },
      color,
      intensity,
      radius,
      type,
      isActive: true,
      lifetime: environmentType === 'LightningStrike' ? 0.2 : -1,
      pulseSpeed: 3.0,
      pulseIntensity: 0.5,
      flickerSpeed: 15.0,
      flickerIntensity: 0.4
    });
    
    return lightId;
  }

  public updateAmbientLighting(evolutionLevel: number, environmentType: string = 'default'): void {
    // Adjust ambient lighting based on snake evolution
    this.ambientLighting.evolutionModifier = Math.min(2.0, 1.0 + (evolutionLevel - 1) * 0.1);
    
    // Adjust for environment
    switch (environmentType) {
      case 'mystical_forest':
        this.ambientLighting.environmentModifier = 0.8;
        this.ambientLighting.baseColor = [0.15, 0.25, 0.2]; // Green tint
        break;
        
      case 'ancient_temple':
        this.ambientLighting.environmentModifier = 0.6;
        this.ambientLighting.baseColor = [0.25, 0.2, 0.15]; // Warm stone
        break;
        
      case 'crystal_cavern':
        this.ambientLighting.environmentModifier = 0.9;
        this.ambientLighting.baseColor = [0.2, 0.25, 0.35]; // Cool blue
        break;
        
      default:
        this.ambientLighting.environmentModifier = 1.0;
        this.ambientLighting.baseColor = [0.2, 0.25, 0.35]; // Default mystical
    }
  }

  public update(deltaTime: number): void {
    const dt = deltaTime / 1000; // Convert to seconds
    this.frameTime += deltaTime;
    
    // Update lights
    for (const [id, light] of this.lights) {
      if (!light.isActive) continue;
      
      // Update lifetime
      if (light.timeAlive !== undefined) {
        light.timeAlive += dt;
      }
      
      // Check if light should expire
      if (light.lifetime !== undefined && light.lifetime > 0 && light.timeAlive !== undefined) {
        if (light.timeAlive >= light.lifetime) {
          light.isActive = false;
          continue;
        }
      }
    }
    
    // Clean up inactive lights
    for (const [lightId, light] of this.lights) {
      if (!light.isActive) {
        this.lights.delete(lightId);
      }
    }
    
    // Performance monitoring
    if (this.frameTime - this.lastPerformanceCheck > this.performanceCheckInterval) {
      this.checkPerformance();
      this.lastPerformanceCheck = this.frameTime;
    }
  }

  private checkPerformance(): void {
    const lightCount = this.lights.size;
    
    // Automatically adjust quality based on light count
    if (lightCount > this.config.maxLights * 0.8 && !this.config.performanceMode) {
      console.warn('High light count detected, enabling performance mode');
      this.config.performanceMode = true;
      this.config.shadowQuality = 'low';
    } else if (lightCount < this.config.maxLights * 0.5 && this.config.performanceMode) {
      console.log('Light count reduced, disabling performance mode');
      this.config.performanceMode = false;
      this.config.shadowQuality = 'medium';
    }
  }

  public render(time: number): void {
    if (!this.lightingShaderProgram || !this.quadVertexBuffer) {
      return;
    }
    
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return;
    }
    
    // Bind lighting framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightingFramebuffer);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // Clear with ambient color
    const ambientIntensity = this.ambientLighting.intensity * 
                            this.ambientLighting.evolutionModifier * 
                            this.ambientLighting.environmentModifier;
    
    gl.clearColor(
      this.ambientLighting.baseColor[0] * ambientIntensity,
      this.ambientLighting.baseColor[1] * ambientIntensity,
      this.ambientLighting.baseColor[2] * ambientIntensity,
      1.0
    );
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Use lighting shader
    gl.useProgram(this.lightingShaderProgram);
    
    // Set uniforms
    const resolutionLocation = gl.getUniformLocation(this.lightingShaderProgram, 'u_resolution');
    const ambientColorLocation = gl.getUniformLocation(this.lightingShaderProgram, 'u_ambientColor');
    const ambientIntensityLocation = gl.getUniformLocation(this.lightingShaderProgram, 'u_ambientIntensity');
    const timeLocation = gl.getUniformLocation(this.lightingShaderProgram, 'u_time');
    const lightCountLocation = gl.getUniformLocation(this.lightingShaderProgram, 'u_lightCount');
    
    gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    gl.uniform3fv(ambientColorLocation, this.ambientLighting.baseColor);
    gl.uniform1f(ambientIntensityLocation, ambientIntensity);
    gl.uniform1f(timeLocation, time / 1000);
    
    // Prepare light data
    const activeLights = Array.from(this.lights.values()).filter(light => light.isActive);
    const lightCount = Math.min(activeLights.length, this.config.maxLights);
    
    gl.uniform1i(lightCountLocation, lightCount);
    
    if (lightCount > 0) {
      // Prepare light arrays
      const positions = new Float32Array(lightCount * 2);
      const colors = new Float32Array(lightCount * 3);
      const intensities = new Float32Array(lightCount);
      const radii = new Float32Array(lightCount);
      const types = new Int32Array(lightCount);
      const flickerSpeeds = new Float32Array(lightCount);
      const flickerIntensities = new Float32Array(lightCount);
      const pulseSpeeds = new Float32Array(lightCount);
      const pulseIntensities = new Float32Array(lightCount);
      
      for (let i = 0; i < lightCount; i++) {
        const light = activeLights[i];
        
        positions[i * 2] = light.position.x;
        positions[i * 2 + 1] = light.position.y;
        
        colors[i * 3] = light.color[0];
        colors[i * 3 + 1] = light.color[1];
        colors[i * 3 + 2] = light.color[2];
        
        intensities[i] = light.intensity;
        radii[i] = light.radius;
        types[i] = this.getLightTypeId(light.type);
        
        flickerSpeeds[i] = light.flickerSpeed || 8.0;
        flickerIntensities[i] = light.flickerIntensity || 0.2;
        pulseSpeeds[i] = light.pulseSpeed || 2.0;
        pulseIntensities[i] = light.pulseIntensity || 0.3;
      }
      
      // Set light uniform arrays
      gl.uniform2fv(gl.getUniformLocation(this.lightingShaderProgram, 'u_lightPositions'), positions);
      gl.uniform3fv(gl.getUniformLocation(this.lightingShaderProgram, 'u_lightColors'), colors);
      gl.uniform1fv(gl.getUniformLocation(this.lightingShaderProgram, 'u_lightIntensities'), intensities);
      gl.uniform1fv(gl.getUniformLocation(this.lightingShaderProgram, 'u_lightRadii'), radii);
      gl.uniform1iv(gl.getUniformLocation(this.lightingShaderProgram, 'u_lightTypes'), types);
      gl.uniform1fv(gl.getUniformLocation(this.lightingShaderProgram, 'u_lightFlickerSpeeds'), flickerSpeeds);
      gl.uniform1fv(gl.getUniformLocation(this.lightingShaderProgram, 'u_lightFlickerIntensities'), flickerIntensities);
      gl.uniform1fv(gl.getUniformLocation(this.lightingShaderProgram, 'u_lightPulseSpeeds'), pulseSpeeds);
      gl.uniform1fv(gl.getUniformLocation(this.lightingShaderProgram, 'u_lightPulseIntensities'), pulseIntensities);
    }
    
    // Bind quad vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVertexBuffer);
    
    const positionLocation = gl.getAttribLocation(this.lightingShaderProgram, 'a_position');
    const texCoordLocation = gl.getAttribLocation(this.lightingShaderProgram, 'a_texCoord');
    
    gl.enableVertexAttribArray(positionLocation);
    gl.enableVertexAttribArray(texCoordLocation);
    
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
    
    // Render fullscreen quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Unbind framebuffer (render to screen)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private getLightTypeId(type: LightType): number {
    switch (type) {
      case LightType.Static: return 0;
      case LightType.Flickering: return 1;
      case LightType.Pulsing: return 2;
      case LightType.Glowing: return 3;
      case LightType.Mystical: return 4;
      case LightType.Fire: return 5;
      case LightType.Lightning: return 6;
      default: return 0;
    }
  }

  public getLightingTexture(): WebGLTexture | null {
    return this.lightingTexture;
  }

  public getPerformanceMetrics(): { lightCount: number; performanceMode: boolean; frameTime: number } {
    return {
      lightCount: this.lights.size,
      performanceMode: this.config.performanceMode,
      frameTime: this.frameTime
    };
  }

  public getActiveLightCount(): number {
    return Array.from(this.lights.values()).filter(light => light.isActive).length;
  }

  public reset(): void {
    // Clear all lights
    this.lights.clear();
    
    // Reset ambient lighting to default
    this.ambientLighting = {
      baseColor: [0.2, 0.2, 0.3],
      intensity: 0.3,
      evolutionModifier: 1.0,
      environmentModifier: 1.0
    };
    
    // Reset frame time
    this.frameTime = 0;
    this.lastPerformanceCheck = 0;
  }

  public dispose(): void {
    const gl = this.gl;

    // Handle test environments where WebGL context might be null
    if (!gl) {
      return;
    }
    
    if (this.lightingShaderProgram) {
      gl.deleteProgram(this.lightingShaderProgram);
    }
    
    if (this.lightingFramebuffer) {
      gl.deleteFramebuffer(this.lightingFramebuffer);
    }
    
    if (this.lightingTexture) {
      gl.deleteTexture(this.lightingTexture);
    }
    
    if (this.quadVertexBuffer) {
      gl.deleteBuffer(this.quadVertexBuffer);
    }
    
    this.lights.clear();
  }
}