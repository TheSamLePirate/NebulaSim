# Flight Computer: Advanced Examples & "God Mode"

The Flight Computer in Nebula Orbit is more than just a rocket autopilot—it is a runtime scripting environment that grants access to the core engine. By combining visual nodes with the **Custom Script Module**, you can build game modes, cinematic sequences, and external hardware integrations.

## Case Study: "Launch Pomme" (Full-Stack Integration)

The `data/Launch Pomme.json` preset demonstrates a complete system that connects the game to an external API to trigger physical events. This system allows an external device (like a phone or physical button) to "launch an apple" into the simulation.

### The Architecture

This setup creates a **Bi-Directional Loop** between the game and a local server:

1.  **Poll**: The game asks the server "Should I launch?"
2.  **Trigger**: If yes, the game spawns a specific object with velocity data from the server.
3.  **Direct**: The game forces the camera to track this new object.
4.  **Report**: The game sends the new object's ID back to the server.

### 1. The Sensor (Polling API)
**Module**: `GetPomme` (Custom Script)
**Role**: Continuously checks an external endpoint without freezing the game.

```javascript
// Mode: Async (Continuous Run)
// Checks http://localhost:3009/apiR/Pomme every 500ms
const payload = { valueName: "Pomme", sleepTime: 500 };
// getApiValueAndReset reads the value and sets it back to 0 on the server
const result = await game.actions.getApiValueAndReset(payload);
return result == 1 ? true : false;
```

### 2. The Creator (God Mode)
**Module**: `CreatePomme` (Custom Script)
**Role**: Spawns a new physics body when triggered. Uses velocity data fetched from another endpoint.

```javascript
// Inputs: [0] = Trigger Signal, [1] = Velocity Vector {x, y}
if (input[0] === false) { return; }

const pommeName = "Pomme_" + new Date();
const velocity = input[1]; // Vector from 'GetVelocity' module

// game.actions.createAndSpawnBody(name, mass, radius, color, pos, vel, description)
game.actions.createAndSpawnBody(
    pommeName,
    1.015,   // Mass
    0.03,    // Radius
    "#ff0000", // Color (Red)
    { x: -47.10, y: 18.23 }, // Position (Launch Pad)
    velocity,
    "La Pomme" // Description
);

return pommeName; // Pass the name to the next module
```

### 3. The Director (Camera Control)
**Module**: `Folow Pomme` (Custom Script)
**Role**: Hijacks the user's camera to focus on the newly created object.

```javascript
// Inputs: [0] = The Body Object (resolved from the name output of CreatePomme)
if (input[0] == null) { return "none"; }

// Force camera tracking
game.actions.setFollowingBody(input[0].id);

return input[0].id;
```

### 4. The Reporter (Feedback Loop)
**Module**: `SavePomme` (Custom Script)
**Role**: Sends the new body's internal ID back to the external server, allowing the external app to track it.

```javascript
// Inputs: [0] = The Body Object
if (input[0] === null || input[0] == undefined) { return "no" }

// POST the ID to http://localhost:3009/api/Pomme
const payload = {
    valueName: "Pomme",
    sleepTime: 500,
    value: input[0].id
};
const result = await game.actions.postApiValue(payload);
return result;
```

---

## The Power of `game.actions` (The Master Key)

The `game.actions` object exposed to Custom Scripts provides "God Mode" access to the engine. It bypasses the physics loop and interacts directly with the React state and Game Engine.

You can use these actions to build:
*   **Level Editors**: Spawn planets and obstacles dynamically.
*   **Cinematics**: Control time and camera angles.
*   **Hardware Integration**: Connect physical controllers via local APIs.

### 1. World Manipulation (Creation & Destruction)
*   **`createAndSpawnBody(...)`**: The ultimate tool. Creates matter from nothing.
    *   *Use Case*: Spawning asteroids for a defense game, or launching waves of ships.
*   **`updateRocket(id, { ... })`**: Instant reconfiguration.
    *   *Use Case*: Instant refueling ("Cheat Code"), upgrading engine power mid-flight, or enabling RCS.
*   **`handleSpawnManual()`**: Trigger the manual placement UI programmatically.

### 2. Time Control (The Time Stone)
*   **`setSpeed(number)`**: Control the simulation clock.
    *   *Use Case*: "Bullet Time" (slow motion) during critical maneuvers, or fast-forwarding during transfer orbits.
*   **`setIsRunning(boolean)`**: Pause/Play.
    *   *Use Case*: Pause the game when a mission objective is met.
*   **`onReset()`, `onTimeReverse()\rasekhar**: Reboot the universe or rewind time.

### 3. Director Mode (Camera & UI)
*   **`setFollowingBody(id)`**: Force the camera to look at something.
    *   *Use Case*: Cinematic launch sequences (focus on rocket) -> switching to target planet view.
*   **`onZoom(factor)`**: Programmatic zoom.
*   **`setShowCameraViewer(bool)`**: Toggle the webcam overlay.
*   **`setShowImageSlideShow(bool)`**, **`nextImage()`**: Control multimedia presentations inside the game engine.

### 4. The Bridge (I/O)
*   **`getApiValue / postApiValue`**: The universal connector.
    *   *Use Case*: Connect an Arduino via a local server to control throttle with a physical potentiometer.
    *   *Use Case*: Visualize stock market data as planetary orbits.
