import fs from "fs";
import path from "path";

// Helper to resolve path relative to Server directory
// Assuming cwd is usually the project root or Server dir.
// The original code used path.join("..", "importAtStartup", ...) which implies running from 'Server' dir?
// Wait, the user has 'node server.js' running in '/Nebula Orbit (5)'.
// But 'server.js' is in 'Server/server.js'? 
// No, looking at metadata:
// "node server.js (in /Users/olivierveinand/Downloads/Nebula Orbit (5)"
// "Active Document: .../Server/server.js"
// "list_dir ... Server" -> server.js is inside Server/
//
// The original code: path.join("..", "importAtStartup", "Presets")
// If running from 'Nebula Orbit (5)', then 'Server/server.js' is executing?
// Wait, command is 'node server.js' in 'Nebula Orbit (5)'.
// This implies 'server.js' is in the root of 'Nebula Orbit (5)'?
// Let's check the list_dir of root again?
// The user metdata says:
// - /Users/olivierveinand/Downloads/Nebula Orbit (5)/Server/server.js
// - /Users/olivierveinand/Downloads/Nebula Orbit (5)/server.js
// There are TWO server.js files!
// The user explicitly asked to refactor "@[Server]" which maps to ".../Server".
// The active document is ".../Server/server.js".
// HOWEVER, the RUNNING command is "node server.js (in .../Nebula Orbit (5))".
// This suggests the user might be running a DIFFERENT server.js or running the one in root.
// BUT, the content I read was from ".../Server/server.js".
// That content has `path.join("..", "importAtStartup"...)`.
// If that file is in `/Server`, ".." goes to project root, then "importAtStartup".
// So assuming we are in `/Server` directory context for the file location.
// When we move code to `/Server/services/fileService.js`, we are one level deeper.
// So we need `path.join("..", "..", "importAtStartup")` to reach the same place relative to THIS file.
// Or we can use `process.cwd()` if we are sure about the starting directory.
// Safe bet: The original code used relative paths. I should verify relative paths.
//
// If `server.js` was in `Server/server.js`, `..` is the parent of `Server`, i.e. Project Root.
// Now `services/fileService.js` is in `Server/services`.
// Parent is `Server`. Parent of `Server` is Project Root.
// So `path.join(__dirname, "../../importAtStartup")` ... but we are in ESM.
// In ESM we don't have __dirname by default.
//
// Let's stick to `path.join(process.cwd(), "importAtStartup")` if running from root?
// The original code was `path.join("..", "importAtStartup")`.
// This is relative to CWD if using `fs.readdirSync`.
// Wait, `fs` methods use paths relative to CWD.
// If the user runs `node Server/server.js` from root:
// CWD is root. `..` would be outside project. That would be wrong.
// If the user runs `cd Server; node server.js`:
// CWD is Server. `..` is root. That works.
//
// The metadata says "node server.js (in .../Nebula Orbit (5))".
// This implies CWD is root. And it's running `server.js` from root.
// But the content I read was from `Server/server.js`.
// And the user explicitly pointed to `@[Server]`.
//
// Hypothesis: There is a `server.js` in root taking precedence, or the user is confused, OR the user wants me to refactor the one in `Server/` specifically.
// The user said "the server.js works fine." and pointed to `@[Server]`.
// So I must refactor `Server/server.js`.
//
// Regarding `fs` paths:
// If the original `Server/server.js` had `path.join("..", "importAtStartup")`, and it "works fine",
// then it must be that CWD is `Server/`.
// OR, if CWD is root, then `..` implies parent of root???? No.
// Let's look at `list_dir` of `Server/` again.
// It has `server.js`.
//
// Let's assume the user will run the new app from `Server/` directory or I should make it robust.
// Best practice: Use `import.meta.url` to resolve paths relative to the current file.
//
// `fileService.js` location: `Server/services/fileService.js`
// `importAtStartup` location: `importAtStartup` (presumably in Project Root).
//
// Path from `fileService.js` to `importAtStartup`: `../../importAtStartup`.

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root related to this file: ../..
const IMPORT_BASE = path.join(__dirname, "../../importAtStartup");

export const getPresets = () => {
    try {
        const presetsDir = path.join(IMPORT_BASE, "Presets");
        if (!fs.existsSync(presetsDir)) return [];

        const presets = fs.readdirSync(presetsDir);
        return presets.map(preset => {
            const presetPath = path.join(presetsDir, preset);
            const presetContent = fs.readFileSync(presetPath, "utf-8");
            return { name: preset.replace(".json", ""), preset: JSON.parse(presetContent) };
        });
    } catch (e) {
        console.error("Error reading presets:", e);
        return [];
    }
};

export const getFlightComputerModules = () => {
    try {
        const dir = path.join(IMPORT_BASE, "FlightComputerModules");
        if (!fs.existsSync(dir)) return [];

        const modules = fs.readdirSync(dir);
        return modules.map(module => {
            const modulePath = path.join(dir, module);
            const moduleContent = fs.readFileSync(modulePath, "utf-8");
            return { name: module.replace(".json", ""), module: JSON.parse(moduleContent) };
        });
    } catch (e) {
        console.error("Error reading FlightComputerModules:", e);
        return [];
    }
};

export const getGameData = () => {
    try {
        const filePath = path.join(IMPORT_BASE, "GameData", "gamedata.json");
        if (!fs.existsSync(filePath)) return {};

        const gameData = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(gameData);
    } catch (e) {
        console.error("Error reading GameData:", e);
        return {};
    }
}
