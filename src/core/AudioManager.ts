import { SoundManager, SoundType } from './SoundManager';
import { PowerType } from './EvolutionSystem';
import { FoodType } from '../types/game';

/**
 * AudioManager - High-level interface for game audio management
 * Provides convenient methods for common game audio scenarios
 */
export class AudioManager {
  private soundManager: SoundManager;
  private backgroundMusicId: string | null = null;
  private ambientSoundId: string | null = null;
  private isGameMuted = false;

  constructor() {
    this.soundManager = new SoundManager();
  }

  /**
   * Initialize the audio system and start background audio
   */
  public async initialize(): Promise<void> {
    if (!this.soundManager.isAudioSupported()) {
      console.warn('Audio not supported, running in silent mode');
      return;
    }

    // In a real implementation, you would load actual audio files here
    // For now, we'll just start the background audio (which will be silent until buffers are loaded)
    this.startBackgroundAudio();
  }

  /**
   * Start background music and ambient sounds
   */
  public startBackgroundAudio(): void {
    if (this.isGameMuted) return;

    this.backgroundMusicId = this.soundManager.startBackgroundMusic();
    this.ambientSoundId = this.soundManager.startAmbientSounds();
  }

  /**
   * Stop background audio
   */
  public stopBackgroundAudio(): void {
    if (this.backgroundMusicId) {
      this.soundManager.stopSound(this.backgroundMusicId);
      this.backgroundMusicId = null;
    }
    if (this.ambientSoundId) {
      this.soundManager.stopSound(this.ambientSoundId);
      this.ambientSoundId = null;
    }
  }

  /**
   * Play power activation sound
   */
  public playPowerActivation(powerType: PowerType): void {
    if (this.isGameMuted) return;
    this.soundManager.playPowerSound(powerType);
  }

  /**
   * Play evolution transformation sequence
   */
  public playEvolutionSequence(): void {
    if (this.isGameMuted) return;
    
    // Play transformation sound first
    this.soundManager.playEvolutionSound();
    
    // Play completion sound after a delay (in a real implementation, this would be timed with the visual effect)
    setTimeout(() => {
      this.soundManager.playEvolutionCompleteSound();
    }, 1500);
  }

  /**
   * Play food consumption sound based on food properties
   */
  public playFoodConsumption(foodType: FoodType, isWrongLevel: boolean = false, isCombination: boolean = false): void {
    if (this.isGameMuted) return;

    const isSpecial = this.isSpecialFood(foodType);
    this.soundManager.playFoodSound(isSpecial, isWrongLevel, isCombination);
  }

  /**
   * Play game state sounds
   */
  public playGamePause(): void {
    if (this.isGameMuted) return;
    this.soundManager.playSound(SoundType.PAUSE);
  }

  public playGameResume(): void {
    if (this.isGameMuted) return;
    this.soundManager.playSound(SoundType.RESUME);
  }

  public playGameOver(): void {
    // Always play game over sound, even if muted
    this.soundManager.playSound(SoundType.GAME_OVER);
  }

  /**
   * Volume control methods
   */
  public setMasterVolume(volume: number): void {
    this.soundManager.setMasterVolume(volume);
  }

  public setSfxVolume(volume: number): void {
    this.soundManager.setSfxVolume(volume);
  }

  public setMusicVolume(volume: number): void {
    this.soundManager.setMusicVolume(volume);
  }

  public setAmbientVolume(volume: number): void {
    this.soundManager.setAmbientVolume(volume);
  }

  /**
   * Mute/unmute functionality
   */
  public mute(): void {
    this.isGameMuted = true;
    this.soundManager.mute();
    this.stopBackgroundAudio();
  }

  public unmute(): void {
    this.isGameMuted = false;
    this.soundManager.unmute();
    this.startBackgroundAudio();
  }

  public isMuted(): boolean {
    return this.isGameMuted;
  }

  /**
   * Load audio buffer for a specific sound type
   */
  public async loadAudioBuffer(soundType: SoundType, audioData: ArrayBuffer): Promise<void> {
    await this.soundManager.loadAudioBuffer(soundType, audioData);
  }

  /**
   * Get audio system status
   */
  public isAudioSupported(): boolean {
    return this.soundManager.isAudioSupported();
  }

  public getActiveSourceCount(): number {
    return this.soundManager.getActiveSourceCount();
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stopBackgroundAudio();
    this.soundManager.dispose();
  }

  /**
   * Helper method to determine if a food type is special
   */
  private isSpecialFood(foodType: FoodType): boolean {
    const specialFoods = [
      FoodType.CrystalFruit,
      FoodType.VenomousFlower,
      FoodType.RainbowNectar,
      FoodType.StardustBerry,
      FoodType.DragonScale,
      FoodType.EternalOrb,
      FoodType.OuroborosEssence
    ];
    return specialFoods.includes(foodType);
  }
}

// Export a factory function for creating AudioManager instances
export function createAudioManager(): AudioManager {
  return new AudioManager();
}