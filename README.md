# Ouroboros Snake Game

A modern, feature-rich snake game built with TypeScript, React, and WebGL. This implementation includes advanced features like evolution mechanics, particle systems, dynamic lighting, and immersive audio.

## Features

### Core Gameplay
- **Classic Snake Mechanics**: Grow by eating food, avoid collisions
- **Evolution System**: Snake evolves through multiple levels with visual changes
- **Power System**: Special abilities like speed boost, fire breath, and more
- **Dynamic Food System**: Multiple food types with different effects
- **Tail Consumption**: Advanced mechanic allowing strategic gameplay

### Visual & Audio
- **WebGL Rendering**: High-performance graphics with custom shaders
- **Particle Systems**: Dynamic visual effects for food consumption, evolution, and powers
- **Dynamic Lighting**: Real-time lighting effects that respond to gameplay
- **Responsive Design**: Adapts to different screen sizes and orientations
- **Immersive Audio**: Spatial audio system with dynamic sound effects

### Technical Features
- **Performance Optimization**: Memory management and frame rate optimization
- **Cross-Browser Compatibility**: Works across modern browsers
- **Touch Input Support**: Mobile-friendly controls
- **Error Handling**: Robust error management and recovery
- **Comprehensive Testing**: Full test suite with integration tests

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/T0rr1/Ouroboros.git
cd Ouroboros
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Running Tests

```bash
npm test
```

## Game Controls

### Desktop
- **Arrow Keys** or **WASD**: Move the snake
- **Space**: Activate power (when available)
- **P**: Pause/Resume game
- **R**: Restart game

### Mobile
- **Touch Controls**: Swipe to change direction
- **Tap**: Activate power (when available)

## Game Mechanics

### Evolution System
The snake evolves through multiple levels as it consumes food:
- **Level 1**: Basic snake
- **Level 2**: Enhanced speed and visual effects
- **Level 3**: Unlocks fire breath power
- **Level 4**: Advanced abilities and visual patterns
- **Level 5**: Maximum evolution with all powers

### Power System
- **Speed Boost**: Temporary speed increase
- **Fire Breath**: Destroy obstacles and gain points
- **Phase**: Pass through walls temporarily
- **Magnetism**: Attract nearby food
- **Time Slow**: Slow down time for precise control

### Scoring
- Points awarded for food consumption
- Bonus multipliers for evolution level
- Combo system for consecutive food consumption
- Survival time bonuses

## Architecture

The game is built with a modular architecture:

- **Core Systems**: Game engine, rendering, input management
- **Game Logic**: Snake mechanics, food system, collision detection
- **Visual Systems**: Particle effects, lighting, visual patterns
- **Audio System**: Sound management and spatial audio
- **Performance**: Memory management and optimization

## Development

### Project Structure
```
src/
├── core/           # Core game systems
├── components/     # React UI components
├── tests/          # Test files
└── types/          # TypeScript type definitions
```

### Key Technologies
- **TypeScript**: Type-safe development
- **React**: UI framework
- **WebGL**: High-performance graphics
- **Vite**: Build tool and development server
- **Vitest**: Testing framework

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the classic Snake game
- Built with modern web technologies
- Designed for performance and extensibility