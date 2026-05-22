# Nebula Orbit - Project Architecture Documentation

## 1. Project Overview
Nebula Orbit is a web-based orbital mechanics simulation and space exploration sandbox. It features an N-body physics engine, a visual flight computer for programming rockets, and an AI assistant. The application is built with React, TypeScript, and Vite.

## 2. Directory Structure

```
/
├── components/         # React UI components (Panels, Canvas, Controls)
├── services/           # Core logic (Physics, Math, AI, Workers)
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types.ts            # TypeScript definitions for all data structures
├── constants.ts        # Simulation constants and presets (Solar System, etc.)
├── App.tsx             # Main application entry point and state manager
├── main.tsx            # React DOM root
└── vite.config.ts      # Vite configuration
```

## 3. Core Architecture

### 3.1 State Management (`App.tsx`)
`App.tsx` serves as the central "store" for the application. It manages:
- **Simulation State**: `bodies` (array of celestial objects and rockets), `particles` (visual effects), `simulationTime`.
- **Configuration**: `physicsConfig` (G constant, time step), `visualConfig` (trails, grid, etc.).
- **UI State**: Active panels, selected objects, camera transform (`scale`, `offset`).
- **Flight Computer**: `flightComputerModules` (logic blocks) and `moduleGroups`.
- **Prediction**: `predictionPaths` calculated by a Web Worker.

The main simulation loop is the `animate` function in `App.tsx`, which:
1.  Calculates `dt` (delta time) based on simulation speed.
2.  Applies Flight Computer logic (`applyManeuverExecutorModules`, `applyThrustBurstModules`).
3.  Calls `physicsEngine.updatePhysics` to advance the simulation.
4.  Updates particles and handles cleanup of destroyed bodies.
5.  Dispatches prediction tasks to the worker if needed.

### 3.2 Physics Engine (`services/physicsEngine.ts`)
This service handles the deterministic evolution of the system.
- **N-Body Gravity**: `calculateForces` computes gravitational forces between all pairs of bodies ($F = G \frac{m_1 m_2}{r^2}$).
- **Integration**: Uses a semi-implicit Euler or similar integration step in `updatePhysics` to update positions and velocities.
- **Collision Detection**: Merges bodies upon contact and spawns explosion particles.
- **Rocket Physics**: Handles thrust application, fuel consumption, and mass updates.
- **Maneuvers**: `calculateOrbitalManeuver` solves for specific orbital changes (Hohmann transfers, circularization, intercepts).

### 3.3 Orbital Math (`services/orbitalMath.ts`)
A collection of pure functions for Keplerian orbital mechanics.
- **Orbit Info**: `calculateOrbitInfo` derives orbital elements (Periapsis, Apoapsis, Period, Eccentricity) from state vectors.
- **Transfer Windows**: `calculateTransferInfo` computes phase angles and transfer windows for interplanetary travel.
- **Input Resolution**: `resolveInput` is the bridge between the Flight Computer (abstract inputs) and the Simulation (concrete values). It resolves references like "Target Body" or "Module Output" into actual `Body` objects or numbers.

### 3.4 Flight Computer System
The Flight Computer is a visual programming system allowing users to automate rockets.
- **Data Model**: Defined in `types.ts` (`FlightComputerModule`, `FlightComputerInput`).
- **Execution**:
    - **Logic**: `App.tsx` iterates through modules.
    - **Resolution**: Inputs are resolved via `orbitalMath.resolveInput`.
    - **Action**: Modules like `maneuver_executor` or `thrust_burst` modify the rocket's state (queueing maneuvers or applying thrust).
- **UI**: `components/FlightComputerPanel.tsx` renders the node-based interface.

## 4. Key Files & Functionalities

### Root Files
- **`App.tsx`**: The heart of the app. Contains the `requestAnimationFrame` loop, event handlers for the canvas, and renders all UI panels.
- **`types.ts`**: The "Source of Truth" for data structures. Defines `Body`, `Maneuver`, `FlightComputerModule`, etc.
- **`constants.ts`**: Defines the `SYSTEM_SOLAR` and other presets. Contains `G_CONST` and default configurations.

### Services
- **`services/physicsEngine.ts`**:
    - `updatePhysics`: The main step function. Handles sub-stepping for stability.
    - `calculateOrbitalManeuver`: Calculates $\Delta v$ and burn angles for auto-pilots.
    - `predictSystemTrajectories`: Runs a fast-forward simulation (without collisions/particles) to draw future paths.
    - `solveLambert`: Solves the Lambert boundary value problem for intercepts.
- **`services/orbitalMath.ts`**:
    - `calculateOrbitInfo`: Calculates orbital parameters ($a, e, i, \omega, \Omega, \nu$) - mostly 2D equivalents.
    - `calculateTransferInfo`: Calculates phase angles for Hohmann transfers.
    - `resolveInput`: Critical function that allows modules to read data from bodies or other modules.
- **`services/predictionWorker.ts`**: Runs `predictSystemTrajectories` in a background thread to prevent UI freezing during heavy calculations.
- **`services/geminiService.ts`**: Handles communication with the Google Gemini API for the AI Assistant.

### Components
- **`components/Canvas.tsx`**: 2D Renderer using HTML5 Canvas API. Draws bodies, trails, grids, and orbits.
- **`components/Canvas3D.tsx`**: Alternative 3D Renderer (likely using Three.js/React Three Fiber).
- **`components/FlightComputerPanel.tsx`**: Complex UI for managing modules. Handles drag-and-drop, connection linking (via ID references), and group management.
- **`components/RocketDataPanel.tsx`**: Displays telemetry (Speed, Altitude, Fuel) and allows manual control (Throttle, RCS).
- **`components/BuilderPanel.tsx`**: UI for creating custom solar systems.
- **`components/PredictionPanel.tsx`**: Controls for the prediction system (number of steps, which bodies to predict).

## 5. Data Flow Examples

### 5.1 Simulation Step
1. `App.tsx` `animate()` is called.
2. `applyManeuverExecutorModules()` checks active modules.
3. If a module triggers, it updates the `Body`'s `maneuvers` queue.
4. `updatePhysics()` is called.
5. Inside `updatePhysics`, forces are calculated.
6. Rocket thrust is applied based on active maneuvers.
7. Positions/Velocities are updated.
8. `setBodies()` updates the React state, triggering a re-render of `Canvas`.

### 5.2 Flight Computer Interaction
1. User adds a "Track Distance" module in `FlightComputerPanel`.
2. Module is added to `flightComputerModules` state in `App.tsx`.
3. In `animate()`, `App.tsx` calls `getFlightComputerData` (via `assistantActions` or internal logic) or simply passes modules to `Canvas`.
4. `Canvas` or `App` logic uses `resolveInput` to get the distance between the two linked bodies.
5. If connected to a "Thrust Burst" module, the boolean output of a "Logic Gate" (checking distance) is resolved.
6. If true, `applyThrustBurstModules` in `App.tsx` applies a velocity change to the rocket.

### 5.3 AI Assistant
1. User types "Orbit Earth" in `Assistant`.
2. `geminiService` sends prompt to API.
3. API returns a function call JSON (e.g., `programAdvancedFlightPlan`).
4. `Assistant` component executes this action via `assistantActions` prop.
5. `assistantActions.programAdvancedFlightPlan` modifies the `Body` state in `App.tsx` to add maneuvers.

## 6. Technical Details

### Coordinate System
- **Origin (0,0)**: Initially the center of the simulation (usually the Sun).
- **Units**: Arbitrary simulation units.
    - Distance: Pixels (at scale 1.0).
    - Mass: Arbitrary units (Sun ~ 5000-30000).
    - Time: Seconds (simulation time).

### Physics Model
- **Gravity**: Newtonian $1/r^2$.
- **Integration**: Semi-implicit Euler (Symplectic Euler) for orbital stability.
    - $v_{t+1} = v_t + a(x_t) \cdot dt$
    - $x_{t+1} = x_t + v_{t+1} \cdot dt$

### Performance Optimizations
- **Web Worker**: Trajectory predictions run off the main thread.
- **Canvas API**: Used for high-performance 2D rendering instead of DOM elements.
- **Throttling**: Prediction updates are throttled (e.g., every 20ms or 500ms).
- **Trail Limiting**: Trails are capped at a certain length to prevent memory leaks.
