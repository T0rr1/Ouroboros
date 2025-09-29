import React from 'react';

interface MainMenuProps {
  onStartGame: () => void;
  onShowInstructions: () => void;
  highScore: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
  onStartGame, 
  onShowInstructions, 
  highScore 
}) => {
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
          radial-gradient(circle at 20% 30%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(75, 0, 130, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(72, 61, 139, 0.05) 0%, transparent 70%)
        `,
        zIndex: -1
      }} />

      {/* Title */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem'
      }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #dda0dd, #9370db, #8a2be2)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 30px rgba(138, 43, 226, 0.5)',
          marginBottom: '1rem',
          fontFamily: '"Cinzel", serif, "Times New Roman", serif'
        }}>
          OUROBOROS
        </h1>
        <h2 style={{
          fontSize: '1.5rem',
          color: '#dda0dd',
          fontWeight: 'normal',
          letterSpacing: '0.2em',
          textShadow: '0 0 10px rgba(138, 43, 226, 0.3)',
          fontFamily: '"Cinzel", serif, "Times New Roman", serif'
        }}>
          The Eternal Serpent
        </h2>
        <p style={{
          fontSize: '1rem',
          color: '#b19cd9',
          marginTop: '1rem',
          fontStyle: 'italic',
          opacity: 0.8
        }}>
          Evolve through 10 mystical forms • Master ancient powers • Consume your own tail
        </p>
      </div>

      {/* High Score Display */}
      {highScore > 0 && (
        <div style={{
          backgroundColor: 'rgba(138, 43, 226, 0.1)',
          border: '2px solid rgba(138, 43, 226, 0.3)',
          borderRadius: '12px',
          padding: '1rem 2rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: '#dda0dd',
            marginBottom: '0.25rem'
          }}>
            Best Achievement
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#ffd700',
            textShadow: '0 0 8px rgba(255, 215, 0, 0.5)'
          }}>
            {highScore.toLocaleString()}
          </div>
        </div>
      )}

      {/* Menu Buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'center'
      }}>
        <button
          onClick={onStartGame}
          style={{
            padding: '1rem 3rem',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#ffffff',
            backgroundColor: 'rgba(138, 43, 226, 0.2)',
            border: '2px solid #8a2be2',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)',
            textShadow: '0 0 8px rgba(138, 43, 226, 0.5)',
            minWidth: '200px'
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
          Begin Evolution
        </button>

        <button
          onClick={onShowInstructions}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            color: '#dda0dd',
            backgroundColor: 'transparent',
            border: '2px solid rgba(138, 43, 226, 0.5)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minWidth: '200px'
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
          Ancient Wisdom
        </button>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        textAlign: 'center',
        color: '#8a8a8a',
        fontSize: '0.8rem'
      }}>
        <p>Use WASD or Arrow Keys • Space to Pause • Q-P for Powers</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.7rem', opacity: 0.7 }}>
          "The serpent that devours its own tail symbolizes the eternal cycle of creation and destruction"
        </p>
      </div>
    </div>
  );
};