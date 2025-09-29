# Ouroboros Snake Game

A modern, web-based evolution of the classic snake game, themed around the mythical Ouroboros serpent. Players evolve through 10 distinct serpent forms, each with unique abilities and gameplay mechanics.

## Project Structure

```
ouroboros-snake-game/
├── src/
│   ├── components/          # React components
│   │   ├── GameCanvas.tsx   # Main game canvas with WebGL
│   │   └── GameHUD.tsx      # Game UI and status display
│   ├── core/                # Core game systems
│   │   ├── GameEngine.ts    # Main game engine with 60 FPS loop
│   │   └── InputManager.ts  # WASD/Arrow key input handling
│   ├── types/               # TypeScript type definitions
│   │   └── game.ts          # Core game interfaces and types
│   ├── tests/               # Unit tests and verification
│   │   ├── GameEngine.test.ts
│   │   ├── InputManager.test.ts
│   │   └── manual-verification.js
│   ├── App.tsx              # Main React application
│   └── main.tsx             # Application entry point
├── .kiro/specs/             # Feature specifications
│   └── ouroboros-snake-game/
│       ├── requirements.md  # Game requirements
│       ├── design.md        # Technical design
│       └── tasks.md         # Implementation tasks
└── Configuration files...
```

## Core Foundation (Task 1) - ✅ COMPLETED

### Implemented Features

1. **HTML5 Canvas Setup with React Components**
   - `GameCanvas` component with WebGL context initialization
   - `GameHUD` component for game state display
   - Error handling for WebGL compatibility

2. **WebGL Context and Rendering Pipeline**
   - WebGL context initialization with fallback detection
   - Viewport setup for 1750x1225 pixel canvas (50x35 grid at 35px per cell)
   - Blending enabled for transparency effects
   - Mystical dark background color

3. **60 FPS Game Loop with Delta Time**
   - `requestAnimationFrame` based game loop
   - Delta time calculation for smooth animation
   - FPS monitoring and display
   - Pause/resume functionality

4. **Input Handling System**
   - WASD and Arrow key support
   - Space bar for pause/resume
   - Direction vector calculation
   - Event listener management with cleanup

### Technical Specifications

- **Grid System**: 50x35 cells (1750x1225 pixels)
- **Target Performance**: 60 FPS
- **Input Methods**: WASD keys, Arrow keys, Space bar
- **Rendering**: WebGL with HTML5 Canvas
- **Framework**: React with TypeScript

### Requirements Satisfied

- ✅ **1.1**: 50x35 cell grid (1750x1225 pixels at 35px per cell)
- ✅ **1.2**: WASD/Arrow key input handling
- ✅ **7.1**: 60 FPS performance target
- ✅ **7.4**: Responsive input with minimal lag
- ✅ **11.1**: HTML5 Canvas with React framework
- ✅ **11.2**: WebGL for graphics rendering

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Modern web browser with WebGL support

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Testing

```bash
npm test
```

### Build

```bash
npm run build
```

## Game Controls

- **WASD** or **Arrow Keys**: Control snake movement
- **Space**: Pause/Resume game

## Next Steps

The core foundation is complete. Next tasks will implement:

1. Snake entity and movement system
2. Collision detection and grid system
3. Food system and consumption mechanics
4. Evolution system with 10 levels
5. Visual effects and particle systems
6. Audio system
7. Environmental obstacles and interactions

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

Requires WebGL support for optimal performance.