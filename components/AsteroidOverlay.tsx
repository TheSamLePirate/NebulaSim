
import React, { useRef, useEffect, useState } from 'react';
import { AsteroidEngine } from '../services/AsteroidEngine';
import { Body, PhysicsConfig, Vector2D } from '../types';

interface AsteroidOverlayProps {
    width: number;
    height: number;
    scale: number;
    offset: Vector2D;
    bodies: Body[];
    physicsConfig: PhysicsConfig;
    simulationSpeed: number;
    showDensity?: boolean;
}

const AsteroidOverlay: React.FC<AsteroidOverlayProps> = ({
    width,
    height,
    scale,
    offset,
    bodies,
    physicsConfig,
    simulationSpeed,
    showDensity = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<AsteroidEngine | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const requestRef = useRef<number | null>(null);

    // Initialization
    useEffect(() => {
        const initEngine = async () => {
            if (canvasRef.current && !engineRef.current) {
                const engine = new AsteroidEngine();
                const success = await engine.init(canvasRef.current);
                if (success) {
                    engineRef.current = engine;
                    setIsInitialized(true);
                }
            }
        };
        initEngine();

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, []);

    // Update View Params
    useEffect(() => {
        if (engineRef.current && isInitialized) {
            engineRef.current.updateView(scale, offset, width, height);
        }
    }, [scale, offset, width, height, isInitialized]);

    // Sync density overlay state
    useEffect(() => {
        if (engineRef.current && isInitialized) {
            engineRef.current.setDensityEnabled(showDensity);
        }
    }, [showDensity, isInitialized]);

    // Handle Asteroid Spawning (On System Change)
    const lastSystemIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (engineRef.current && isInitialized && bodies.length > 0) {
            // Identify the "System" by the main body (Sun) ID to detect preset changes
            // Use same logic as engine to find sun
            let sun = bodies.find(b => b.mass > 1000);
            if (!sun) sun = bodies[0];

            if (sun.id !== lastSystemIdRef.current) {
                console.log("System changed, spawning asteroids...", sun.id);
                // Pass G const
                engineRef.current.spawnAsteroids(bodies, physicsConfig.gravitationalConstant);
                lastSystemIdRef.current = sun.id;
            }
        }
    }, [bodies, isInitialized, physicsConfig.gravitationalConstant]);

    // Update Bodies & Physics Params
    useEffect(() => {
        if (engineRef.current && isInitialized) {
            engineRef.current.updateBodies(bodies);

            // Find Sun for mass/pos
            let sun = bodies.find(b => b.mass > 1000);
            if (!sun) sun = bodies[0];

            if (!sun) return;


            // Consistent with Engine defaults
            const minRadius = 300;
            const maxRadius = 5000;

            // In AsteroidEngine shader, dt is used as-is. 
            // Our physics loop might pass a larger dt based on time acceleration.
            // If physicsConfig.timeStep is the simulation tick (e.g. 0.1 or 1.0 depending on speed), pass it directly.
            engineRef.current.updateParams(
                physicsConfig.timeStep * simulationSpeed,
                physicsConfig.gravitationalConstant,
                bodies.length,
                minRadius,
                maxRadius,
                sun.mass,
                sun.position
            );
        }
    }, [bodies, physicsConfig, simulationSpeed, isInitialized]);


    // Animation Loop
    const animate = () => {
        if (engineRef.current && isInitialized) {
            engineRef.current.step();
            // Render density heatmap if enabled
            if (engineRef.current.isDensityEnabled()) {
                engineRef.current.renderDensity();
            }
        }
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (isInitialized) {
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isInitialized]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none', // Allow clicks to pass through to main canvas
                zIndex: 5, // Above standard canvas (usually 0 or 1), below UI (usually 10+)
            }}
        />
    );
};

export default AsteroidOverlay;
