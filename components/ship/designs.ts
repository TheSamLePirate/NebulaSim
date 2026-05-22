import { FlightComputerModule } from "@/types";

/**
 * The original Sci-Fi Rocket design.
 */
export function drawRegularShip(
    ctx: CanvasRenderingContext2D,
    size: number,
    time: number,
    body: any,
    flightComputerModules: FlightComputerModule[],
    thrust: { x: number, y: number }
) {
    const mods = parseModules(body, flightComputerModules);
    const {
        hasSolarPanel, hasGravityRing, hasObservatory, hasRadar, hasLaser,
        hasRoboticArm, fireLaser, laserAngle, gravityRingSpeed, roboticArm, landingOverride
    } = mods;

    const landing = landingOverride; // Custom script override
    // COMPATIBILITY: If shipStructure exists, we might need to sum fuel, but for now 
    // we assume body.fuel is correct (or updated by physics engine loop).
    const fuel = body.fuel / body.maxFuel * 100; // 0 to 100
    const landed = body.landedOnBodyId !== undefined || landing;
    const sasMode = body.sasMode; // 'none', 'prograde', 'retrograde', 'radial-out'

    // --- RENDERING PIPELINE ---

    // Layer 1: Behind Hull
    if (hasSolarPanel) drawSolarPanels(ctx, size);
    if (hasGravityRing) drawGravityRing(ctx, size, time, gravityRingSpeed);

    // Layer 2: Main Body
    drawHull(ctx, size, fuel, body.color);

    // Layer 3: Modules
    if (hasObservatory) {
        drawObservatory(ctx, size);
    } else {
        drawCockpit(ctx, size);
    }


    if (hasRadar) drawRadar(ctx, size, time);
    if (hasLaser) drawLaser(ctx, size, laserAngle, fireLaser);
    if (hasRoboticArm) drawRoboticArm(ctx, size, roboticArm);

    // Layer 4: Landing Gear
    if (landed) {
        const extension = landed ? 1.0 : 0.6;
        drawLandingGear(ctx, size, extension);
    }

    // Layer 5: FX
    drawEngine(ctx, size, thrust, time);
    drawRCS(ctx, size, sasMode, time);
    drawIndicators(ctx, size, sasMode, landed, time);
}

export function drawMultiStageRocket(
    ctx: CanvasRenderingContext2D,
    size: number,
    time: number,
    body: any,
    flightComputerModules: FlightComputerModule[],
    thrust: { x: number, y: number }
) {
    const struct = body.shipStructure;
    if (!struct) {
        drawRegularShip(ctx, size, time, body, flightComputerModules, thrust);
        return;
    }

    const { stages, currentStageIndex } = struct;
    const remainingStages = stages.slice(currentStageIndex);
    const stageCount = remainingStages.length;

    // Dimensions
    const stageLength = size * 1.8;
    const stageWidth = size * 0.9;

    // Calculate boundaries to center the stack
    const totalLength = stageCount * stageLength;
    // We want the stack centered. StartX is the left-most point (Tail)
    const startX = -(totalLength / 2);

    // Render from Bottom (Active) to Top (Payload)
    // Note: Active index is 0 in remainingStages
    remainingStages.forEach((stage: any, index: number) => {
        const absoluteIndex = currentStageIndex + index;
        const isPayload = absoluteIndex === stages.length - 1;
        const isActive = index === 0;

        ctx.save();
        const myX = startX + (index * stageLength) + (stageLength / 2);
        ctx.translate(myX, 0);

        // 1. Draw Engine (If active) or Interstage
        if (isActive) {
            // drawEngine expects to be at the tail. Adjust position.
            // It fits neatly if we translate to the left edge of this stage
            ctx.save();
            // The stage is drawn centered at (0,0) in local space
            // Tail is at -stageLength/2
            // drawEngine draws at roughly -size (approx tail) by default
            // But we have scaled up stageLength = size * 1.8. Half is 0.9 * size.
            // drawEngine draws nozzle around -size. So it's close.
            // Let's refine:
            // Translate to the tail of the current stage
            ctx.translate(-stageLength / 2 + size, 0); 
            // Why +size? Because drawEngine draws at -size*1.1. 
            // If we move to -0.9*size, then drawEngine at -1.1*size puts it at -2.0*size. Too far?
            // Actually, drawEngine assumes center is at (0,0) and draws nozzle to left.
            // We want nozzle attached to -stageLength/2.
            // So we translate so that (0,0) for drawEngine is shifted right such that its "nozzle point" aligns with our tail.
            // Nozzle starts at -size*0.9.
            // We want -size*0.9 to align with -stageLength/2.
            // So shift = (-stageLength/2) - (-size*0.9) = -0.9*size + 0.9*size = 0.
            // Wait, stageLength = 1.8*size. Half is 0.9*size.
            // So tail is at -0.9*size.
            // Engine starts at -0.9*size.
            // Perfect match?
            // Let's try drawing without extra translation first, or minimal.
            // The previous code had `ctx.translate(-stageLength / 2 + size, 0); ctx.translate(-size, 0);` which effectively meant translate(-stageLength/2).
            // Let's just translate to align perfectly.
            // We are at center of stage.
            // We want engine to appear attached to left side (-stageLength/2).
            // drawEngine draws starting at x = -0.9 * size.
            // So we need coordinate -0.9*size to match -stageLength/2.
            // delta = -stageLength/2 - (-0.9*size)
            //       = -0.9*size + 0.9*size = 0.
            // So it should just work if we render it here?
            // Let's force it to be exactly at the tail.
            // We will translate to the tail, then un-translate by where drawEngine starts drawing.
            ctx.translate(-stageLength / 2 + (size * 0.9), 0);
            
            drawEngine(ctx, size, thrust, time);
            ctx.restore();
        } else {
            // Interstage Connector
            ctx.fillStyle = '#111';
            ctx.fillRect(-stageLength / 2 - (size * 0.1), -stageWidth * 0.25, size * 0.2, stageWidth * 0.5);
        }

        // 2. Hull
        drawStageHull(ctx, stageLength, stageWidth, stage.color || '#white', isPayload, stage.fuel || 0, stage.maxFuel || 1);

        // 3. Payload Modules
        if (isPayload) {
            const mods = parseModules(body, flightComputerModules);
            // Only draw some modules on payload
            if (mods.hasSolarPanel) drawSolarPanels(ctx, size);
            if (mods.hasGravityRing) drawGravityRing(ctx, size, time, mods.gravityRingSpeed);

            // Top modules
            if (mods.hasObservatory) drawObservatory(ctx, size);
            else drawCockpit(ctx, size); // Cockpit always on payload

            if (mods.hasRadar) drawRadar(ctx, size, time);
            if (mods.hasLaser) drawLaser(ctx, size, mods.laserAngle, mods.fireLaser);
            if (mods.hasRoboticArm) drawRoboticArm(ctx, size, mods.roboticArm);

            const landed = body.landedOnBodyId !== undefined || mods.landingOverride;
            if (landed) drawLandingGear(ctx, size, 1.0);

            drawRCS(ctx, size, body.sasMode, time);
            drawIndicators(ctx, size, body.sasMode, landed, time);
        }

        ctx.restore();
    });
}

export function drawStation(
    ctx: CanvasRenderingContext2D,
    size: number,
    time: number,
    body: any,
    flightComputerModules: FlightComputerModule[],
    thrust: { x: number, y: number }
) {
    const mods = parseModules(body, flightComputerModules);
    const s = size * 1.2; // Slightly larger scale for station

    ctx.save();

    // 1. Solar Arrays (Truss Structure & Panels)
    // Truss Vertical
    ctx.fillStyle = '#475569';
    ctx.fillRect(-s * 0.1, -s * 2.2, s * 0.2, s * 4.4);
    
    // Solar Panels
    const drawPanelWing = (yOffset: number) => {
        // Gradient for cells
        const grad = ctx.createLinearGradient(-s * 1.8, 0, s * 1.8, 0);
        grad.addColorStop(0, '#172554'); // Dark Blue
        grad.addColorStop(0.5, '#2563eb'); // Blue
        grad.addColorStop(1, '#172554');

        ctx.fillStyle = grad;
        ctx.shadowColor = '#2563eb';
        ctx.shadowBlur = 2;
        
        // Left Wing
        ctx.fillRect(-s * 1.8, yOffset - s * 0.4, s * 1.6, s * 0.8);
        // Right Wing
        ctx.fillRect(s * 0.2, yOffset - s * 0.4, s * 1.6, s * 0.8);
        
        ctx.shadowBlur = 0;

        // Grid details
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Horizontal lines
        ctx.moveTo(-s * 1.8, yOffset); ctx.lineTo(-s * 0.2, yOffset);
        ctx.moveTo(s * 0.2, yOffset); ctx.lineTo(s * 1.8, yOffset);
        // Vertical lines
        for(let i=0; i<=4; i++) {
            const xL = -s * 1.8 + (i * s * 1.6 / 4);
            ctx.moveTo(xL, yOffset - s * 0.4); ctx.lineTo(xL, yOffset + s * 0.4);
            
            const xR = s * 0.2 + (i * s * 1.6 / 4);
            ctx.moveTo(xR, yOffset - s * 0.4); ctx.lineTo(xR, yOffset + s * 0.4);
        }
        ctx.stroke();
    };

    drawPanelWing(-s * 1.4);
    drawPanelWing(s * 1.4);

    // 2. Main Hull (Horizontal Modules)
    const hullGrad = ctx.createLinearGradient(0, -s * 0.35, 0, s * 0.35);
    hullGrad.addColorStop(0, '#334155');
    hullGrad.addColorStop(0.4, '#f1f5f9'); // White-ish
    hullGrad.addColorStop(1, '#334155');
    
    ctx.fillStyle = hullGrad;
    
    // Central Module
    ctx.beginPath();
    ctx.roundRect(-s * 1.0, -s * 0.35, s * 2.0, s * 0.7, s * 0.1);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Module Seams
    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.35); ctx.lineTo(-s * 0.3, s * 0.35);
    ctx.moveTo(s * 0.3, -s * 0.35); ctx.lineTo(s * 0.3, s * 0.35);
    ctx.stroke();

    // 3. Docking Nodes / Cupola
    // Forward Node
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(s * 1.0, 0, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Docking Port Detail
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(s * 1.15, 0, s * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 4. Dynamic Modules
    if (mods.hasObservatory) {
        // Cupola on the side
        ctx.save();
        ctx.translate(0, s * 0.35);
        ctx.fillStyle = '#4f46e5'; // Glass blue
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.2, 0, Math.PI, false);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, s * 0.2);
        ctx.stroke();
        ctx.restore();
    }
    
    if (mods.hasRadar) {
         drawRadar(ctx, s, time);
    }
    
    if (mods.hasGravityRing) {
        drawGravityRing(ctx, s, time, mods.gravityRingSpeed);
    }

    if (mods.hasLaser) {
        drawLaser(ctx, s, mods.laserAngle, mods.fireLaser);
    }

    if (mods.hasRoboticArm) {
        drawRoboticArm(ctx, s, mods.roboticArm);
    }

    // 5. Thrusters
    drawRCS(ctx, s, body.sasMode, time);

    // Main Engine (for station keeping / maneuvers)
    if (thrust.x !== 0 || thrust.y !== 0) {
        drawEngine(ctx, s * 0.6, thrust, time);
    }

    ctx.restore();
}

export function drawSatellite(
    ctx: CanvasRenderingContext2D,
    size: number,
    time: number,
    body: any,
    flightComputerModules: FlightComputerModule[],
    thrust: { x: number, y: number }
) {
    const mods = parseModules(body, flightComputerModules);
    const s = size;

    ctx.save();

    // 1. Solar Panels (Wings)
    // Rotating slowly to look cool
    const panelAngle = Math.sin(time * 0.5) * 0.1;

    const drawWing = (dir: 1 | -1) => {
        ctx.save();
        ctx.translate(dir * s * 0.6, 0); // Offset from bus
        ctx.rotate(dir * panelAngle);
        
        // Panel Stem
        ctx.fillStyle = '#64748b';
        ctx.fillRect(dir === 1 ? 0 : -s*0.3, -s*0.05, s*0.3, s*0.1);

        // Panel Array
        const pW = s * 1.2;
        const pH = s * 0.5;
        const pX = dir === 1 ? s * 0.3 : -s * 0.3 - pW;

        // Dark Blue Gradient for Solar Cells
        const grad = ctx.createLinearGradient(0, -pH/2, 0, pH/2);
        grad.addColorStop(0, '#1e3a8a'); // Dark Blue
        grad.addColorStop(0.5, '#2563eb'); // Blue
        grad.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = grad;
        
        // Panel Shadow
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillRect(pX, -pH/2, pW, pH);
        ctx.shadowBlur = 0;

        // Grid Lines
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // 2x3 Grid
        ctx.moveTo(pX + pW/3, -pH/2); ctx.lineTo(pX + pW/3, pH/2);
        ctx.moveTo(pX + 2*pW/3, -pH/2); ctx.lineTo(pX + 2*pW/3, pH/2);
        ctx.moveTo(pX, 0); ctx.lineTo(pX + pW, 0);
        ctx.stroke();

        ctx.restore();
    };

    drawWing(1);
    drawWing(-1);

    // 2. Main Bus (Gold Foil - Multi-Layer Insulation)
    // Cube-ish shape
    const busSize = s * 0.9;
    
    // Gradient for Gold Foil
    const busGrad = ctx.createLinearGradient(-busSize/2, -busSize/2, busSize/2, busSize/2);
    busGrad.addColorStop(0, '#a16207'); // Dark Gold
    busGrad.addColorStop(0.3, '#facc15'); // Bright Gold
    busGrad.addColorStop(0.6, '#eab308'); // Gold
    busGrad.addColorStop(1, '#713f12'); // Shadow Brown

    ctx.fillStyle = busGrad;
    ctx.beginPath();
    ctx.roundRect(-busSize/2, -busSize/2, busSize, busSize, s * 0.1);
    ctx.fill();

    // Foil Wrinkle details (crinkle pattern)
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-busSize*0.3, -busSize*0.4); ctx.lineTo(busSize*0.4, busSize*0.2);
    ctx.moveTo(busSize*0.2, -busSize*0.5); ctx.lineTo(-busSize*0.3, busSize*0.5);
    ctx.moveTo(-busSize*0.4, 0); ctx.lineTo(busSize*0.2, busSize*0.4);
    ctx.stroke();

    // 3. Communications Dish (High Gain Antenna)
    ctx.save();
    ctx.translate(0, -busSize * 0.5);
    
    // Dish Support
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.15);
    ctx.stroke();

    // Dish Parabola
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(0, -s*0.25, s*0.35, s*0.1, 0, Math.PI, 0, false); 
    ctx.fill();
    ctx.stroke();
    
    // Feed Horn
    ctx.beginPath(); ctx.moveTo(0, -s*0.25); ctx.lineTo(0, -s*0.45); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, -s*0.45, 2, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // 4. Sensors / Instruments (Camera Lens)
    ctx.fillStyle = '#020617';
    ctx.beginPath(); ctx.arc(0, 0, s*0.2, 0, Math.PI*2); ctx.fill();
    
    // Lens Glare
    const lensGrad = ctx.createRadialGradient(s*0.05, -s*0.05, 0, 0, 0, s*0.2);
    lensGrad.addColorStop(0, '#38bdf8');
    lensGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = lensGrad;
    ctx.beginPath(); ctx.arc(0, 0, s*0.18, 0, Math.PI*2); ctx.fill();

    // 5. Dynamic Modules
    if (mods.hasLaser) {
        ctx.save();
        ctx.scale(0.6, 0.6);
        ctx.translate(s * 1.5, s * 1.5);
        drawLaser(ctx, s, mods.laserAngle, mods.fireLaser);
        ctx.restore();
    }
    
    if (mods.hasRadar) {
         ctx.save();
         ctx.scale(0.5, 0.5);
         ctx.translate(-s * 1.5, -s * 1.5);
         drawRadar(ctx, s, time); 
         ctx.restore();
    }

    // 6. Thrusters
    drawRCS(ctx, s * 0.9, body.sasMode, time);

    // Kick Motor (Small Engine)
    if (thrust.x !== 0 || thrust.y !== 0) {
        drawEngine(ctx, s * 0.4, thrust, time);
    }

    ctx.restore();
}


// --- SUB-DRAW HELPER FUNCTIONS (Copied from ship.ts) ---

function drawHull(ctx: CanvasRenderingContext2D, size: number, fuel: number, color: string) {
    const width = size * 0.8;

    function shadeHexColor(hex: any, factor: any) {
        if (typeof hex !== "string") throw new TypeError("hex must be a string");
        let h = hex.trim().replace(/^#/, "");

        if (h.length === 3) h = h.split("").map(ch => ch + ch).join("");
        if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#888888"; // Fallback

        const f = Math.min(1, Math.max(0, Number(factor)));
        const t = (f - 0.5) * 2; // -1..1

        const to2 = (n: any) => n.toString(16).padStart(2, "0");

        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);

        const adj = (c: any) => {
            const v = t >= 0 ? c + t * (255 - c) : c * (1 + t);
            return Math.min(255, Math.max(0, Math.round(v)));
        };

        return `#${to2(adj(r))}${to2(adj(g))}${to2(adj(b))}`;
    }

    const arrayColor = [
        shadeHexColor(color, 0.2),    // Dark Slate (Shadow)
        shadeHexColor(color, 0.4), // Lighter Slate
        '#cbd5e1', // Highlight (Specular)
        color,
        shadeHexColor(color, 0.8),    // Dark Bottom
    ];

    // Metallic Hull Gradient
    const hullGrad = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
    hullGrad.addColorStop(0, arrayColor[0]);    // Dark Slate (Shadow)
    hullGrad.addColorStop(0.2, arrayColor[1]); // Lighter Slate
    hullGrad.addColorStop(0.5, arrayColor[2]); // Highlight (Specular)
    hullGrad.addColorStop(0.8, arrayColor[3]);
    hullGrad.addColorStop(1, arrayColor[4]);    // Dark Bottom

    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    // Nose
    ctx.moveTo(size, 0);
    // Upper Body Curve
    ctx.bezierCurveTo(size * 0.5, -width * 0.45, -size * 0.5, -width * 0.5, -size * 0.9, -width * 0.35);
    // Engine Mount
    ctx.lineTo(-size, -width * 0.25);
    ctx.lineTo(-size, width * 0.25);
    // Lower Body Curve
    ctx.lineTo(-size * 0.9, width * 0.35);
    ctx.bezierCurveTo(-size * 0.5, width * 0.5, size * 0.5, width * 0.45, size, 0);
    ctx.fill();

    // Panel Lines (1px details)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cross-section lines
    ctx.beginPath();
    ctx.moveTo(size * 0.3, -width * 0.42); ctx.lineTo(size * 0.3, width * 0.42);
    ctx.moveTo(-size * 0.2, -width * 0.48); ctx.lineTo(-size * 0.2, width * 0.48);
    ctx.stroke();

    // Bolts/Rivets
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(size * 0.3, -width * 0.2 + (i * width * 0.1), 1, 1);
    }

    // Fuel Gauge
    const fuelH = width * 0.5;
    const fuelW = size * 0.15;
    const fuelX = -size * 0.4;
    const currentFuelH = fuelH * (fuel / 100);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(fuelX, -fuelH / 2, fuelW, fuelH); // Background

    ctx.fillStyle = fuel > 20 ? '#10b981' : '#ef4444'; // Green or Red
    ctx.fillRect(fuelX, (fuelH / 2) - currentFuelH, fuelW, currentFuelH); // Bar

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(fuelX, -fuelH / 2, fuelW, fuelH / 2); // Glass Reflection

    ctx.strokeStyle = '#475569';
    ctx.strokeRect(fuelX, -fuelH / 2, fuelW, fuelH); // Border
}

function drawCockpit(ctx: CanvasRenderingContext2D, size: number) {
    ctx.save();
    // Glass Gradient
    const glassGrad = ctx.createLinearGradient(size * 0.4, -size * 0.1, size * 0.6, size * 0.1);
    glassGrad.addColorStop(0, '#0ea5e9'); // Sky Blue
    glassGrad.addColorStop(1, '#0369a1'); // Dark Blue

    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.ellipse(size * 0.5, 0, size * 0.18, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(size * 0.55, -size * 0.04, size * 0.06, size * 0.03, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawObservatory(ctx: CanvasRenderingContext2D, size: number) {
    ctx.fillStyle = '#4f46e5';
    ctx.shadowColor = '#818cf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(size * 0.4, 0, size * 0.25, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size * 0.4, -size * 0.2); ctx.lineTo(size * 0.4, size * 0.2);
    ctx.moveTo(size * 0.15, 0); ctx.lineTo(size * 0.65, 0);
    ctx.stroke();
}

function drawEngine(ctx: CanvasRenderingContext2D, size: number, thrust: { x: number, y: number }, time: number) {
    const thrustPower = Math.sqrt(thrust.x * thrust.x + thrust.y * thrust.y) * 500;
    const isThrusting = thrustPower > 0.001;

    // Nozzle
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(-size * 0.9, -size * 0.25);
    ctx.lineTo(-size * 1.1, -size * 0.35);
    ctx.lineTo(-size * 1.1, size * 0.35);
    ctx.lineTo(-size * 0.9, size * 0.25);
    ctx.fill();

    // Detail
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-size * 1.1, -size * 0.35); ctx.lineTo(-size * 1.1, size * 0.35);
    ctx.stroke();

    if (isThrusting) {
        ctx.globalCompositeOperation = 'lighter';
        const flicker = Math.sin(time * 0.8) * 0.1 + 0.9;
        const flameLen = size * 1.8 * flicker * Math.min(thrustPower * 0.5, 2);

        // Flame Core
        const gradient = ctx.createLinearGradient(-size * 1.1, 0, -size * 1.1 - flameLen, 0);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.1, '#fff7ed');
        gradient.addColorStop(0.4, '#f97316');
        gradient.addColorStop(0.8, '#dc2626');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(-size * 1.1, -size * 0.3);
        ctx.lineTo(-size * 1.1 - flameLen, 0);
        ctx.lineTo(-size * 1.1, size * 0.3);
        ctx.fill();

        // Ambient Glow
        const glowRad = ctx.createRadialGradient(-size * 1.1, 0, 0, -size * 1.1, 0, size);
        glowRad.addColorStop(0, 'rgba(249, 115, 22, 0.4)');
        glowRad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = glowRad;
        ctx.beginPath();
        ctx.arc(-size * 1.1, 0, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
    }
}

function drawRCS(ctx: CanvasRenderingContext2D, size: number, sas: string, time: number) {
    if (sas === 'none') return;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const puffSize = size * 0.3;

    // Simple blinking puff effect
    if (Math.sin(time * 0.8) > 0) {
        if (sas === 'prograde' || sas === 'radial_out') {
            // Front puffs
            ctx.beginPath();
            ctx.arc(size * 0.8, 0, size * 0.05, 0, Math.PI * 2);
            ctx.fill();
        }

        if (sas === 'retrograde') {
            // Rear puffs
            ctx.beginPath();
            ctx.arc(-size * 0.8, 0, size * 0.05, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawSolarPanels(ctx: CanvasRenderingContext2D, size: number) {
    const panelW = size * 1.2;
    const panelH = size * 0.5;

    ctx.save();
    ctx.translate(-size * 0.2, 0);

    const drawPanel = (yOffset: number) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-panelH / 2, yOffset, panelH, panelW);

        // Solar Cells
        const rows = 4;
        const cellH = (panelW - 4) / rows;
        for (let i = 0; i < rows; i++) {
            const cellGrad = ctx.createLinearGradient(0, yOffset + 2 + (i * cellH), 0, yOffset + 2 + ((i + 1) * cellH));
            cellGrad.addColorStop(0, '#3b82f6');
            cellGrad.addColorStop(1, '#1e40af');
            ctx.fillStyle = cellGrad;

            ctx.fillRect(-panelH / 2 + 2, yOffset + 2 + (i * cellH), panelH - 4, cellH - 1);
        }
    };

    drawPanel(-size * 0.4 - panelW); // Top
    drawPanel(size * 0.4);           // Bottom

    // Mounts
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -size * 0.4);
    ctx.moveTo(0, 0); ctx.lineTo(0, size * 0.4);
    ctx.stroke();

    ctx.restore();
}

function drawGravityRing(ctx: CanvasRenderingContext2D, size: number, time: number, speed: number) {
    const rx = size * 0.25;
    const ry = size * 1.3;

    ctx.save();
    ctx.translate(-size * 0.4, 0);

    const drawRingArc = (start: number, end: number, color: string, w: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, start, end);
        ctx.stroke();
    };

    // Back (Darker)
    drawRingArc(Math.PI / 2, Math.PI * 1.5, '#1e293b', size * 0.15);
    drawRingArc(Math.PI / 2, Math.PI * 1.5, '#334155', size * 0.1);

    // Front (Lighter)
    drawRingArc(-Math.PI / 2, Math.PI * 0.5, '#475569', size * 0.15);
    drawRingArc(-Math.PI / 2, Math.PI * 0.5, '#94a3b8', size * 0.1);

    // Lights
    const numLights = 6;
    for (let i = 0; i < numLights; i++) {
        const phase = (time * speed * 0.05 + (i * (Math.PI * 2 / numLights))) % (Math.PI * 2);
        const z = Math.cos(phase);

        if (z > -0.2) {
            const lx = Math.cos(phase) * rx;
            const ly = Math.sin(phase) * ry;

            ctx.fillStyle = z > 0 ? '#facc15' : '#854d0e';
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = z > 0 ? 5 : 0;
            ctx.beginPath();
            ctx.arc(lx, ly, size * 0.03 * (0.8 + z * 0.2), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
    ctx.restore();
}

function drawLandingGear(ctx: CanvasRenderingContext2D, size: number, extension: number) {
    if (extension <= 0) return;
    const legLen = size * 0.7 * extension;
    const legSpread = size * 0.6;

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawLeg = (dir: number) => {
        const startY = dir * size * 0.2;
        const kneeY = dir * (size * 0.2 + legLen * 0.5);
        const footY = dir * (size * 0.2 + legLen);
        const kneeX = -size * 0.5;
        const footX = -size * 0.6 - legSpread * 0.5;

        ctx.beginPath();
        ctx.moveTo(-size * 0.4, startY);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.arc(kneeX, kneeY, 2, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath(); ctx.ellipse(footX, footY, size * 0.02, size * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    };

    drawLeg(-1); // Top
    drawLeg(1);  // Bottom
}

function drawRoboticArm(ctx: CanvasRenderingContext2D, size: number, armState: any) {
    ctx.save();
    ctx.translate(0, size * 0.25);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = size * 0.06;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const drawJoint = (r: number) => {
        ctx.fillStyle = '#334155';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.stroke();
    };

    drawJoint(size * 0.05);
    ctx.rotate(armState.shoulder);

    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size * 0.4, 0); ctx.stroke();
    ctx.translate(size * 0.4, 0);

    drawJoint(size * 0.04);
    ctx.rotate(armState.elbow);

    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size * 0.35, 0); ctx.stroke();
    ctx.translate(size * 0.35, 0);

    ctx.rotate(armState.wrist);

    const clawColor = armState.grab ? '#f59e0b' : '#94a3b8';
    ctx.strokeStyle = clawColor;
    ctx.lineWidth = 2;
    const open = armState.grab ? 0.05 : 0.4;

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.02);
    ctx.bezierCurveTo(size * 0.1, -size * 0.02, size * 0.15, -size * 0.1 - (open * size * 0.2), size * 0.2, -size * 0.05);
    ctx.moveTo(0, size * 0.02);
    ctx.bezierCurveTo(size * 0.1, size * 0.02, size * 0.15, size * 0.1 + (open * size * 0.2), size * 0.2, size * 0.05);
    ctx.stroke();

    ctx.restore();
}

function drawRadar(ctx: CanvasRenderingContext2D, size: number, time: number) {
    ctx.save();
    ctx.translate(size * 0.2, -size * 0.35);

    const angle = time * 0.02;

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2, -4); ctx.lineTo(-2, -4);
    ctx.fill();

    ctx.rotate(angle);
    ctx.translate(0, -5);

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.12, 0, Math.PI, true);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -size * 0.15); ctx.stroke();
    ctx.fillStyle = 'red';
    ctx.beginPath(); ctx.arc(0, -size * 0.15, 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}

function drawLaser(ctx: CanvasRenderingContext2D, size: number, angle: number, fire: boolean) {
    ctx.save();
    ctx.translate(size * 0.6, size * 0.3);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(0, 0, size * 0.09, 0, Math.PI * 2); ctx.fill();

    ctx.rotate(angle);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, -2, size * 0.35, 4);

    ctx.fillStyle = '#000';
    ctx.fillRect(size * 0.35, -3, size * 0.08, 2);
    ctx.fillRect(size * 0.35, 1, size * 0.08, 2);


    if (fire) {
        //draw the green laser beam line (infinite)
        ctx.beginPath();
        ctx.moveTo(size * 0.35, 0);
        ctx.lineTo(1000, 0);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.restore();
}

function drawIndicators(ctx: CanvasRenderingContext2D, size: number, sas: string, landed: boolean, time: number) {
    const blink = Math.floor(time / 40) % 2 === 0;
    const halfBlink = Math.floor(time / 20) % 2 === 0;
    const width = size * 0.8;

    // Navigation Lights
    if (blink) {
        if (halfBlink) {
            // Red Left Bottom
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(-size * 0.9, -width * 0.4, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 5;
        }
        else {
            // Green RightBottom
            ctx.fillStyle = '#22c55e';
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(-size * 0.9, width * 0.4, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
    else {
        // Blue top
        ctx.fillStyle = '#01a2ffff';
        ctx.shadowColor = '#01a2ffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(size, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function parseModules(body: any, flightComputerModules: FlightComputerModule[]) {
    const res = {
        hasSolarPanel: false,
        hasGravityRing: false,
        hasObservatory: false,
        hasRadar: false,
        hasLaser: false,
        fireLaser: false,
        hasRoboticArm: false,
        laserAngle: 0,
        gravityRingSpeed: 2,
        roboticArm: { shoulder: Math.PI / 4, elbow: -Math.PI / 2, wrist: 0, grab: false },
        landingOverride: false
    };

    flightComputerModules.forEach(module => {
        if (!module.isEnabled) return;
        if (module.type === 'custom_script' && module.customScriptLastResult) {
            try {
                const datas = module.customScriptLastResult.split(':');
                const idMatch = datas[1] === body.id;
                if (!idMatch) return;

                switch (datas[0]) {
                    case "landing": res.landingOverride = true; break;
                    case "solarOn": res.hasSolarPanel = true; break;
                    case "solarOff": res.hasSolarPanel = false; break;
                    case "hasObservatory": res.hasObservatory = true; break;
                    case "hasObservatoryOff": res.hasObservatory = false; break;
                    case "hasRadar": res.hasRadar = true; break;
                    case "hasRadarOff": res.hasRadar = false; break;
                    case "hasGravityRing": res.hasGravityRing = true; break;
                    case "hasGravityRingOff": res.hasGravityRing = false; break;
                    case "hasLaserOff": res.hasLaser = false; break;
                    case "gravityRingSpeed": res.gravityRingSpeed = Number(datas[2]); break;
                    case "laserAngle": res.laserAngle = Number(datas[2]); break;
                    case "hasLaser":
                        if (datas[2] && datas[3]) {
                            res.hasLaser = true;
                            res.laserAngle = Number(datas[2]);
                            res.fireLaser = datas[3] === "true";
                        }
                        break;
                    case "roboticArm":
                        res.hasRoboticArm = true;
                        res.roboticArm = {
                            shoulder: Number(datas[2]),
                            elbow: Number(datas[3]),
                            wrist: Number(datas[4]),
                            grab: datas[5] === "true"
                        };
                        break;
                }
            } catch (error) { }
        }
    });
    return res;
}

function drawStageHull(ctx: CanvasRenderingContext2D, length: number, width: number, color: string, isPayload: boolean, fuel: number, maxFuel: number) {
    const halfLen = length / 2;
    const halfWidth = width / 2;

    // Gradient
    function shadeHexColor(hex: string, factor: number) { // Simplified inline or duplicate?
        // Duplicating for robustness or export it? Duplicate for now to keep self-contained.
        // Actually, let's just make a simple gradient helper or assume hex is valid.
        return hex; // Fallback to simple color if shading is complex to copy-paste.
    }

    // We'll reuse the logic from drawHull implicitly by creating a gradient directly
    // Or just use a simple gradient
    const grad = ctx.createLinearGradient(0, -halfWidth, 0, halfWidth);
    grad.addColorStop(0, '#1e293b'); // Dark
    grad.addColorStop(0.3, color);
    grad.addColorStop(0.5, '#fff'); // Specular
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, '#0f172a'); // Dark

    ctx.fillStyle = grad;
    ctx.beginPath();

    if (isPayload) {
        // Pointy Nose at +X
        // Tail at -X
        ctx.moveTo(halfLen, 0);
        ctx.bezierCurveTo(halfLen * 0.5, -halfWidth, -halfLen * 0.8, -halfWidth, -halfLen, -halfWidth * 0.8);
        ctx.lineTo(-halfLen, halfWidth * 0.8);
        ctx.bezierCurveTo(-halfLen * 0.8, halfWidth, halfLen * 0.5, halfWidth, halfLen, 0);
    } else {
        // Cylindrical Stage
        // Slight bevel
        ctx.moveTo(halfLen, -halfWidth * 0.9);
        ctx.lineTo(halfLen, halfWidth * 0.9);
        ctx.lineTo(halfLen * 0.95, halfWidth);
        ctx.lineTo(-halfLen * 0.95, halfWidth);
        ctx.lineTo(-halfLen, halfWidth * 0.9);
        ctx.lineTo(-halfLen, -halfWidth * 0.9);
        ctx.lineTo(-halfLen * 0.95, -halfWidth);
        ctx.lineTo(halfLen * 0.95, -halfWidth);
    }
    ctx.closePath();
    ctx.fill();

    // Details/Lines
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (!isPayload) {
        // Fuel Gauge logic for stages
        const fPct = maxFuel > 0 ? (fuel / maxFuel) : 0;
        const barW = length * 0.6;
        const barH = width * 0.3;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-barW / 2, -barH / 2, barW, barH);

        ctx.fillStyle = fPct > 0.2 ? '#10b981' : '#ef4444';
        ctx.fillRect(-barW / 2, -barH / 2, barW * fPct, barH);

        ctx.strokeStyle = '#333';
        ctx.strokeRect(-barW / 2, -barH / 2, barW, barH);
    }
}
