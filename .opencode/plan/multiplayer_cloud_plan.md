# Multiplayer & Cloud Save Implementation Plan

## 1. Overview
This plan integrates two major features into *Nebula Orbit*:
1.  **Cloud Timelines (Puter)**: Users can save their simulation state to the cloud. Other users can see "ghosts" of these saves at specific timestamps/locations and branch from them.
2.  **Real-Time Multiplayer (Socket.IO)**: Users can host rooms where they share the simulation state. One user (Host) calculates physics; others (Clients) synchronize to it while controlling their own rockets in real-time.

## 2. Architecture

### A. Cloud Service (`services/cloudService.ts`)
- **Backend**: Uses `fetch` to communicate with the user's existing API (acting as a proxy to Puter or local storage).
- **Key Functions**:
    - `saveTimeline(state)`: Uploads full JSON state.
    - `getGhosts(worldId, time)`: Fetches metadata of saves near the current simulation time.
    - `getSharedObjects(worldId)`: Fetches objects placed by other users.

### B. Multiplayer Service (`services/socketService.ts`)
- **Protocol**: Socket.IO
- **Roles**:
    - **Host**: Runs physics, broadcasts planet positions (1Hz), broadcasts simulation speed.
    - **Client**: Receives planet positions (interpolates/snaps), sends local rocket state (30Hz).
- **Collision Authority**: "Trust Client". If a client detects their rocket hit something, they report the crash.

### C. Backend Reference (`server/socketServer.js`)
- A standalone Node.js script provided for the user to run/integrate.
- Handles room management and event relaying (`physics_update`, `rocket_update`).

## 3. Implementation Steps

### Step 1: Data Structures (`types.ts`, `constants.ts`)
- Define `CloudSaveMetadata` (id, timestamp, rocketState).
- Define `RemoteRocket` (visual properties for rendering others).
- Define sync constants (`PHYSICS_SYNC_RATE = 1000`, `ROCKET_SYNC_RATE = 33`).

### Step 2: Services
- Create `services/cloudService.ts`.
- Create `services/socketService.ts`.

### Step 3: Application Logic (`App.tsx`)
- **State**: Add `isMultiplayer`, `isHost`, `remoteRockets` ref.
- **Loop (Host)**:
    - Execute physics normally.
    - Every 1s: Emit `physics_update` (Planets only).
- **Loop (Client)**:
    - Execute physics locally (for smooth animation).
    - On `physics_update`: Calculate error. If small, nudge velocities. If large, snap positions.
    - Lock controls (Time Scale, Pause) to match Host.
- **Rocket Loop**:
    - Every frame: Update local rocket.
    - Every 33ms: Emit `rocket_update`.

### Step 4: Physics Engine (`services/physicsEngine.ts`)
- Update collision detection to check `remoteRockets`.
- Treat `remoteRockets` as having mass but 0 gravity influence (passive colliders).

### Step 5: Visuals (`components/Canvas.tsx`)
- **Ghosts**: Render semi-transparent markers at the save location.
- **Remote Rockets**: Render solid rockets using the `RemoteRocket` data (interpolated if possible, or raw updates).
- **Shared Objects**: Render user-placed items on planet surfaces.

### Step 6: UI Components
- `components/MultiplayerPanel.tsx`: Host/Join controls, connection status.
- `components/CloudPanel.tsx`: Save Timeline, View Ghosts toggles.

## 4. Verification
- Test Ghost saving/loading (simulated via local storage mock if API unavailable).
- Test Multiplayer connection (simulated latency).
