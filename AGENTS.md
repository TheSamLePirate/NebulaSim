# Agent Guide for Nebula Orbit

This repository contains **Nebula Orbit**, an interactive N-body gravity simulation and rocket sandbox built with React, Three.js, and Google Gemini AI.

## 1. Build, Lint & Test Commands

### Development
- **Start Dev Server**: `npm run dev`
  - Runs Vite on **Port 3000** (HTTPS via `mkcert`).
  - **Network Access**: Binds to `0.0.0.0`. Accessible on local network (e.g., `https://macbook-pro-de-olivier.local:3000`).
  - HMR (Hot Module Replacement) is active.
- **Build for Production**: `npm run build`
  - Performs TypeScript compilation (`tsc`) and Vite build.
  - Output directory: `dist/`.
- **Preview Build**: `npm run preview`
  - Serves the `dist/` folder locally on **Port 443** (HTTPS).

### Environment & Configuration (`vite.config.ts`)
- **SSL/HTTPS**: The project uses `vite-plugin-mkcert` to provide valid SSL certificates locally. This is required for permissions like Camera access (`useWebcam.ts`) and Audio.
- **Environment Variables**:
  - The app loads `GEMINI_API_KEY` from `.env`.
  - It is exposed to the client via `define` as both:
    - `process.env.GEMINI_API_KEY`
    - `process.env.API_KEY`
- **Path Aliases**: `@/` maps to project root `./`.

### Testing & Linting
- **Tests**: There is **NO** test framework currently configured in `package.json`.
  - **Do NOT** attempt to run `npm test` or `npm run test`.
  - If you are asked to write tests, you must first propose installing a framework (recommended: **Vitest** for Vite compatibility).
  - *Exception*: If you implement a standalone utility script, you may verify it by running it directly with `ts-node` or `node` if appropriate.
- **Linting**: No explicit lint scripts (like `npm run lint`) are defined.
  - Follow standard ESLint and Prettier conventions.
  - Ensure code compiles with `tsc --noEmit` before finishing a task.

---

## 2. Code Style & Conventions

### Imports
- **Path Aliases**: Use `@/` for root-relative imports (e.g., `@/components/...`, `@/types`).
- **Extensions**: Do **NOT** use file extensions in imports for `.ts`, `.tsx`, `.js`, `.jsx` files.
- **Ordering**:
  1.  External libraries (React, Three.js, Lucide).
  2.  Internal Components (`./components/...`).
  3.  Contexts & Hooks (`./contexts/...`, `./hooks/...`).
  4.  Services & Utils (`./services/...`).
  5.  Types & Constants (`./types`, `./constants`).
  6.  Assets/Styles.

### TypeScript & Typing
- **Strict Typing**: usage of `any` is strictly forbidden. Create proper interfaces in `types.ts`.
- **Component Props**: Use `React.FC<Props>` generic pattern.
- **State**: Explicitly type `useState` and `useRef`.
  - Example: `const [presets, setPresets] = useState<Preset[]>([]);`
- **Null Safety**: Use optional chaining (`?.`) and nullish coalescing (`??`). Handle `null` vs `undefined` explicitly where relevant.

### Naming Conventions
- **Components**: `PascalCase` (e.g., `FlightComputerPanel.tsx`).
- **Files**:
  - Components: `PascalCase` (matches component name).
  - Services/Hooks/Utils: `camelCase` (e.g., `physicsEngine.ts`, `useRocketSound.ts`).
- **Functions/Variables**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_ROCKET_THRUST`).
- **Interfaces/Types**: `PascalCase` (e.g., `SimulationState`).

---

## 3. Architecture & Logic

### Core Simulation Loop (Hybrid State)
The application uses a hybrid state model to balance UI reactivity with high-performance physics:
- **Physics Loop**: Runs on `requestAnimationFrame` inside `App.tsx`. It uses **Refs** (`useRef`) for the simulation state (`bodies`, `particles`) to avoid triggering React re-renders on every frame (60 FPS).
- **React State**: Used for UI updates (panels, selection, configuration) and lower-frequency simulation sync (e.g., updating the sidebar list of planets).
- **Physics Engine**: Located in `services/physicsEngine.ts`. It is a collection of pure functions that advance the simulation state deterministically using N-body gravity ( = G \frac{m_1 m_2}{r^2}$) and sub-stepping integration.

### Flight Computer System
A visual programming interface for automating rocket control:
- **Data Model**: Nodes are `FlightComputerModule` objects defined in `types.ts`.
- **Execution**: Logic is evaluated in the main loop in `App.tsx`.
- **Input Resolution**: `services/orbitalMath.ts` contains `resolveInput`, which bridges the abstract module connections (IDs) to concrete simulation values (positions, velocities).

### Rendering Layers
- **3D Renderer**: `components/Canvas3D.tsx` (Three.js/@react-three/fiber). Handles volumetric lighting, shadows, and particle systems.
- **2D Renderer**: `components/Canvas.tsx` (HTML5 Canvas). A lightweight fallback and schematic view.
- **Synchronization**: Both renderers consume the same Ref-based simulation state.

### AI Integration
- **Cosmos AI**: Powered by Google Gemini via `services/geminiService.ts`.
- **Capabilities**: The AI can execute tools to spawn bodies, create flight plans, or control simulation speed. These tools directly mutate the simulation state.

---

## 4. File Dictionary & Responsibilities

### Root
- **`App.tsx`**: Main simulation loop, state management, and UI orchestration.
- **`constants.ts`**: Simulation constants, initial solar system data, and configuration defaults.
- **`types.ts`**: Shared TypeScript interfaces for bodies, vectors, and simulation state.

### Services (Core Logic)
- **`services/physicsEngine.ts`**: Deterministic N-body physics logic (gravity, collisions, thrust).
- **`services/orbitalMath.ts`**: Core calculations for orbits (Keplerian), transfers, and intercepts.
- **`services/geminiService.ts`**: Interface for Google Gemini API chat and tools.
- **`services/predictionWorker.ts`**: Web Worker for calculating future trajectories off-thread.
- **`services/physicsWorker.ts`**: (Experimental) Web Worker for off-thread physics processing.

### Components (UI & Rendering)
- **`components/Canvas.tsx`**: Primary 2D rendering engine (HTML5 Canvas).
- **`components/Canvas3D.tsx`**: Experimental 3D rendering engine (Three.js).
- **`components/FlightComputerPanel.tsx`**: Visual programming interface for creating logic modules.
- **`components/RocketPanel.tsx`**: Main control panel for manual and auto rocket flight.
- **`components/RocketDataPanel.tsx`**: HUD for rocket telemetry and orbital data.
- **`components/Assistant.tsx`**: AI chat interface for natural language simulation control.
- **`components/Controls.tsx`**: Main UI bar for playback, speeds, and tools.
- **`components/InfoPanel.tsx`**: Sidebar showing detailed properties of a selected body.
- **`components/BuilderPanel.tsx`**: UI panel for manually spawning new celestial bodies.
- **`components/PlanetsGemini.ts`**: High-fidelity procedural planet renderer using Canvas API.
- **`components/Parralaxe.tsx`**: Educational module for demonstrating stellar parallax.
- **`components/MusicPanel.tsx`**: UI for the generative AI music system.

### Hooks & Contexts
- **`hooks/useFlightComputerLogic.ts`**: Encapsulates execution logic for flight computer modules.
- **`hooks/useRocketSound.ts`**: Generates procedural audio based on rocket thrust.
- **`hooks/useWebcam.ts`**: Manages webcam device access and streams.
- **`contexts/MusicContext.tsx`**: Manages AI music generation state and audio graph.

---

## 5. Agent Behavior & Rules

### File Operations
- **Safety**: Always check if a file exists before reading.
- **Paths**: Use absolute paths for file ops (resolved from project root).

### Refactoring
- **Preserve Logic**: The physics engine is sensitive. `SOFTENING`, `GRAVITY_CONST`, and collision logic are tuned. **Do not change magic numbers** in `physicsEngine.ts` unless explicitly instructed to retune physics.
- **Legacy Support**: Keep existing specific physics hacks (e.g., `nameExcludedFromGravity`) unless refactoring the entire gravity system.

### New Features
- **UI**: If adding a new panel, create it in `components/` and register it in `App.tsx`.
- **State**: If the feature requires high-frequency updates (e.g., a new telemetry gauge), read from `simulationStateRef` in `App.tsx`, do not subscribe to React state.

## 6. Scripting & Automation

The project includes a powerful **Scripting API** exposed via the `CustomScriptModule`. This allows runtime execution of JavaScript to control the simulation.

- **Documentation**: See `documentation/SCRIPTING_API.md` for the full API reference (Game Object, Actions, Helpers).
- **Capabilities**:
  - Direct control of simulation state (speed, pause/play).
  - Rocket manipulation (throttle, staging).
  - External API integration (fetch/post data).
  - Dynamic body spawning.

## 7. Advanced Examples
For a deep dive into using the Flight Computer as a game engine scripting tool, see `documentation/FLIGHT_COMPUTER_EXAMPLES.md`. This file documents the "Launch Pomme" system, which demonstrates external API integration, dynamic spawning, and camera control.

## 7. Advanced Examples
For a deep dive into using the Flight Computer as a game engine scripting tool, see `documentation/FLIGHT_COMPUTER_EXAMPLES.md`. This file documents the "Launch Pomme" system, which demonstrates external API integration, dynamic spawning, and camera control.
