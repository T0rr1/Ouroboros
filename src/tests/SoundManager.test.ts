import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoundManager, SoundType } from '../core/SoundManager';
import { PowerType } from '../core/EvolutionSystem';

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

// Mock global AudioContext
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext)
});

describe('SoundManager', () => {
  let soundManager: SoundManager;

  beforeEach(() => {
    vi.clearAllMocks();
    soundManager = new SoundManager();
  });

  afterEach(() => {
    soundManager.dispose();
  });

  describe('Initialization', () => {
    it('should initialize audio context successfully', () => {
      expect(soundManager.isAudioSupported()).toBe(true);
    });

    it('should create master gain node and category gain nodes', () => {
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(4); // master + 3 categories
    });

    it('should handle audio context initialization failure gracefully', () => {
      // Mock AudioContext constructor to throw
      const originalAudioContext = window.AudioContext;
      (window as any).AudioContext = vi.fn(() => {
        throw new Error('Audio context not supported');
      });

      const failingSoundManager = new SoundManager();
      expect(failingSoundManager.isAudioSupported()).toBe(false);

      // Restore original
      window.AudioContext = originalAudioContext;
      failingSoundManager.dispose();
    });
  });

  describe('Audio Loading', () => {
    it('should load audio buffer successfully', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockAudioBuffer = {};
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);

      await soundManager.loadAudioBuffer(SoundType.SPEED_BOOST, mockArrayBuffer);

      expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
    });

    it('should handle audio loading failure gracefully', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode failed'));

      // Should not throw
      await expect(soundManager.loadAudioBuffer(SoundType.SPEED_BOOST, mockArrayBuffer))
        .resolves.toBeUndefined();
    });
  });

  describe('Sound Playback', () => {
    beforeEach(async () => {
      // Load a mock audio buffer
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockAudioBuffer = {};
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
      await soundManager.loadAudioBuffer(SoundType.SPEED_BOOST, mockArrayBuffer);
    });

    it('should play sound successfully', () => {
      const sourceId = soundManager.playSound(SoundType.SPEED_BOOST);

      expect(sourceId).toBeTruthy();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should apply custom volume and pitch options', () => {
      const mockSource = {
        buffer: null,
        loop: false,
        playbackRate: { value: 1 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null
      };
      mockAudioContext.createBufferSource.mockReturnValue(mockSource);

      soundManager.playSound(SoundType.SPEED_BOOST, {
        volume: 0.5,
        pitch: 1.5
      });

      expect(mockSource.playbackRate.value).toBe(1.5);
    });

    it('should handle spatial audio options', () => {
      const mockPanner = {
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 100,
        rolloffFactor: 1,
        positionX: { value: 0 },
        positionY: { value: 0 },
        positionZ: { value: 0 },
        connect: vi.fn()
      };
      mockAudioContext.createPanner.mockReturnValue(mockPanner);

      soundManager.playSound(SoundType.SPEED_BOOST, {
        spatial: {
          position: { x: 10, y: 20 },
          falloffDistance: 50,
          volume: 0.8
        }
      });

      expect(mockAudioContext.createPanner).toHaveBeenCalled();
      expect(mockPanner.positionX.value).toBe(10);
      expect(mockPanner.positionY.value).toBe(20);
    });

    it('should return null when audio clip not found', () => {
      const sourceId = soundManager.playSound(SoundType.VENOM_STRIKE); // Not loaded
      expect(sourceId).toBeNull();
    });

    it('should return null when muted', () => {
      soundManager.mute();
      const sourceId = soundManager.playSound(SoundType.SPEED_BOOST);
      expect(sourceId).toBeNull();
    });
  });

  describe('Power Sound Integration', () => {
    beforeEach(async () => {
      // Load mock audio buffers for power sounds
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockAudioBuffer = {};
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
      
      await soundManager.loadAudioBuffer(SoundType.SPEED_BOOST, mockArrayBuffer);
      await soundManager.loadAudioBuffer(SoundType.VENOM_STRIKE, mockArrayBuffer);
      await soundManager.loadAudioBuffer(SoundType.FIRE_BREATH, mockArrayBuffer);
    });

    it('should play correct sound for each power type', () => {
      const speedBoostId = soundManager.playPowerSound(PowerType.SpeedBoost);
      const venomStrikeId = soundManager.playPowerSound(PowerType.VenomStrike);
      const fireBreathId = soundManager.playPowerSound(PowerType.FireBreath);

      expect(speedBoostId).toBeTruthy();
      expect(venomStrikeId).toBeTruthy();
      expect(fireBreathId).toBeTruthy();
    });

    it('should handle unknown power types gracefully', () => {
      const sourceId = soundManager.playPowerSound('UNKNOWN_POWER' as PowerType);
      expect(sourceId).toBeTruthy(); // Should fallback to speed boost
    });
  });

  describe('Evolution Sounds', () => {
    beforeEach(async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockAudioBuffer = {};
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
      
      await soundManager.loadAudioBuffer(SoundType.EVOLUTION_TRANSFORM, mockArrayBuffer);
      await soundManager.loadAudioBuffer(SoundType.EVOLUTION_COMPLETE, mockArrayBuffer);
    });

    it('should play evolution transformation sound', () => {
      const sourceId = soundManager.playEvolutionSound();
      expect(sourceId).toBeTruthy();
    });

    it('should play evolution complete sound', () => {
      const sourceId = soundManager.playEvolutionCompleteSound();
      expect(sourceId).toBeTruthy();
    });
  });

  describe('Food Consumption Sounds', () => {
    beforeEach(async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockAudioBuffer = {};
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
      
      await soundManager.loadAudioBuffer(SoundType.FOOD_BASIC, mockArrayBuffer);
      await soundManager.loadAudioBuffer(SoundType.FOOD_SPECIAL, mockArrayBuffer);
      await soundManager.loadAudioBuffer(SoundType.FOOD_NEGATIVE, mockArrayBuffer);
      await soundManager.loadAudioBuffer(SoundType.FOOD_COMBINATION, mockArrayBuffer);
    });

    it('should play basic food sound by default', () => {
      const sourceId = soundManager.playFoodSound();
      expect(sourceId).toBeTruthy();
    });

    it('should play special food sound when specified', () => {
      const sourceId = soundManager.playFoodSound(true);
      expect(sourceId).toBeTruthy();
    });

    it('should play negative food sound when specified', () => {
      const sourceId = soundManager.playFoodSound(false, true);
      expect(sourceId).toBeTruthy();
    });

    it('should play combination sound when specified', () => {
      const sourceId = soundManager.playFoodSound(false, false, true);
      expect(sourceId).toBeTruthy();
    });

    it('should prioritize combination sound over other flags', () => {
      const sourceId = soundManager.playFoodSound(true, true, true);
      expect(sourceId).toBeTruthy();
    });
  });

  describe('Background Music and Ambient Sounds', () => {
    beforeEach(async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockAudioBuffer = {};
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
      
      await soundManager.loadAudioBuffer(SoundType.BACKGROUND_MUSIC, mockArrayBuffer);
      await soundManager.loadAudioBuffer(SoundType.AMBIENT_MYSTICAL, mockArrayBuffer);
    });

    it('should start background music with fade in', () => {
      const sourceId = soundManager.startBackgroundMusic();
      expect(sourceId).toBeTruthy();
    });

    it('should start ambient sounds with fade in', () => {
      const sourceId = soundManager.startAmbientSounds();
      expect(sourceId).toBeTruthy();
    });
  });

  describe('Sound Control', () => {
    let sourceId: string;

    beforeEach(async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockAudioBuffer = {};
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
      await soundManager.loadAudioBuffer(SoundType.SPEED_BOOST, mockArrayBuffer);
      
      sourceId = soundManager.playSound(SoundType.SPEED_BOOST)!;
    });

    it('should stop individual sound', () => {
      expect(soundManager.getActiveSourceCount()).toBe(1);
      soundManager.stopSound(sourceId);
      expect(soundManager.getActiveSourceCount()).toBe(0);
    });

    it('should stop all sounds', () => {
      // Play multiple sounds
      soundManager.playSound(SoundType.SPEED_BOOST);
      soundManager.playSound(SoundType.SPEED_BOOST);
      
      expect(soundManager.getActiveSourceCount()).toBeGreaterThan(0);
      soundManager.stopAllSounds();
      expect(soundManager.getActiveSourceCount()).toBe(0);
    });

    it('should handle stopping non-existent sound gracefully', () => {
      soundManager.stopSound('non-existent-id');
      // Should not throw
    });
  });

  describe('Volume Control', () => {
    it('should set master volume', () => {
      soundManager.setMasterVolume(0.5);
      // Volume should be clamped between 0 and 1
      soundManager.setMasterVolume(1.5);
      soundManager.setMasterVolume(-0.5);
    });

    it('should set category volumes', () => {
      soundManager.setSfxVolume(0.7);
      soundManager.setMusicVolume(0.3);
      soundManager.setAmbientVolume(0.2);
    });

    it('should mute and unmute', () => {
      expect(soundManager.isMutedState()).toBe(false);
      
      soundManager.mute();
      expect(soundManager.isMutedState()).toBe(true);
      
      soundManager.unmute();
      expect(soundManager.isMutedState()).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources properly', () => {
      soundManager.dispose();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(soundManager.getActiveSourceCount()).toBe(0);
      expect(soundManager.isAudioSupported()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle playback errors gracefully', () => {
      const mockSource = {
        buffer: null,
        loop: false,
        playbackRate: { value: 1 },
        connect: vi.fn(),
        start: vi.fn(() => { throw new Error('Playback failed'); }),
        stop: vi.fn(),
        onended: null
      };
      mockAudioContext.createBufferSource.mockReturnValue(mockSource);

      const sourceId = soundManager.playSound(SoundType.SPEED_BOOST);
      expect(sourceId).toBeNull();
    });

    it('should handle stop errors gracefully', () => {
      const mockSource = {
        buffer: null,
        loop: false,
        playbackRate: { value: 1 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(() => { throw new Error('Stop failed'); }),
        onended: null
      };
      mockAudioContext.createBufferSource.mockReturnValue(mockSource);

      const sourceId = soundManager.playSound(SoundType.SPEED_BOOST);
      if (sourceId) {
        // Should not throw
        soundManager.stopSound(sourceId);
      }
    });
  });
});