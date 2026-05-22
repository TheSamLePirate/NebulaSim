import React, { useState, useEffect, useRef } from 'react';
import { X, Glasses, ArrowRightLeft } from 'lucide-react';
import { Body } from '../types';
import { calculateForces } from '../services/physicsEngineNew';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import useIsMobile from '../hooks/useIsMobile';

interface GravityObserverPanelProps {
    bodies: Body[];
    bodyIdA: string | null;
    bodyIdB: string | null;
    onSelectA: (id: string) => void;
    onSelectB: (id: string) => void;
    onClose: () => void;
    gConstant: number;
}

const GravityObserverPanel: React.FC<GravityObserverPanelProps> = ({
    bodies,
    bodyIdA,
    bodyIdB,
    onSelectA,
    onSelectB,
    onClose,
    gConstant
}) => {
    const bodyA = bodies.find(b => b.id === bodyIdA);
    const bodyB = bodies.find(b => b.id === bodyIdB);

    let dist = 0;
    let force = 0;
    let netForceA = 0;
    let netForceB = 0;
    let velA = 0;
    let velB = 0;

    if (bodyA && bodyB) {
        // Pairwise Calculation
        const dx = bodyA.position.x - bodyB.position.x;
        const dy = bodyA.position.y - bodyB.position.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        force = (gConstant * bodyA.mass * bodyB.mass) / (dist * dist);

        // Net Force Calculation (Total Force on body from all other bodies)
        const forces = calculateForces(bodies, gConstant);

        const idxA = bodies.findIndex(b => b.id === bodyIdA);
        const fA = forces[idxA];
        netForceA = Math.sqrt(fA.x * fA.x + fA.y * fA.y);

        const idxB = bodies.findIndex(b => b.id === bodyIdB);
        const fB = forces[idxB];
        netForceB = Math.sqrt(fB.x * fB.x + fB.y * fB.y);

        // Velocity Calculation
        velA = Math.sqrt(bodyA.velocity.x * bodyA.velocity.x + bodyA.velocity.y * bodyA.velocity.y);
        velB = Math.sqrt(bodyB.velocity.x * bodyB.velocity.x + bodyB.velocity.y * bodyB.velocity.y);
    }

    // Velocity History State for Graphs
    const [history, setHistory] = useState<{ vA: number, vB: number }[]>([]);
    const [samplingRate, setSamplingRate] = useState(6);
    const sampleRef = useRef(0);

    // Reset history when bodies change
    useEffect(() => {
        setHistory([]);
        sampleRef.current = 0;
    }, [bodyIdA, bodyIdB]);

    // Update history loop with Sampling
    useEffect(() => {
        if (bodyA && bodyB) {
            sampleRef.current++;
            // Sample based on user setting
            if (sampleRef.current % samplingRate === 0) {
                setHistory(prev => {
                    const next = [...prev, { vA: velA, vB: velB }];
                    // Keep ~80 points
                    if (next.length > 80) next.shift();
                    return next;
                });
            }
        }
    }, [velA, velB, samplingRate, bodyA, bodyB]);

    const isMobile = useIsMobile();

    return (
        <div
            className={`absolute ${isMobile ? 'top-20 left-4 right-4 w-auto' : 'top-20 left-4 w-80'} bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-none p-4 shadow-2xl z-20`}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <div className="flex items-center gap-2 text-white font-bold">
                    <Glasses size={18} className="text-cyan-400" />
                    Gravity Observer
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white">
                    <X size={18} />
                </button>
            </div>

            <div className="space-y-4">
                {/* Selectors */}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <select
                        className="bg-slate-800 text-xs text-white p-2 rounded border border-slate-700 outline-none focus:border-cyan-500 w-full"
                        value={bodyIdA || ''}
                        onChange={(e) => onSelectA(e.target.value)}
                    >
                        <option value="">Select Body A</option>
                        {bodies.map(b => (
                            <option key={b.id} value={b.id} disabled={b.id === bodyIdB}>{b.name}</option>
                        ))}
                    </select>

                    <ArrowRightLeft size={14} className="text-slate-500" />

                    <select
                        className="bg-slate-800 text-xs text-white p-2 rounded border border-slate-700 outline-none focus:border-cyan-500 w-full"
                        value={bodyIdB || ''}
                        onChange={(e) => onSelectB(e.target.value)}
                    >
                        <option value="">Select Body B</option>
                        {bodies.map(b => (
                            <option key={b.id} value={b.id} disabled={b.id === bodyIdA}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {/* Formula Display */}
                <div className="bg-slate-800 p-3 rounded-lg font-mono text-xs text-center border border-slate-700">
                    <div className="text-slate-400 mb-2">Newton's Law of Universal Gravitation</div>
                    <div className="text-white text-lg">
                        F = G <span className="mx-1">·</span>
                        <span className="inline-block text-center align-middle">
                            <div className="border-b border-slate-500 pb-0.5">m₁m₂</div>
                            <div className="pt-0.5">r²</div>
                        </span>
                    </div>
                </div>

                {/* Data Stats */}
                {bodyA && bodyB ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-800 p-2 rounded border-l-2 border-blue-500">
                                <div className="text-[10px] text-slate-400">Mass A (m₁)</div>
                                <div className="text-sm font-mono text-white">{bodyA.mass.toFixed(1)}</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded border-l-2 border-purple-500">
                                <div className="text-[10px] text-slate-400">Mass B (m₂)</div>
                                <div className="text-sm font-mono text-white">{bodyB.mass.toFixed(1)}</div>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-2 rounded flex justify-between items-center">
                            <div className="text-xs text-slate-400">Distance (r)</div>
                            <div className="text-sm font-mono text-cyan-300">{dist.toFixed(1)} u</div>
                        </div>

                        <div className="bg-slate-800 p-3 rounded border border-red-500/30">
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-xs text-red-400 font-bold uppercase">Pairwise Force (A↔B)</div>
                                <div className="text-[10px] text-slate-500">G = {gConstant}</div>
                            </div>
                            <div className="text-xl font-mono text-white text-center py-2">
                                {force.toFixed(6)} <span className="text-sm text-slate-500">N</span>
                            </div>
                        </div>

                        {/* Net Force Section */}
                        <div className="space-y-2 pt-2 border-t border-slate-700">
                            <div className="text-xs text-yellow-400 font-bold uppercase flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                Net Force (Total)
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-800/50 p-2 rounded">
                                    <div className="text-[10px] text-slate-400">Body A</div>
                                    <div className="text-sm font-mono text-yellow-200">{netForceA.toFixed(6)}</div>
                                </div>
                                <div className="bg-slate-800/50 p-2 rounded">
                                    <div className="text-[10px] text-slate-400">Body B</div>
                                    <div className="text-sm font-mono text-yellow-200">{netForceB.toFixed(6)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Velocity Section (GRAPHS) */}
                        <div className="space-y-2 pt-2 border-t border-slate-700">
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-xs text-green-400 font-bold uppercase flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                    Velocity Graph
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-slate-400" title="Frames per sample">Sampling: {samplingRate}</span>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        step="1"
                                        value={samplingRate}
                                        onChange={(e) => setSamplingRate(Number(e.target.value))}
                                        className="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        title="Adjust sampling rate (higher = longer history, less detail)"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 h-24">
                                <div className="bg-slate-800/50 rounded relative overflow-hidden border border-slate-700/50">
                                    <div className="absolute top-1 left-2 text-[10px] text-green-200 font-mono z-10 bg-slate-900/50 px-1 rounded">
                                        A: {velA.toFixed(2)}
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={history}>
                                            <YAxis hide domain={['auto', 'auto']} />
                                            <Line
                                                type="monotone"
                                                dataKey="vA"
                                                stroke="#4ade80"
                                                strokeWidth={2}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-slate-800/50 rounded relative overflow-hidden border border-slate-700/50">
                                    <div className="absolute top-1 left-2 text-[10px] text-green-200 font-mono z-10 bg-slate-900/50 px-1 rounded">
                                        B: {velB.toFixed(2)}
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={history}>
                                            <YAxis hide domain={['auto', 'auto']} />
                                            <Line
                                                type="monotone"
                                                dataKey="vB"
                                                stroke="#4ade80"
                                                strokeWidth={2}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-500 text-xs py-4 italic">
                        Select two bodies to observe the gravitational interaction.
                    </div>
                )}
            </div>
        </div>
    );
};

export default GravityObserverPanel;
