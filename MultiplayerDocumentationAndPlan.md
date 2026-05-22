# Nebula Orbit: Multiplayer & Cloud Timeline System Architecture

## 1. Executive Summary

This document details the architectural and implementation plan for adding persistent "Cloud Timelines" and real-time "Multiplayer" capabilities to *Nebula Orbit*. 

**Core Concepts:**
1.  **Cloud Timelines**: Asynchronous persistence. Users save their simulation states ("worlds") to a cloud store (Puter). These saves act as "Ghost" markers for other players. Loading a ghost loads the branched timeline.
2.  **Real-Time Multiplayer**: Synchronous play. A Host runs the physics simulation for a room; Clients join, synchronize their planetary bodies to the Host, and broadcast their own rocket telemetry in real-time.
3.  **Shared Universe**: Objects placed on planets (flags, bases) are persistent across all timelines of a specific world ID.

---

## 2. Cloud Timeline System

### 2.1 Data Models

#### Cloud Save Metadata (`CloudSaveMetadata`)
Represents a snapshot of the simulation at a specific moment.
```typescript
interface CloudSaveMetadata {
  id: string;              // UUID
  worldId: string;         // Identifier for the root universe (e.g., "sol_prime")
  parentSaveId?: string;   // UUID of the save this branched from (linked list structure)
  username: string;        // Creator
  timestamp: number;       // Real-world creation time (Date.now())
  simulationTime: number;  // In-game simulation time (seconds from epoch)
  
  // Ghost Visualization Data (Lightweight)
  rocketState?: {
    position: Vector2D;
    velocity: Vector2D;
    angle: number;
    color: string;
    design: ShipDesign;
  };
  
  thumbnail?: string;      // Base64 generic preview or specific screenshot
  description?: string;    // User provided context ("Landed on Moon!")
}
```

#### Shared Surface Object (`CloudObject`)
Represents a persistent item placed on a celestial body.
```typescript
interface CloudObject {
  id: string;
  worldId: string;         // The universe this object belongs to
  planetId: string;        // The body it is attached to (e.g., "earth")
  
  // Placement Data
  angle: number;           // Angular position on the planet surface (radians)
  // Note: We use angle because planets rotate. The visual renderer calculates Cartesian pos.
  
  type: 'flag' | 'base' | 'artifact';
  color: string;
  placedBy: string;
  placedAt: number;
}
```

### 2.2 Ghost System Logic

**Goal**: Show relevant saves from other users without cluttering the view.

**Algorithm**:
1.  **Fetch**: Periodically (e.g., every 30s) fetch `CloudSaveMetadata` for the current `worldId`.
2.  **Filter**:
    *   `simulationTime`: Show saves that are within +/- 5 minutes of the current simulation time.
    *   `proximity (option in UI)`: Only render markers if the camera is near the ghost's position (optimization).
3.  **Render**: 
    *   Draw a semi-transparent "Ghost Rocket" at the save coordinates.
    *   Draw a UI marker/label ("User X - 10m ago").
4.  **Interaction**:
    *   Clicking a Ghost pauses the sim and offers: "Branch Timeline here?".
    *   Accepting loads the full save file associated with that metadata.

### 2.3 Shared Object Logic

**Goal**: Persistent universe modifications.

**Logic**:
1.  **Polling**: The client polls `GET /api/objects?worldId=X` every 10 seconds.
2.  **Integration**:
    *   Received objects are mapped to their `planetId`.
    *   If a planet exists in the local simulation with that ID, the object is added to its `surfaceObjects` array.
    *   **deduplication**: Ensure objects aren't added twice.
3.  **Rendering**:
    *   The `Canvas` renderer iterates `body.surfaceObjects`.
    *   It applies the body's current rotation to the object's `angle` to determine screen position.

---

## 3. Real-Time Multiplayer (Socket.IO)

### 3.1 Network Topology: Client-Server-Host

*   **Signaling Server**: A lightweight Node.js/Socket.IO server. Relays messages and manages rooms. Does NOT run physics.
*   **Host**: A browser client that initiates a room. **Authoritative** for planetary physics and simulation time.
*   **Client**: Browser clients that join a room. **Authoritative** for their own rocket's control input and physics.

### 3.2 Host Responsibilities

1.  **Physics Authority**:
    *   Runs the N-Body simulation (typically 60-120Hz internally).
    *   **Broadcasts** `host_physics_update` at 1Hz (Low Frequency).
    *   Payload: `{ timestamp, bodies: [ { id, position, velocity } ] }`. 
2.  **Time Authority**:
    *   Controls `simulationSpeed` and `isPaused`.
    *   Broadcasts `sync_sim_control` immediately upon change.

### 3.3 Client Responsibilities

1.  **Soft-Sync (Planets)**:
    *   Runs a local N-Body simulation to fill the gaps between Host updates.
    *   On receiving `host_physics_update`:
        *   Calculate `error = distance(localPos, hostPos)`.
        *   **If error < Threshold (Small drift)**: Apply a "Nudge" force to gradually correct the position over the next few frames.
        *   **If error > Threshold (Desync)**: "Snap" position directly to Host coordinates.
2.  **Input/Rocket Authority**:
    *   Simulates own rocket physics locally (instant feedback).
    *   **Broadcasts** `client_rocket_update` at 30Hz.
    *   Payload: `{ id, position, velocity, angle, thrust, color }`.

### 3.4 Collision & Events

**"Trust the Client" Model**:
To ensure responsive gameplay, clients determine their own collisions.
1.  **Detection**: Client A detects their rocket intersects Planet X.
2.  **Report**: Client A sends `event_collision` to the Room.
3.  **Reaction**: 
    *   Client A explodes locally.
    *   Other Clients receive event -> Render explosion for Rocket A.

### 3.5 Latency Handling & Interpolation

**For Remote Rockets (Other players seen by Client)**:
*   We receive updates at 30Hz (every ~33ms).
*   **Buffer**: Store the last 2-3 updates.
*   **Interpolation**: Render the rocket slightly in the past (e.g., 50ms delay) by interpolating between buffer points. This ensures smooth movement even with jittery network.
*   **Extrapolation**: If packets stop, predict movement based on last known velocity for ~500ms before fading out.

---

## 4. API & Protocol Specification

### 4.1 Socket Events

| Event Name | Direction | Payload Description | Purpose |
| :--- | :--- | :--- | :--- |
| `join_room` | Client->Server | `{ roomId, username }` | Join or create a room. |
| `role_assigned` | Server->Client | `'host' \| 'client'` | Tells user if they run physics. |
| `host_physics_update` | Host->Room | `{ bodies: [...] }` | 1Hz sync of celestial bodies. |
| `client_rocket_update` | Client->Room | `{ pos, vel, angle, thrust }` | 30Hz high-freq player movement. |
| `remote_rocket_update` | Server->Client | `{ clientId, pos... }` | Relayed rocket data to others. |
| `sync_sim_control` | Host->Room | `{ type: 'speed', value: 2 }` | Force clients to change speed. |
| `place_object` | Client->Room | `{ planetId, angle, type }` | Real-time object placement. |
| `event_collision` | Client->Room | `{ rocketId, bodyId }` | Notify others of crash. |

### 4.2 Cloud Endpoints (Mock/Puter)

*   `POST /api/save`: Upload JSON simulation state.
*   `GET /api/ghosts`: params: `{ worldId, time, radius }`. Returns `CloudSaveMetadata[]`.
*   `GET /api/objects`: params: `{ worldId }`. Returns `CloudObject[]`.
*   `GET /api/load/:id`: Download full save file.

---

## 5. Implementation Roadmap for AI Agent

**Phase 1: Backend & Service Layer**
1.  Deploy `server/socketServer.js` (Node/Express/Socket.IO).
2.  Create `services/cloudService.ts` implementing `fetch` calls to the API.
3.  Create `services/socketService.ts` encapsulating the Socket.IO client logic.

**Phase 2: Core Simulation Integration**
1.  Modify `App.tsx`:
    *   Add `isHost`, `isMultiplayer` flags.
    *   Implement the "Soft-Sync" loop for Clients in `useAnimationFrame`.
    *   Inject `remoteRockets` ref into the render loop.
2.  Modify `physicsEngine.ts`:
    *   Add `checkRemoteCollisions()` function.

**Phase 3: Visuals & UI**
1.  Update `Canvas.tsx`:
    *   Render `remoteRockets` (distinct visual style, username labels).
    *   Render `ghostMarkers` (clickable, semi-transparent).
2.  Create `MultiplayerPanel.tsx` (Connect/Host UI).
3.  Create `CloudControls.tsx` (Save/Timeline UI).

**Phase 4: Polish**
1.  Implement interpolation for remote rockets.
2.  Add visual "lag" indicator.
3.  Handle Host migration (if Host disconnects, promote oldest Client).
