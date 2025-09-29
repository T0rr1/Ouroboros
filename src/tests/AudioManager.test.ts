import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from '../core/AudioManager';
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

describe('AudioManager', () => {
  let audioManager: AudioManager;

  beforeEach(() => {
    vi.clearAllMocks();
    audioManager = new AudioManager();
  });

  afterEach(() => {
    audioManager.dispose();
  });

  describe('Initialization', () => {
    it('should initialize successfully with audio support', async () => {
      expect(audioManager.isAudioSupported()).toBe(true);
      await audioManager.initialize();
      // Should not throw and complete successfully
      expect(audioManager.isAudioSupported()).toBe(true);
    });

    it('should handle initialization without audio support gracefully', async () => {
      // Mock no audio support
      const originalAudioContext = window.AudioContext;
      (window as any).AudioContext = undefined;
      (window as any).webkitAudioContext = undefined;
      
      const unsupportedAudioManager = new AudioManager();
      expect(unsupportedAudioManager.isAudioSupported()).toBe(false);
      
      // Should not throw
      await expect(unsupportedAudioManager.initialize()).resolves.toBeUndefined();
      
      // Restore
      window.AudioContext = originalAudioContext;
      unsupportedAudioManager.dispose();
    });
  });

  describe('Background Audio Management', () => {
    it('should start and stop background audio', () => {
      // Should not throw when starting/stopping background audio
      expect(() => audioManager.startBackgroundAudio()).not.toThrow();
      expect(() => audioManager.stopBackgroundAudio()).not.toThrow();
    });

    it('should not start background audio when muted', () => {
      audioManager.mute();
      audioManager.startBackgroundAudio();
      expect(audioManager.getActiveSourceCount()).toBe(0);
    });
  });

  describe('Power Sound Integration', () => {
    it('should play power activation sounds', () => {
      // Should not throw when playing power sounds
      expect(() => audioManager.playPowerActivation(PowerType.SpeedBoost)).not.toThrow();
      expect(() => audioManager.playPowerActivation(PowerType.VenomStrike)).not.toThrow();
      expect(() => audioManager.playPowerActivation(PowerType.FireBreath)).not.toThrow();
    });

    it('should not play power sounds when muted', () => {
      audioManager.mute();
      const initialCallCount = mockAudioContext.createBufferSource.mock.calls.length;
      
      audioManager.playPowerActivation(PowerType.SpeedBoost);
      
      // Should not have created additional audio sources
      expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe('Evolution Sound Integration', () => {
    it('should play evolution sequence', () => {
      // Should not throw when playing evolution sequence
      expect(() => audioManager.playEvolutionSequence()).not.toThrow();
    });

    it('should not play evolution sounds when muted', () => {
      audioManager.mute();
      const initialCallCount = mockAudioContext.createBufferSource.mock.calls.length;
      
      audioManager.playEvolutionSequence();
      
      expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe('Food Consumption Sounds', () => {
    it('should play basic food consumption sound', () => {
      expect(() => audioManager.playFoodConsumption(FoodType.BasicBerry)).not.toThrow();
    });

    it('should play special food consumption sound', () => {
      expect(() => audioManager.playFoodConsumption(FoodType.CrystalFruit)).not.toThrow();
    });

    it('should play negative food consumption sound', () => {
      expect(() => audioManager.playFoodConsumption(FoodType.BasicBerry, true)).not.toThrow();
    });

    it('should play combination food sound', () => {
      expect(() => audioManager.playFoodConsumption(FoodType.BasicBerry, false, true)).not.toThrow();
    });

    it('should identify special foods correctly', () => {
      // Test special foods
      const specialFoods = [
        FoodType.CrystalFruit,
        FoodType.VenomousFlower,
        FoodType.RainbowNectar,
        FoodType.StardustBerry,
        FoodType.DragonScale,
        FoodType.EternalOrb,
        FoodType.OuroborosEssence
      ];

      specialFoods.forEach(foodType => {
        expect(() => audioManager.playFoodConsumption(foodType)).not.toThrow();
      });

      // Test basic foods
      const basicFoods = [FoodType.BasicBerry, FoodType.WildMushroom, FoodType.AquaticPlant];
      basicFoods.forEach(foodType => {
        expect(() => audioManager.playFoodConsumption(foodType)).not.toThrow();
      });
    });
  });

  describe('Game State Sounds', () => {
    it('should play pause sound', () => {
      expect(() => audioManager.playGamePause()).not.toThrow();
    });

    it('should play resume sound', () => {
      expect(() => audioManager.playGameResume()).not.toThrow();
    });

    it('should play game over sound even when muted', () => {
      audioManager.mute();
      expect(() => audioManager.playGameOver()).not.toThrow();
    });
  });

  describe('Volume Control', () => {
    it('should set master volume', () => {
      audioManager.setMasterVolume(0.5);
      // Volume control is delegated to SoundManager, so we just verify it doesn't throw
    });

    it('should set category volumes', () => {
      audioManager.setSfxVolume(0.7);
      audioManager.setMusicVolume(0.3);
      audioManager.setAmbientVolume(0.2);
      // Volume control is delegated to SoundManager, so we just verify it doesn't throw
    });
  });

  describe('Mute/Unmute Functionality', () => {
    it('should mute and unmute correctly', () => {
      expect(audioManager.isMuted()).toBe(false);
      
      // Mute
      audioManager.mute();
      expect(audioManager.isMuted()).toBe(true);
      
      // Unmute
      audioManager.unmute();
      expect(audioManager.isMuted()).toBe(false);
    });

    it('should prevent sounds when muted except game over', () => {
      audioManager.mute();
      
      // These should not throw but also should not play sounds
      expect(() => audioManager.playPowerActivation(PowerType.SpeedBoost)).not.toThrow();
      expect(() => audioManager.playEvolutionSequence()).not.toThrow();
      expect(() => audioManager.playFoodConsumption(FoodType.BasicBerry)).not.toThrow();
      expect(() => audioManager.playGamePause()).not.toThrow();
      expect(() => audioManager.playGameResume()).not.toThrow();
      
      // Game over should still work
      expect(() => audioManager.playGameOver()).not.toThrow();
    });
  });

  describe('Audio Buffer Management', () => {
    it('should load audio buffers', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      mockAudioContext.decodeAudioData.mockResolvedValue({});
      
      // Should not throw
      await expect(audioManager.loadAudioBuffer(
        'speed_boost' as any, 
        mockArrayBuffer
      )).resolves.toBeUndefined();
      
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources properly', () => {
      audioManager.startBackgroundAudio();
      
      expect(() => audioManager.dispose()).not.toThrow();
      expect(audioManager.getActiveSourceCount()).toBe(0);
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });
});