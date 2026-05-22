# AI Agent Guide: Server Architecture

## Overview
The server has been refactored from a monolithic `server.js` into a modular Layered Architecture.
Each layer has a distinct responsibility, making it easier to maintain and extend.

## Architecture

### Directory Structure
- **`Server/server.js`**: Entry point. Starts the server.
- **`Server/app.js`**: Express application setup (middleware, routes).
- **`Server/config/`**: Configuration constants (Port, API URLs).
- **`Server/routes/`**: Route definitions. Maps URLs to Controllers.
- **`Server/controllers/`**: Handles HTTP requests. Validates input and calls Services.
- **`Server/services/`**: Business logic and data access. Pure logic.
- **`Server/middleware/`**: Express middleware (logging, auth, etc.).

### Data Flow
`Request` -> `Route` -> `Controller` -> `Service` -> `Data/External API`

## API Usage

### Key-Value Store (Shared State)
Manages dynamic runtime variables.
- **GET /api**: Retrieve all stored values.
    - Response: `{"key1": "value1", "key2": 123}`
- **GET /api/:key**: Retrieve a specific value.
    - Response: `{"key": "value"}` or `{"key": 0, "error": "not found"}`
- **POST /api/:key**: Set a value.
    - Body: `{"value": "someValue"}`
    - **Side Effects**: Setting `menuAction` triggers Govee API calls (Color/Brightness).
- **GET /apiR/:key**: Retrieve and delete (Read-once).
    - Response: `{"key": "value"}`

### Files
Read-only access to configuration and game data.
- **GET /api/presets**: Lists presets from `importAtStartup/Presets`.
- **GET /api/flightComputerModules**: Lists modules from `importAtStartup/FlightComputerModules`.
- **GET /api/gameData**: Returns content of `importAtStartup/GameData/gamedata.json`.

### Govee Proxy
Proxies requests to the local Govee LAN Controller.
- **GET /api/devices**
- **POST /api/color**
- **POST /api/brightness**
- **POST /api/fade**

## Developer Guide: How to Extend

### 1. Identify the Responsibility
- **Logic?** -> `services/`
- **HTTP/Input?** -> `controllers/`
- **New URL?** -> `routes/`

### 2. Workflow for Adding a Feature
**Example: Add a new "Status" endpoint.**

1.  **Service**: Create logic in `services/statusService.js`.
    ```javascript
    export const getSystemStatus = () => ({ status: "OK", uptime: process.uptime() });
    ```
2.  **Controller**: Create handler in `controllers/statusController.js`.
    ```javascript
    import * as statusService from "../services/statusService.js";
    export const getStatus = (req, res) => res.json(statusService.getSystemStatus());
    ```
3.  **Route**: Add entry in `routes/` (e.g., create `routes/statusRoutes.js` or add to `index.js`).
    ```javascript
    // routes/statusRoutes.js
    router.get("/status", statusController.getStatus);
    ```
4.  **Wire It Up**: Import and use route in `routes/index.js` or `app.js`.

## Important Notes for AI agents
- **Paths**: Use `import.meta.url` for file system operations to ensure paths are relative to the module, not the execution context.
- **Ports**: The server listens on `PORT` (default 3009). Govee proxy targets `https://localhost:3008`.
- **Legacy Support**: The `/api` prefix is heavily overloaded (KV store vs Govee routes). Ensure specific routes are defined *before* wildcard routes (`/:dataName`).
