# Flight Computer Module Documentation

The Flight Computer is a modular system that allows users to compose logic, process data, and visualize information within the Nebula Orbit simulation. This document explains the architecture, logic flow, and how to create new modules.

## Architecture Overview

The Flight Computer is built on a split architecture separating **Logic** (state processing) from **Presentation** (UI rendering).

### 1. Logic Layer
**File:** `hooks/useFlightComputerLogic.ts`

The brain of the system is the `useFlightComputerLogic` hook. It:
- **Iterates** through all active modules.
- **Resolves Inputs**: Fetches values from other modules or simulation bodies using helper functions (`resolveInput`, `resolveScalarInput`, etc.).
- **Executes Logic**: Performs calculations based on the module type (e.g., detecting edge triggers, calculating orbits, managing music).
- **Updates State**: Calls `onUpdateModule` to effectively "output" new values by updating the module's properties. These updated properties can then be read as inputs by other modules.

### 2. Presentation Layer
**File:** `components/FlightComputerPanel.tsx`

The UI container for the Flight Computer. It:
- Manages the grid/list layout of modules.
- Handles Drag & Drop reordering and Grouping.
- Renders the common "Header" for every module (Name, Color, On/Off toggle, Delete).
- Uses `ModuleContent` to render the specific body of each module.

**File:** `components/flight_computer/ModuleContent.tsx`

A router component that switches on `module.type` to render the specific React component for that module (e.g., `<OrbitInfoModule />`, `<LogicGateModule />`).

### 3. Resolution Layer
**File:** `services/orbitalMath.ts`

This is the calculation engine. It provides:
- **Core Math**: Functions like `calculateOrbitInfo`, `calculateTransferInfo`, `calculateDistance`.
- **Input Resolution**: The recursive logic that traces an input back to its source.
  - `resolveInput()`: The main entry point. Checks if the input is a Body ID or a Module Output key.
  - If it's a Module Output, it looks up that module and calculates/retrieves the requested value (e.g., `'orbit_module:periapsis'`).
  - This layer ensures that modules don't need to know *how* to calculate another module's data, they just ask for the result.

## Core Concepts

### Inputs & Outputs
Modules communicate via a standardized Input/Output system.

- **Inputs**: Stored in `module.inputs` (Record<string, FlightComputerInput>).
  - An `Input` is a reference, not a value. It points to a source (e.g., `Type: 'module_output'`, `Value: 'module-id:output-key'`).
- **Resolution**: Use helper functions in `services/orbitalMath.ts` and `hooks/useFlightComputerLogic.ts` to get the actual value.
  - `resolveScalarInput(...)`: Returns a number.
  - `resolveBooleanInput(...)`: Returns a boolean.
  - `resolveStringInput(...)`: Returns a string.
  - `resolveInput(...)`: Returns the raw object (Body, Vector, etc.).
- **Outputs**: Modules "output" data by acting as potential sources.
  - **Implicit Outputs**: Any property on the `FlightComputerModule` object can be an output.
  - **Explicit Registration**: You must register the available output keys in `components/flight_computer/InputSelector.tsx` so users can select them.

### Activation
Every module has a standard `activate` input.
- If connected and evaluating to `false`, the `useFlightComputerLogic` hook skips the module's logic.
- The UI listens to `isModuleActive` to update the visual status indicator.

## How to Create a New Module

Follow these steps to add a new module (e.g., "Counter").

### Step 1: Define the Type
**File:** `types.ts`

1.  Add the new type string to `FlightComputerModuleType` union (e.g., `'counter'`).
2.  Add configuration fields to `FlightComputerModule` interface.
    ```typescript
    export interface FlightComputerModule {
        // ... existing fields
        counterValue?: number; // The state/output
        counterStep?: number;  // Configurable step size
    }
    ```

### Step 2: Register Metadata
**File:** `components/FlightComputerPanel.tsx`

Add the module to the `MODULE_TYPES` array so it appears in the "Add Module" list.
```typescript
{ value: 'counter', label: 'Counter', category: 'Logic' },
```

**File:** `components/flight_computer/utils.ts`

Register an icon for the module.
```typescript
export const MODULE_ICONS: Record<FlightComputerModuleType, React.ElementType> = {
    // ...
    counter: Calculator, // Import icon from lucide-react
};
```

### Step 3: Create the Component
Create `components/flight_computer/modules/CounterModule.tsx`.

This component handles the **Settings UI** (configuring inputs/parameters) and **Visual Feedback** (showing the current count).

```tsx
import React from 'react';
import { FlightComputerModule, ... } from '../../../types';
import { getInput } from '../utils';
import InputSelector from '../InputSelector';

const CounterModule: React.FC<ModuleProps> = ({ module, onUpdateModule, ... }) => {
    // 1. Get current inputs/config
    const resetInput = getInput(module, 'reset');
    
    // 2. Render UI
    return (
        <div className="space-y-2">
            {/* Display Current Value */}
            <div className="text-xl font-mono text-center">{module.counterValue || 0}</div>

            {/* Input Config */}
            <InputSelector
                label="Reset Signal"
                value={resetInput}
                onChange={(input) => onUpdateModule(module.id, { 
                     inputs: { ...module.inputs, reset: input } 
                })}
                // ... props
            />
        </div>
    );
};
```

### Step 4: Register Component
**File:** `components/flight_computer/ModuleContent.tsx`

Import your component and add it to the switch statement.
```tsx
case 'counter': return <CounterModule {...props} />;
```

### Step 5: Implement Logic
**File:** `hooks/useFlightComputerLogic.ts`

Add a block in the main loop to handle your module's behavior.

```typescript
if (module.type === 'counter' && isModuleActive(module)) {
    // 1. Resolve Inputs
    const triggerInput = module.inputs?.trigger;
    const triggerVal = resolveBooleanInput(triggerInput, ...);
    
    const resetInput = module.inputs?.reset;
    const resetVal = resolveBooleanInput(resetInput, ...);

    // 2. Logic (e.g., increment on rising edge)
    const lastTrigger = module.counterLastTrigger || false;
    let newValue = module.counterValue || 0;
    
    if (resetVal) {
        newValue = 0;
    } else if (triggerVal && !lastTrigger) {
        newValue += 1;
    }

    // 3. Update State (Output)
    // Only call onUpdateModule if something changed to avoid render loops
    if (newValue !== module.counterValue || triggerVal !== lastTrigger) {
        onUpdateModule(module.id, {
            counterValue: newValue,
            counterLastTrigger: triggerVal
        });
    }
}
```

### Step 6: Expose Outputs
**File:** `components/flight_computer/InputSelector.tsx`

Allow other modules to select your `counterValue`.

Inside the `availableModules.map` loop:
```tsx
if (m.type === 'counter') {
    if (allowedTypes.includes('scalar')) {
        options.push(
            <option key={`${m.id}:value`} value={`${m.id}:value`}>
                {m.name || 'Counter'} - Value
            </option>
        );
    }
}
```


### Step 7: Implement Output Resolution (Important!)
**File:** `services/orbitalMath.ts`

For your custom module outputs (like `counterValue` above) to be resolvable by *other* modules, you must add a handler in `resolveScalarInput` (or `resolveBooleanInput`, `resolveStringInput` depending on type).

```typescript
// Inside resolveScalarInput function...
} else if (module.type === 'counter' && outputKey === 'value') {
    return module.counterValue || 0;
}
```

## Summary Checklist
- [ ] **Type**: `types.ts`
- **Registration**:
    - [ ] `FlightComputerPanel.tsx` (List)
    - [ ] `utils.ts` (Icon)
    - [ ] `ModuleContent.tsx` (Component)
- [ ] **Component**: Create `components/flight_computer/modules/MyModule.tsx`
- [ ] **Logic**: `hooks/useFlightComputerLogic.ts`
- [ ] **IO UI**: `components/flight_computer/InputSelector.tsx` (Show options in dropdown)
- [ ] **IO Resolution**: `services/orbitalMath.ts` (Return actual values)
