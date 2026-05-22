# Nebula Orbit Documentation

This folder provides a structured, practical documentation for the codebase. It maps every file, clarifies the data models and core flows, and explains how the many tools and functions interact across modules. Use this as the single source of truth to navigate the project and evolve it confidently.

## Navigation
- File Map: high-level purpose per file
  - See: `documentation/file-map.md`
- Core Services (physics, orbital math, AI, worker)
  - See: `documentation/services.md`
- UI Components (2D/3D renderers, panels, controls)
  - See: `documentation/components.md`
- App State & Key Flows (simulation loop, prediction, flight computer, AI, audio)
  - See: `documentation/state-and-flows.md`
- Data Models (types/interfaces) overview
  - See: `documentation/data-models.md`
- Constants & Presets (systems, defaults, utilities)
  - See: `documentation/constants-and-presets.md`

## Quick Facts
- Rendering: HTML5 Canvas and Three.js (via @react-three/fiber)
- Physics: Deterministic pure functions in `services/physicsEngine.ts`
- Orbital Math: Transfer windows, orbit info, and typed input resolution in `services/orbitalMath.ts`
- AI Assistant: Tool-enabled Gemini chat session in `services/geminiService.ts`, UI in `components/Assistant.tsx`
- Prediction: Web Worker offloads multi-step future trajectories (`services/predictionWorker.ts`)
- Audio: Web Audio engine for rocket SFX (`hooks/useRocketSound.ts`) and AI music panel (`components/MusicPanel.tsx`)
- State Pattern: React state for UI + refs for animation loop; no Redux or global stores

## Conventions Recap
- Strict typing: all shared types live in `types.ts`
- Services: pure functions (no side effects) wherever possible
- Path alias: `@/` for root imports
- No `any` — prefer specific interfaces
- Avoid stale closures in loops: store mutable values in refs

If something feels unclear or missing, start in `state-and-flows.md` to see how runtime pieces connect, then deep-dive into the relevant service or component.
