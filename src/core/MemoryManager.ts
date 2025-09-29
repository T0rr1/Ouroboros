export interface MemoryPool<T> {
  acquire(): T;
  release(item: T): void;
  clear(): void;
  size(): number;
  activeCount(): number;
}

export class ObjectPool<T> implements MemoryPool<T> {
  private pool: T[] = [];
  private active = new Set<T>();
  private createFn: () => T;
  private resetFn?: (item: T) => void;
  private maxSize: number;
  
  constructor(createFn: () => T, resetFn?: (item: T) => void, maxSize = 1000) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }
  
  public acquire(): T {
    let item: T;
    
    if (this.pool.length > 0) {
      item = this.pool.pop()!;
    } else {
      item = this.createFn();
    }
    
    this.active.add(item);
    return item;
  }
  
  public release(item: T): void {
    if (!this.active.has(item)) {
      return;
    }
    
    this.active.delete(item);
    
    if (this.resetFn) {
      this.resetFn(item);
    }
    
    if (this.pool.length < this.maxSize) {
      this.pool.push(item);
    }
  }
  
  public clear(): void {
    this.pool = [];
    this.active.clear();
  }
  
  public size(): number {
    return this.pool.length;
  }
  
  public activeCount(): number {
    return this.active.size;
  }
  
  public preAllocate(count: number): void {
    for (let i = 0; i < count && this.pool.length < this.maxSize; i++) {
      this.pool.push(this.createFn());
    }
  }
}

export interface TextureInfo {
  id: string;
  texture: WebGLTexture;
  width: number;
  height: number;
  lastUsed: number;
  referenceCount: number;
}

export class TextureManager {
  private textures = new Map<string, TextureInfo>();
  private gl: WebGLRenderingContext;
  private maxTextureMemory: number;
  private currentMemoryUsage = 0;
  private readonly BYTES_PER_PIXEL = 4; // RGBA
  
  constructor(gl: WebGLRenderingContext, maxMemoryMB = 256) {
    this.gl = gl;
    this.maxTextureMemory = maxMemoryMB * 1024 * 1024; // Convert to bytes
  }
  
  public loadTexture(id: string, image: HTMLImageElement | HTMLCanvasElement): WebGLTexture | null {
    try {
      // Check if texture already exists
      const existing = this.textures.get(id);
      if (existing) {
        existing.referenceCount++;
        existing.lastUsed = Date.now();
        return existing.texture;
      }
      
      const texture = this.gl.createTexture();
      if (!texture) {
        console.error('Failed to create WebGL texture');
        return null;
      }
      
      const memoryRequired = image.width * image.height * this.BYTES_PER_PIXEL;
      
      // Check memory limits and cleanup if necessary
      if (this.currentMemoryUsage + memoryRequired > this.maxTextureMemory) {
        this.cleanupUnusedTextures();
        
        if (this.currentMemoryUsage + memoryRequired > this.maxTextureMemory) {
          console.warn('Texture memory limit exceeded, cannot load texture:', id);
          this.gl.deleteTexture(texture);
          return null;
        }
      }
      
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
      
      // Set texture parameters
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      
      const textureInfo: TextureInfo = {
        id,
        texture,
        width: image.width,
        height: image.height,
        lastUsed: Date.now(),
        referenceCount: 1
      };
      
      this.textures.set(id, textureInfo);
      this.currentMemoryUsage += memoryRequired;
      
      return texture;
    } catch (error) {
      console.error('Error loading texture:', id, error);
      return null;
    }
  }
  
  public getTexture(id: string): WebGLTexture | null {
    const textureInfo = this.textures.get(id);
    if (textureInfo) {
      textureInfo.lastUsed = Date.now();
      textureInfo.referenceCount++;
      return textureInfo.texture;
    }
    return null;
  }
  
  public releaseTexture(id: string): void {
    const textureInfo = this.textures.get(id);
    if (textureInfo) {
      textureInfo.referenceCount = Math.max(0, textureInfo.referenceCount - 1);
    }
  }
  
  private cleanupUnusedTextures(): void {
    const now = Date.now();
    const UNUSED_THRESHOLD = 30000; // 30 seconds
    
    for (const [id, textureInfo] of this.textures.entries()) {
      if (textureInfo.referenceCount === 0 && 
          now - textureInfo.lastUsed > UNUSED_THRESHOLD) {
        this.deleteTexture(id);
      }
    }
  }
  
  public deleteTexture(id: string): void {
    const textureInfo = this.textures.get(id);
    if (textureInfo) {
      this.gl.deleteTexture(textureInfo.texture);
      const memoryFreed = textureInfo.width * textureInfo.height * this.BYTES_PER_PIXEL;
      this.currentMemoryUsage -= memoryFreed;
      this.textures.delete(id);
    }
  }
  
  public getMemoryUsage(): number {
    return this.currentMemoryUsage;
  }
  
  public getTextureCount(): number {
    return this.textures.size;
  }
  
  public cleanup(): void {
    for (const [id] of this.textures) {
      this.deleteTexture(id);
    }
    this.textures.clear();
    this.currentMemoryUsage = 0;
  }
  
  public forceCleanup(): void {
    // Force cleanup of all unreferenced textures
    for (const [id, textureInfo] of this.textures.entries()) {
      if (textureInfo.referenceCount === 0) {
        this.deleteTexture(id);
      }
    }
  }
}

export class MemoryManager {
  private textureManager: TextureManager;
  private particlePools = new Map<string, ObjectPool<any>>();
  private audioBufferCache = new Map<string, AudioBuffer>();
  private maxAudioCacheSize = 50;
  
  constructor(gl: WebGLRenderingContext) {
    this.textureManager = new TextureManager(gl);
  }
  
  public getTextureManager(): TextureManager {
    return this.textureManager;
  }
  
  public createParticlePool<T>(
    name: string, 
    createFn: () => T, 
    resetFn?: (item: T) => void, 
    maxSize = 1000
  ): ObjectPool<T> {
    const pool = new ObjectPool(createFn, resetFn, maxSize);
    this.particlePools.set(name, pool);
    return pool;
  }
  
  public getParticlePool<T>(name: string): ObjectPool<T> | null {
    return this.particlePools.get(name) || null;
  }
  
  public cacheAudioBuffer(id: string, buffer: AudioBuffer): void {
    if (this.audioBufferCache.size >= this.maxAudioCacheSize) {
      // Remove oldest entry
      const firstKey = this.audioBufferCache.keys().next().value;
      this.audioBufferCache.delete(firstKey);
    }
    this.audioBufferCache.set(id, buffer);
  }
  
  public getAudioBuffer(id: string): AudioBuffer | null {
    return this.audioBufferCache.get(id) || null;
  }
  
  public getMemoryStats(): {
    textureMemory: number;
    textureCount: number;
    particlePoolCount: number;
    audioBufferCount: number;
  } {
    return {
      textureMemory: this.textureManager.getMemoryUsage(),
      textureCount: this.textureManager.getTextureCount(),
      particlePoolCount: this.particlePools.size,
      audioBufferCount: this.audioBufferCache.size
    };
  }
  
  public cleanup(): void {
    this.textureManager.cleanup();
    this.particlePools.forEach(pool => pool.clear());
    this.particlePools.clear();
    this.audioBufferCache.clear();
  }
  
  public performGarbageCollection(): void {
    this.textureManager.forceCleanup();
    
    // Clean up unused particle pools
    this.particlePools.forEach((pool, name) => {
      if (pool.activeCount() === 0 && pool.size() > 100) {
        pool.clear();
      }
    });
    
    // Trigger browser garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }
  
  public dispose(): void {
    this.cleanup();
  }
}