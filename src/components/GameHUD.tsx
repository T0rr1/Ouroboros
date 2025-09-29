import React from 'react';
import { GameState, ScoreState } from '../types/game';
import { PowerType } from '../core/EvolutionSystem';
import { PowerVisualState } from '../core/PowerSystem';

interface GameHUDProps {
  gameState: GameState;
  evolutionLevel?: number;
  scoreState?: ScoreState;
  powerState?: PowerVisualState;
  onPowerActivate?: (powerType: PowerType) => void;
}

const getPowerDisplayName = (powerType: PowerType): string => {
  const names: Record<PowerType, string> = {
    [PowerType.SpeedBoost]: 'Speed Boost',
    [PowerType.VenomStrike]: 'Venom Strike',
    [PowerType.Constrict]: 'Constrict',
    [PowerType.HoodExpansion]: 'Hood Expansion',
    [PowerType.AquaticMovement]: 'Aquatic Movement',
    [PowerType.ColorChange]: 'Color Change',
    [PowerType.TimeWarp]: 'Time Warp',
    [PowerType.FireBreath]: 'Fire Breath',
    [PowerType.TailConsumption]: 'Tail Consumption',
    [PowerType.PowerCycling]: 'Power Cycling',
    [PowerType.RealityManipulation]: 'Reality Manipulation'
  };
  return names[powerType] || powerType;
};

const getPowerHotkey = (powerType: PowerType): string => {
  const hotkeys: Record<PowerType, string> = {
    [PowerType.SpeedBoost]: 'Q',
    [PowerType.VenomStrike]: 'E',
    [PowerType.Constrict]: 'R',
    [PowerType.HoodExpansion]: 'T',
    [PowerType.AquaticMovement]: 'Y',
    [PowerType.ColorChange]: 'U',
    [PowerType.TimeWarp]: 'I',
    [PowerType.FireBreath]: 'O',
    [PowerType.TailConsumption]: 'P',
    [PowerType.PowerCycling]: '[',
    [PowerType.RealityManipulation]: ']'
  };
  return hotkeys[powerType] || '?';
};

const getEvolutionName = (level: number): string => {
  const names: Record<number, string> = {
    1: 'Hatchling',
    2: 'Garden Snake',
    3: 'Viper',
    4: 'Python',
    5: 'Cobra',
    6: 'Anaconda',
    7: 'Rainbow Serpent',
    8: 'Celestial Serpent',
    9: 'Ancient Dragon Serpent',
    10: 'Ouroboros'
  };
  return names[level] || `Level ${level}`;
};

export const GameHUD: React.FC<GameHUDProps> = ({ 
  gameState, 
  evolutionLevel = 1, 
  scoreState, 
  powerState,
  onPowerActivate 
}) => {
  const handlePowerClick = (powerType: PowerType) => {
    if (onPowerActivate && powerState) {
      const cooldown = powerState.cooldowns.get(powerType) || 0;
      if (cooldown <= 0) {
        onPowerActivate(powerType);
      }
    }
  };

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const survivalTime = scoreState ? Date.now() - scoreState.gameStartTime : 0;

  return (
    <div style={{
      position: 'absolute',
      top: '1rem',
      left: '1rem',
      right: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      color: '#e0e0e0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      fontSize: '0.9rem',
      pointerEvents: 'none',
      zIndex: 10
    }}>
      {/* Left side - Game status and evolution info */}
      <div style={{
        backgroundColor: 'rgba(15, 15, 26, 0.95)',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: '2px solid rgba(138, 43, 226, 0.3)',
        boxShadow: '0 4px 12px rgba(138, 43, 226, 0.2)',
        backdropFilter: 'blur(10px)',
        minWidth: '200px'
      }}>
        <div style={{ 
          fontSize: '1rem', 
          fontWeight: 'bold', 
          marginBottom: '0.5rem',
          color: '#dda0dd',
          textShadow: '0 0 8px rgba(138, 43, 226, 0.5)'
        }}>
          {getEvolutionName(evolutionLevel)}
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>
          Level {evolutionLevel}/10
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
          Status: <span style={{ 
            color: gameState.isPaused ? '#ffa500' : '#90ee90',
            fontWeight: 'bold'
          }}>
            {gameState.isPaused ? 'PAUSED' : 'ACTIVE'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
          FPS: {Math.round(gameState.fps)}
        </div>
      </div>

      {/* Center - Powers */}
      {powerState && powerState.cooldowns.size > 0 && (
        <div style={{
          backgroundColor: 'rgba(15, 15, 26, 0.95)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '2px solid rgba(138, 43, 226, 0.3)',
          boxShadow: '0 4px 12px rgba(138, 43, 226, 0.2)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'auto',
          maxWidth: '400px'
        }}>
          <div style={{ 
            marginBottom: '0.75rem', 
            textAlign: 'center',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: '#dda0dd',
            textShadow: '0 0 8px rgba(138, 43, 226, 0.5)'
          }}>
            Mystical Powers
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {Array.from(powerState.cooldowns.entries()).map(([powerType, cooldown]) => {
              const isActive = powerState.activePowers.includes(powerType);
              const duration = powerState.durations.get(powerType) || 0;
              const isOnCooldown = cooldown > 0;
              
              return (
                <button
                  key={powerType}
                  onClick={() => handlePowerClick(powerType)}
                  disabled={isOnCooldown}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    border: isActive 
                      ? '2px solid rgba(76, 175, 80, 0.8)' 
                      : isOnCooldown 
                        ? '2px solid rgba(100, 100, 100, 0.5)' 
                        : '2px solid rgba(138, 43, 226, 0.5)',
                    borderRadius: '6px',
                    backgroundColor: isActive 
                      ? 'rgba(76, 175, 80, 0.2)' 
                      : isOnCooldown 
                        ? 'rgba(100, 100, 100, 0.1)' 
                        : 'rgba(138, 43, 226, 0.1)',
                    color: isOnCooldown ? '#888' : '#e0e0e0',
                    cursor: isOnCooldown ? 'not-allowed' : 'pointer',
                    pointerEvents: 'auto',
                    position: 'relative',
                    minWidth: '70px',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive 
                      ? '0 0 12px rgba(76, 175, 80, 0.4)' 
                      : isOnCooldown 
                        ? 'none' 
                        : '0 0 8px rgba(138, 43, 226, 0.3)',
                    textShadow: isActive ? '0 0 4px rgba(76, 175, 80, 0.8)' : 'none'
                  }}
                  title={`${getPowerDisplayName(powerType)} (Press ${getPowerHotkey(powerType)})`}
                  onMouseEnter={(e) => {
                    if (!isOnCooldown) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 0 16px rgba(138, 43, 226, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = isActive 
                      ? '0 0 12px rgba(76, 175, 80, 0.4)' 
                      : isOnCooldown 
                        ? 'none' 
                        : '0 0 8px rgba(138, 43, 226, 0.3)';
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{getPowerHotkey(powerType)}</div>
                  {isActive && duration > 0 && (
                    <div style={{ 
                      fontSize: '0.7rem', 
                      color: '#90ee90',
                      fontWeight: 'bold'
                    }}>
                      {Math.ceil(duration / 1000)}s
                    </div>
                  )}
                  {isOnCooldown && (
                    <div style={{ 
                      fontSize: '0.7rem',
                      color: '#ff6b6b'
                    }}>
                      {Math.ceil(cooldown / 1000)}s
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Right side - Score and stats */}
      <div style={{
        backgroundColor: 'rgba(15, 15, 26, 0.95)',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: '2px solid rgba(138, 43, 226, 0.3)',
        boxShadow: '0 4px 12px rgba(138, 43, 226, 0.2)',
        backdropFilter: 'blur(10px)',
        textAlign: 'right',
        minWidth: '180px'
      }}>
        <div style={{ 
          fontSize: '1.1rem', 
          fontWeight: 'bold', 
          marginBottom: '0.5rem',
          color: '#ffd700',
          textShadow: '0 0 8px rgba(255, 215, 0, 0.5)'
        }}>
          {scoreState ? scoreState.currentScore.toLocaleString() : '0'}
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>
          High: {scoreState ? scoreState.highScore.toLocaleString() : '0'}
        </div>
        {scoreState && scoreState.comboCount > 1 && (
          <div style={{ 
            fontSize: '0.8rem', 
            color: '#ff69b4',
            fontWeight: 'bold',
            marginBottom: '0.25rem'
          }}>
            Combo: {scoreState.comboCount}x
          </div>
        )}
        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
          Time: {formatTime(survivalTime)}
        </div>
        {scoreState && (
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
            Food: {scoreState.totalFoodConsumed}
          </div>
        )}
      </div>
    </div>
  );
};