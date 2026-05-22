
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useThree, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { Body, Vector2D, Particle, VisualConfig, PhysicsConfig, CoMData, FlightComputerModule, FlightComputerInput, RendezvousSolution, MarkerShape } from '../types';
import { calculateOrbitalPoints, calculateEllipsePoints, calculateForces } from '../services/physicsEngineNew';
import { resolveInput, resolveStringInput, resolveBooleanInput } from '@/services/orbitalMath';

interface Canvas3DProps {
    bodies: Body[];
    particles: Particle[];
    width: number;
    height: number;
    scale: number;
    offset: Vector2D;
    onPan: (dx: number, dy: number) => void;
    onZoom: (delta: number, clientX?: number, clientY?: number) => void;
    onSelectBody: (id: string | null) => void;
    selectedBodyId: string | null;
    visualConfig: VisualConfig;
    physicsConfig: PhysicsConfig;

    isCreationMode: boolean;
    creationCandidate: Body | null;
    predictionPaths: { id: string, color: string, points: Vector2D[] }[];
    onCanvasClick: (x: number, y: number) => void;

    isRocketMode: boolean;
    isRocketSpawning: boolean;
    rocketTargetBodyId?: string;

    observerBodyIds: { a: string | null; b: string | null };

    coMData: CoMData | null;

    showTransferWindow: boolean;
    showTheoreticalOrbit: boolean;
    followingBodyId: string | null;
    followingCoM: boolean;
    flightComputerModules: FlightComputerModule[];
    rendezvousPoint?: Vector2D | null; // Legacy from RocketPanel
    rendezvousPoints?: Array<{
        point: Vector2D;
        name: string;
        color: string;
        moduleId: string;
        timeToRendezvous: number;
        distance: number;
        deltaVPrograde: number;
        deltaVRadial: number;
        totalDeltaV: number;
    }>;
}

// ... (rest of file)

// --- TEXTURE GENERATION ---
const useGlowTexture = () => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 64, 64);
        }
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }, []);
};

const sanitizeMarkerColor = (value?: string | null, fallback = '#ffffff') => {
    if (!value) return fallback;
    const trimmed = value.trim();
    return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
};

const getPulsePhase = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash << 5) - hash + id.charCodeAt(i);
        hash |= 0;
    }
    return (hash % 360) / 57.2958;
};

const extractVector = (value: Body | Vector2D): Vector2D => ('position' in value ? value.position : value);

// --- HELPER COMPONENTS ---

const BodyMesh: React.FC<{
    body: Body;
    isSelected: boolean;
    onSelect: (id: string) => void;
    visualConfig: VisualConfig;
    isGhost?: boolean;
    scale: number;
    width: number;
    height: number;
    offset: Vector2D;
    onCanvasClick: (x: number, y: number) => void;
}> = ({ body, isSelected, onSelect, visualConfig, isGhost, scale, width, height, offset, onCanvasClick }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowTexture = useGlowTexture();

    // Trail
    const trailPoints = useMemo(() => {
        if (!visualConfig.showTrails || !body.trail || isGhost) return [];
        return body.trail.map(p => new THREE.Vector3(p.x, -p.y, 0)); // Negate Y for Canvas coordinate system
    }, [body.trail, visualConfig.showTrails, isGhost]);

    return (
        <group>
            {!isGhost && visualConfig.showTrails && trailPoints.length > 1 && (
                <Line
                    points={trailPoints}
                    color={body.color}
                    lineWidth={1}
                    opacity={0.5}
                    transparent
                />
            )}

            {/* Rocket or Body Mesh */}
            {body.isRocket ? (
                /* ROCKET RENDERING */
                <group position={[body.position.x, -body.position.y, 0]} rotation={[0, 0, -(body.angle || 0) - Math.PI / 2]}>{/* Negate angle for Y-flip */}
                    {/* Thrust Flame */}
                    {body.thrust && (Math.abs(body.thrust.x) > 0.01 || Math.abs(body.thrust.y) > 0.01) && (
                        <group position={[0, -body.radius * 2, 0]}>
                            {/* Main flame cone */}
                            <mesh rotation={[0, 0, 0]}>
                                <coneGeometry args={[body.radius * 1.5, body.radius * 4, 8]} />
                                <meshBasicMaterial
                                    color="#ff6600"
                                    transparent
                                    opacity={0.8}
                                    blending={THREE.AdditiveBlending}
                                />
                            </mesh>
                            {/* Inner bright core */}
                            <mesh rotation={[0, 0, 0]}>
                                <coneGeometry args={[body.radius * 0.8, body.radius * 3, 6]} />
                                <meshBasicMaterial
                                    color="#ffff00"
                                    transparent
                                    opacity={0.9}
                                    blending={THREE.AdditiveBlending}
                                />
                            </mesh>
                        </group>
                    )}

                    {/* Rocket Body - Cone shape pointing up (direction of travel) */}
                    <mesh
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(body.id);
                            // Also trigger onCanvasClick for rocket spawning
                            const screenX = (body.position.x * scale) + (width / 2 + offset.x);
                            const screenY = (body.position.y * scale) + (height / 2 + offset.y);
                            onCanvasClick(screenX, screenY);
                        }}
                        castShadow
                        receiveShadow
                    >
                        <coneGeometry args={[body.radius * 1.5, body.radius * 4, 8]} />
                        <meshStandardMaterial
                            color={body.color}
                            transparent={isGhost}
                            opacity={isGhost ? 0.5 : 1}
                            roughness={0.9}
                            metalness={0.1}
                        />
                    </mesh>

                    {/* Rocket fins */}
                    {[0, 120, 240].map((angle, i) => (
                        <mesh
                            key={i}
                            position={[
                                Math.cos((angle * Math.PI) / 180) * body.radius * 1.2,
                                -body.radius * 1.5,
                                Math.sin((angle * Math.PI) / 180) * body.radius * 1.2
                            ]}
                            rotation={[0, 0, (angle * Math.PI) / 180]}
                            castShadow
                        >
                            <boxGeometry args={[body.radius * 0.3, body.radius * 1.5, body.radius * 0.1]} />
                            <meshStandardMaterial
                                color={body.color}
                                transparent={isGhost}
                                opacity={isGhost ? 0.5 : 1}
                                roughness={0.3}
                                metalness={0.7}
                            />
                        </mesh>
                    ))}

                    {/* Selection Ring */}
                    {isSelected && (
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, body.radius, 0]}>
                            <ringGeometry args={[body.radius * 2, body.radius * 2.2, 64]} />
                            <meshBasicMaterial color="orange" side={THREE.DoubleSide} transparent opacity={0.8} />
                        </mesh>
                    )}

                    {/* Label - only for high mass rockets, not when selected */}
                    {!isSelected && body.mass > 100 && (
                        <Html position={[0, body.radius * 3, 0]} center distanceFactor={1000}>
                            <div className="px-2 py-1 bg-orange-900/50 text-orange-200 text-xs rounded border border-orange-500/40 whitespace-nowrap pointer-events-none select-none backdrop-blur-sm font-bold">
                                🚀 {body.name}
                            </div>
                        </Html>
                    )}
                </group>
            ) : (
                /* PLANET/STAR RENDERING */
                <mesh
                    ref={meshRef}
                    position={[body.position.x, -body.position.y, 0]}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(body.id);
                        // Also trigger onCanvasClick for rocket spawning
                        const screenX = (body.position.x * scale) + (width / 2 + offset.x);
                        const screenY = (body.position.y * scale) + (height / 2 + offset.y);
                        onCanvasClick(screenX, screenY);
                    }}
                    castShadow={!body.isStar && !isGhost}
                    receiveShadow={!body.isStar && !isGhost}
                >
                    <sphereGeometry args={[body.radius, 64, 64]} />
                    {body.isStar ? (
                        <meshBasicMaterial
                            color={body.color}
                            transparent={isGhost}
                            opacity={isGhost ? 0.5 : 1}
                        />
                    ) : (
                        <meshStandardMaterial
                            color={body.color}
                            transparent={isGhost}
                            opacity={isGhost ? 0.5 : 1}
                            roughness={0.4}
                            metalness={0.1}
                        />
                    )}

                    {/* Selection Ring */}
                    {isSelected && (
                        <mesh rotation={[0, 0, 0]}>
                            <ringGeometry args={[body.radius * 1.2, body.radius * 1.3, 64]} />
                            <meshBasicMaterial color="white" side={THREE.DoubleSide} transparent opacity={0.8} />
                        </mesh>
                    )}

                    {/* Label */}
                    {(isSelected || body.mass > 100) && (
                        <Html position={[0, body.radius * 1.5, 0]} center distanceFactor={1000}>
                            <div className="px-2 py-1 bg-black/50 text-white text-xs rounded border border-white/20 whitespace-nowrap pointer-events-none select-none backdrop-blur-sm">
                                {body.name}
                            </div>
                        </Html>
                    )}
                </mesh>
            )}

            {/* Enhanced Atmosphere / Glow */}
            {!body.isRocket && (visualConfig.showGlow || body.isStar) && (
                <group position={[body.position.x, -body.position.y, 0]}>
                    {/* Geometric Glow (Atmosphere) for Planets */}
                    {!body.isStar && visualConfig.showGlow && (
                        <mesh>
                            <sphereGeometry args={[body.radius * 1.15, 32, 32]} />
                            <meshBasicMaterial
                                color={body.color}
                                transparent
                                opacity={0.2}
                                depthWrite={false}
                                blending={THREE.AdditiveBlending}
                            />
                        </mesh>
                    )}

                    {/* Massive Sprite Glow (Star Corona) */}
                    {body.isStar && (
                        <>
                            {/* Inner bright glow */}
                            <sprite scale={[body.radius * 6, body.radius * 6, 1]}>
                                <spriteMaterial
                                    map={glowTexture}
                                    color={body.color}
                                    transparent
                                    opacity={0.8}
                                    blending={THREE.AdditiveBlending}
                                    depthWrite={false}
                                />
                            </sprite>
                            {/* Outer corona */}
                            <sprite scale={[body.radius * 12, body.radius * 12, 1]}>
                                <spriteMaterial
                                    map={glowTexture}
                                    color={body.color}
                                    transparent
                                    opacity={0.3}
                                    blending={THREE.AdditiveBlending}
                                    depthWrite={false}
                                />
                            </sprite>
                        </>
                    )}
                </group>
            )}
        </group>
    );
};

const Particles: React.FC<{ particles: Particle[] }> = ({ particles }) => {
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(particles.length * 3);
        const colors = new Float32Array(particles.length * 3);

        particles.forEach((p, i) => {
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = -p.y; // Negate Y
            positions[i * 3 + 2] = 0;

            const color = new THREE.Color(p.color);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        });

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return geo;
    }, [particles]);

    return (
        <points>
            <primitive object={geometry} />
            <pointsMaterial size={4} vertexColors transparent opacity={0.8} sizeAttenuation={false} blending={THREE.AdditiveBlending} />
        </points>
    );
};

const PredictionLines: React.FC<{ paths: { color: string, points: Vector2D[] }[] }> = ({ paths }) => {
    return (
        <>
            {paths.map((path, i) => (
                <Line
                    key={i}
                    points={path.points.map(p => new THREE.Vector3(p.x, -p.y, 0))} // Negate Y
                    color={path.color}
                    lineWidth={1}
                    dashed
                    dashScale={5}
                    gapSize={2}
                    opacity={0.5}
                    transparent
                />
            ))}
        </>
    );
};

const RocketOverlay: React.FC<{
    bodies: Body[];
    selectedBodyId: string | null;
    targetBodyId?: string;
    showTheoreticalOrbit: boolean;
    showTransferWindow: boolean;
    physicsConfig: PhysicsConfig;
}> = ({ bodies, selectedBodyId, targetBodyId, showTheoreticalOrbit, showTransferWindow, physicsConfig }) => {
    const body = bodies.find(b => b.id === selectedBodyId);
    const target = bodies.find(b => b.id === targetBodyId);
    const parent = bodies.find(b => b.id === body?.orbitReferenceId);

    if (!body?.isRocket || !target) return null;

    const ellipsePoints = useMemo(() => {
        if (!showTheoreticalOrbit) return [];
        return calculateEllipsePoints(body, target, physicsConfig.gravitationalConstant);
    }, [body, target, showTheoreticalOrbit, physicsConfig.gravitationalConstant]);

    const orbitalPoints = useMemo(() => {
        return calculateOrbitalPoints(body, target, physicsConfig.gravitationalConstant);
    }, [body, target, physicsConfig.gravitationalConstant]);

    return (
        <group>
            {/* Theoretical Orbit */}
            {showTheoreticalOrbit && ellipsePoints.length > 0 && (
                <Line
                    points={ellipsePoints.map(p => new THREE.Vector3(p.x, -p.y, 0))} // Negate Y
                    color={body.color}
                    lineWidth={1}
                    dashed
                    opacity={0.3}
                    transparent
                />
            )}

            {/* Markers */}
            {orbitalPoints?.periapsis && (
                <Html position={[orbitalPoints.periapsis.x, -orbitalPoints.periapsis.y, 0]}> {/* Negate Y */}
                    <div className="text-[10px] font-bold text-cyan-400">Pe</div>
                </Html>
            )}
            {orbitalPoints?.apoapsis && (
                <Html position={[orbitalPoints.apoapsis.x, -orbitalPoints.apoapsis.y, 0]}> {/* Negate Y */}
                    <div className="text-[10px] font-bold text-orange-400">Ap</div>
                </Html>
            )}

            {/* Transfer Window Lines */}
            {showTransferWindow && parent && (
                <>
                    {/* Logic duplicated from Canvas.tsx for visualization */}
                    {(() => {
                        const r2 = Math.sqrt(Math.pow(target.position.x - parent.position.x, 2) + Math.pow(target.position.y - parent.position.y, 2));
                        const r1 = Math.sqrt(Math.pow(body.position.x - parent.position.x, 2) + Math.pow(body.position.y - parent.position.y, 2));
                        const a_transfer = (r1 + r2) / 2;
                        const period_target = 2 * Math.PI * Math.sqrt(Math.pow(r2, 3) / (physicsConfig.gravitationalConstant * parent.mass));
                        const period_transfer = 2 * Math.PI * Math.sqrt(Math.pow(a_transfer, 3) / (physicsConfig.gravitationalConstant * parent.mass));
                        const travelTime = period_transfer / 2;
                        const targetMotion = (360 / period_target) * travelTime;
                        const requiredPhaseRad = (180 - targetMotion) * Math.PI / 180;

                        const rocketAngle = Math.atan2(body.position.y - parent.position.y, body.position.x - parent.position.x);
                        const idealTargetAngle = rocketAngle + requiredPhaseRad;
                        const idealX = parent.position.x + Math.cos(idealTargetAngle) * r2;
                        const idealY = parent.position.y + Math.sin(idealTargetAngle) * r2;

                        return (
                            <>
                                <Line points={[[parent.position.x, -parent.position.y, 0], [body.position.x, -body.position.y, 0]]} color="#22d3ee" opacity={0.4} transparent dashed /> {/* Negate Y */}
                                <Line points={[[parent.position.x, -parent.position.y, 0], [idealX, -idealY, 0]]} color="#f97316" opacity={0.4} transparent dashed /> {/* Negate Y */}
                                <Html position={[idealX, -idealY, 0]}> {/* Negate Y */}
                                    <div className="text-[8px] text-orange-500 font-mono">WINDOW</div>
                                </Html>
                            </>
                        );
                    })()}
                </>
            )}
        </group>
    );
};

const GravitationalWaves: React.FC<{ bodies: Body[], physicsConfig: PhysicsConfig, showWaves: boolean }> = ({ bodies, physicsConfig, showWaves }) => {
    const wavesRef = useRef<{ x: number, y: number, radius: number, maxRadius: number, alpha: number, color: string, speed: number }[]>([]);
    const forces = useMemo(() => calculateForces(bodies, physicsConfig.gravitationalConstant), [bodies, physicsConfig.gravitationalConstant]);

    useFrame(() => {
        if (!showWaves) return;

        // Spawn waves
        bodies.forEach((body, idx) => {
            if (body.mass > 10) {
                const f = forces[idx];
                const acceleration = Math.sqrt(f.x * f.x + f.y * f.y) / body.mass;
                if (acceleration > 0.02 && Math.random() < Math.min(0.8, acceleration * 0.5)) {
                    wavesRef.current.push({
                        x: body.position.x,
                        y: -body.position.y, // Negate Y
                        radius: body.radius,
                        maxRadius: body.radius * 30 + (body.mass * 0.5),
                        alpha: Math.min(0.6, acceleration * 3.0),
                        color: body.color,
                        speed: (2 + acceleration * 10) * 0.1
                    });
                }
            }
        });

        // Update waves
        wavesRef.current = wavesRef.current.filter(w => {
            w.radius += w.speed;
            w.alpha *= 0.96;
            return w.alpha > 0.01 && w.radius < w.maxRadius;
        });
    });

    return (
        <>
            {wavesRef.current.map((wave, i) => (
                <mesh key={i} position={[wave.x, wave.y, -1]} rotation={[0, 0, 0]}>
                    <ringGeometry args={[wave.radius, wave.radius + 2, 32]} />
                    <meshBasicMaterial color={wave.color} transparent opacity={wave.alpha} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </>
    );
};

const ObserverOverlay: React.FC<{
    bodies: Body[];
    observerBodyIds: { a: string | null; b: string | null };
    physicsConfig: PhysicsConfig;
}> = ({ bodies, observerBodyIds, physicsConfig }) => {
    const bodyA = bodies.find(b => b.id === observerBodyIds.a);
    const bodyB = bodies.find(b => b.id === observerBodyIds.b);

    const forces = useMemo(() => calculateForces(bodies, physicsConfig.gravitationalConstant), [bodies, physicsConfig.gravitationalConstant]);

    if (!bodyA || !bodyB) return null;

    const FORCE_SCALE = 1.5;
    const VELOCITY_SCALE = 15;

    const drawVector = (start: Vector2D, dir: Vector2D, length: number, color: string) => {
        return (
            <group>
                <Line
                    points={[[start.x, start.y, 0], [start.x + dir.x * length, start.y + dir.y * length, 0]]}
                    color={color}
                    lineWidth={2}
                />
                <mesh position={[start.x + dir.x * length, start.y + dir.y * length, 0]} rotation={[0, 0, Math.atan2(dir.y, dir.x)]}>
                    <coneGeometry args={[2, 8, 8]} />
                    <meshBasicMaterial color={color} />
                </mesh>
            </group>
        );
    };

    return (
        <group>
            {/* Connection Line */}
            <Line
                points={[[bodyA.position.x, -bodyA.position.y, 0], [bodyB.position.x, -bodyB.position.y, 0]]} // Negate Y
                color="#22d3ee"
                lineWidth={2}
                dashed
                dashScale={5}
                opacity={0.5}
                transparent
            />

            {/* Pairwise Force Vectors (Red) */}
            {(() => {
                const dx = bodyB.position.x - bodyA.position.x;
                const dy = bodyB.position.y - bodyA.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const forceMag = (physicsConfig.gravitationalConstant * bodyA.mass * bodyB.mass) / (dist * dist);
                const dirX = dx / dist;
                const dirY = dy / dist;
                const visualForceLen = Math.min(300, forceMag * FORCE_SCALE);

                return (
                    <>
                        {drawVector(bodyA.position, { x: dirX, y: dirY }, visualForceLen, '#ef4444')}
                        {drawVector(bodyB.position, { x: -dirX, y: -dirY }, visualForceLen, '#ef4444')}
                    </>
                );
            })()}

            {/* Net Force Vectors (Yellow) */}
            {(() => {
                const idxA = bodies.findIndex(b => b.id === bodyA.id);
                const fA = forces[idxA];
                const fMagA = Math.sqrt(fA.x * fA.x + fA.y * fA.y);

                const idxB = bodies.findIndex(b => b.id === bodyB.id);
                const fB = forces[idxB];
                const fMagB = Math.sqrt(fB.x * fB.x + fB.y * fB.y);

                return (
                    <>
                        {fMagA > 0.0001 && drawVector(bodyA.position, { x: fA.x / fMagA, y: fA.y / fMagA }, Math.min(300, fMagA * FORCE_SCALE), '#fbbf24')}
                        {fMagB > 0.0001 && drawVector(bodyB.position, { x: fB.x / fMagB, y: fB.y / fMagB }, Math.min(300, fMagB * FORCE_SCALE), '#fbbf24')}
                    </>
                );
            })()}

            {/* Velocity Vectors (Green) */}
            {(() => {
                const vMagA = Math.sqrt(bodyA.velocity.x * bodyA.velocity.x + bodyA.velocity.y * bodyA.velocity.y);
                const vMagB = Math.sqrt(bodyB.velocity.x * bodyB.velocity.x + bodyB.velocity.y * bodyB.velocity.y);

                return (
                    <>
                        {vMagA > 0.01 && drawVector(bodyA.position, { x: bodyA.velocity.x / vMagA, y: bodyA.velocity.y / vMagA }, Math.min(300, vMagA * VELOCITY_SCALE), '#4ade80')}
                        {vMagB > 0.01 && drawVector(bodyB.position, { x: bodyB.velocity.x / vMagB, y: bodyB.velocity.y / vMagB }, Math.min(300, vMagB * VELOCITY_SCALE), '#4ade80')}
                    </>
                );
            })()}
        </group>
    );
};

const GravityGrid: React.FC<{ bodies: Body[], visualConfig: VisualConfig, width: number, height: number, scale: number, offset: Vector2D }> = ({ bodies, visualConfig, width, height, scale, offset }) => {
    const geometryRef = useRef<THREE.BufferGeometry>(null);
    const { camera } = useThree(); // Access the 3D camera

    useFrame(() => {
        if (!geometryRef.current || !visualConfig.showGrid) return;

        // Calculate grid spacing (same logic as 2D)
        const targetScreenSpacing = 15; // Reduced from 50 to increase density (more vertices)
        const baseGridSpacing = visualConfig.gridSpacing;

        // Use camera distance to determine scale in 3D
        // visibleHeight at z=0 = 2 * cameraZ * tan(fov/2)
        // scale ~ height / visibleHeight
        const cameraZ = Math.max(10, camera.position.z);
        const fov = (camera as THREE.PerspectiveCamera).fov || 50;
        const visibleHeight = 2 * cameraZ * Math.tan((fov * Math.PI) / 360);
        const effectiveScale = height / visibleHeight;

        const approximateWorldSpacing = targetScreenSpacing / effectiveScale;
        const power = Math.round(Math.log2(approximateWorldSpacing / baseGridSpacing));
        const renderGridSize = baseGridSpacing * Math.pow(2, power);
        const spacing = renderGridSize;

        // Calculate view bounds based on camera position
        const centerX = camera.position.x;
        const centerY = camera.position.y;

        // Calculate visible range with a generous buffer (4x) to cover tilt/rotation
        const aspect = width / height;
        const rangeY = visibleHeight * 2; // 2x buffer up/down
        const rangeX = visibleHeight * aspect * 2; // 2x buffer left/right

        const startX = Math.floor((centerX - rangeX) / spacing) * spacing;
        const endX = Math.floor((centerX + rangeX) / spacing) * spacing;
        const startY = Math.floor((centerY - rangeY) / spacing) * spacing;
        const endY = Math.floor((centerY + rangeY) / spacing) * spacing;

        const points: number[] = [];

        // Helper to distort point
        const getDistortedPoint = (wx: number, wy: number) => {
            let dx = 0;
            let dy = 0;

            for (const body of bodies) {
                if (body.mass < 10) continue;
                const bdx = body.position.x - wx;
                const bdy = -body.position.y - wy; // Negate body Y to match our world space
                const distSq = bdx * bdx + bdy * bdy;
                if (distSq > 500000 && body.mass < 1000) continue;
                const dist = Math.sqrt(distSq);
                if (dist < 1) continue;
                // Exaggerated effect: Increased multiplier from 30 to 150, max force from 60 to 300
                const force = Math.min(300, (body.mass * 10) / (distSq + 500));
                dx += (bdx / dist) * force;
                dy += (bdy / dist) * force;
            }
            return { x: wx + dx, y: wy + dy };
        };

        // Vertical lines
        for (let x = startX; x <= endX; x += spacing) {
            for (let y = startY; y < endY; y += spacing) {
                const p1 = getDistortedPoint(x, y);
                const p2 = getDistortedPoint(x, y + spacing);
                points.push(p1.x, p1.y, 0);
                points.push(p2.x, p2.y, 0);
            }
        }

        // Horizontal lines
        for (let y = startY; y <= endY; y += spacing) {
            for (let x = startX; x < endX; x += spacing) {
                const p1 = getDistortedPoint(x, y);
                const p2 = getDistortedPoint(x + spacing, y);
                points.push(p1.x, p1.y, 0);
                points.push(p2.x, p2.y, 0);
            }
        }

        geometryRef.current.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geometryRef.current.attributes.position.needsUpdate = true;
    });

    if (!visualConfig.showGrid) return null;

    return (
        <lineSegments>
            <bufferGeometry ref={geometryRef} />
            <lineBasicMaterial color="#64748b" transparent opacity={visualConfig.gridOpacity} />
        </lineSegments>
    );
};

const CoMOverlay: React.FC<{ coMData: CoMData | null, visualConfig: VisualConfig }> = ({ coMData, visualConfig }) => {
    if (!visualConfig.showCenterOfMass || !coMData) return null;

    const CROSS_SIZE = 50;

    return (
        <group>
            {/* Real CoM (Gray) */}
            <group position={[coMData.realCoM.x, -coMData.realCoM.y, 0]}> {/* Negate Y */}
                <Line
                    points={[[-CROSS_SIZE, 0, 0], [CROSS_SIZE, 0, 0]]}
                    color="#6b7280"
                    lineWidth={1}
                    transparent
                    opacity={0.5}
                />
                <Line
                    points={[[0, -CROSS_SIZE, 0], [0, CROSS_SIZE, 0]]}
                    color="#6b7280"
                    lineWidth={1}
                    transparent
                    opacity={0.5}
                />
            </group>

            {/* Refined CoM (Red) */}
            <group position={[coMData.refinedCoM.x, -coMData.refinedCoM.y, 0]}> {/* Negate Y */}
                <Line
                    points={[[-CROSS_SIZE, 0, 0], [CROSS_SIZE, 0, 0]]}
                    color="#ef4444"
                    lineWidth={2}
                />
                <Line
                    points={[[0, -CROSS_SIZE, 0], [0, CROSS_SIZE, 0]]}
                    color="#ef4444"
                    lineWidth={2}
                />
            </group>
        </group>
    );
};



const Marker3D: React.FC<{
    id: string;
    point: Vector2D;
    color: string;
    shape: MarkerShape;
    pulse: boolean;
    title: string;
    description?: string;
}> = ({ id, point, color, shape, pulse, title, description }) => {
    const groupRef = useRef<THREE.Group>(null);
    const phase = useMemo(() => getPulsePhase(id), [id]);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const scale = pulse ? 1 + Math.sin(clock.getElapsedTime() * 3 + phase) * 0.2 : 1;
        groupRef.current.scale.set(scale, scale, scale);
    });

    const shapeElements = useMemo(() => {
        const commonCross = (
            <>
                <Line points={[[-14, 0, 0], [14, 0, 0]]} color={color} lineWidth={1.5} />
                <Line points={[[0, -14, 0], [0, 14, 0]]} color={color} lineWidth={1.5} />
            </>
        );

        switch (shape) {
            case 'diamond':
                return (
                    <>
                        <Line points={[[0, -12, 0], [12, 0, 0], [0, 12, 0], [-12, 0, 0], [0, -12, 0]]} color={color} lineWidth={2} />
                        {commonCross}
                    </>
                );
            case 'square':
                return (
                    <>
                        <Line points={[[-12, -12, 0], [12, -12, 0], [12, 12, 0], [-12, 12, 0], [-12, -12, 0]]} color={color} lineWidth={2} />
                        {commonCross}
                    </>
                );
            case 'triangle':
                return (
                    <>
                        <Line points={[[0, -14, 0], [12, 12, 0], [-12, 12, 0], [0, -14, 0]]} color={color} lineWidth={2} />
                        {commonCross}
                    </>
                );
            case 'pin':
                return (
                    <>
                        <mesh position={[0, -4, 0]}>
                            <sphereGeometry args={[4, 16, 16]} />
                            <meshBasicMaterial color={color} />
                        </mesh>
                        <mesh position={[0, 8, 0]} rotation={[0, 0, Math.PI]}>
                            <coneGeometry args={[3, 12, 16]} />
                            <meshBasicMaterial color={color} transparent opacity={0.85} />
                        </mesh>
                    </>
                );
            default:
                return (
                    <>
                        <mesh>
                            <ringGeometry args={[8, 10, 32]} />
                            <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
                        </mesh>
                        <mesh>
                            <ringGeometry args={[5, 7, 32]} />
                            <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
                        </mesh>
                        {commonCross}
                    </>
                );
        }
    }, [color, shape]);

    return (
        <group ref={groupRef} position={[point.x, -point.y, 0]}>
            {shapeElements}
            <Html position={[0, -18, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                <div className="px-2 py-1 rounded border border-slate-700 bg-slate-900/80 text-[10px] font-mono text-slate-100 whitespace-pre leading-tight">
                    <div className="font-bold text-[11px]" style={{ color }}>{title}</div>
                    {description && <div className="opacity-80">{description}</div>}
                </div>
            </Html>
        </group>
    );
};


const FlightComputerOverlay: React.FC<{
    modules: FlightComputerModule[];
    bodies: Body[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutions?: Record<string, RendezvousSolution>;
}> = ({ modules, bodies, physicsConfig, rendezvousSolutions }) => {
    const resolveVectorInputValue = (input?: FlightComputerInput) => {
        if (!input) return null;
        const resolved = resolveInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutions);
        if (!resolved) return null;
        return extractVector(resolved as Body | Vector2D);
    };

    const resolveMarkerString = (input: FlightComputerInput | undefined, fallback: string) => {
        if (!input) return fallback;
        const resolved = resolveStringInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutions);
        return resolved ?? fallback;
    };

    const resolveMarkerBoolean = (input: FlightComputerInput | undefined, fallback: boolean) => {
        if (!input) return fallback;
        const resolved = resolveBooleanInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutions);
        return resolved ?? fallback;
    };

    return (
        <group>

        </group>
    );
};

// Rendezvous Marker Component
const RendezvousMarker: React.FC<{
    point: Vector2D;
    name: string;
    color: string;
    timeToRendezvous?: number;
    deltaVPrograde?: number;
    deltaVRadial?: number;
    totalDeltaV?: number;
}> = ({ point, name, color, timeToRendezvous, deltaVPrograde, deltaVRadial, totalDeltaV }) => {
    const meshRef = useRef<THREE.Group>(null);

    // Pulsing animation
    useFrame(({ clock }) => {
        if (meshRef.current) {
            const scale = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
            meshRef.current.scale.set(scale, scale, scale);
        }
    });

    // Convert hex color to rgba for background
    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Format time: only show non-zero values
    let timeStr = '';
    let secondsStr = '';
    if (timeToRendezvous !== undefined) {
        const totalSeconds = Math.floor(timeToRendezvous);
        const years = Math.floor(totalSeconds / (365.25 * 24 * 3600));
        const remainingAfterYears = totalSeconds % (365.25 * 24 * 3600);
        const months = Math.floor(remainingAfterYears / (30.44 * 24 * 3600));
        const remainingAfterMonths = remainingAfterYears % (30.44 * 24 * 3600);
        const days = Math.floor(remainingAfterMonths / (24 * 3600));
        const remainingAfterDays = remainingAfterMonths % (24 * 3600);
        const hours = Math.floor(remainingAfterDays / 3600);
        const minutes = Math.floor((remainingAfterDays % 3600) / 60);
        const seconds = Math.floor(remainingAfterDays % 60);

        const timeParts = [];
        if (years > 0) timeParts.push(`${years}y`);
        if (months > 0) timeParts.push(`${months}m`);
        if (days > 0) timeParts.push(`${days}d`);
        if (hours > 0) timeParts.push(`${hours}h`);
        if (minutes > 0) timeParts.push(`${minutes}m`);
        if (seconds > 0 && timeParts.length === 0) timeParts.push(`${seconds}s`); // Show seconds only if everything else is 0

        timeStr = timeParts.length > 0 ? timeParts.join(' ') : '0s';
        secondsStr = `${timeToRendezvous.toFixed(1)}s`;
    }

    return (
        <group ref={meshRef} position={[point.x, -point.y, 0]}>
            {/* Outer ring */}
            <mesh>
                <ringGeometry args={[8, 10, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>

            {/* Inner cross */}
            <Line
                points={[[-12, 0, 0], [12, 0, 0]]}
                color={color}
                lineWidth={2}
            />
            <Line
                points={[[0, -12, 0], [0, 12, 0]]}
                color={color}
                lineWidth={2}
            />

            {/* Center dot */}
            <mesh>
                <sphereGeometry args={[2, 16, 16]} />
                <meshBasicMaterial color={color} />
            </mesh>

            {/* Label */}
            <Html position={[0, 15, 0]} center style={{ pointerEvents: 'none' }}>
                <div style={{
                    background: hexToRgba(color, 0.2),
                    border: `1px solid ${color}`,
                    borderRadius: '4px',
                    padding: '4px 8px',
                    color: color,
                    fontSize: '12px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    textShadow: `0 0 4px ${hexToRgba(color, 0.8)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                }}>
                    <div>{name.toUpperCase()}</div>
                    {timeToRendezvous !== undefined && (
                        <>
                            <div style={{ fontSize: '9px', opacity: 0.9 }}>{timeStr}</div>
                            <div style={{ fontSize: '9px', opacity: 0.9 }}>{secondsStr}</div>
                        </>
                    )}
                    {totalDeltaV !== undefined && (
                        <>
                            <div style={{ fontSize: '9px', opacity: 0.9 }}>ΔV: {totalDeltaV.toFixed(1)} m/s</div>
                            <div style={{ fontSize: '8px', opacity: 0.8 }}>P:{deltaVPrograde?.toFixed(1)} R:{deltaVRadial?.toFixed(1)}</div>
                        </>
                    )}
                </div>
            </Html>
        </group>
    );
};

const SceneContent: React.FC<Canvas3DProps> = (props) => {
    const { bodies, particles, visualConfig, selectedBodyId, onSelectBody, onCanvasClick, isCreationMode, creationCandidate, predictionPaths, width, height, scale, offset, isRocketMode, rocketTargetBodyId, showTheoreticalOrbit, showTransferWindow, physicsConfig, observerBodyIds, followingBodyId, followingCoM, coMData, flightComputerModules, rendezvousPoint, rendezvousPoints } = props;

    const controlsRef = useRef<any>(null);
    const { camera } = useThree();
    const previousFollowingId = useRef<string | null>(null);
    const wasFollowingCoM = useRef(false);

    // Initial Camera Setup to match 2D view
    useEffect(() => {
        controlsRef.current?.update();
    }, [controlsRef.current]);

    const rendezvousSolutionMap = useMemo<Record<string, RendezvousSolution> | undefined>(() => {
        if (!rendezvousPoints || rendezvousPoints.length === 0) return undefined;
        const map: Record<string, RendezvousSolution> = {};
        rendezvousPoints.forEach(point => {
            map[point.moduleId] = {
                moduleId: point.moduleId,
                name: point.name,
                color: point.color,
                point: point.point,
                timeToRendezvous: point.timeToRendezvous,
                distance: point.distance,
                deltaVPrograde: point.deltaVPrograde,
                deltaVRadial: point.deltaVRadial,
                totalDeltaV: point.totalDeltaV
            };
        });
        return map;
    }, [rendezvousPoints]);

    return (
        <>

            {/* NO ambient light - pure darkness except for stars */}

            <ambientLight intensity={0} />

            {/* Star Point Lights - VERY STRONG */}
            {bodies.filter(b => b.isStar).map(star => (
                <pointLight
                    key={`light-${star.id}`}
                    position={[star.position.x, -star.position.y, 100]} // Negate Y 
                    intensity={100000}
                    distance={100000}
                    decay={1.1}
                    castShadow
                    shadow-mapSize={[4096 * 16, 4096 * 16]}
                    shadow-camera-near={1}
                    shadow-camera-far={100000}
                    shadow-bias={-0.0001}
                    shadow-radius={2}
                />
            ))}

            {visualConfig.showStars && <Stars radius={5000} depth={50} count={visualConfig.starDensity * 5} factor={4} saturation={0} fade speed={1} />}

            {/* Gravity Grid */}
            <GravityGrid
                bodies={bodies}
                visualConfig={visualConfig}
                width={width}
                height={height}
                scale={scale}
                offset={offset}
            />

            {/* Bodies */}
            {bodies.map(body => (
                <BodyMesh
                    key={body.id}
                    body={body}
                    isSelected={body.id === selectedBodyId}
                    onSelect={onSelectBody}
                    visualConfig={visualConfig}
                    scale={scale}
                    width={width}
                    height={height}
                    offset={offset}
                    onCanvasClick={onCanvasClick}
                />
            ))}

            {/* Particles */}
            <Particles particles={particles} />

            {/* Prediction Lines */}
            <PredictionLines paths={predictionPaths} />

            {/* Creation Mode Ghost */}
            {isCreationMode && creationCandidate && (
                <>
                    <BodyMesh
                        body={creationCandidate}
                        isSelected={false}
                        onSelect={() => { }}
                        visualConfig={visualConfig}
                        isGhost={true}
                        scale={scale}
                        width={width}
                        height={height}
                        offset={offset}
                        onCanvasClick={onCanvasClick}
                    />
                    {/* Velocity Arrow */}
                    <Line
                        points={[
                            [creationCandidate.position.x, -creationCandidate.position.y, 0], // Negate Y
                            [creationCandidate.position.x + creationCandidate.velocity.x * 10, -(creationCandidate.position.y + creationCandidate.velocity.y * 10), 0] // Negate Y
                        ]}
                        color={creationCandidate.color}
                        lineWidth={2}
                    />
                </>
            )}

            {/* Flight Computer Overlay */}
            <FlightComputerOverlay
                modules={flightComputerModules}
                bodies={bodies}
                physicsConfig={physicsConfig}
                rendezvousSolutions={rendezvousSolutionMap}
            />

            {/* Rocket Overlay (Legacy/Quick View) */}
            {isRocketMode && selectedBodyId && (
                <RocketOverlay
                    bodies={bodies}
                    selectedBodyId={selectedBodyId}
                    targetBodyId={rocketTargetBodyId}
                    showTheoreticalOrbit={showTheoreticalOrbit}
                    showTransferWindow={showTransferWindow}
                    physicsConfig={physicsConfig}
                />
            )}

            {/* Observer Overlay */}
            {observerBodyIds.a && observerBodyIds.b && (
                <ObserverOverlay
                    bodies={bodies}
                    observerBodyIds={observerBodyIds}
                    physicsConfig={physicsConfig}
                />
            )}

            {/* CoM Overlay */}
            <CoMOverlay coMData={coMData} visualConfig={visualConfig} />

            {/* Rendezvous Markers */}
            {rendezvousPoint && <RendezvousMarker point={rendezvousPoint} name="RENDEZVOUS" color="#00ff88" />}
            {rendezvousPoints && rendezvousPoints.map((rdv, index) => (
                <RendezvousMarker
                    key={rdv.moduleId}
                    point={rdv.point}
                    name={rdv.name}
                    color={rdv.color}
                    timeToRendezvous={rdv.timeToRendezvous}
                    deltaVPrograde={rdv.deltaVPrograde}
                    deltaVRadial={rdv.deltaVRadial}
                    totalDeltaV={rdv.totalDeltaV}
                />
            ))}

            {/* Gravitational Waves */}
            <GravitationalWaves bodies={bodies} physicsConfig={physicsConfig} showWaves={visualConfig.showWaves} />

            {/* Invisible plane for clicking/raycasting at z=0 */}
            <mesh position={[0, 0, -5]} onPointerMissed={() => !isCreationMode && onSelectBody(null)} visible={false}>
                <planeGeometry args={[1000000, 1000000]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Grid Helper Removed - replaced by GravityGrid */}

            <OrbitControls
                ref={controlsRef}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                mouseButtons={{
                    LEFT: THREE.MOUSE.PAN,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.ROTATE
                }}
            />
        </>
    );
};

const Canvas3D: React.FC<Canvas3DProps> = (props) => {
    return (
        <div style={{ width: props.width, height: props.height, background: '#000' }}>
            <Canvas shadows camera={{ position: [0, 0, 1000], fov: 45, far: 1000000 }}>
                <SceneContent {...props} />
            </Canvas>
        </div>
    );
};

export default Canvas3D;
