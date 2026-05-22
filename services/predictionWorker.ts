
import { calculateForces } from './physicsEngineNew';
import { Body, Vector2D } from '../types';

// Define the message types for type safety
export type PredictionWorkerRequest = {
    bodies: Body[];
    steps: number;
    timeStep: number;
    gravitationalConstant: number;
    predictionBodyIds: string[];
};

export type PredictionWorkerResponse = {
    paths: { id: string, color: string, points: Vector2D[] }[];
};

self.onmessage = (e: MessageEvent<PredictionWorkerRequest>) => {
    const { bodies, steps, timeStep, gravitationalConstant, predictionBodyIds } = e.data;

    // We reproduce the logic from predictSystemTrajectories here
    // to avoid complex imports or just use the logic directly.
    // Since we have calculateForces imported, we can rewrite the loop here 
    // to ensure it runs completely isolated.

    let simBodies = bodies.map(b => ({ ...b }));

    const paths = (predictionBodyIds && predictionBodyIds.length > 0
        ? simBodies.filter(b => predictionBodyIds.includes(b.id))
        : simBodies
    ).map(b => ({
        id: b.id,
        color: b.color,
        points: [] as Vector2D[]
    }));

    // Limit points to prevent memory issues - max 10000 points per path
    // (Same logic as original function)
    const MAX_POINTS = 10000;
    const stride = Math.max(1, Math.ceil(steps / MAX_POINTS));

    const totalDuration = steps * timeStep;
    let currentTime = 0;

    // Adaptive settings
    const MIN_DT = 0.1; // Minimum step size (seconds) for close encounters
    const MAX_DT = timeStep; // Maximum step size (seconds) - deep space
    const ADAPTIVE_THRESHOLD_RATIO = 20; // Reduce step when within 20x radius

    let pointsStored = 0;
    const targetPoints = Math.min(steps, 2000); // Aim for ~2000 points drawn
    let lastStoreTime = 0;
    const storeInterval = totalDuration / targetPoints;

    // Pre-calculate massive bodies for optimization
    const massiveBodies = simBodies.filter(b => b.mass > 100 && !b.isRocket && !b.name.includes("Fake"));

    // Initial Gravity Calculation (Velocity Verlet Requirement)
    let gravityForces = calculateForces(simBodies, gravitationalConstant);

    while (currentTime < totalDuration) {
        // 1. Determine Adaptive Time Step
        let currentDt = MAX_DT;

        // Check proximity to massive bodies
        for (const body of massiveBodies) {
            // Find closest rocket/prediction body
            for (const predUnit of simBodies) {
                if (!predictionBodyIds.includes(predUnit.id)) continue;
                if (predUnit.id === body.id) continue;

                const dx = predUnit.position.x - body.position.x;
                const dy = predUnit.position.y - body.position.y;
                const distSq = dx * dx + dy * dy;

                // If close, reduce dt
                const threshold = body.radius * ADAPTIVE_THRESHOLD_RATIO;
                if (distSq < threshold * threshold) {
                    const dist = Math.sqrt(distSq);
                    // Linear interpolation for dt based on distance
                    const factor = (dist - body.radius) / (threshold - body.radius);
                    const clampedFactor = Math.max(0, Math.min(1, factor));
                    const adaptiveDt = MIN_DT + (MAX_DT - MIN_DT) * clampedFactor;

                    if (adaptiveDt < currentDt) {
                        currentDt = adaptiveDt;
                    }
                }
            }
        }

        // 2. Velocity Verlet Integration

        // --- A. Half-Kick + Drift ---
        const intermediateBodies = simBodies.map((b, i) => {
            let updatedV = { ...b.velocity };

            // Apply Manual Maneuvers (Impulsive modification to velocity)
            if (b.isRocket && b.maneuvers) {
                b.maneuvers.forEach(m => {
                    if (m.type === 'manual_node' && m.timeFromNow !== undefined) {
                        // Check if we cross the maneuver time in this step
                        if (currentTime <= m.timeFromNow && currentTime + currentDt > m.timeFromNow) {
                            const vMag = Math.sqrt(b.velocity.x * b.velocity.x + b.velocity.y * b.velocity.y);
                            if (vMag > 0.0001) {
                                const prograde = { x: b.velocity.x / vMag, y: b.velocity.y / vMag };
                                const radial = { x: -prograde.y, y: prograde.x };

                                const dvP = m.deltaVPrograde || 0;
                                const dvR = m.deltaVRadial || 0;

                                updatedV.x += prograde.x * dvP + radial.x * dvR;
                                updatedV.y += prograde.y * dvP + radial.y * dvR;
                            }
                        }
                    }
                });
            }

            // Half-Kick (using previous forces)
            const ax = gravityForces[i].x / b.mass;
            const ay = gravityForces[i].y / b.mass;

            const vHalfX = updatedV.x + 0.5 * ax * currentDt;
            const vHalfY = updatedV.y + 0.5 * ay * currentDt;

            // Drift
            const newX = b.position.x + vHalfX * currentDt;
            const newY = b.position.y + vHalfY * currentDt;

            return {
                ...b,
                position: { x: newX, y: newY },
                velocity: { x: vHalfX, y: vHalfY } // Storing vHalf here temporarily
            };
        });

        // --- B. Recalculate Forces at new positions ---
        const newGravityForces = calculateForces(intermediateBodies, gravitationalConstant);

        // --- C. Second Half-Kick ---
        simBodies = intermediateBodies.map((b, i) => {
            const ax = newGravityForces[i].x / b.mass;
            const ay = newGravityForces[i].y / b.mass;

            const vFinalX = b.velocity.x + 0.5 * ax * currentDt;
            const vFinalY = b.velocity.y + 0.5 * ay * currentDt;

            return {
                ...b,
                velocity: { x: vFinalX, y: vFinalY }
            };
        });

        // Prepare for next iteration
        gravityForces = newGravityForces;

        currentTime += currentDt;

        // 3. Store Points (Time-based striding)
        if (currentTime - lastStoreTime >= storeInterval) {
            paths.forEach(path => {
                const body = simBodies.find(sb => sb.id === path.id);
                if (body && path.points.length < MAX_POINTS) {
                    path.points.push({ x: body.position.x, y: body.position.y });
                }
            });
            lastStoreTime = currentTime;
        }
    }

    // Collect Maneuver Node Positions for UI
    const maneuverNodes: { maneuverId: string; position: Vector2D }[] = [];
    // We need to re-scan or just pick them up from the rockets.
    // Actually, manual_nodes are fixed in time relative to NOW.
    // The worker simulated "future" time.
    // A manual node happens at `timeFromNow`.
    // We need to find the position of the rocket at `timeFromNow`.
    // Since we just ran the simulation, we could have captured it.

    // Rerun/Check approach: 
    // We should have captured this INSIDE the loop. Let's optimize in future.
    // For now, since we didn't capture it inside, let's just use the closest point in the path 
    // corresponding to the time.

    // Better: Capture strictly inside the loop. 
    // Let's rewrite the loop part lightly to capture "events".

    // RE-SIMULATING just for the capture would be wasteful.
    // Let's use the PATHS we just generated.
    // logic: Node is at T + timeFromNow.
    // Path points are spaced by `storeInterval`.
    // Index ~ timeFromNow / storeInterval.

    bodies.forEach(b => {
        if (!b.isRocket) return;
        const path = paths.find(p => p.id === b.id);
        if (!path) return;

        b.maneuvers?.forEach(m => {
            if (m.type === 'manual_node' && m.timeFromNow !== undefined) {
                // Find point in path closest to this time
                // totalDuration = steps * timeStep
                const time = m.timeFromNow;
                if (time > totalDuration) return; // Out of prediction range

                const ratio = time / totalDuration;
                const index = Math.floor(ratio * path.points.length);

                if (path.points[index]) {
                    maneuverNodes.push({
                        maneuverId: m.id,
                        position: path.points[index]
                    });
                }
            }
        });
    });

    self.postMessage({ paths, maneuverNodes });
};
