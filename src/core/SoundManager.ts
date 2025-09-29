import { PowerType } from './EvolutionSystem';

export enum SoundType {
  // Power activation sounds
  SPEED_BOOST = 'speed_boost',
  VENOM_STRIKE = 'venom_strike',
  CONSTRICT = 'constrict',
  HOOD_EXPANSION = 'hood_expansion',
  AQUATIC_MOVEMENT = 'aquatic_movement',
  COLOR_CHANGE = 'color_change',
  TIME_WARP = 'time_warp',
  FIRE_BREATH = 'fire_breath',
  TAIL_CONSUMPTION = 'tail_consumption',
  
  // Evolution sounds
  EVOLUTION_TRANSFORM = 'evolution_transform',
  EVOLUTION_COMPLETE = 'evolution_complete',
  
  // Food consumption sounds
  FOOD_BASIC = 'food_basic',
  FOOD_SPECIAL = 'food_special',
  FOOD_NEGATIVE = 'food_negative',
  FOOD_COMBINATION = 'food_combination',
  
  // Ambient sounds
  BACKGROUND_MUSIC = 'background_music',
  AMBIENT_MYSTICAL = 'ambient_mystical',
  
  // Game state sounds
  GAME_OVER = 'game_over',
  PAUSE = 'pause',
  RESUME = 'resume'
}

interface AudioClip {
  id: string;
  buffer: AudioBuffer | null;
  volume: number;
  pitch: number;
  loop: boolean;
  category: AudioCategory;
}

enum AudioCategory {
  SFX = 'sfx',
  MUSIC = 'music',
  AMBIENT = 'ambient'
}

interface SpatialAudio {
  position: { x: number; y: number };
  falloffDistance: number;
  volume: number;
}

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private ambientGainNode: GainNode | null = null;
  
  private audioClips: Map<SoundType, AudioClip> = new Map();
  private activeAudioSources: Map<string, AudioBufferSourceNode> = new Map();
  private isInitialized = false;
  private isMuted = false;
  
  // Volume settings
  private masterVolume = 1.0;
  private sfxVolume = 0.8;
  private musicVolume = 0.6;
  private ambientVolume = 0.4;

  constructor() {
    this.initializeAudioContext();
    this.setupAudioClips();
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.setupAudioNodes();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.isInitialized = false;
    }
  }

  private setupAudioNodes(): void {
    if (!this.audioContext) return;

    // Create master gain node
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);
    this.masterGainNode.gain.value = this.masterVolume;

    // Create category-specific gain nodes
    this.sfxGainNode = this.audioContext.createGain();
    this.sfxGainNode.connect(this.masterGainNode);
    this.sfxGainNode.gain.value = this.sfxVolume;

    this.musicGainNode = this.audioContext.createGain();
    this.musicGainNode.connect(this.masterGainNode);
    this.musicGainNode.gain.value = this.musicVolume;

    this.ambientGainNode = this.audioContext.createGain();
    this.ambientGainNode.connect(this.masterGainNode);
    this.ambientGainNode.gain.value = this.ambientVolume;
  }

  private setupAudioClips(): void {
    // Power activation sounds
    this.registerAudioClip(SoundType.SPEED_BOOST, {
      id: 'speed_boost',
      buffer: null,
      volume: 0.7,
      pitch: 1.2,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.VENOM_STRIKE, {
      id: 'venom_strike',
      buffer: null,
      volume: 0.8,
      pitch: 0.9,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.CONSTRICT, {
      id: 'constrict',
      buffer: null,
      volume: 0.6,
      pitch: 0.8,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.HOOD_EXPANSION, {
      id: 'hood_expansion',
      buffer: null,
      volume: 0.9,
      pitch: 1.0,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.AQUATIC_MOVEMENT, {
      id: 'aquatic_movement',
      buffer: null,
      volume: 0.5,
      pitch: 1.1,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.COLOR_CHANGE, {
      id: 'color_change',
      buffer: null,
      volume: 0.4,
      pitch: 1.3,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.TIME_WARP, {
      id: 'time_warp',
      buffer: null,
      volume: 0.8,
      pitch: 0.7,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.FIRE_BREATH, {
      id: 'fire_breath',
      buffer: null,
      volume: 1.0,
      pitch: 0.8,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.TAIL_CONSUMPTION, {
      id: 'tail_consumption',
      buffer: null,
      volume: 0.9,
      pitch: 1.0,
      loop: false,
      category: AudioCategory.SFX
    });

    // Evolution sounds
    this.registerAudioClip(SoundType.EVOLUTION_TRANSFORM, {
      id: 'evolution_transform',
      buffer: null,
      volume: 0.8,
      pitch: 1.0,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.EVOLUTION_COMPLETE, {
      id: 'evolution_complete',
      buffer: null,
      volume: 0.9,
      pitch: 1.1,
      loop: false,
      category: AudioCategory.SFX
    });

    // Food consumption sounds
    this.registerAudioClip(SoundType.FOOD_BASIC, {
      id: 'food_basic',
      buffer: null,
      volume: 0.5,
      pitch: 1.0,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.FOOD_SPECIAL, {
      id: 'food_special',
      buffer: null,
      volume: 0.7,
      pitch: 1.2,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.FOOD_NEGATIVE, {
      id: 'food_negative',
      buffer: null,
      volume: 0.6,
      pitch: 0.8,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.FOOD_COMBINATION, {
      id: 'food_combination',
      buffer: null,
      volume: 0.8,
      pitch: 1.3,
      loop: false,
      category: AudioCategory.SFX
    });

    // Background and ambient sounds
    this.registerAudioClip(SoundType.BACKGROUND_MUSIC, {
      id: 'background_music',
      buffer: null,
      volume: 1.0,
      pitch: 1.0,
      loop: true,
      category: AudioCategory.MUSIC
    });

    this.registerAudioClip(SoundType.AMBIENT_MYSTICAL, {
      id: 'ambient_mystical',
      buffer: null,
      volume: 0.3,
      pitch: 1.0,
      loop: true,
      category: AudioCategory.AMBIENT
    });

    // Game state sounds
    this.registerAudioClip(SoundType.GAME_OVER, {
      id: 'game_over',
      buffer: null,
      volume: 0.8,
      pitch: 0.9,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.PAUSE, {
      id: 'pause',
      buffer: null,
      volume: 0.5,
      pitch: 1.0,
      loop: false,
      category: AudioCategory.SFX
    });

    this.registerAudioClip(SoundType.RESUME, {
      id: 'resume',
      buffer: null,
      volume: 0.5,
      pitch: 1.1,
      loop: false,
      category: AudioCategory.SFX
    });
  }

  private registerAudioClip(soundType: SoundType, clip: AudioClip): void {
    this.audioClips.set(soundType, clip);
  }

  public async loadAudioBuffer(soundType: SoundType, audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext || !this.isInitialized) {
      console.warn('Audio context not initialized');
      return;
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const clip = this.audioClips.get(soundType);
      if (clip) {
        clip.buffer = audioBuffer;
      }
    } catch (error) {
      console.error(`Failed to load audio buffer for ${soundType}:`, error);
    }
  }

  public playSound(soundType: SoundType, options?: { 
    volume?: number; 
    pitch?: number; 
    spatial?: SpatialAudio;
    fadeIn?: number;
  }): string | null {
    if (!this.audioContext || !this.isInitialized || this.isMuted) {
      return null;
    }

    const clip = this.audioClips.get(soundType);
    if (!clip || !clip.buffer) {
      console.warn(`Audio clip not found or not loaded: ${soundType}`);
      return null;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = clip.buffer;
      source.loop = clip.loop;
      
      // Apply pitch modification
      const pitch = options?.pitch ?? clip.pitch;
      source.playbackRate.value = pitch;
      
      // Connect audio nodes
      source.connect(gainNode);
      
      // Connect to appropriate category gain node
      const categoryGainNode = this.getCategoryGainNode(clip.category);
      if (categoryGainNode) {
        gainNode.connect(categoryGainNode);
      }
      
      // Set volume
      const volume = (options?.volume ?? clip.volume) * this.getCategoryVolume(clip.category);
      gainNode.gain.value = volume;
      
      // Apply spatial audio if provided
      if (options?.spatial) {
        this.applySpatialAudio(gainNode, options.spatial);
      }
      
      // Apply fade in if specified
      if (options?.fadeIn) {
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + options.fadeIn);
      }
      
      // Generate unique ID for this audio source
      const sourceId = `${soundType}_${Date.now()}_${Math.random()}`;
      
      // Handle source cleanup
      source.onended = () => {
        this.activeAudioSources.delete(sourceId);
      };
      
      // Store active source
      this.activeAudioSources.set(sourceId, source);
      
      // Start playback
      source.start();
      
      return sourceId;
    } catch (error) {
      console.error(`Failed to play sound ${soundType}:`, error);
      return null;
    }
  }

  public stopSound(sourceId: string): void {
    const source = this.activeAudioSources.get(sourceId);
    if (source) {
      try {
        source.stop();
        this.activeAudioSources.delete(sourceId);
      } catch (error) {
        console.warn(`Failed to stop sound ${sourceId}:`, error);
      }
    }
  }

  public stopAllSounds(): void {
    this.activeAudioSources.forEach((source, sourceId) => {
      try {
        source.stop();
      } catch (error) {
        console.warn(`Failed to stop sound ${sourceId}:`, error);
      }
    });
    this.activeAudioSources.clear();
  }

  public playPowerSound(powerType: PowerType): string | null {
    const soundType = this.getPowerSoundType(powerType);
    return this.playSound(soundType);
  }

  public playEvolutionSound(): string | null {
    return this.playSound(SoundType.EVOLUTION_TRANSFORM);
  }

  public playEvolutionCompleteSound(): string | null {
    return this.playSound(SoundType.EVOLUTION_COMPLETE);
  }

  public playFoodSound(isSpecial: boolean = false, isNegative: boolean = false, isCombination: boolean = false): string | null {
    if (isCombination) {
      return this.playSound(SoundType.FOOD_COMBINATION);
    } else if (isNegative) {
      return this.playSound(SoundType.FOOD_NEGATIVE);
    } else if (isSpecial) {
      return this.playSound(SoundType.FOOD_SPECIAL);
    } else {
      return this.playSound(SoundType.FOOD_BASIC);
    }
  }

  public startBackgroundMusic(): string | null {
    return this.playSound(SoundType.BACKGROUND_MUSIC, { fadeIn: 2.0 });
  }

  public startAmbientSounds(): string | null {
    return this.playSound(SoundType.AMBIENT_MYSTICAL, { fadeIn: 1.0 });
  }

  private getPowerSoundType(powerType: PowerType): SoundType {
    switch (powerType) {
      case PowerType.SpeedBoost:
        return SoundType.SPEED_BOOST;
      case PowerType.VenomStrike:
        return SoundType.VENOM_STRIKE;
      case PowerType.Constrict:
        return SoundType.CONSTRICT;
      case PowerType.HoodExpansion:
        return SoundType.HOOD_EXPANSION;
      case PowerType.AquaticMovement:
        return SoundType.AQUATIC_MOVEMENT;
      case PowerType.ColorChange:
        return SoundType.COLOR_CHANGE;
      case PowerType.TimeWarp:
        return SoundType.TIME_WARP;
      case PowerType.FireBreath:
        return SoundType.FIRE_BREATH;
      case PowerType.TailConsumption:
        return SoundType.TAIL_CONSUMPTION;
      default:
        return SoundType.SPEED_BOOST; // Fallback
    }
  }

  private getCategoryGainNode(category: AudioCategory): GainNode | null {
    switch (category) {
      case AudioCategory.SFX:
        return this.sfxGainNode;
      case AudioCategory.MUSIC:
        return this.musicGainNode;
      case AudioCategory.AMBIENT:
        return this.ambientGainNode;
      default:
        return this.sfxGainNode;
    }
  }

  private getCategoryVolume(category: AudioCategory): number {
    switch (category) {
      case AudioCategory.SFX:
        return this.sfxVolume;
      case AudioCategory.MUSIC:
        return this.musicVolume;
      case AudioCategory.AMBIENT:
        return this.ambientVolume;
      default:
        return this.sfxVolume;
    }
  }

  private applySpatialAudio(gainNode: GainNode, spatial: SpatialAudio): void {
    if (!this.audioContext) return;

    // Create panner node for spatial audio
    const pannerNode = this.audioContext.createPanner();
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse';
    pannerNode.refDistance = 1;
    pannerNode.maxDistance = spatial.falloffDistance;
    pannerNode.rolloffFactor = 1;

    // Set position
    pannerNode.positionX.value = spatial.position.x;
    pannerNode.positionY.value = spatial.position.y;
    pannerNode.positionZ.value = 0;

    // Connect through panner
    gainNode.disconnect();
    gainNode.connect(pannerNode);
    pannerNode.connect(this.getCategoryGainNode(AudioCategory.SFX) || this.masterGainNode!);
  }

  // Volume control methods
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.masterVolume;
    }
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.value = this.sfxVolume;
    }
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGainNode) {
      this.musicGainNode.gain.value = this.musicVolume;
    }
  }

  public setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    if (this.ambientGainNode) {
      this.ambientGainNode.gain.value = this.ambientVolume;
    }
  }

  public mute(): void {
    this.isMuted = true;
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = 0;
    }
  }

  public unmute(): void {
    this.isMuted = false;
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.masterVolume;
    }
  }

  public isMutedState(): boolean {
    return this.isMuted;
  }

  public isAudioSupported(): boolean {
    return this.isInitialized;
  }

  public getActiveSourceCount(): number {
    return this.activeAudioSources.size;
  }

  public dispose(): void {
    this.stopAllSounds();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.audioClips.clear();
    this.activeAudioSources.clear();
    this.isInitialized = false;
  }
}