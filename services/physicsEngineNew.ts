import {
  Body,
  Vector2D,
  Particle,
  PhysicsResult,
  SASMode,
  SystemEvent,
} from "../types";
export type { PhysicsResult };
import { calculateTransferInfo } from "./orbitalMath";
import { SOFTENING } from "../constants";
// Velocity threshold for a safe landing (relative velocity magnitude)
const LANDING_MAX_VELOCITY = 3;
// Fuel consumption factor (Fuel units per Thrust Unit per Second)
// Tuned for mass ~0.001 rocket. Lower = fuel lasts longer.
const FUEL_CONSUMPTION_RATE = 50000;
// Max thrust clamp for autopilot to prevent physics breaking
const MAX_ROCKET_THRUST = 0.01;

const nameExcludedFromGravity = ["FakeSun", "FakeStar", "FakePlanet"];
const attractButDontMove = ["FakeTerre", "FakeTerre", "FakeSoleil"];
const dontAttractButMove = ["Pomme_"];

export const calculateForces = (bodies: Body[], gConst: number): Vector2D[] => {
  const forces: Vector2D[] = bodies.map(() => ({ x: 0, y: 0 }));
  const eps2 = SOFTENING * SOFTENING;

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      if (
        nameExcludedFromGravity.includes(bodies[i].name) ||
        nameExcludedFromGravity.includes(bodies[j].name)
      )
        continue;

      const A = bodies[i];
      const B = bodies[j];

      const dx = B.position.x - A.position.x;
      const dy = B.position.y - A.position.y;

      const r2 = dx * dx + dy * dy + eps2;
      const invR = 1 / Math.sqrt(r2);
      const invR3 = invR * invR * invR;

      // Force vector on A due to B
      const s = gConst * A.mass * B.mass * invR3;
      const fx = s * dx;
      const fy = s * dy;

      // Pomme_ : reçoit mais n'attire pas
      if (A.name.includes("Pomme_")) {
        forces[i].x += fx;
        forces[i].y += fy;
        continue;
      }
      if (B.name.includes("Pomme_")) {
        forces[j].x -= fx;
        forces[j].y -= fy;
        continue;
      }

      if (!attractButDontMove.includes(A.name)) {
        forces[i].x += fx;
        forces[i].y += fy;
      }
      if (!attractButDontMove.includes(B.name)) {
        forces[j].x -= fx;
        forces[j].y -= fy;
      }
    }
  }

  return forces;
};

export const calculateForcesNew = calculateForces;

const createExplosion = (
  x: number,
  y: number,
  color: string,
  intensity: number,
  dt: number,
): Particle[] => {
  const particles: Particle[] = [];
  const count = Math.min(300, Math.floor(intensity * 100)); // Increased multiplier from 10 to 100, cap at 5000

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 10 + 5;
    particles.push({
      id: `p_${Date.now()}_${i}`,
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 200 * dt,
      decay: (0.01 + Math.random() * 0.01) * dt,
      color: color,
      size: Math.random() * 2 + 1,
    });
  }
  return particles;
};

// --- ORBITAL MANEUVER MATH ---
const normalize = (v: Vector2D) => {
  const m = Math.sqrt(v.x * v.x + v.y * v.y);
  return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
};

export const calculateOrbitalManeuver = (
  rocket: Body,
  target: Body,
  type: "auto_circularize" | "auto_land" | "auto_transfer" | "auto_intercept",
  gConst: number,
  bodies: Body[],
  parentId?: string,
  param?: number | string,
): { deltaV: number; angle: number; duration?: number } | null => {
  if (!rocket || !target) return null;

  // Relative Position/Velocity
  const relPos = {
    x: rocket.position.x - target.position.x,
    y: rocket.position.y - target.position.y,
  };
  const relVel = {
    x: rocket.velocity.x - target.velocity.x,
    y: rocket.velocity.y - target.velocity.y,
  };
  const r = Math.sqrt(relPos.x * relPos.x + relPos.y * relPos.y);

  if (type === "auto_circularize") {
    const mu = gConst * target.mass;
    const v_circ_mag = Math.sqrt(mu / r);
    // Desired velocity vector direction (tangent)
    const t1 = normalize({ x: -relPos.y, y: relPos.x });
    const t2 = normalize({ x: relPos.y, y: -relPos.x });
    // Choose tangent closest to current velocity direction
    const dot1 = t1.x * relVel.x + t1.y * relVel.y;
    const desiredDir = dot1 > 0 ? t1 : t2;

    const desiredVel = {
      x: desiredDir.x * v_circ_mag,
      y: desiredDir.y * v_circ_mag,
    };
    const deltaVVec = {
      x: desiredVel.x - relVel.x,
      y: desiredVel.y - relVel.y,
    };

    return {
      deltaV: Math.sqrt(deltaVVec.x * deltaVVec.x + deltaVVec.y * deltaVVec.y),
      angle: Math.atan2(deltaVVec.y, deltaVVec.x),
    };
  } else if (type === "auto_land") {
    // Kill Relative Velocity
    const dvMag = Math.sqrt(relVel.x * relVel.x + relVel.y * relVel.y);
    const dvAngle = Math.atan2(-relVel.y, -relVel.x);
    return { deltaV: dvMag, angle: dvAngle };
  } else if (type === "auto_transfer") {
    // PRECISE HOHMANN TRANSFER LOGIC
    let parent = null;
    if (parentId) {
      parent = bodies.find((b) => b.id === parentId);
    }

    if (!parent) {
      // Auto-detect parent
      let strongestG = 0;
      bodies.forEach((other) => {
        if (other.id === rocket.id || other.isRocket || other.id === target.id)
          return;
        const dx = other.position.x - rocket.position.x;
        const dy = other.position.y - rocket.position.y;
        const distSq = dx * dx + dy * dy;
        const gForce = other.mass / distSq;
        if (gForce > strongestG) {
          strongestG = gForce;
          parent = other;
        }
      });
    }

    if (!parent) return null;

    const mu = gConst * parent.mass;

    // 1. Calculate Rocket State relative to Parent
    const rPos = {
      x: rocket.position.x - parent.position.x,
      y: rocket.position.y - parent.position.y,
    };
    const rVel = {
      x: rocket.velocity.x - parent.velocity.x,
      y: rocket.velocity.y - parent.velocity.y,
    };
    const r1 = Math.sqrt(rPos.x * rPos.x + rPos.y * rPos.y);
    const v1 = Math.sqrt(rVel.x * rVel.x + rVel.y * rVel.y);

    // 2. Calculate Target State relative to Parent
    const tPos = {
      x: target.position.x - parent.position.x,
      y: target.position.y - parent.position.y,
    };
    const tVel = {
      x: target.velocity.x - parent.velocity.x,
      y: target.velocity.y - parent.velocity.y,
    };
    const rTargetCurr = Math.sqrt(tPos.x * tPos.x + tPos.y * tPos.y);
    const vTargetCurr = Math.sqrt(tVel.x * tVel.x + tVel.y * tVel.y);

    // 3. Determine r2 (Destination Radius)
    // Use Semi-Major Axis of target to handle eccentricity better
    const targetEnergy = (vTargetCurr * vTargetCurr) / 2 - mu / rTargetCurr;
    if (targetEnergy >= 0) return null; // Hyperbolic/Parabolic target orbit not supported
    const r2 = -mu / (2 * targetEnergy);

    // 4. Hohmann Transfer Calculation
    const transferEnergy = -mu / (r1 + r2);
    const vNeeded = Math.sqrt(2 * (transferEnergy + mu / r1));
    const deltaVMag = vNeeded - v1;

    // 5. Direction (Prograde or Retrograde)
    const progradeAngle = Math.atan2(rVel.y, rVel.x);
    const burnAngle = progradeAngle + (deltaVMag < 0 ? Math.PI : 0);

    return {
      deltaV: Math.abs(deltaVMag),
      angle: burnAngle,
    };
  } else if (type === "auto_intercept") {
    const timeOfFlight = Number(param) || 30;

    const steps = 50;
    const dt = timeOfFlight / steps;

    const predResult = predictSystemTrajectories(bodies, steps, dt, gConst, [
      target.id,
    ]);
    const targetPath = predResult.find((p) => p.id === target.id);

    if (!targetPath || targetPath.points.length === 0) return null;
    const finalPos = targetPath.points[targetPath.points.length - 1];

    let parent = null;
    if (parentId) parent = bodies.find((b) => b.id === parentId);
    if (!parent) {
      let strongestG = 0;
      bodies.forEach((other) => {
        if (other.id === rocket.id || other.isRocket || other.id === target.id)
          return;
        const dx = other.position.x - rocket.position.x;
        const dy = other.position.y - rocket.position.y;
        const distSq = dx * dx + dy * dy;
        const gForce = other.mass / distSq;
        if (gForce > strongestG) {
          strongestG = gForce;
          parent = other;
        }
      });
    }
    if (!parent) return null;
    const mu = gConst * parent.mass;

    const r1Rel = {
      x: rocket.position.x - parent.position.x,
      y: rocket.position.y - parent.position.y,
    };
    const r2Rel = {
      x: finalPos.x - parent.position.x,
      y: finalPos.y - parent.position.y,
    };

    const lambert = solveLambert(r1Rel, r2Rel, timeOfFlight, mu, false);

    if (lambert) {
      const vCurrentRel = {
        x: rocket.velocity.x - parent.velocity.x,
        y: rocket.velocity.y - parent.velocity.y,
      };
      const dv = {
        x: lambert.v1.x - vCurrentRel.x,
        y: lambert.v1.y - vCurrentRel.y,
      };

      return {
        deltaV: Math.sqrt(dv.x * dv.x + dv.y * dv.y),
        angle: Math.atan2(dv.y, dv.x),
      };
    }
  }

  return null;
};

export const updatePhysics = (
  bodies: Body[],
  totalDt: number,
  gConst: number,
  trailLength: number,
  enableCollisions: boolean,
): PhysicsResult => {
  // Adaptive Sub-stepping
  const TARGET_DT = 0.008;
  const numSteps = Math.ceil(Math.abs(totalDt) / TARGET_DT);
  const steps = Math.min(numSteps, 100);
  const dt = totalDt / steps;

  let currentBodies = bodies;
  let allNewParticles: Particle[] = [];
  let systemEvents: SystemEvent[] = [];

  // INITIAL GRAVITY CALCULATION (required for Velocity Verlet)
  let gravityForces = calculateForces(currentBodies, gConst);

  for (let s = 0; s < steps; s++) {
    // --- STEP 1: LOGIC, THRUST, HALF-KICK (Velocity), DRIFT (Position) ---
    const intermediateBodies = currentBodies.map((body, idx) => {
      let updatedBody = { ...body };

      // A. FLIGHT COMPUTER & LOGIC (Updates Thrust, Fuel, Maneuvers)
      // ============================================================

      // --- ROCKET LOGIC ---
      if (updatedBody.isRocket) {
        // 1. Identify Parent Body (for SAS / Navigation)
        let parent: Body | null = null;
        // Prefer explicit user selection
        if (updatedBody.orbitReferenceId) {
          parent =
            currentBodies.find((b) => b.id === updatedBody.orbitReferenceId) ||
            null;
        }
        // Fallback to strongest gravity
        if (!parent) {
          let strongestG = 0;
          currentBodies.forEach((other) => {
            if (other.id === updatedBody.id || other.isRocket) return;
            const dx = other.position.x - updatedBody.position.x;
            const dy = other.position.y - updatedBody.position.y;
            const distSq = dx * dx + dy * dy;
            const gForce = other.mass / distSq;
            if (gForce > strongestG) {
              strongestG = gForce;
              parent = other;
            }
          });
        }

        // 2. SAS Autopilot
        if (updatedBody.sasMode && updatedBody.sasMode !== "off" && parent) {
          const relVx = updatedBody.velocity.x - parent.velocity.x;
          const relVy = updatedBody.velocity.y - parent.velocity.y;
          const relX = updatedBody.position.x - parent.position.x;
          const relY = updatedBody.position.y - parent.position.y;

          let targetAngle = updatedBody.angle || 0;

          if (updatedBody.sasMode === "prograde") {
            targetAngle = Math.atan2(relVy, relVx);
          } else if (updatedBody.sasMode === "retrograde") {
            targetAngle = Math.atan2(relVy, relVx) + Math.PI;
          } else if (updatedBody.sasMode === "radial_out") {
            targetAngle = Math.atan2(relY, relX);
          } else if (updatedBody.sasMode === "radial_in") {
            targetAngle = Math.atan2(relY, relX) + Math.PI;
          }
          updatedBody.angle = targetAngle;
        }

        // 3. Process Maneuvers
        if (updatedBody.maneuvers && updatedBody.maneuvers.length > 0) {
          // Find first 'active' maneuver.
          const activeIdx = updatedBody.maneuvers.findIndex(
            (m) => m.status === "active",
          );

          if (activeIdx !== -1) {
            let m = { ...updatedBody.maneuvers[activeIdx] };

            // Handle Instant Starts
            if (m.type === "rotate") {
              updatedBody.angle =
                (updatedBody.angle || 0) +
                ((m.param as number) * Math.PI) / 180;
              m.status = "completed";
              m.progress = 1;
            } else if (m.type === "sas") {
              updatedBody.sasMode = m.param as any;
              // Store reference body for SAS if provided
              if (m.parentBodyId) {
                updatedBody.orbitReferenceId = m.parentBodyId;
              }
              m.status = "completed";
              m.progress = 1;
            } else if (m.type === "change_simulation_speed") {
              systemEvents.push({
                type: "set_speed",
                value: Number(m.param) || 1.0,
              });
              m.status = "completed";
              m.progress = 1;
            } else if (m.type === "stage") {
              // Stage separation is a React-side side-effect — emit an event
              // for App.tsx to call handleStageRocket(). Skip if no further
              // stages remain so we don't spin on a dead maneuver.
              const struct = updatedBody.shipStructure;
              if (
                struct &&
                struct.currentStageIndex < struct.stages.length - 1
              ) {
                systemEvents.push({
                  type: "stage_rocket",
                  rocketId: updatedBody.id,
                });
              }
              m.status = "completed";
              m.progress = 1;
            } else if (m.type.startsWith("auto_")) {
              const target = currentBodies.find((b) => b.id === m.targetBodyId);
              // Use explicitly recorded parent or fallback to current parent
              const refParentId =
                m.parentBodyId || (parent ? parent.id : undefined);

              if (target) {
                // CONTINUOUS CONTROL FOR CIRCULARIZE (Closed Loop)
                if (m.type === "auto_circularize") {
                  const res = calculateOrbitalManeuver(
                    updatedBody,
                    target,
                    "auto_circularize",
                    gConst,
                    currentBodies,
                    refParentId,
                  );

                  // Use a tight tolerance for "perfect" circularization
                  if (res && res.deltaV > 0.05) {
                    let thrustMag = MAX_ROCKET_THRUST;

                    // Proportional control for final approach to prevent overshoot/oscillation
                    // If deltaV is small, scale down thrust
                    if (res.deltaV < 0.5) {
                      thrustMag = MAX_ROCKET_THRUST * (res.deltaV / 0.5);
                    }

                    updatedBody.thrust = {
                      x: Math.cos(res.angle) * thrustMag,
                      y: Math.sin(res.angle) * thrustMag,
                    };

                    // Store initial DeltaV for progress bar
                    if (!(m as any).initialDeltaV) {
                      (m as any).initialDeltaV = res.deltaV;
                    }
                    const initialDV = (m as any).initialDeltaV || res.deltaV;
                    if (initialDV > 0) {
                      m.progress = Math.max(
                        0,
                        Math.min(1, 1 - res.deltaV / initialDV),
                      );
                    }
                  } else {
                    // Target reached
                    m.status = "completed";
                    m.progress = 1;
                    updatedBody.thrust = { x: 0, y: 0 };
                  }
                }
                // ONE-SHOT BURN CALCULATION FOR OTHERS (Transfer, Land)
                else {
                  if (m.type === "auto_land") {
                    updatedBody.landedOnBodyId = "landing";
                  }

                  const res = calculateOrbitalManeuver(
                    updatedBody,
                    target,
                    m.type as any,
                    gConst,
                    currentBodies,
                    refParentId,
                  );
                  if (res) {
                    // PRECISE BURN CALCULATION
                    let thrust = MAX_ROCKET_THRUST;

                    // Calculate burn duration
                    const mass = updatedBody.mass;
                    const duration = (mass * res.deltaV) / thrust;

                    // Store the absolute burn angle (not relative to heading)
                    m.type = "burn";
                    m.thrust = thrust;
                    m.duration = duration;
                    m.angleOffset = res.angle; // Store absolute angle
                    m.param = "absolute"; // Flag to indicate this is an absolute angle, not offset
                    m.progress = 0;
                    // NEW: Store target deltaV for accurate tracking
                    m.targetDeltaV = res.deltaV;
                    m.appliedDeltaV = 0;
                  } else {
                    m.status = "completed";
                  }
                }
              } else {
                m.status = "completed";
              }
            }
            // Handle wait_for_transfer
            else if (m.type === "wait_for_transfer") {
              const target = currentBodies.find((b) => b.id === m.targetBodyId);
              let refParent = currentBodies.find(
                (b) => b.id === m.parentBodyId,
              );

              if (!refParent && target) {
                // Auto-detect parent (most massive body)
                refParent = currentBodies
                  .filter((b) => !b.isRocket && b.id !== target.id)
                  .sort((a, b) => b.mass - a.mass)[0];
              }

              if (target && refParent) {
                const transferInfo = calculateTransferInfo(
                  updatedBody,
                  refParent,
                  target,
                  gConst,
                );
                const diff = Math.abs(transferInfo.errorAngle);
                const errorMargin = (0.5 * Math.PI) / 180; // 0.5 degrees

                //map error that is between 0 and 180 from 1 to 0 (0 -> 1, 180 -> 0)
                const progress = 1 - diff / Math.PI;
                m.progress = Math.max(0, Math.min(0.99, progress));

                if (diff < errorMargin) {
                  m.status = "completed";
                  m.progress = 1;
                }
              } else {
                m.status = "completed";
              }
            }
            // Handle wait_for_altitude
            else if (m.type === "wait_for_altitude") {
              let refParent = currentBodies.find(
                (b) => b.id === m.parentBodyId,
              );

              if (!refParent) {
                refParent = currentBodies
                  .filter((b) => !b.isRocket)
                  .sort((a, b) => b.mass - a.mass)[0];
              }

              if (refParent) {
                const dx = updatedBody.position.x - refParent.position.x;
                const dy = updatedBody.position.y - refParent.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const altitude = distance - refParent.radius; // Altitude above surface

                // Parse param: "altitude:direction" or just altitude for backward compatibility
                let targetAltitude = 100;
                let direction: "ascending" | "descending" = "ascending";

                if (typeof m.param === "string" && m.param.includes(":")) {
                  const parts = m.param.split(":");
                  targetAltitude = Number(parts[0]) || 100;
                  direction = parts[1] as "ascending" | "descending";
                } else {
                  targetAltitude = Number(m.param) || 100;
                }

                // Store previous altitude to detect direction of change
                if (m.progress === 0 && !m.startTime) {
                  m.startTime = Date.now();
                  (m as any).previousAltitude = altitude;
                }

                // Capture initial altitude for progress bar (idempotent)
                if (m.initialAltitude === undefined) {
                  m.initialAltitude = altitude;
                }

                const previousAltitude =
                  (m as any).previousAltitude || altitude;
                const isAscending = altitude > previousAltitude;
                const isDescending = altitude < previousAltitude;

                // Calculate Progress
                if (m.initialAltitude !== undefined) {
                  const totalChange = Math.abs(
                    targetAltitude - m.initialAltitude,
                  );
                  // const currentChange = Math.abs(altitude - m.initialAltitude);
                  const percentageOfTravel =
                    1 -
                    Math.abs((targetAltitude - altitude) / m.initialAltitude); // Simple approx
                  if (totalChange > 0.001) {
                    m.progress = Math.min(1, Math.max(0, percentageOfTravel));
                  }
                }

                // Check if we've reached the target altitude in the correct direction
                if (direction === "ascending") {
                  // Wait for altitude to be rising and reach target
                  if (
                    altitude >= targetAltitude &&
                    (isAscending || previousAltitude < targetAltitude)
                  ) {
                    m.status = "completed";
                    m.progress = 1;
                  }
                } else {
                  // Wait for altitude to be falling and reach target
                  if (
                    altitude <= targetAltitude &&
                    (isDescending || previousAltitude > targetAltitude)
                  ) {
                    m.status = "completed";
                    m.progress = 1;
                  }
                }

                // Update previous altitude for next frame
                (m as any).previousAltitude = altitude;
              } else {
                m.status = "completed";
              }
            }
            // Handle manual_node
            else if (m.type === "manual_node") {
              if (m.timeFromNow !== undefined) {
                m.timeFromNow -= dt;

                if (m.timeFromNow <= 0) {
                  // Convert to BURN
                  const dvP = m.deltaVPrograde || 0;
                  const dvR = m.deltaVRadial || 0;
                  const totalDV = Math.sqrt(dvP * dvP + dvR * dvR);
                  const angleFromPrograde = Math.atan2(dvR, dvP);

                  m.type = "burn";
                  m.thrust = MAX_ROCKET_THRUST;
                  m.duration = (updatedBody.mass * totalDV) / MAX_ROCKET_THRUST;
                  m.angleOffset = angleFromPrograde;
                  m.progress = 0;

                  // Force SAS to Prograde so angleOffset works correctly
                  updatedBody.sasMode = "prograde";
                  if (m.parentBodyId) {
                    updatedBody.orbitReferenceId = m.parentBodyId;
                  }
                }
              } else {
                m.timeFromNow = 0;
              }
            }
            // Handle burn_until_altitude
            else if (m.type === "burn_until_altitude") {
              let refParent = currentBodies.find(
                (b) => b.id === m.parentBodyId,
              );
              if (!refParent) {
                refParent = currentBodies
                  .filter((b) => !b.isRocket)
                  .sort((a, b) => b.mass - a.mass)[0];
              }
              if (refParent) {
                const dx = updatedBody.position.x - refParent.position.x;
                const dy = updatedBody.position.y - refParent.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const altitude = distance - refParent.radius;
                const targetAltitude = Number(m.param) || 100;

                if (altitude >= targetAltitude) {
                  // Target reached, complete maneuver
                  m.status = "completed";
                  m.progress = 1;
                  updatedBody.thrust = { x: 0, y: 0 };
                } else {
                  // Continue burning in specified direction
                  const heading = updatedBody.angle || 0;
                  const thrustAngle = heading + (m.angleOffset || 0);
                  const thrust = m.thrust || 0.005;

                  updatedBody.thrust = {
                    x: Math.cos(thrustAngle) * thrust,
                    y: Math.sin(thrustAngle) * thrust,
                  };
                  // ... progress calculation omitted for brevity as it was unchanged ...
                }
              } else {
                m.status = "completed";
              }
            }

            // Handle Time-Based (Burn/Wait)
            if (
              m.status === "active" &&
              (m.type === "burn" || m.type === "wait")
            ) {
              if (m.type === "burn") {
                // Check if this burn uses accurate deltaV tracking
                const useAccurateDV =
                  m.targetDeltaV !== undefined && m.targetDeltaV > 0;

                // Store initial velocity if not already stored (first frame of burn)
                if (useAccurateDV && !(m as any).initialVelocity) {
                  (m as any).initialVelocity = {
                    x: updatedBody.velocity.x,
                    y: updatedBody.velocity.y,
                  };
                }

                // Check if this is an absolute angle (from auto-maneuvers) or relative offset
                let thrustAngle;
                if (m.param === "absolute") {
                  thrustAngle = m.angleOffset;
                } else {
                  const heading = updatedBody.angle || 0;
                  thrustAngle = heading + m.angleOffset;
                }

                // Check if we've achieved target deltaV (for accurate burns)
                if (useAccurateDV && (m as any).initialVelocity) {
                  const dvX =
                    updatedBody.velocity.x - (m as any).initialVelocity.x;
                  const dvY =
                    updatedBody.velocity.y - (m as any).initialVelocity.y;
                  const currentDV = Math.sqrt(dvX * dvX + dvY * dvY);
                  m.appliedDeltaV = currentDV;

                  if (currentDV >= m.targetDeltaV) {
                    m.progress = 1;
                    m.status = "completed";
                    updatedBody.thrust = { x: 0, y: 0 };
                  } else {
                    m.progress = currentDV / m.targetDeltaV;
                  }
                }

                // Only apply thrust if not completed
                if (m.status === "active") {
                  // TIME-STEP INDEPENDENT BURN LOGIC
                  const remainingTime = m.duration * (1 - m.progress);
                  const burnDt = Math.min(dt, remainingTime);

                  if (burnDt > 0) {
                    const scale = burnDt / dt;
                    updatedBody.thrust = {
                      x: Math.cos(thrustAngle) * m.thrust * scale,
                      y: Math.sin(thrustAngle) * m.thrust * scale,
                    };
                  } else {
                    updatedBody.thrust = { x: 0, y: 0 };
                  }

                  // For non-accurate burns, use time-based completion
                  if (!useAccurateDV) {
                    if (m.duration > 0) {
                      const progressInc = dt / m.duration;
                      m.progress += progressInc;
                      if (m.progress >= 1) {
                        m.progress = 1;
                        m.status = "completed";
                        updatedBody.thrust = { x: 0, y: 0 };
                      }
                    } else {
                      m.status = "completed";
                    }
                  }
                }
              } else {
                // Wait maneuver
                updatedBody.thrust = { x: 0, y: 0 };
                if (m.duration > 0) {
                  const progressInc = dt / m.duration;
                  m.progress += progressInc;
                  if (m.progress >= 1) {
                    m.progress = 1;
                    m.status = "completed";
                  }
                } else {
                  m.status = "completed";
                }
              }
            }

            // Save updated maneuver
            const newManeuvers = [...updatedBody.maneuvers];
            newManeuvers[activeIdx] = m;
            updatedBody.maneuvers = newManeuvers;
          }
        }
      }

      // --- CONSUME FUEL (Logic Side Effect) ---
      if (
        updatedBody.thrust &&
        (Math.abs(updatedBody.thrust.x) > 0 ||
          Math.abs(updatedBody.thrust.y) > 0)
      ) {
        let hasFuel = false;
        if (
          updatedBody.shipStructure &&
          updatedBody.shipStructure.stages.length > 0
        ) {
          const struct = updatedBody.shipStructure;
          const idx = struct.currentStageIndex;
          if (idx >= 0 && idx < struct.stages.length) {
            hasFuel = struct.stages[idx].fuel > 0;
          }
        } else {
          hasFuel = updatedBody.fuel !== undefined && updatedBody.fuel > 0;
        }

        if (updatedBody.isRocket && !hasFuel) {
          updatedBody.thrust = { x: 0, y: 0 };
          if (!updatedBody.shipStructure) updatedBody.fuel = 0;
        } else if (updatedBody.isRocket) {
          const thrustMag = Math.sqrt(
            updatedBody.thrust.x ** 2 + updatedBody.thrust.y ** 2,
          );
          const consumed = thrustMag * FUEL_CONSUMPTION_RATE * dt;

          if (
            updatedBody.shipStructure &&
            updatedBody.shipStructure.stages.length > 0
          ) {
            const struct = updatedBody.shipStructure;
            const idx = struct.currentStageIndex;
            if (idx >= 0 && idx < struct.stages.length) {
              const activeStage = struct.stages[idx];
              activeStage.fuel = Math.max(0, activeStage.fuel - consumed);
              let totalFuel = 0;
              let totalMass = 0;
              for (let i = idx; i < struct.stages.length; i++) {
                const s = struct.stages[i];
                totalFuel += s.fuel;
                totalMass += s.mass || 0;
              }
              updatedBody.fuel = totalFuel;
              updatedBody.mass = totalMass;
            }
          } else if (updatedBody.fuel !== undefined) {
            updatedBody.fuel = Math.max(0, updatedBody.fuel - consumed);
          }
        }
      }

      // B. INTEGRATION FIRST HALF (Half-Kick + Drift)
      // =============================================

      // Calculate Force
      let fx = gravityForces[idx].x;
      let fy = gravityForces[idx].y;

      if (updatedBody.thrust) {
        fx += updatedBody.thrust.x;
        fy += updatedBody.thrust.y;
      }

      const ax = fx / updatedBody.mass;
      const ay = fy / updatedBody.mass;

      // Half-Kick V (v = v + 0.5 * a * dt)
      const vHalfX = updatedBody.velocity.x + 0.5 * ax * dt;
      const vHalfY = updatedBody.velocity.y + 0.5 * ay * dt;

      // Drift X (x = x + vHalf * dt)
      const newX = updatedBody.position.x + vHalfX * dt;
      const newY = updatedBody.position.y + vHalfY * dt;

      // --- LANDED ROCKET LOGIC (Position Constraint) ---
      if (updatedBody.landedOnBodyId) {
        // ... (Logic for docked/landed bodies - overriding position)
        // Check if we are applying thrust to takeoff
        const isThrusting =
          updatedBody.thrust &&
          (Math.abs(updatedBody.thrust.x) > 0.0001 ||
            Math.abs(updatedBody.thrust.y) > 0.0001);

        if (isThrusting) {
          updatedBody.landedOnBodyId = undefined;
          updatedBody.landingAngle = undefined;
          updatedBody.dockingRelativePosition = undefined;
          updatedBody.dockingRelativeAngle = undefined;
        } else if (updatedBody.landedOnBodyId.includes("rocket_")) {
          // DOCKING LOGIC (Using currentBodies for parent lookup, effectively t's state, but that's fine for constraint)
          const parent = currentBodies.find(
            (b) => b.id === updatedBody.landedOnBodyId,
          );
          if (parent) {
            // Reuse existing logic for relative pos/angle init
            let relPos = updatedBody.dockingRelativePosition;
            let relAngle = updatedBody.dockingRelativeAngle;

            // If not set, init (same as before)
            if (!relPos || relAngle === undefined) {
              const dx = updatedBody.position.x - parent.position.x;
              const dy = updatedBody.position.y - parent.position.y;
              const parentAngle = parent.angle || 0;
              const cos = Math.cos(-parentAngle);
              const sin = Math.sin(-parentAngle);
              relPos = {
                x: dx * cos - dy * sin,
                y: dx * sin + dy * cos,
              };
              relAngle = (updatedBody.angle || 0) - parentAngle;

              updatedBody.dockingRelativePosition = relPos;
              updatedBody.dockingRelativeAngle = relAngle;
            }

            const parentAngle = parent.angle || 0;
            const cos = Math.cos(parentAngle);
            const sin = Math.sin(parentAngle);
            const worldOffsetX = relPos.x * cos - relPos.y * sin;
            const worldOffsetY = relPos.x * sin + relPos.y * cos;

            const constrainedX = parent.position.x + worldOffsetX;
            const constrainedY = parent.position.y + worldOffsetY;

            return {
              ...updatedBody,
              position: { x: constrainedX, y: constrainedY },
              velocity: { ...parent.velocity }, // Match parent velocity
              angle: parentAngle + relAngle,
              trail: updatedBody.trail, // Preserve trail
            };
          } else {
            updatedBody.landedOnBodyId = undefined;
          }
        } else {
          // LANDING LOGIC
          const parent = currentBodies.find(
            (b) => b.id === updatedBody.landedOnBodyId,
          );
          if (parent) {
            if (updatedBody.landingAngle === undefined) {
              const dx = updatedBody.position.x - parent.position.x;
              const dy = updatedBody.position.y - parent.position.y;
              updatedBody.landingAngle = Math.atan2(dy, dx);
            }
            const surfaceDist = parent.radius + updatedBody.radius;
            const constrainedX =
              parent.position.x +
              Math.cos(updatedBody.landingAngle) * surfaceDist;
            const constrainedY =
              parent.position.y +
              Math.sin(updatedBody.landingAngle) * surfaceDist;

            return {
              ...updatedBody,
              position: { x: constrainedX, y: constrainedY },
              velocity: { ...parent.velocity },
              trail: updatedBody.trail,
            };
          } else {
            updatedBody.landedOnBodyId = undefined;
          }
        }
      }

      // Standard Physics Update

      // OPTIONAL: Trail Generation (in Drift phase?)
      let newTrail = updatedBody.trail;
      if (s === steps - 1) {
        if (Math.random() > 0.5) {
          // MUTABLE OPTIMIZATION:
          // Instead of creating a new array every frame with [...trail, point],
          // we push to the existing array and shift from the front.
          // This avoids massive GC pressure when trails are long (e.g. 5000 points).

          // 1. Push new point
          updatedBody.trail.push({ x: newX, y: newY });

          // 2. Enforce Limit
          // Use a while loop to handle cases where the limit was drastically reduced
          // (e.g. user changed settings from 5000 to 100)
          const limit = trailLength || 150;
          if (updatedBody.trail.length > limit) {
            // If we need to remove many points (resize), splice is faster than many shifts
            const excess = updatedBody.trail.length - limit;
            if (excess > 1) {
              updatedBody.trail.splice(0, excess);
            } else {
              updatedBody.trail.shift();
            }
          }

          // Note: We don't reassign newTrail because we modified the array in place.
          // updatedBody.trail refers to the same array as the one we just modified.
        }
      }

      return {
        ...updatedBody,
        position: { x: newX, y: newY },
        velocity: { x: vHalfX, y: vHalfY }, // Store vHalf temporarily in velocity
        trail: newTrail,
      };
    });

    // --- STEP 2: RECALCULATE FORCES ---
    // Calculate G-Forces at new Position
    const newGravityForces = calculateForces(intermediateBodies, gConst);

    // --- STEP 3: SECOND HALF-KICK & COLLISIONS ---
    const finalBodies = intermediateBodies.map((body, idx) => {
      // For landed bodies, we just skip integration
      if (body.landedOnBodyId) {
        return body;
      }

      // Calculate Force (New Gravity + Same Thrust)
      // Note: Thrust assumes constant over the step, which is standard.
      let fx = newGravityForces[idx].x;
      let fy = newGravityForces[idx].y;

      if (body.thrust) {
        fx += body.thrust.x;
        fy += body.thrust.y;
      }

      const ax = fx / body.mass;
      const ay = fy / body.mass;

      // Second Half-Kick V (v = vHalf + 0.5 * a * dt)
      // Note: body.velocity currently holds vHalf
      const vNewX = body.velocity.x + 0.5 * ax * dt;
      const vNewY = body.velocity.y + 0.5 * ay * dt;

      return {
        ...body,
        velocity: { x: vNewX, y: vNewY },
      };
    });

    // Resolve Collisions
    if (!enableCollisions) {
      currentBodies = finalBodies;
    } else {
      // ... Collision logic (same as before, mostly position based) ...

      const survivedBodies: Body[] = [];
      const mergedIndices = new Set<number>();
      const movedBodies = finalBodies; // alias

      for (let i = 0; i < movedBodies.length; i++) {
        if (mergedIndices.has(i)) continue;

        let currentBody = { ...movedBodies[i] };

        for (let j = i + 1; j < movedBodies.length; j++) {
          if (mergedIndices.has(j)) continue;

          const otherBody = movedBodies[j];
          const dx = currentBody.position.x - otherBody.position.x;
          const dy = currentBody.position.y - otherBody.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = currentBody.radius + otherBody.radius;

          if (dist < minDist) {
            // COLLISION DETECTED
            const isRocketA = !!currentBody.isRocket;
            const isRocketB = !!otherBody.isRocket;
            const isApple =
              currentBody.name.includes("Pomme") ||
              otherBody.name.includes("Pomme");

            if (isRocketA !== isRocketB || isApple) {
              const rocket = isRocketA ? currentBody : otherBody;
              const planet = isRocketA ? otherBody : currentBody;

              if (
                rocket.thrust &&
                (Math.abs(rocket.thrust.x) > 0.0001 ||
                  Math.abs(rocket.thrust.y) > 0.0001)
              ) {
                const dx = rocket.position.x - planet.position.x;
                const dy = rocket.position.y - planet.position.y;
                const dot = rocket.thrust.x * dx + rocket.thrust.y * dy;
                if (dot > 0) continue;
              }

              const dvx = rocket.velocity.x - planet.velocity.x;
              const dvy = rocket.velocity.y - planet.velocity.y;
              const relVel = Math.sqrt(dvx * dvx + dvy * dvy);
              const maxVel = isApple ? 100 : LANDING_MAX_VELOCITY;

              // check the rocket.angle is landing radial out , otherwise it's a crash
              let isLandingStraight = true; // TODO: implement
              const rocketAngle = rocket.angle;
              const targetAngle = Math.atan2(
                rocket.position.y - planet.position.y,
                rocket.position.x - planet.position.x,
              );
              const angleDiff = Math.abs(rocketAngle - targetAngle);
              if (angleDiff > 0.1) {
                isLandingStraight = false;
              }

              if (relVel < maxVel && isLandingStraight) {
                // Successful Landing
                if (isRocketA) {
                  currentBody.landedOnBodyId = planet.id;
                  currentBody.velocity = { ...planet.velocity };
                  // Position Adjustment
                  const landAngle = Math.atan2(
                    currentBody.position.y - otherBody.position.y,
                    currentBody.position.x - otherBody.position.x,
                  );
                  currentBody.position = {
                    x:
                      otherBody.position.x +
                      Math.cos(landAngle) *
                        (otherBody.radius + currentBody.radius),
                    y:
                      otherBody.position.y +
                      Math.sin(landAngle) *
                        (otherBody.radius + currentBody.radius),
                  };
                  continue;
                } else {
                  movedBodies[j] = {
                    ...otherBody,
                    landedOnBodyId: currentBody.id,
                    velocity: { ...currentBody.velocity },
                    position: {
                      x:
                        currentBody.position.x -
                        (dx / dist) * (currentBody.radius + otherBody.radius),
                      y:
                        currentBody.position.y -
                        (dy / dist) * (currentBody.radius + otherBody.radius),
                    },
                  };
                  continue;
                }
              }
            }

            // Verify Merge
            mergedIndices.add(j);
            const totalMass = currentBody.mass + otherBody.mass;
            const vX =
              (currentBody.velocity.x * currentBody.mass +
                otherBody.velocity.x * otherBody.mass) /
              totalMass;
            const vY =
              (currentBody.velocity.y * currentBody.mass +
                otherBody.velocity.y * otherBody.mass) /
              totalMass;
            const newRadius = Math.cbrt(
              Math.pow(currentBody.radius, 3) + Math.pow(otherBody.radius, 3),
            );

            const lightBody =
              currentBody.mass > otherBody.mass ? otherBody : currentBody;
            const heavyBody =
              currentBody.mass > otherBody.mass ? currentBody : otherBody;
            const pX =
              (currentBody.position.x * currentBody.mass +
                otherBody.position.x * otherBody.mass) /
              totalMass;
            const pY =
              (currentBody.position.y * currentBody.mass +
                otherBody.position.y * otherBody.mass) /
              totalMass;

            const collisionPointX =
              currentBody.position.x +
              (otherBody.position.x - currentBody.position.x) *
                (currentBody.radius / (currentBody.radius + otherBody.radius));
            const collisionPointY =
              currentBody.position.y +
              (otherBody.position.y - currentBody.position.y) *
                (currentBody.radius / (currentBody.radius + otherBody.radius));

            const intensity =
              Math.sqrt(lightBody.mass) +
              Math.sqrt(heavyBody.mass) +
              Math.sqrt(lightBody.velocity.x ** 2 + lightBody.velocity.y ** 2) +
              Math.sqrt(heavyBody.velocity.x ** 2 + heavyBody.velocity.y ** 2);

            const isRocketCollision = isRocketA || isRocketB;
            let explosionIntensity = intensity;
            if (isRocketCollision) {
              explosionIntensity = Math.min(
                Math.max(explosionIntensity, 10),
                50,
              );
            }
            allNewParticles.push(
              ...createExplosion(
                collisionPointX,
                collisionPointY,
                lightBody.color,
                explosionIntensity,
                dt,
              ),
            );

            currentBody = {
              ...currentBody,
              mass: totalMass,
              radius: newRadius,
              position: { x: pX, y: pY },
              velocity: { x: vX, y: vY },
              name:
                currentBody.mass > otherBody.mass
                  ? currentBody.name
                  : otherBody.name,
              description: `${currentBody.name} merged with ${otherBody.name}`,
              trail:
                currentBody.mass > otherBody.mass
                  ? currentBody.trail
                  : otherBody.trail,
              landedOnBodyId: undefined,
            };
          }
        }
        survivedBodies.push(currentBody);
      }
      currentBodies = survivedBodies;
    }

    // Update gravity forces for next Step 1 (reusing the ones calculated at end of step 2)
    gravityForces = newGravityForces;
  }

  return { bodies: currentBodies, newParticles: allNewParticles, systemEvents };
};

export const predictSystemTrajectories = (
  bodies: Body[],
  steps: number,
  dt: number,
  gConst: number,
  bodyIds?: string[],
): { id: string; color: string; points: Vector2D[] }[] => {
  let simBodies = bodies.map((b) => ({ ...b }));

  const paths = (
    bodyIds && bodyIds.length > 0
      ? simBodies.filter((b) => bodyIds.includes(b.id))
      : simBodies
  ).map((b) => ({
    id: b.id,
    color: b.color,
    points: [] as Vector2D[],
  }));

  const MAX_POINTS = 10000;
  const stride = Math.max(1, Math.ceil(steps / MAX_POINTS));

  // VELOCITY VERLET PREDICTION

  // Initial Forces
  let gravityForces = calculateForces(simBodies, gConst);

  for (let k = 0; k < steps; k++) {
    // --- STEP 1: Half-Kick + Drift ---
    const intermediateBodies = simBodies.map((b, i) => {
      let updatedV = { ...b.velocity };

      // Apply Maneuver Delta-V (Impulsive)
      const simTime = k * dt;
      if (b.isRocket && b.maneuvers) {
        b.maneuvers.forEach((m) => {
          if (m.type === "manual_node" && m.timeFromNow !== undefined) {
            if (simTime >= m.timeFromNow && simTime < m.timeFromNow + dt) {
              const vMag = Math.sqrt(
                b.velocity.x * b.velocity.x + b.velocity.y * b.velocity.y,
              );
              if (vMag > 0.0001) {
                const prograde = {
                  x: b.velocity.x / vMag,
                  y: b.velocity.y / vMag,
                };
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

      // Half-Kick (Gravity)
      const ax = gravityForces[i].x / b.mass;
      const ay = gravityForces[i].y / b.mass;

      const vHalfX = updatedV.x + 0.5 * ax * dt;
      const vHalfY = updatedV.y + 0.5 * ay * dt;

      // Drift
      const newX = b.position.x + vHalfX * dt;
      const newY = b.position.y + vHalfY * dt;

      return {
        ...b,
        position: { x: newX, y: newY },
        velocity: { x: vHalfX, y: vHalfY }, // Store vHalf
      };
    });

    // --- STEP 2: New Forces ---
    const newGravityForces = calculateForces(intermediateBodies, gConst);

    // --- STEP 3: Second Half-Kick ---
    simBodies = intermediateBodies.map((b, i) => {
      const ax = newGravityForces[i].x / b.mass;
      const ay = newGravityForces[i].y / b.mass;

      const vFinalX = b.velocity.x + 0.5 * ax * dt;
      const vFinalY = b.velocity.y + 0.5 * ay * dt;

      return {
        ...b,
        velocity: { x: vFinalX, y: vFinalY },
      };
    });

    // Loop Update
    gravityForces = newGravityForces;

    // Record Points
    if (k % stride === 0) {
      paths.forEach((path) => {
        const body = simBodies.find((sb) => sb.id === path.id);
        if (body && path.points.length < MAX_POINTS) {
          path.points.push({ x: body.position.x, y: body.position.y });
        }
      });
    }
  }

  return paths;
};

export const predictPath = (
  currentBodies: Body[],
  candidate: Body,
  steps: number,
  dt: number,
  gConst: number,
): Vector2D[] => {
  const all = [...currentBodies, candidate];
  const results = predictSystemTrajectories(all, steps, dt, gConst, [
    candidate.id,
  ]);
  const candidatePath = results.find((r) => r.id === candidate.id);
  return candidatePath ? candidatePath.points : [];
};

export const calculateOrbitalPoints = (
  body: Body,
  parent: Body,
  gConst: number,
): { periapsis: Vector2D; apoapsis: Vector2D | null } | null => {
  const mu = gConst * parent.mass;
  if (mu <= 0) return null;

  const rx = body.position.x - parent.position.x;
  const ry = body.position.y - parent.position.y;
  // Relative Velocity for accuracy
  const vx = body.velocity.x - parent.velocity.x;
  const vy = body.velocity.y - parent.velocity.y;

  const r = Math.sqrt(rx * rx + ry * ry);
  const vSq = vx * vx + vy * vy;

  const h = rx * vy - ry * vx;

  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const eccentricity = Math.sqrt(ex * ex + ey * ey);

  const epsilon = vSq / 2 - mu / r;

  const a = -mu / (2 * epsilon);

  const rPe = a * (1 - eccentricity);

  const rAp = a * (1 + eccentricity);

  let eNormX = 0,
    eNormY = 0;
  if (eccentricity > 0.0001) {
    eNormX = ex / eccentricity;
    eNormY = ey / eccentricity;
  } else {
    return null;
  }

  const periapsis = {
    x: parent.position.x + eNormX * rPe,
    y: parent.position.y + eNormY * rPe,
  };

  let apoapsis: Vector2D | null = null;
  if (eccentricity < 0.99 && epsilon < 0) {
    apoapsis = {
      x: parent.position.x - eNormX * rAp,
      y: parent.position.y - eNormY * rAp,
    };
  }

  return { periapsis, apoapsis };
};

export const calculateEllipsePoints = (
  body: Body,
  parent: Body,
  gConst: number,
  numPoints: number = 720,
): Vector2D[] | null => {
  const mu = gConst * parent.mass;
  if (mu <= 0) return null;

  const rx = body.position.x - parent.position.x;
  const ry = body.position.y - parent.position.y;
  const vx = body.velocity.x - parent.velocity.x;
  const vy = body.velocity.y - parent.velocity.y;

  const r = Math.sqrt(rx * rx + ry * ry);
  const vSq = vx * vx + vy * vy;

  const h = rx * vy - ry * vx;

  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const eccentricity = Math.sqrt(ex * ex + ey * ey);

  const epsilon = vSq / 2 - mu / r;

  // Only draw ellipse for bound orbits
  if (epsilon >= 0 || eccentricity >= 0.99) return null;

  const a = -mu / (2 * epsilon);
  const b = a * Math.sqrt(1 - eccentricity * eccentricity);

  // Eccentricity vector points from focus (parent) toward periapsis
  // Get the angle of the eccentricity vector (direction to periapsis)
  let eAngle = 0;
  if (eccentricity > 0.0001) {
    eAngle = Math.atan2(ey, ex);
  }

  // The parent body is at one focus of the ellipse
  // The center of the ellipse is offset from the parent by distance 'c'
  // in the direction OPPOSITE to periapsis (away from eccentricity vector)
  const c = a * eccentricity;
  const centerX = parent.position.x - c * Math.cos(eAngle);
  const centerY = parent.position.y - c * Math.sin(eAngle);

  // Generate points along the ellipse
  const points: Vector2D[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const theta = (i / numPoints) * 2 * Math.PI;

    // Point on ellipse in local coordinates (centered at origin)
    // theta = 0 corresponds to periapsis direction
    const localX = a * Math.cos(theta);
    const localY = b * Math.sin(theta);

    // Rotate by eccentricity angle (periapsis direction)
    const rotatedX = localX * Math.cos(eAngle) - localY * Math.sin(eAngle);
    const rotatedY = localX * Math.sin(eAngle) + localY * Math.cos(eAngle);

    // Translate to world coordinates
    points.push({
      x: centerX + rotatedX,
      y: centerY + rotatedY,
    });
  }

  return points;
};

export const solveLambert = (
  r1: Vector2D,
  r2: Vector2D,
  dt: number,
  mu: number,
  cw: boolean = false,
): { v1: Vector2D; v2: Vector2D } | null => {
  const r1Mag = Math.sqrt(r1.x * r1.x + r1.y * r1.y);
  const r2Mag = Math.sqrt(r2.x * r2.x + r2.y * r2.y);

  if (dt <= 0 || mu <= 0 || r1Mag === 0 || r2Mag === 0) return null;

  // 1. Calculate Transfer Angle (dNu)
  const cross = r1.x * r2.y - r1.y * r2.x;
  const dot = r1.x * r2.x + r1.y * r2.y;

  let dNu = Math.atan2(Math.abs(cross), dot);

  // Determine transfer direction
  if (cw) {
    if (cross > 0) dNu = 2 * Math.PI - dNu;
  } else {
    if (cross < 0) dNu = 2 * Math.PI - dNu;
  }

  const A = Math.sin(dNu) * Math.sqrt((r1Mag * r2Mag) / (1 - Math.cos(dNu)));

  // Stumpff functions
  const stumpffC = (z: number) => {
    if (z > 0) return (1 - Math.cos(Math.sqrt(z))) / z;
    if (z < 0) return (Math.cosh(Math.sqrt(-z)) - 1) / -z;
    return 0.5;
  };

  const stumpffS = (z: number) => {
    if (z > 0)
      return (Math.sqrt(z) - Math.sin(Math.sqrt(z))) / (z * Math.sqrt(z));
    if (z < 0)
      return (Math.sinh(Math.sqrt(-z)) - Math.sqrt(-z)) / (-z * Math.sqrt(-z));
    return 1 / 6;
  };

  let z = 0;
  let iter = 0;
  const MAX_ITER = 60;

  // Secant Method State
  let z_prev = 0;
  let t_prev = -1; // Flag to indicate first pass
  let initialized = false;

  while (iter < MAX_ITER) {
    const C = stumpffC(z);
    const S = stumpffS(z);

    const y = r1Mag + r2Mag + (A * (z * S - 1)) / Math.sqrt(C);

    // If y becomes negative, we are out of physical bounds (complex x).
    // This often happens if z is too negative (hyperbola too fast) or A is large.
    if (isNaN(y) || y < 0) {
      // Retreat towards z=0 or previous safe value
      if (initialized) {
        z = z_prev + (0 - z_prev) * 0.5; // Try to recover
        z_prev = 0; // Reset
        t_prev = -1;
        initialized = false;
      } else {
        z += 0.1; // Just bump it
      }
      iter++;
      continue;
    }

    const x = Math.sqrt(y / C);
    const t = (Math.pow(x, 3) * S + A * Math.sqrt(y)) / Math.sqrt(mu);

    if (Math.abs(t - dt) < 1e-5) break;

    if (!initialized) {
      // First iteration: we have result for z=0 (or initial z)
      // Need a second point to start Secant
      z_prev = z;
      t_prev = t;

      // Heuristic slope
      if (t < dt) {
        // Actual time is too short. We need longer path? No.
        // Lambert:
        // z > 0 (Ellipse) -> Slower, Longer time
        // z < 0 (Hyperbola) -> Faster, Shorter time
        // If t(calculated) < dt(target), we are TOO FAST.
        // We need to SLOW DOWN -> Increase z.
        z = 1.0;
      } else {
        // t > dt. We are too slow.
        // We need to SPEED UP -> Decrease z.
        z = -1.0;
      }
      initialized = true;
    } else {
      // Secant Step
      // Avoid division by zero
      if (Math.abs(t - t_prev) < 1e-9) {
        z += 0.1; // Nudge
      } else {
        const next_z = z - ((t - dt) * (z - z_prev)) / (t - t_prev);
        z_prev = z;
        t_prev = t;
        z = next_z;
      }
    }

    iter++;
  }

  const C = stumpffC(z);
  const S = stumpffS(z);
  const y = r1Mag + r2Mag + (A * (z * S - 1)) / Math.sqrt(C);

  const f = 1 - y / r1Mag;
  const g = A * Math.sqrt(y / mu);
  const gDot = 1 - y / r2Mag;

  const v1 = {
    x: (r2.x - f * r1.x) / g,
    y: (r2.y - f * r1.y) / g,
  };

  const v2 = {
    x: (gDot * r2.x - r1.x) / g,
    y: (gDot * r2.y - r1.y) / g,
  };

  return { v1, v2 };
};

export const reverseTime = (bodies: Body[]): Body[] => {
  return bodies.map((body) => ({
    ...body,
    velocity: { x: -body.velocity.x, y: -body.velocity.y },
    trail: [],
    thrust: body.thrust ? { x: -body.thrust.x, y: -body.thrust.y } : undefined,
  }));
};
