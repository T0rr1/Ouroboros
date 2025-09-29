import React, { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { MainMenu } from './components/MainMenu';
import { GameOverScreen } from './components/GameOverScreen';
import { InstructionsScreen } from './components/InstructionsScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CompleteGameIntegration } from './core/CompleteGameIntegration';
import { GameState, ScoreState, DeathReason } from './types/game';
import { PowerType } from './core/EvolutionSystem';
import { PowerVisualState } from './core/PowerSystem';
import { PerformanceMetrics } from './core/PerformanceMonitor';

type AppScreen = 'menu' | 'instructions' | 'game' | 'gameOver';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('menu');
  const [gameIntegration, setGameIntegration] = useState<CompleteGameIntegration | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    isRunning: false,
    isPaused: false,
    lastFrameTime: 0,
    deltaTime: 0,
    fps: 0
  });
  const [evolutionLevel, setEvolutionLevel] = useState<number>(1);
  const [scoreState, setScoreState] = useState<ScoreState | undefined>();
  const [powerState, setPowerState] = useState<PowerVisualState | undefined>();
  const [gameOverData, setGameOverData] = useState<{
    finalScore: number;
    finalEvolutionLevel: number;
    survivalTime: number;
    deathReason: DeathReason;
    isNewHighScore: boolean;
  } | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [showPerformanceDebug, setShowPerformanceDebug] = useState(false);

  // Load high score from localStorage
  const getHighScore = useCallback((): number => {
    try {
      const saved = localStorage.getItem('ouroboros-high-score');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }, []);

  const saveHighScore = useCallback((score: number) => {
    try {
      localStorage.setItem('ouroboros-high-score', score.toString());
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handlePowerActivate = useCallback((powerType: PowerType) => {
    if (gameIntegration) {
      const gameEngine = gameIntegration.getGameEngine();
      const snakeManager = gameEngine.getSnakeManager();
      const result = snakeManager.activatePower(powerType);
      console.log('Power activation result:', result);
    }
  }, [gameIntegration]);

  const handleGameEngineReady = useCallback((integration: CompleteGameIntegration) => {
    setGameIntegration(integration);
    const engine = integration.getGameEngine();
    
    // Set up a timer to update the game state display
    const updateInterval = setInterval(() => {
      const state = engine.getState();
      setGameState(state);
      
      // Update evolution and power information
      const snakeManager = engine.getSnakeManager();
      setEvolutionLevel(snakeManager.getCurrentEvolutionLevel());
      setPowerState(snakeManager.getPowerVisualState());
      
      // Update score information
      const scoreSystem = engine.getScoreSystem();
      if (scoreSystem) {
        setScoreState(scoreSystem.getState());
      }
      
      // Update performance metrics (development only)
      if (process.env.NODE_ENV === 'development') {
        const performanceReport = integration.getPerformanceReport();
        setPerformanceMetrics(performanceReport.gameEngine);
      }

      // Check for game over
      const gameStateManager = engine.getGameStateManager();
      if (gameStateManager) {
        const gameOverState = gameStateManager.getGameOverState();
        if (gameOverState.isGameOver && currentScreen === 'game') {
          const currentScore = scoreState?.currentScore || 0;
          const highScore = getHighScore();
          const isNewHighScore = currentScore > highScore;
          
          if (isNewHighScore) {
            saveHighScore(currentScore);
          }

          setGameOverData({
            finalScore: currentScore,
            finalEvolutionLevel: evolutionLevel,
            survivalTime: Date.now() - (scoreState?.gameStartTime || Date.now()),
            deathReason: gameOverState.deathReason,
            isNewHighScore
          });
          setCurrentScreen('gameOver');
        }
      }
    }, 100); // Update every 100ms for smooth FPS display

    // Cleanup interval when component unmounts
    return () => clearInterval(updateInterval);
  }, [currentScreen, scoreState, evolutionLevel, getHighScore, saveHighScore]);

  const handleStartGame = useCallback(() => {
    setCurrentScreen('game');
  }, []);

  const handleShowInstructions = useCallback(() => {
    setCurrentScreen('instructions');
  }, []);

  const handleCloseInstructions = useCallback(() => {
    setCurrentScreen('menu');
  }, []);

  const handleRestartGame = useCallback(() => {
    if (gameIntegration) {
      gameIntegration.restart();
    }
    setGameOverData(null);
    setCurrentScreen('game');
  }, [gameIntegration]);

  const handleReturnToMenu = useCallback(() => {
    if (gameIntegration) {
      gameIntegration.dispose();
      setGameIntegration(null);
    }
    setGameOverData(null);
    setCurrentScreen('menu');
  }, [gameIntegration]);

  // Render different screens based on current state
  if (currentScreen === 'menu') {
    return (
      <MainMenu
        onStartGame={handleStartGame}
        onShowInstructions={handleShowInstructions}
        highScore={getHighScore()}
      />
    );
  }

  if (currentScreen === 'instructions') {
    return (
      <InstructionsScreen onClose={handleCloseInstructions} />
    );
  }

  if (currentScreen === 'gameOver' && gameOverData && scoreState) {
    return (
      <GameOverScreen
        finalScore={gameOverData.finalScore}
        finalEvolutionLevel={gameOverData.finalEvolutionLevel}
        survivalTime={gameOverData.survivalTime}
        deathReason={gameOverData.deathReason}
        scoreState={scoreState}
        isNewHighScore={gameOverData.isNewHighScore}
        onRestart={handleRestartGame}
        onMainMenu={handleReturnToMenu}
      />
    );
  }

  // Game screen
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f0f1a',
      position: 'relative',
      background: `
        radial-gradient(circle at 20% 20%, rgba(138, 43, 226, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(75, 0, 130, 0.05) 0%, transparent 50%),
        linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)
      `
    }}>
      {/* Game Canvas */}
      <GameCanvas onGameEngineReady={handleGameEngineReady} />

      {/* Game HUD */}
      {gameIntegration && (
        <GameHUD 
          gameState={gameState} 
          evolutionLevel={evolutionLevel}
          scoreState={scoreState}
          powerState={powerState}
          onPowerActivate={handlePowerActivate}
        />
      )}

      {/* Pause overlay */}
      {gameState.isPaused && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 15, 26, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 500,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#dda0dd',
            fontSize: '2rem',
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(138, 43, 226, 0.5)'
          }}>
            <div style={{ marginBottom: '1rem' }}>PAUSED</div>
            <div style={{ fontSize: '1rem', opacity: 0.8 }}>
              Press Space to continue your evolution
            </div>
          </div>
        </div>
      )}
      
      {/* Performance Debug Panel (Development only) */}
      {process.env.NODE_ENV === 'development' && showPerformanceDebug && performanceMetrics && (
        <div className="performance-debug">
          <h3>Performance Metrics</h3>
          <div>FPS: {performanceMetrics.fps.toFixed(1)}</div>
          <div>Frame Time: {performanceMetrics.frameTime.toFixed(2)}ms</div>
          <div>Memory: {performanceMetrics.memoryUsage.toFixed(1)}MB</div>
          <div>Particles: {performanceMetrics.particleCount}</div>
          <div>Render Calls: {performanceMetrics.renderCalls}</div>
          <button onClick={() => setShowPerformanceDebug(false)}>Close</button>
        </div>
      )}
      
      {/* Performance Debug Toggle (Development only) */}
      {process.env.NODE_ENV === 'development' && !showPerformanceDebug && (
        <button 
          className="performance-toggle"
          onClick={() => setShowPerformanceDebug(true)}
        >
          Show Performance
        </button>
      )}
      
      <style jsx>{`
        .performance-debug {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 1rem;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          z-index: 1000;
          min-width: 200px;
        }
        
        .performance-debug h3 {
          margin: 0 0 0.5rem 0;
          color: #4ecdc4;
        }
        
        .performance-debug div {
          margin: 0.25rem 0;
        }
        
        .performance-debug button {
          margin-top: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: #ff6b6b;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
        }
        
        .performance-toggle {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          padding: 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
          z-index: 1000;
        }
        
        .performance-toggle:hover {
          background: rgba(0, 0, 0, 0.8);
        }
      `}</style>
    </div>
  );
}

// Wrap the App component with ErrorBoundary
function AppWithErrorBoundary() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Application error:', error, errorInfo);
    
    // In a real application, you might want to send this to an error reporting service
    // like Sentry, LogRocket, etc.
  };

  return (
    <ErrorBoundary onError={handleError}>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;