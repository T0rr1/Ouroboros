export interface AssetManifest {
  textures: { [key: string]: string };
  audio: { [key: string]: string };
  fonts: { [key: string]: string };
}

export interface LoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentAsset: string;
  phase: 'textures' | 'audio' | 'fonts' | 'complete';
}

export interface AssetLoadResult<T> {
  success: boolean;
  asset?: T;
  error?: string;
  fallbackUsed: boolean;
}

export class AssetLoader {
  private loadedTextures = new Map<string, HTMLImageElement>();
  private loadedAudio = new Map<string, AudioBuffer>();
  private loadedFonts = new Set<string>();
  private audioContext: AudioContext | null = null;
  
  private onProgress?: (progress: LoadingProgress) => void;
  private onError?: (error: string) => void;
  
  constructor(audioContext?: AudioContext) {
    this.audioContext = audioContext || null;
  }
  
  public setProgressCallback(callback: (progress: LoadingProgress) => void): void {
    this.onProgress = callback;
  }
  
  public setErrorCallback(callback: (error: string) => void): void {
    this.onError = callback;
  }
  
  public async loadAssets(manifest: AssetManifest): Promise<boolean> {
    const totalAssets = Object.keys(manifest.textures).length + 
                       Object.keys(manifest.audio).length + 
                       Object.keys(manifest.fonts).length;
    
    let loadedCount = 0;
    
    const updateProgress = (currentAsset: string, phase: LoadingProgress['phase']) => {
      if (this.onProgress) {
        this.onProgress({
          loaded: loadedCount,
          total: totalAssets,
          percentage: (loadedCount / totalAssets) * 100,
          currentAsset,
          phase
        });
      }
    };
    
    try {
      // Load textures first (highest priority)
      updateProgress('Loading textures...', 'textures');
      for (const [key, url] of Object.entries(manifest.textures)) {
        const result = await this.loadTexture(key, url);
        if (!result.success && this.onError) {
          this.onError(`Failed to load texture ${key}: ${result.error}`);
        }
        loadedCount++;
        updateProgress(key, 'textures');
      }
      
      // Load fonts (medium priority)
      updateProgress('Loading fonts...', 'fonts');
      for (const [key, url] of Object.entries(manifest.fonts)) {
        const result = await this.loadFont(key, url);
        if (!result.success && this.onError) {
          this.onError(`Failed to load font ${key}: ${result.error}`);
        }
        loadedCount++;
        updateProgress(key, 'fonts');
      }
      
      // Load audio last (lowest priority, can be skipped)
      updateProgress('Loading audio...', 'audio');
      for (const [key, url] of Object.entries(manifest.audio)) {
        const result = await this.loadAudio(key, url);
        if (!result.success && this.onError) {
          this.onError(`Failed to load audio ${key}: ${result.error}`);
        }
        loadedCount++;
        updateProgress(key, 'audio');
      }
      
      updateProgress('Complete', 'complete');
      return true;
    } catch (error) {
      if (this.onError) {
        this.onError(`Asset loading failed: ${error}`);
      }
      return false;
    }
  }
  
  private async loadTexture(key: string, url: string): Promise<AssetLoadResult<HTMLImageElement>> {
    return new Promise((resolve) => {
      const img = new Image();
      let fallbackUsed = false;
      
      const onLoad = () => {
        this.loadedTextures.set(key, img);
        resolve({ success: true, asset: img, fallbackUsed });
      };
      
      const onError = () => {
        // Try fallback - create a colored canvas
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Create a simple colored square as fallback
          ctx.fillStyle = this.getFallbackColor(key);
          ctx.fillRect(0, 0, 64, 64);
          
          // Convert canvas to image
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            this.loadedTextures.set(key, fallbackImg);
            fallbackUsed = true;
            resolve({ success: true, asset: fallbackImg, fallbackUsed });
          };
          fallbackImg.src = canvas.toDataURL();
        } else {
          resolve({ 
            success: false, 
            error: `Failed to load texture and create fallback: ${url}`,
            fallbackUsed: false
          });
        }
      };
      
      img.onload = onLoad;
      img.onerror = onError;
      img.crossOrigin = 'anonymous';
      
      // Set a timeout for loading
      setTimeout(() => {
        if (!img.complete) {
          img.onload = null;
          img.onerror = null;
          onError();
        }
      }, 10000); // 10 second timeout
      
      img.src = url;
    });
  }
  
  private getFallbackColor(key: string): string {
    // Generate a consistent color based on the key
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash + key.charCodeAt(i)) & 0xffffffff;
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
  
  private async loadAudio(key: string, url: string): Promise<AssetLoadResult<AudioBuffer>> {
    if (!this.audioContext) {
      return { 
        success: false, 
        error: 'No audio context available',
        fallbackUsed: false
      };
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.loadedAudio.set(key, audioBuffer);
      return { success: true, asset: audioBuffer, fallbackUsed: false };
    } catch (error) {
      // Create silent fallback audio buffer
      try {
        const fallbackBuffer = this.audioContext.createBuffer(1, 44100, 44100); // 1 second of silence
        this.loadedAudio.set(key, fallbackBuffer);
        return { 
          success: true, 
          asset: fallbackBuffer, 
          fallbackUsed: true
        };
      } catch (fallbackError) {
        return { 
          success: false, 
          error: `Failed to load audio and create fallback: ${error}`,
          fallbackUsed: false
        };
      }
    }
  }
  
  private async loadFont(key: string, url: string): Promise<AssetLoadResult<void>> {
    try {
      const font = new FontFace(key, `url(${url})`);
      await font.load();
      document.fonts.add(font);
      this.loadedFonts.add(key);
      return { success: true, fallbackUsed: false };
    } catch (error) {
      // Font loading failed, but we can continue with system fonts
      this.loadedFonts.add(key); // Mark as "loaded" to prevent retries
      return { 
        success: true, // Don't fail the entire loading process for fonts
        error: `Font loading failed, using fallback: ${error}`,
        fallbackUsed: true
      };
    }
  }
  
  public getTexture(key: string): HTMLImageElement | null {
    return this.loadedTextures.get(key) || null;
  }
  
  public getAudio(key: string): AudioBuffer | null {
    return this.loadedAudio.get(key) || null;
  }
  
  public hasFont(key: string): boolean {
    return this.loadedFonts.has(key);
  }
  
  public preloadCriticalAssets(manifest: Partial<AssetManifest>): Promise<boolean> {
    // Load only the most critical assets first
    const criticalManifest: AssetManifest = {
      textures: {},
      audio: {},
      fonts: {}
    };
    
    // Define critical assets (these should be the minimum needed to start the game)
    const criticalTextureKeys = ['snake-head', 'snake-body', 'food-basic'];
    const criticalAudioKeys = ['eat-sound'];
    const criticalFontKeys = ['game-font'];
    
    if (manifest.textures) {
      for (const key of criticalTextureKeys) {
        if (manifest.textures[key]) {
          criticalManifest.textures[key] = manifest.textures[key];
        }
      }
    }
    
    if (manifest.audio) {
      for (const key of criticalAudioKeys) {
        if (manifest.audio[key]) {
          criticalManifest.audio[key] = manifest.audio[key];
        }
      }
    }
    
    if (manifest.fonts) {
      for (const key of criticalFontKeys) {
        if (manifest.fonts[key]) {
          criticalManifest.fonts[key] = manifest.fonts[key];
        }
      }
    }
    
    return this.loadAssets(criticalManifest);
  }
  
  public loadRemainingAssets(manifest: AssetManifest): Promise<boolean> {
    // Load assets that weren't loaded in the critical phase
    const remainingManifest: AssetManifest = {
      textures: {},
      audio: {},
      fonts: {}
    };
    
    // Add assets that haven't been loaded yet
    for (const [key, url] of Object.entries(manifest.textures)) {
      if (!this.loadedTextures.has(key)) {
        remainingManifest.textures[key] = url;
      }
    }
    
    for (const [key, url] of Object.entries(manifest.audio)) {
      if (!this.loadedAudio.has(key)) {
        remainingManifest.audio[key] = url;
      }
    }
    
    for (const [key, url] of Object.entries(manifest.fonts)) {
      if (!this.loadedFonts.has(key)) {
        remainingManifest.fonts[key] = url;
      }
    }
    
    return this.loadAssets(remainingManifest);
  }
  
  public getLoadedAssetCount(): { textures: number; audio: number; fonts: number } {
    return {
      textures: this.loadedTextures.size,
      audio: this.loadedAudio.size,
      fonts: this.loadedFonts.size
    };
  }
  
  public cleanup(): void {
    this.loadedTextures.clear();
    this.loadedAudio.clear();
    this.loadedFonts.clear();
  }
}