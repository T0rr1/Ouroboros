import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoundManager, SoundType } from '../core/SoundManager';
import { PowerType } from '../core/EvolutionSystem';
import { FoodType } from '../types/game';

// Mock Web Audio API
const mockAudioContext = {
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    loop: false,
    playbackRate: { value: 1 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null
  })),
  createPanner: vi.fn(() => ({
    panningModel: 'HRTF',
    distanceModel: 'inverse',
    refDistance: 1,
    maxDistance: 100,
    rolloffFactor: 1,
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    connect: vi.fn()
  })),
  decodeAudioData: vi.fn(() => Promise.resolve({})),
  destination: {},
  currentTime: 0,
  state: 'running',
  close: vi.fn()
};

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext)
});

describe('SoundManager Integration', () => {
  let soundManager: SoundManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    soundManager = new SoundManager();
    
    // Load mock audio buffers for all sound types
    const mockArrayBuffer = new ArrayBuffer(1024);
    const mockAudioBuffer = {};
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
    
    // Load all power sounds
    await soundManager.loadAudioBuffer(SoundType.SPEED_BOOST, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.VENOM_STRIKE, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.CONSTRICT, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.HOOD_EXPANSION, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.AQUATIC_MOVEMENT, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.COLOR_CHANGE, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.TIME_WARP, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.FIRE_BREATH, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.TAIL_CONSUMPTION, mockArrayBuffer);
    
    // Load evolution sounds
    await soundManager.loadAudioBuffer(SoundType.EVOLUTION_TRANSFORM, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.EVOLUTION_COMPLETE, mockArrayBuffer);
    
    // Load food sounds
    await soundManager.loadAudioBuffer(SoundType.FOOD_BASIC, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.FOOD_SPECIAL, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.FOOD_NEGATIVE, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.FOOD_COMBINATION, mockArrayBuffer);
    
    // Load background sounds
    await soundManager.loadAudioBuffer(SoundType.BACKGROUND_MUSIC, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.AMBIENT_MYSTICAL, mockArrayBuffer);
    
    // Load game state sounds
    await soundManager.loadAudioBuffer(SoundType.GAME_OVER, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.PAUSE, mockArrayBuffer);
    await soundManager.loadAudioBuffer(SoundType.RESUME, mockArrayBuffer);
  });

  afterEach(() => {
    soundManager.dispose();
  });

  describe('Game Flow Integration', () => {
    it('should handle complete game startup audio sequence', () => {
      // Start background music
      const musicId = soundManager.startBackgroundMusic();
      expect(musicId).toBeTruthy();
      
      // Start ambient sounds
      const ambientId = soundManager.startAmbientSounds();
      expect(ambientId).toBeTruthy();
      
      // Verify both are playing
      expect(soundManager.getActiveSourceCount()).toBe(2);
    });

    it('should handle evolution progression audio sequence', () => {
      // Play evolution transformation sound
      const transformId = soundManager.playEvolutionSound();
      expect(transformId).toBeTruthy();
      
      // Play evolution complete sound
      const completeId = soundManager.playEvolutionCompleteSound();
      expect(completeId).toBeTruthy();
      
      expect(soundManager.getActiveSourceCount()).toBe(2);
    });

    it('should handle power activation sequence for all evolution levels', () => {
      const powerTypes = [
        PowerType.SpeedBoost,
        PowerType.VenomStrike,
        PowerType.Constrict,
        PowerType.HoodExpansion,
        PowerType.AquaticMovement,
        PowerType.ColorChange,
        PowerType.TimeWarp,
        PowerType.FireBreath,
        PowerType.TailConsumption
      ];

      const sourceIds: (string | null)[] = [];
      
      powerTypes.forEach(powerType => {
        const sourceId = soundManager.playPowerSound(powerType);
        sourceIds.push(sourceId);
        expect(sourceId).toBeTruthy();
      });

      expect(soundManager.getActiveSourceCount()).toBe(powerTypes.length);
    });

    it('should handle food consumption patterns', () => {
      // Basic food consumption
      const basicId = soundManager.playFoodSound();
      expect(basicId).toBeTruthy();
      
      // Special food consumption
      const specialId = soundManager.playFoodSound(true);
      expect(specialId).toBeTruthy();
      
      // Negative food consumption
      const negativeId = soundManager.playFoodSound(false, true);
      expect(negativeId).toBeTruthy();
      
      // Food combination bonus
      const comboId = soundManager.playFoodSound(false, false, true);
      expect(comboId).toBeTruthy();
      
      expect(soundManager.getActiveSourceCount()).toBe(4);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle multiple simultaneous sounds without performance degradation', () => {
      const sourceIds: (string | null)[] = [];
      
      // Play 20 simultaneous sounds
      for (let i = 0; i < 20; i++) {
        const sourceId = soundManager.playSound(SoundType.FOOD_BASIC);
        sourceIds.push(sourceId);
      }
      
      // All sounds should be created successfully
      const successfulSounds = sourceIds.filter(id => id !== null);
      expect(successfulSounds.length).toBe(20);
      expect(soundManager.getActiveSourceCount()).toBe(20);
    });

    it('should properly clean up resources when stopping all sounds', () => {
      // Play multiple sounds
      soundManager.playSound(SoundType.SPEED_BOOST);
      soundManager.playSound(SoundType.VENOM_STRIKE);
      soundManager.playSound(SoundType.EVOLUTION_TRANSFORM);
      soundManager.startBackgroundMusic();
      
      expect(soundManager.getActiveSourceCount()).toBeGreaterThan(0);
      
      // Stop all sounds
      soundManager.stopAllSounds();
      expect(soundManager.getActiveSourceCount()).toBe(0);
    });

    it('should handle rapid power activation sequences', () => {
      const powerTypes = [
        PowerType.SpeedBoost,
        PowerType.VenomStrike,
        PowerType.FireBreath
      ];
      
      // Rapidly activate powers
      powerTypes.forEach(powerType => {
        const sourceId = soundManager.playPowerSound(powerType);
        expect(sourceId).toBeTruthy();
      });
      
      expect(soundManager.getActiveSourceCount()).toBe(3);
    });
  });

  describe('Volume and Audio Control Integration', () => {
    it('should maintain proper volume levels across different audio categories', () => {
      // Set different volume levels
      soundManager.setMasterVolume(0.8);
      soundManager.setSfxVolume(0.6);
      soundManager.setMusicVolume(0.4);
      soundManager.setAmbientVolume(0.2);
      
      // Play sounds from different categories
      const sfxId = soundManager.playPowerSound(PowerType.SpeedBoost);
      const musicId = soundManager.startBackgroundMusic();
      const ambientId = soundManager.startAmbientSounds();
      
      expect(sfxId).toBeTruthy();
      expect(musicId).toBeTruthy();
      expect(ambientId).toBeTruthy();
      expect(soundManager.getActiveSourceCount()).toBe(3);
    });

    it('should handle mute/unmute during active gameplay', () => {
      // Start some sounds
      soundManager.playPowerSound(PowerType.SpeedBoost);
      soundManager.startBackgroundMusic();
      
      expect(soundManager.isMutedState()).toBe(false);
      
      // Mute
      soundManager.mute();
      expect(soundManager.isMutedState()).toBe(true);
      
      // Try to play new sound while muted
      const mutedSoundId = soundManager.playSound(SoundType.FOOD_BASIC);
      expect(mutedSoundId).toBeNull();
      
      // Unmute
      soundManager.unmute();
      expect(soundManager.isMutedState()).toBe(false);
      
      // Should be able to play sounds again
      const unmutedSoundId = soundManager.playSound(SoundType.FOOD_BASIC);
      expect(unmutedSoundId).toBeTruthy();
    });
  });

  describe('Spatial Audio Integration', () => {
    it('should handle spatial audio for environmental interactions', () => {
      const spatialOptions = {
        spatial: {
          position: { x: 100, y: 200 },
          falloffDistance: 300,
          volume: 0.8
        }
      };
      
      // Play power sound with spatial audio
      const sourceId = soundManager.playSound(SoundType.FIRE_BREATH, spatialOptions);
      expect(sourceId).toBeTruthy();
      
      // Verify panner node was created
      expect(mockAudioContext.createPanner).toHaveBeenCalled();
    });

    it('should handle multiple spatial audio sources', () => {
      const positions = [
        { x: 50, y: 100 },
        { x: 150, y: 200 },
        { x: 250, y: 300 }
      ];
      
      positions.forEach(position => {
        const sourceId = soundManager.playSound(SoundType.VENOM_STRIKE, {
          spatial: {
            position,
            falloffDistance: 200,
            volume: 0.7
          }
        });
        expect(sourceId).toBeTruthy();
      });
      
      expect(soundManager.getActiveSourceCount()).toBe(3);
      expect(mockAudioContext.createPanner).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should continue functioning after audio context errors', () => {
      // Simulate audio context error
      const originalCreateBufferSource = mockAudioContext.createBufferSource;
      mockAudioContext.createBufferSource = vi.fn(() => {
        throw new Error('Audio context error');
      });
      
      // Try to play sound - should fail gracefully
      const failedSoundId = soundManager.playSound(SoundType.SPEED_BOOST);
      expect(failedSoundId).toBeNull();
      
      // Restore functionality
      mockAudioContext.createBufferSource = originalCreateBufferSource;
      
      // Should work again
      const workingSoundId = soundManager.playSound(SoundType.SPEED_BOOST);
      expect(workingSoundId).toBeTruthy();
    });

    it('should handle graceful degradation when Web Audio API is not supported', () => {
      // Create sound manager without audio support
      const originalAudioContext = window.AudioContext;
      (window as any).AudioContext = undefined;
      (window as any).webkitAudioContext = undefined;
      
      const unsupportedSoundManager = new SoundManager();
      expect(unsupportedSoundManager.isAudioSupported()).toBe(false);
      
      // Should return null for all sound operations
      const soundId = unsupportedSoundManager.playSound(SoundType.SPEED_BOOST);
      expect(soundId).toBeNull();
      
      // Restore
      window.AudioContext = originalAudioContext;
      unsupportedSoundManager.dispose();
    });
  });

  describe('Game State Audio Integration', () => {
    it('should handle pause/resume audio sequence', () => {
      // Start background music
      const musicId = soundManager.startBackgroundMusic();
      expect(musicId).toBeTruthy();
      
      // Play pause sound
      const pauseId = soundManager.playSound(SoundType.PAUSE);
      expect(pauseId).toBeTruthy();
      
      // Play resume sound
      const resumeId = soundManager.playSound(SoundType.RESUME);
      expect(resumeId).toBeTruthy();
      
      expect(soundManager.getActiveSourceCount()).toBe(3);
    });

    it('should handle game over audio sequence', () => {
      // Play game over sound
      const gameOverId = soundManager.playSound(SoundType.GAME_OVER);
      expect(gameOverId).toBeTruthy();
      
      // Stop all other sounds
      soundManager.stopAllSounds();
      expect(soundManager.getActiveSourceCount()).toBe(0);
    });
  });
});