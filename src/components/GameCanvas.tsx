import React, { useRef, useEffect, useState } from 'react';
import { CompleteGameIntegration } from '../core/CompleteGameIntegration';
import { BrowserCompatibility } from '../core/BrowserCompatibility';

interface GameCanvasProps {
  onGameEngineReady?: (integration: CompleteGameIntegration) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameEngineReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameIntegrationRef = useRef<CompleteGameIntegration | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1750, height: 1225 });

  useEffect(() => {
    // Initialize browser compatibility
    const compatibility = new BrowserCompatibility();
    setBrowserInfo(compatibility.getBrowserInfo());
    
    // Log compatibility information in development
    if (process.env.NODE_ENV === 'development') {
      compatibility.logCompatibilityInfo();
    }

    if (!canvasRef.current) return;

    try {
      // Initialize complete game integration
      const gameIntegration = new CompleteGameIntegration(canvasRef.current);
      gameIntegrationRef.current = gameIntegration;

      // Get the underlying game engine for responsive features
      const gameEngine = gameIntegration.getGameEngine();

      // Setup responsive canvas handling
      const handleResize = (viewport: any, newCanvasSize: { width: number; height: number }) => {
        setCanvasSize(newCanvasSize);
        
        // Notify game engine of resize
        if (gameEngine.handleResize) {
          gameEngine.handleResize(newCanvasSize.width, newCanvasSize.height);
        }
      };

      // Enable responsive features if supported
      if (gameEngine.enableResponsiveMode) {
        gameEngine.enableResponsiveMode(handleResize);
      }

      // Start the complete game
      gameIntegration.start();

      setIsInitialized(true);
      
      // Notify parent component that game integration is ready
      if (onGameEngineReady) {
        onGameEngineReady(gameIntegration);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize game';
      setError(errorMessage);
      console.error('Game initialization error:', err);
    }

    // Cleanup function
    return () => {
      if (gameIntegrationRef.current) {
        gameIntegrationRef.current.dispose();
      }
    };
  }, [onGameEngineReady]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: '#ff6b6b',
        backgroundColor: '#2a2a3e',
        borderRadius: '8px',
        border: '2px solid #ff6b6b'
      }}>
        <h2>Game Initialization Error</h2>
        <p>{error}</p>
        <p style={{ fontSize: '0.9em', opacity: 0.8 }}>
          Please ensure your browser supports WebGL
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        padding: '1rem',
        boxSizing: 'border-box'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid #4a4a6a',
          borderRadius: '4px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          backgroundColor: '#1a1a2e',
          maxWidth: '100%',
          maxHeight: '80vh',
          objectFit: 'contain'
        }}
      />
      
      {isInitialized && (
        <div style={{
          color: '#a0a0b0',
          fontSize: browserInfo?.isMobile ? '0.8em' : '0.9em',
          textAlign: 'center',
          maxWidth: '90%'
        }}>
          {browserInfo?.isMobile ? (
            <>
              <p>Swipe to control the snake</p>
              <p>Tap to consume tail • Double-tap to pause</p>
              <p>Use virtual controls for powers</p>
            </>
          ) : (
            <>
              <p>Use WASD or Arrow Keys to control the snake</p>
              <p>Press Space to pause/resume</p>
              <p>Click on tail to consume (Ouroboros level)</p>
            </>
          )}
        </div>
      )}
      
      {browserInfo && !browserInfo.supportsWebGL && (
        <div style={{
          color: '#ffa500',
          fontSize: '0.8em',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 165, 0, 0.1)',
          padding: '0.5rem',
          borderRadius: '4px',
          border: '1px solid #ffa500'
        }}>
          ⚠️ WebGL not supported. Game running in compatibility mode.
        </div>
      )}
    </div>
  );
};