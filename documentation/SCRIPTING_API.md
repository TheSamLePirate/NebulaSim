# Scripting API Documentation

The **Custom Script Module** in the Flight Computer allows for advanced automation and game control using JavaScript. This module provides a sandbox environment where you can execute code to interact with the simulation, control rockets, and manipulate game state.

## Global Objects

Your script has access to the following global objects:

### 1. `game`
The primary interface for interacting with the simulation.

#### Properties
- **`game.bodies`**: `Body[]` - Array of all celestial bodies and rockets in the simulation.
- **`game.modules`**: `FlightComputerModule[]` - Array of all active flight computer modules.
- **`game.physicsConfig`**: `PhysicsConfig` - Current physics settings (G constant, time step).
- **`game.simulationTime`**: `number` - Current simulation time in seconds.
- **`game.fps`**: `number` - Current framerate.
- **`game.isRunning`**: `boolean` - Whether the simulation is playing or paused.
- **`game.speed`**: `number` - Current time multiplier (e.g., 1x, 100x).

#### Actions (`game.actions`)
Methods to modify the game state.

**Simulation Control:**
- `game.actions.setIsRunning(boolean)`: Pause or play the simulation.
- `game.actions.setSpeed(number)`: Set the simulation speed multiplier.
- `game.actions.onReset()`: Reset the simulation to the initial state.
- `game.actions.onTimeReverse()`: Reverse time direction.

**Rocket & Body Control:**
- `game.actions.updateRocket(id, { ...updates })`: Modify a rocket's properties (e.g., `throttle`, `rcsEnabled`, `stage`).
- `game.actions.createAndSpawnBody(name, mass, radius, color, pos, vel, desc)`: Spawn a new body dynamically.
- `game.actions.setFollowingBody(bodyId)`: Focus the camera on a specific body.

**Flight Computer:**
- `game.actions.updateModule(id, { ...updates })`: Modify another module's state.
- `game.actions.addModule(type, inputs)`: specific usage (advanced).
- `game.actions.toggleModule(id)`: Enable/Disable a module.

**UI Control:**
- `game.actions.setShowCameraViewer(boolean)`: Show/Hide the webcam feed.
- `game.actions.setShowParralaxe(boolean)`: Show/Hide the parallax experiment overlay.
- `game.actions.setShowImageSlideShow(boolean)`: Control the full-page slideshow.
- `game.actions.nextImage()`: Advance slideshow.

**Network / API:**
- `game.actions.getApiValue({ baseUrl, valueName })`: Fetch data from an external local API.
- `game.actions.postApiValue({ baseUrl, valueName, value })`: Send data to an external local API.

#### Helpers (`game.helpers`)
Utility functions for processing data.
- `game.helpers.resolveInput(inputDef)`: Resolve a raw input definition to its value.
- `game.helpers.formatTime(seconds)`: Format seconds into "HH:MM:SS".

### 2. `input`
An array containing the resolved values of the module's inputs.
- `input[0]`: Value of Input 0.
- `input[1]`: Value of Input 1.
- ...and so on.

### 3. `console`
A mock console for debugging. Logs appear in the module's "Console / Result" panel.
- `console.log(...args)`
- `console.warn(...args)`
- `console.error(...args)`

---

## Execution Modes

### Synchronous Mode (Realtime)
- **Best for:** Logic gates, math, simple control loops running every frame.
- **Return Value:** The value returned by your script is the module's output.
- **Constraint:** Code must be fast. Blocking code will freeze the game.

### Asynchronous Mode (Promise)
- **Best for:** Fetching data (API), waiting for events, or complex multi-step sequences.
- **Structure:** Your code is wrapped in an `async` function. You can use `await`.
- **Helpers:**
    - `await game.actions.sleep(ms)`: Pause execution for a set time.

---

## Examples

### 1. Auto-Staging Script (Sync)
Check fuel level and trigger staging.

```javascript
// Inputs: [0] = Rocket Body
const rocket = input[0];

if (rocket && rocket.fuel <= 0) {
    game.actions.updateRocket(rocket.id, {
        stage: rocket.stage + 1,
        fuel: 100 // Refuel for next stage
    });
    console.log("Staging triggered!");
    return true; // Output signal
}
return false;
```

### 2. External Control (Async)
Fetch a value from a local server to control throttle.

```javascript
// Loop forever
while (true) {
    // Fetch 'throttle' value from local API
    const throttle = await game.actions.getApiValue({
        valueName: 'throttle',
        sleepTime: 100
    });

    if (throttle !== undefined) {
        const rocket = game.bodies.find(b => b.name === 'Ship');
        if (rocket) {
            game.actions.updateRocket(rocket.id, { throttle: parseFloat(throttle) });
        }
    }
}
```

### 3. Simulation Speed Control (Sync)
Automatically slow down time when near a planet.

```javascript
// Inputs: [0] = Current Altitude
const altitude = input[0];

if (altitude < 500 && game.speed > 1) {
    game.actions.setSpeed(1);
    console.log("Landing approach: Speed set to 1x");
}
```
