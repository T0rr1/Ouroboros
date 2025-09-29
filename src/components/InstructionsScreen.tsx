import React from 'react';

interface InstructionsScreenProps {
  onClose: () => void;
}

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ onClose }) => {
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
      justifyContent: 'flex-start',
      zIndex: 1000,
      backdropFilter: 'blur(10px)',
      overflowY: 'auto',
      padding: '2rem'
    }}>
      {/* Mystical background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(circle at 25% 25%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(75, 0, 130, 0.1) 0%, transparent 50%)
        `,
        zIndex: -1
      }} />

      {/* Title */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #dda0dd, #9370db)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(138, 43, 226, 0.5)',
          marginBottom: '0.5rem',
          fontFamily: '"Cinzel", serif, "Times New Roman", serif'
        }}>
          Ancient Wisdom
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#dda0dd',
          fontStyle: 'italic'
        }}>
          Master the secrets of serpentine evolution
        </p>
      </div>

      {/* Instructions Content */}
      <div style={{
        maxWidth: '800px',
        width: '100%',
        display: 'grid',
        gap: '1.5rem'
      }}>
        {/* Controls Section */}
        <div style={{
          backgroundColor: 'rgba(138, 43, 226, 0.1)',
          border: '2px solid rgba(138, 43, 226, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            color: '#dda0dd',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            🎮 Mystical Controls
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.9rem',
            color: '#e0e0e0'
          }}>
            <div><strong>WASD / Arrow Keys:</strong> Guide your serpent</div>
            <div><strong>Space:</strong> Pause the eternal dance</div>
            <div><strong>Q-P Keys:</strong> Activate mystical powers</div>
            <div><strong>Mouse Click:</strong> Consume tail (Ouroboros only)</div>
          </div>
        </div>

        {/* Evolution Path */}
        <div style={{
          backgroundColor: 'rgba(75, 0, 130, 0.1)',
          border: '2px solid rgba(75, 0, 130, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            color: '#dda0dd',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            🐍 The Path of Evolution
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.85rem',
            color: '#e0e0e0'
          }}>
            <div><strong>1. Hatchling:</strong> Your humble beginning</div>
            <div><strong>2. Garden Snake:</strong> Speed Boost power</div>
            <div><strong>3. Viper:</strong> Venom Strike ability</div>
            <div><strong>4. Python:</strong> Constrict power</div>
            <div><strong>5. Cobra:</strong> Hood Expansion defense</div>
            <div><strong>6. Anaconda:</strong> Aquatic Movement</div>
            <div><strong>7. Rainbow Serpent:</strong> Color Change</div>
            <div><strong>8. Celestial Serpent:</strong> Time Warp</div>
            <div><strong>9. Ancient Dragon:</strong> Fire Breath</div>
            <div><strong>10. Ouroboros:</strong> Tail Consumption</div>
          </div>
        </div>

        {/* Powers Guide */}
        <div style={{
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          border: '2px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            color: '#ffd700',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            ✨ Mystical Powers
          </h2>
          <div style={{
            fontSize: '0.9rem',
            color: '#e0e0e0',
            lineHeight: '1.6'
          }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Speed Boost (Q):</strong> Accelerate through dangers and phase through magic barriers
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Venom Strike (E):</strong> Shatter crystal formations and destroy stone weak points
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Fire Breath (O):</strong> Incinerate ice walls, thorn bushes, and wooden barriers
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Time Warp (I):</strong> Slow moving hazards and gain temporal advantage
            </p>
            <p>
              <strong>Tail Consumption (P):</strong> Click your tail segments to strategically reduce length
            </p>
          </div>
        </div>

        {/* Food System */}
        <div style={{
          backgroundColor: 'rgba(34, 139, 34, 0.1)',
          border: '2px solid rgba(34, 139, 34, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            color: '#90ee90',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            🍃 Sacred Nourishment
          </h2>
          <div style={{
            fontSize: '0.9rem',
            color: '#e0e0e0',
            lineHeight: '1.6'
          }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Evolution-Specific Foods:</strong> Consume foods matching your current evolution level for optimal growth
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Wrong Level Foods:</strong> Eating inappropriate foods causes negative effects like poison or reversed controls
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Food Combinations:</strong> Consuming certain food sequences grants bonus multipliers
            </p>
            <p>
              <strong>Eternal Orbs:</strong> The ultimate nourishment, available only to the Ouroboros form
            </p>
          </div>
        </div>

        {/* Environmental Challenges */}
        <div style={{
          backgroundColor: 'rgba(178, 34, 34, 0.1)',
          border: '2px solid rgba(178, 34, 34, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            color: '#ff6b6b',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            ⚡ Environmental Trials
          </h2>
          <div style={{
            fontSize: '0.9rem',
            color: '#e0e0e0',
            lineHeight: '1.6'
          }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Static Obstacles:</strong> Stone pillars, crystal formations, ice walls, and magic barriers block your path
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Dynamic Hazards:</strong> Flame geysers, poison gas clouds, and lightning strikes appear and disappear
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Interactive Elements:</strong> Pressure plates, ancient switches, and mystical portals await activation
            </p>
            <p>
              <strong>Power Interactions:</strong> Use specific abilities to overcome environmental challenges
            </p>
          </div>
        </div>

        {/* Scoring */}
        <div style={{
          backgroundColor: 'rgba(255, 105, 180, 0.1)',
          border: '2px solid rgba(255, 105, 180, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            color: '#ff69b4',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            🏆 Path to Glory
          </h2>
          <div style={{
            fontSize: '0.9rem',
            color: '#e0e0e0',
            lineHeight: '1.6'
          }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Evolution Multipliers:</strong> Higher evolution levels grant greater point multipliers
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Combo System:</strong> Consecutive food consumption builds powerful combo multipliers
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Survival Bonus:</strong> Longer survival times contribute to your final score
            </p>
            <p>
              <strong>Ultimate Goal:</strong> Reach the Ouroboros form and master the art of tail consumption
            </p>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          marginTop: '2rem',
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
        Begin Your Journey
      </button>
    </div>
  );
};