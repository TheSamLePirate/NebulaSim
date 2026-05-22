# Nebula Orbit - Project Architecture

This document provides a high-level overview of the Nebula Orbit project architecture, core systems, and file structure.

## Overview

Nebula Orbit is a web-based N-body gravity simulation with a focus on orbital mechanics, rocket physics, and a modular flight computer system. It is built using React, Three.js (via React Three Fiber), and TypeScript.

## Core Systems

### 1. Simulation Loop (`App.tsx`)
The `App.tsx` component is the heart of the application. It:
- Maintains the global state: bodies (planets, stars, rockets), particles, physics configuration, and visual settings.
- Runs the simulation loop (implicitly via React state updates and `requestAnimationFrame` in sub-components or hooks).
- Orchestrates the interaction between the physics engine and the UI.
- Manages the "Flight Computer" state (modules and groups).

### 2. Physics Engine (`services/physicsEngine.ts`)
The physics engine is deterministic and handles:
- **N-Body Gravity**: Calculates gravitational forces between all bodies using Newton's law.
- **Integration**: Uses a sub-stepping integrator for stability.
- **Collisions**: Handles merging of bodies and landing logic.
- **Rocket Physics**: Applies thrust forces, consumes fuel, and handles mass changes (though fuel is currently weightless for stability).
- **Maneuvers**: Executes flight plan maneuvers (burns, rotations, SAS modes).

### 3. Orbital Math (`services/orbitalMath.ts`)
This service provides pure functions for orbital mechanics:
- **Keplerian Elements**: Calculates apoapsis, periapsis, period, and eccentricity (`calculateOrbitInfo`).
- **Transfer Windows**: Solves for Hohmann transfer windows and phase angles (`calculateTransferInfo`).
- **Input Resolution**: The `resolveInput` function is the backbone of the Flight Computer, allowing modules to dynamically read data from bodies or other modules.

### 4. AI Assistant (`services/geminiService.ts`)
The "Cosmos" assistant is powered by Google Gemini. It has direct control over the simulation via a set of defined tools:
- `spawn_body`, `delete_body`, `make_star`
- `control_simulation` (pause/speed)
- `program_advanced_flight_plan` (create complex mission scripts)
- `add_flight_computer_module` (modify the flight computer)

## File Dictionary

### Root Directory
| File | Description |
|------|-------------|
| `App.tsx` | Main application entry point. Manages global state and layout. |
| `constants.ts` | Simulation constants (G, physics defaults) and solar system presets. |
| `types.ts` | TypeScript definitions for Bodies, Vectors, Flight Computer Modules, etc. |
| `vite.config.ts` | Vite configuration, including environment variable handling. |

### Components (`/components`)
| Component | Description |
|-----------|-------------|
| `Canvas.tsx` | 2D rendering engine using HTML5 Canvas. Handles interactions (pan/zoom, selection). |
| `Canvas3D.tsx` | 3D rendering engine using Three.js. Alternative view mode. |
| `FlightComputerPanel.tsx` | The visual programming interface for the Flight Computer. Handles module creation, wiring, and configuration. |
| `RocketPanel.tsx` | Main control panel for rockets. Handles manual control, mission planning, and telemetry. |
| `RocketDataPanel.tsx` | Heads-Up Display (HUD) for rocket telemetry (speed, fuel, orbit info). |
| `BuilderPanel.tsx` | UI for creating new celestial bodies. |
| `Controls.tsx` | Bottom playback controls (play/pause, speed, time reverse). |
| `Assistant.tsx` | Chat interface for the AI assistant. |
| `MusicPanel.tsx` | Generative music interface using AI. |
| `SettingsPanel.tsx` | Global settings (visuals, physics, API keys). |
| `PredictionPanel.tsx` | Controls for the trajectory prediction system. |

### Services (`/services`)
| Service | Description |
|---------|-------------|
| `physicsEngine.ts` | Core physics logic (gravity, thrust, collisions). |
| `orbitalMath.ts` | Orbital mechanics calculations and Flight Computer input resolution. |
| `geminiService.ts` | Interface to Google Gemini API and tool definitions. |
| `predictionWorker.ts` | Web Worker for calculating trajectory predictions off the main thread. |

### Hooks (`/hooks`)
| Hook | Description |
|------|-------------|
| `useIsMobile.ts` | Detects mobile viewports for responsive UI logic. |
| `useRocketSound.ts` | Manages procedural audio for rocket engines and events. |

## Data Flow

1.  **State**: `App.tsx` holds `bodies[]`.
2.  **Update**: On every frame (or tick), `App.tsx` calls `updatePhysics` from `physicsEngine.ts`.
3.  **Render**: Updated `bodies` are passed to `Canvas` (2D) or `Canvas3D` (3D) for rendering.
4.  **Interaction**: User actions in panels (e.g., `RocketPanel`) call state setters in `App.tsx` (e.g., `setBodies`, `onUpdateRocket`).
5.  **Flight Computer**: `FlightComputerPanel` modifies `flightComputerModules`. `App.tsx` runs logic to resolve inputs using `orbitalMath.ts` and updates module states (e.g., triggers, outputs).

