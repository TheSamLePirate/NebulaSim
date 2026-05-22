import React, { useRef, useEffect, useState } from 'react';
import { Body, FlightComputerModule, Vector2D, PhysicsConfig, RendezvousSolution } from '../types';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { calculateEllipsePoints } from '../services/physicsEngineNew';
import { resolveInput } from '../services/orbitalMath';
import { isModuleActive } from './flight_computer/utils';

interface MinimapPanelProps {
    bodies: Body[];
    flightComputerModules: FlightComputerModule[];
    predictionPaths: { id: string, color: string, points: Vector2D[] }[];
    physicsConfig: PhysicsConfig;
    onClose: () => void;
}

const MinimapPanel: React.FC<MinimapPanelProps> = ({ bodies, flightComputerModules, predictionPaths, physicsConfig, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        let animationId: number;
        const render = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const width = container.clientWidth;
            const height = container.clientHeight;

            // Update canvas size if needed (handling pixel density could be added here for sharpness)
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // 1. Clear Canvas
            ctx.fillStyle = '#0f172a'; // Slate-900 like background
            ctx.fillRect(0, 0, width, height);

            // 2. Calculate Bounds
            if (bodies.length === 0) return;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            bodies.forEach(b => {
                if (b.position.x < minX) minX = b.position.x;
                if (b.position.y < minY) minY = b.position.y;
                if (b.position.x > maxX) maxX = b.position.x;
                if (b.position.y > maxY) maxY = b.position.y;
            });

            // Add some padding
            const paddingPercentage = 0.1;
            const rangeX = maxX - minX;
            const rangeY = maxY - minY;
            const paddingX = rangeX * paddingPercentage;
            const paddingY = rangeY * paddingPercentage;

            minX -= paddingX || 1000; // Fallback if single point
            maxX += paddingX || 1000;
            minY -= paddingY || 1000;
            maxY += paddingY || 1000;

            const worldWidth = maxX - minX;
            const worldHeight = maxY - minY;

            // Calculate Scale ensuring Aspect Ratio fit
            const scaleX = width / worldWidth;
            const scaleY = height / worldHeight;
            const scale = Math.min(scaleX, scaleY);

            // Center the logic
            const worldCenterX = (minX + maxX) / 2;
            const worldCenterY = (minY + maxY) / 2;
            const cx = width / 2;
            const cy = height / 2;

            // project function
            const project = (x: number, y: number) => {
                return {
                    x: cx + (x - worldCenterX) * scale,
                    y: cy + (y - worldCenterY) * scale
                };
            };

            // 3. Draw Grid (Optional, subtle)
            ctx.strokeStyle = '#1e293b'; // Slate-800
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Simple crosshair at 0,0
            const p0 = project(0, 0);
            ctx.moveTo(p0.x - 10, p0.y);
            ctx.lineTo(p0.x + 10, p0.y);
            ctx.moveTo(p0.x, p0.y - 10);
            ctx.lineTo(p0.x, p0.y + 10);
            ctx.stroke();

            // 4. Draw Prediction Paths (Orbits)
            ctx.lineWidth = 1;
            predictionPaths.forEach(path => {
                if (path.points.length < 2) return;

                ctx.strokeStyle = path.color || '#4ade80'; // Default green if missing
                ctx.globalAlpha = 0.5;
                ctx.beginPath();

                let first = true;
                path.points.forEach(p => {
                    const screenPos = project(p.x, p.y);
                    if (first) {
                        ctx.moveTo(screenPos.x, screenPos.y);
                        first = false;
                    } else {
                        ctx.lineTo(screenPos.x, screenPos.y);
                    }
                });

                ctx.stroke();
                ctx.globalAlpha = 1.0;
            });

            // 5. Draw Flight Computer Orbits
            flightComputerModules.forEach(module => {
                // Determine enablement/activity
                if (!module.isEnabled) return;
                // Use empty rendezvous map as we likely don't need it for basic resolving
                // or we can just ignore it for orbit displays unless strictly needed
                const rendezvousSolutionMap: Record<string, RendezvousSolution> = {};

                if (!isModuleActive(module, bodies, flightComputerModules, physicsConfig, {})) return;

                if (module.type === 'orbit_info') {
                    const primaryInput = module.inputs?.primary;
                    const referenceInput = module.inputs?.reference;

                    let primary = resolveInput(primaryInput, bodies, flightComputerModules, physicsConfig.gravitationalConstant, rendezvousSolutionMap) as Body;
                    let reference = resolveInput(referenceInput, bodies, flightComputerModules, physicsConfig.gravitationalConstant, rendezvousSolutionMap) as Body;

                    // Fallback to legacy IDs
                    if (!primary && module.primaryBodyId) primary = bodies.find(b => b.id === module.primaryBodyId) as Body;
                    if (!reference && module.referenceBodyId) reference = bodies.find(b => b.id === module.referenceBodyId) as Body;

                    if (!primary || !reference || !reference.mass) return;

                    // Calculate theoretical orbit
                    const ellipsePoints = calculateEllipsePoints(primary, reference, physicsConfig.gravitationalConstant);

                    if (ellipsePoints && ellipsePoints.length > 0) {
                        ctx.beginPath();
                        ctx.strokeStyle = module.color;
                        ctx.setLineDash([2, 3]); // Smaller dash for minimap
                        ctx.lineWidth = 1;
                        ctx.globalAlpha = 0.6;

                        let first = true;
                        for (const p of ellipsePoints) {
                            const screenPos = project(p.x, p.y);
                            if (first) {
                                ctx.moveTo(screenPos.x, screenPos.y);
                                first = false;
                            } else {
                                ctx.lineTo(screenPos.x, screenPos.y);
                            }
                        }

                        // Close loop if it looks closed (ellipse)
                        if (ellipsePoints.length > 2) {
                            const firstP = project(ellipsePoints[0].x, ellipsePoints[0].y);
                            ctx.lineTo(firstP.x, firstP.y);
                        }

                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.globalAlpha = 1.0;
                    }
                }
            });

            // 6. Draw Bodies
            bodies.forEach(body => {
                const screenPos = project(body.position.x, body.position.y);

                // Draw Body Dot
                ctx.fillStyle = body.color || '#ffffff';
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 4, 0, Math.PI * 2);
                ctx.fill();

                // Draw Name
                ctx.fillStyle = '#94a3b8'; // Slate-400
                ctx.font = '10px sans-serif';
                ctx.fillText(body.name, screenPos.x + 6, screenPos.y + 3);
            });

            animationId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationId);
    }, [bodies, flightComputerModules, predictionPaths, isExpanded, physicsConfig]);

    return (
        <div
            ref={containerRef}
            className={`
                fixed bottom-16 right-4 bg-slate-900/90 border border-slate-700 
                rounded-lg shadow-xl overflow-hidden backdrop-blur-md transition-all duration-300 z-50
                ${isExpanded ? 'w-[600px] h-[600px]' : 'w-64 h-64'}
            `}
        >
            {/* Header Controls */}
            <div className="absolute top-2 right-2 flex gap-2 z-10">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                >
                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-red-900/50 rounded text-slate-400 hover:text-red-400 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Title (Floating) */}
            <div className="absolute top-2 left-2 pointer-events-none">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Map</span>
            </div>

            <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
    );
};

export default MinimapPanel;
