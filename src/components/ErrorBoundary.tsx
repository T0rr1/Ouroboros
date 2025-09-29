import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>The game encountered an unexpected error and needs to restart.</p>
            
            <div className="error-actions">
              <button onClick={this.handleRetry} className="retry-button">
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="reload-button"
              >
                Reload Game
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
          
          <style jsx>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #1a1a2e, #16213e);
              color: #ffffff;
              font-family: 'Arial', sans-serif;
            }
            
            .error-content {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 12px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              max-width: 500px;
            }
            
            .error-content h2 {
              color: #ff6b6b;
              margin-bottom: 1rem;
              font-size: 1.5rem;
            }
            
            .error-content p {
              margin-bottom: 2rem;
              color: #cccccc;
              line-height: 1.5;
            }
            
            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              margin-bottom: 1rem;
            }
            
            .retry-button, .reload-button {
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              transition: all 0.2s ease;
            }
            
            .retry-button {
              background: #4ecdc4;
              color: #ffffff;
            }
            
            .retry-button:hover {
              background: #45b7aa;
              transform: translateY(-1px);
            }
            
            .reload-button {
              background: #ff6b6b;
              color: #ffffff;
            }
            
            .reload-button:hover {
              background: #ff5252;
              transform: translateY(-1px);
            }
            
            .error-details {
              margin-top: 1rem;
              text-align: left;
            }
            
            .error-details summary {
              cursor: pointer;
              color: #ffd93d;
              margin-bottom: 0.5rem;
            }
            
            .error-stack {
              background: rgba(0, 0, 0, 0.3);
              padding: 1rem;
              border-radius: 4px;
              font-size: 0.8rem;
              overflow-x: auto;
              white-space: pre-wrap;
              color: #ff9999;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;