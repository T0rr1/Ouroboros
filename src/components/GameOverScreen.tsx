import React from 'react';
import { DeathReason, ScoreState } from '../types/game';

interface GameOverScreenProps {
  finalScore: number;
  finalEvolutionLevel: number;
  survivalTime: number;
  deathReason: DeathReason;
  scoreState: ScoreState;
  isNewHighScore: boolean;
  onRestart: () => void;
  onMainMenu: () => void;
}

const getDeathReasonMessage = (reason: DeathReason): { title: string; description: string } => {
  switch (reason) {
    case DeathReason.SelfCollision:
      return {
        title: "The Serpent Consumed Itself",
        description: "Your journey ended in the ancient cycle of self-consumption"
      };
    case DeathReason.WallCollision:
      return {
        title: "Bound by Ancient Barriers",
        description: "The mystical boundaries proved too strong to overcome"
      };
    case DeathReason.ObstacleCollision:
      return {
        title: "Crushed by Stone and Crystal",
        description: "The environment's challenges proved insurmountable"
      };
    case DeathReason.EnvironmentalHazard:
      return {
        title: "Consumed by Elemental Forces",
        description: "Fire, poison, or lightning claimed your serpentine form"
      };
    case DeathReason.PoisonEffect:
      return {
        title: "Venom Coursed Through Your Scales",
        description: "The toxic essence overwhelmed your mystical defenses"
      };
    default:
      return {
        title: "The Journey Ends",
        description: "Your evolution has reached its conclusion"
      };
  }
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

const formatTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
};

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  finalScore,
  finalEvolutionLevel,
  survivalTime,
  deathReason,
  scoreState,
  isNewHighScore,
  onRestart,
  onMainMenu
}) => {
  const deathMessage = getDeathReasonMessage(deathReason);
  const evolutionName = getEvolutionName(finalEvolutionLevel);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 15, 26, 0.98)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      {/* Mystical background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(circle at 30% 40%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 70% 60%, rgba(178, 34, 34, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(75, 0, 130, 0.05) 0%, transparent 70%)
        `,
        zIndex: -1
      }} />

      {/* Death Message */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#cd853f',
          textShadow: '0 0 20px rgba(205, 133, 63, 0.5)',
          marginBottom: '0.5rem',
          fontFamily: '"Cinzel", serif, "Times New Roman", serif'
        }}>
          {deathMessage.title}
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#dda0dd',
          fontStyle: 'italic',
          opacity: 0.9
        }}>
          {deathMessage.description}
        </p>
      </div>

      {/* Final Evolution Achievement */}
      <div style={{
        backgroundColor: 'rgba(138, 43, 226, 0.1)',
        border: '2px solid rgba(138, 43, 226, 0.3)',
        borderRadius: '12px',
        padding: '1.5rem 2rem',
        marginBottom: '2rem',
        textAlign: 'center',
        minWidth: '300px'
      }}>
        <div style={{
          fontSize: '1rem',
          color: '#dda0dd',
          marginBottom: '0.5rem'
        }}>
          Final Evolution
        </div>
        <div style={{
          fontSize: '1.8rem',
          fontWeight: 'bold',
          color: finalEvolutionLevel === 10 ? '#ffd700' : '#9370db',
          textShadow: finalEvolutionLevel === 10 
            ? '0 0 15px rgba(255, 215, 0, 0.5)' 
            : '0 0 10px rgba(147, 112, 219, 0.5)',
          marginBottom: '0.25rem'
        }}>
          {evolutionName}
        </div>
        <div style={{
          fontSize: '0.9rem',
          color: '#b19cd9',
          opacity: 0.8
        }}>
          Level {finalEvolutionLevel} of 10
        </div>
        {finalEvolutionLevel === 10 && (
          <div style={{
            fontSize: '0.9rem',
            color: '#ffd700',
            fontWeight: 'bold',
            marginTop: '0.5rem',
            textShadow: '0 0 8px rgba(255, 215, 0, 0.5)'
          }}>
            🐍 OUROBOROS ACHIEVED! 🐍
          </div>
        )}
      </div>

      {/* Score Display */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        marginBottom: '2rem',
        minWidth: '400px'
      }}>
        {/* Final Score */}
        <div style={{
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          border: '2px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: '#ffd700',
            marginBottom: '0.25rem'
          }}>
            Final Score
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#ffffff',
            textShadow: '0 0 8px rgba(255, 215, 0, 0.5)'
          }}>
            {finalScore.toLocaleString()}
          </div>
          {isNewHighScore && (
            <div style={{
              fontSize: '0.8rem',
              color: '#ffd700',
              fontWeight: 'bold',
              marginTop: '0.25rem',
              textShadow: '0 0 8px rgba(255, 215, 0, 0.8)'
            }}>
              NEW HIGH SCORE!
            </div>
          )}
        </div>

        {/* Survival Time */}
        <div style={{
          backgroundColor: 'rgba(72, 61, 139, 0.1)',
          border: '2px solid rgba(72, 61, 139, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: '#dda0dd',
            marginBottom: '0.25rem'
          }}>
            Survival Time
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#ffffff'
          }}>
            {formatTime(survivalTime)}
          </div>
        </div>

        {/* Food Consumed */}
        <div style={{
          backgroundColor: 'rgba(34, 139, 34, 0.1)',
          border: '2px solid rgba(34, 139, 34, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: '#90ee90',
            marginBottom: '0.25rem'
          }}>
            Food Consumed
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#ffffff'
          }}>
            {scoreState.totalFoodConsumed}
          </div>
        </div>

        {/* Best Combo */}
        <div style={{
          backgroundColor: 'rgba(255, 105, 180, 0.1)',
          border: '2px solid rgba(255, 105, 180, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: '#ff69b4',
            marginBottom: '0.25rem'
          }}>
            Best Combo
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#ffffff'
          }}>
            {scoreState.comboCount}x
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center'
      }}>
        <button
          onClick={onRestart}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#ffffff',
            backgroundColor: 'rgba(138, 43, 226, 0.2)',
            border: '2px solid #8a2be2',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)',
            textShadow: '0 0 8px rgba(138, 43, 226, 0.5)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.4)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(138, 43, 226, 0.5)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.2)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(138, 43, 226, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Evolve Again
        </button>

        <button
          onClick={onMainMenu}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            color: '#dda0dd',
            backgroundColor: 'transparent',
            border: '2px solid rgba(138, 43, 226, 0.5)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
            e.currentTarget.style.borderColor = '#8a2be2';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.5)';
            e.currentTarget.style.color = '#dda0dd';
          }}
        >
          Return to Menu
        </button>
      </div>

      {/* Mystical Quote */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        textAlign: 'center',
        color: '#8a8a8a',
        fontSize: '0.8rem',
        fontStyle: 'italic',
        maxWidth: '600px',
        lineHeight: '1.4'
      }}>
        <p>
          "In the end, all serpents return to the beginning. The cycle of evolution continues eternal, 
          each death a new birth, each ending a fresh start."
        </p>
      </div>
    </div>
  );
};