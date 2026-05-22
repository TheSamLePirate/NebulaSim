
import React, { useMemo, useState } from 'react';
import { Body, PhysicsConfig, Vector2D } from '../types';
import { Activity, Anchor, ArrowRight, Clock, Compass, Fuel, Gauge, Globe, MapPin, Navigation, Rocket, Timer, Zap, ChevronDown, ChevronUp, Pause, Play } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { calculateTransferInfo } from '@/services/orbitalMath';

interface RocketDataPanelProps {
    rocket: Body;
    bodies: Body[];
    physicsConfig: PhysicsConfig;
    parentBodyId?: string;
    targetBodyId?: string;
    predictionPaths: { id: string, color: string, points: Vector2D[] }[];
    predictionSteps: number;
    predictSystem: boolean;
    onUpdateRocket?: (id: string, updates: Partial<Body>) => void;
    onSelectRocket?: (rocketId: string) => void; // Callback to select this rocket
    index?: number; // For stacking multiple panels
}

const RocketDataPanel: React.FC<RocketDataPanelProps> = ({
    rocket,
    bodies,
    physicsConfig,
    parentBodyId,
    targetBodyId,
    predictionPaths,
    predictionSteps,
    predictSystem,
    onUpdateRocket,
    onSelectRocket,
    index = 0
}) => {

    // Helper function to format time in human-readable format
    const formatTime = (totalSeconds: number): string => {
        if (totalSeconds <= 0) return '---';

        const seconds = Math.floor(totalSeconds);
        const years = Math.floor(seconds / (365.25 * 24 * 3600));
        const months = Math.floor((seconds % (365.25 * 24 * 3600)) / (30.44 * 24 * 3600));
        const days = Math.floor((seconds % (30.44 * 24 * 3600)) / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        if (years > 0) parts.push(`${years}y`);
        if (months > 0) parts.push(months < 10 ? `0${months}mo` : `${months}mo`);
        if (days > 0) parts.push(days < 10 ? `0${days}d` : `${days}d`);
        if (hours > 0) parts.push(hours < 10 ? `0${hours}h` : `${hours}h`);
        if (minutes > 0) parts.push(minutes < 10 ? `0${minutes}m` : `${minutes}m`);
        else if (parts.length > 0) parts.push('00m');
        if (secs > 0) parts.push(secs < 10 ? `0${secs}s` : `${secs}s`);
        else if (parts.length > 0) parts.push('00s');

        return parts.length > 0 ? parts.join(' ') : `${totalSeconds.toFixed(1)}s`;
    };

    // --- CALCULATIONS ---
    const speed = Math.sqrt(rocket.velocity.x ** 2 + rocket.velocity.y ** 2);
    const heading = (rocket.angle || 0) * 180 / Math.PI;

    // Orbital Params
    let orbitalParams = { altitude: 0, apoapsis: -1, periapsis: -1, period: 0, inclination: 0 };
    if (parentBodyId) {
        const parent = bodies.find(b => b.id === parentBodyId);
        if (parent) {
            const dx = rocket.position.x - parent.position.x;
            const dy = rocket.position.y - parent.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const dvx = rocket.velocity.x - parent.velocity.x;
            const dvy = rocket.velocity.y - parent.velocity.y;
            const vSq = dvx * dvx + dvy * dvy;

            const mu = physicsConfig.gravitationalConstant * parent.mass;
            const E = (vSq / 2) - (mu / dist);

            orbitalParams.altitude = dist - parent.radius;

            if (E < 0) {
                const a = -mu / (2 * E);
                const h = (dx * dvy) - (dy * dvx);
                const eccentricity = Math.sqrt(1 + (2 * E * h * h) / (mu * mu));
                orbitalParams.periapsis = (a * (1 - eccentricity)) - parent.radius;
                orbitalParams.apoapsis = (a * (1 + eccentricity)) - parent.radius;
                orbitalParams.period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu);
            }
        }
    }

    // Target Params
    let targetData = { dist: 0, deltaV: 0, name: '' };
    let phaseData = { current: 0, required: 0, error: 0, ready: false };

    if (targetBodyId) {
        const target = bodies.find(b => b.id === targetBodyId);
        if (target) {
            targetData.name = target.name;
            const dx = target.position.x - rocket.position.x;
            const dy = target.position.y - rocket.position.y;
            targetData.dist = Math.sqrt(dx * dx + dy * dy);

            const dvx = rocket.velocity.x - target.velocity.x;
            const dvy = rocket.velocity.y - target.velocity.y;
            targetData.deltaV = Math.sqrt(dvx * dvx + dvy * dvy);

            // Phase Angle
            if (parentBodyId) {

                const parent = bodies.find(b => b.id === parentBodyId);
                if (parent) {
                    const { currentPhase, requiredPhase, error, ready } = calculateTransferInfo(rocket, parent, target, physicsConfig.gravitationalConstant);

                    phaseData = {
                        current: currentPhase,
                        required: requiredPhase,
                        error: error,
                        ready: ready
                    };
                }
            }
        }
    }

    // Prediction Analysis
    const predictionAnalysis = useMemo(() => {
        if (!targetBodyId || !predictionPaths) return null;

        const rocketPath = predictionPaths.find(p => p.id === rocket.id);
        const targetPath = predictSystem ? predictionPaths.find(p => p.id === targetBodyId) : null;
        const targetBody = bodies.find(b => b.id === targetBodyId);

        if (!rocketPath || !rocketPath.points.length) return null;

        const totalDuration = predictionSteps * physicsConfig.timeStep;
        const dtPerPoint = totalDuration / rocketPath.points.length;

        let minDist = Infinity;
        let timeToPe = -1;
        let timeToAp = -1;
        let maxDist = 0;

        rocketPath.points.forEach((p, idx) => {
            const targetPos = targetPath && targetPath.points[idx] ? targetPath.points[idx] : (targetBody?.position || { x: 0, y: 0 });
            const d = Math.sqrt(Math.pow(p.x - targetPos.x, 2) + Math.pow(p.y - targetPos.y, 2));

            if (d < minDist) {
                minDist = d;
                timeToPe = idx * dtPerPoint;
            }
            if (d > maxDist) {
                maxDist = d;
                timeToAp = idx * dtPerPoint;
            }
        });

        return { timeToPe, timeToAp, closestApproach: minDist - (targetBody?.radius || 0) };

    }, [rocket, targetBodyId, predictionPaths, predictionSteps, physicsConfig.timeStep, bodies, predictSystem]);

    // Orbital Prediction Analysis (for parent body orbit)
    const orbitalPredictionAnalysis = useMemo(() => {
        if (!parentBodyId || !predictionPaths) return null;

        const rocketPath = predictionPaths.find(p => p.id === rocket.id);
        const parentBody = bodies.find(b => b.id === parentBodyId);

        if (!rocketPath || !rocketPath.points.length || !parentBody) return null;

        const totalDuration = predictionSteps * physicsConfig.timeStep;
        const dtPerPoint = totalDuration / rocketPath.points.length;

        let minDist = Infinity;
        let timeToPe = -1;
        let timeToAp = -1;
        let maxDist = 0;

        rocketPath.points.forEach((p, idx) => {
            const d = Math.sqrt(Math.pow(p.x - parentBody.position.x, 2) + Math.pow(p.y - parentBody.position.y, 2));

            if (d < minDist) {
                minDist = d;
                timeToPe = idx * dtPerPoint;
            }
            if (d > maxDist) {
                maxDist = d;
                timeToAp = idx * dtPerPoint;
            }
        });

        return { timeToPe, timeToAp };

    }, [rocket, parentBodyId, predictionPaths, predictionSteps, physicsConfig.timeStep, bodies]);

    // Mission control handlers
    const handleStopMission = () => {
        if (!onUpdateRocket || !rocket.maneuvers) return;

        // Set all active maneuvers to pending
        const updatedManeuvers = rocket.maneuvers.map(m => {
            if (m.status === 'active') {
                return { ...m, status: 'pending' as const };
            }
            return m;
        });

        onUpdateRocket(rocket.id, { maneuvers: updatedManeuvers });
    };

    const handleResumeMission = () => {
        if (!onUpdateRocket || !rocket.maneuvers) return;

        // Activate all pending maneuvers (will be executed in sequence by physics engine)
        const updatedManeuvers = rocket.maneuvers.map(m => {
            if (m.status === 'pending') {
                return { ...m, status: 'active' as const };
            }
            return m;
        });

        onUpdateRocket(rocket.id, { maneuvers: updatedManeuvers });
    };

    const isMobile = useIsMobile();
    const [isExpanded, setIsExpanded] = useState(false);

    if (isMobile) {
        return RocketDataPanelUImobile();
    }

    // Calculate vertical offset based on index (each panel is roughly 400px tall)
    const topOffset = 20 + (index * 420);

    return (
        <div
            className="fixed left-0 w-80 pointer-events-none z-40 font-mono"
            style={{ top: `${topOffset}px` }}
        >
            {/* MAIN HEADER HUD */}
            <div className="bg-slate-900/30 border-l-4 border-orange-500 backdrop-blur-md p-4 rounded-r-xl shadow-2xl mb-2">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="text-[10px] text-orange-400 font-bold tracking-widest uppercase">Telemetry Data</div>
                        <div
                            className={`text-xl font-bold text-white leading-none ${onSelectRocket ? 'cursor-pointer hover:text-orange-400 transition-colors pointer-events-auto' : ''}`}
                            onClick={() => onSelectRocket?.(rocket.id)}
                            title={onSelectRocket ? 'Click to select this rocket' : ''}
                        >
                            {rocket.name}
                        </div>
                    </div>
                    {rocket.landedOnBodyId ? (
                        <div className="flex items-center gap-1 bg-green-900/50 text-green-400 px-2 py-1 rounded text-[10px] font-bold border border-green-500/30">
                            <Anchor size={12} /> LANDED
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 bg-blue-900/50 text-blue-400 px-2 py-1 rounded text-[10px] font-bold border border-blue-500/30">
                            <Rocket size={12} /> IN FLIGHT
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1"><Gauge size={10} /> Velocity</div>
                        <div className="text-lg text-white font-bold">{speed.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">u/s</span></div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1"><Compass size={10} /> Heading</div>
                        {/* Color the icon base on rocket.color it is a #ffaacc format*/}
                        <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1 " style={{ color: rocket.color }}><Rocket size={26} className={`rotate-[${(heading - 45 + 90).toFixed(0)}deg]`} /></div>

                    </div>
                </div>

                {/* FUEL BAR */}
                <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span className="flex items-center gap-1"><Fuel size={10} /> PROPELLANT</span>
                        <span className={rocket.fuel && rocket.fuel < 10 ? "text-red-400 font-bold animate-pulse" : ""}>
                            {((rocket.fuel || 0) / (rocket.maxFuel || 1) * 100).toFixed(0)}%
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${rocket.fuel && rocket.fuel < 10 ? 'bg-red-500' : 'bg-orange-500'}`}
                            style={{ width: `${rocket.fuel && rocket.maxFuel ? (rocket.fuel / rocket.maxFuel) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ORBITAL DATA */}
            {parentBodyId && false && (
                <div className="bg-slate-900/80 border-l-4 border-blue-500 backdrop-blur-md p-3 rounded-r-xl shadow-2xl mb-2">
                    <div className="text-[10px] text-blue-400 font-bold tracking-widest uppercase mb-2 flex items-center gap-2">
                        <Globe size={12} /> Orbital Info ({bodies.find(b => b.id === parentBodyId)?.name})
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div>
                            <div className="text-[9px] text-slate-500 uppercase">Altitude</div>
                            <div className="text-sm text-cyan-300">{orbitalParams.altitude.toFixed(1)} u</div>
                        </div>
                        <div>
                            <div className="text-[9px] text-slate-500 uppercase">Period</div>
                            <div className="text-sm text-white">{formatTime(orbitalParams.period)}</div>
                        </div>

                        {orbitalParams.apoapsis > 0 ? (
                            <>
                                <div className="relative">
                                    <div className="text-[9px] text-slate-500 uppercase flex items-center gap-1">
                                        Ap Apoapsis
                                        {orbitalPredictionAnalysis && orbitalPredictionAnalysis.timeToAp >= 0 && (
                                            <span className="text-[8px] bg-slate-800 text-slate-300 px-1 rounded ml-auto">T-{orbitalPredictionAnalysis.timeToAp.toFixed(0)}s</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-orange-300">{orbitalParams.apoapsis.toFixed(1)} u</div>
                                </div>
                                <div className="relative">
                                    <div className="text-[9px] text-slate-500 uppercase flex items-center gap-1">
                                        Pe Periapsis
                                        {orbitalPredictionAnalysis && orbitalPredictionAnalysis.timeToPe >= 0 && (
                                            <span className="text-[8px] bg-slate-800 text-slate-300 px-1 rounded ml-auto">T-{orbitalPredictionAnalysis.timeToPe.toFixed(0)}s</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-blue-300">{orbitalParams.periapsis.toFixed(1)} u</div>
                                </div>
                            </>
                        ) : (
                            <div className="col-span-2 text-xs text-slate-500 italic">Unbound Trajectory (Escape)</div>
                        )}
                    </div>
                </div>
            )}

            {/* TARGET DATA */}
            {targetBodyId && (
                <div className="bg-slate-900/80 border-l-4 border-emerald-500 backdrop-blur-md p-3 rounded-r-xl shadow-2xl">
                    <div className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase mb-2 flex items-center gap-2">
                        <Navigation size={12} /> Target: {targetData.name}
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div>
                            <div className="text-[9px] text-slate-500 uppercase">Distance</div>
                            <div className="text-sm text-white">{targetData.dist.toFixed(1)} u</div>
                        </div>
                        <div>
                            <div className="text-[9px] text-slate-500 uppercase">Rel Speed</div>
                            <div className="text-sm text-emerald-300">{targetData.deltaV.toFixed(2)} u/s</div>
                        </div>
                        {predictionAnalysis && (
                            <div className="col-span-2 bg-slate-800/50 p-1.5 rounded flex justify-between items-center">
                                <div className="text-[9px] text-slate-400 uppercase">Closest Approach</div>
                                <div className="text-sm font-bold text-indigo-300">{predictionAnalysis.closestApproach.toFixed(1)} u</div>
                            </div>
                        )}
                    </div>

                    {/* PHASE ANGLE */}
                    {parentBodyId && (
                        <div className="mt-3 pt-2 border-t border-slate-700/50">
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-[9px] text-slate-500 uppercase flex items-center gap-1"><Timer size={10} /> Transfer Phase</div>
                                {phaseData.ready ? (
                                    <div className="text-[9px] bg-green-500 text-black px-1 rounded font-bold animate-pulse">WINDOW OPEN</div>
                                ) : (
                                    <div className="text-[9px] text-slate-600">Wait...</div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                                    {/* Indicator Logic */}
                                    <div
                                        className={`absolute top-0 bottom-0 w-1/5 left-1/2 -translate-x-1/2 ${phaseData.ready ? 'bg-green-500/20' : 'bg-slate-700'}`}
                                    />
                                    <div
                                        className={`absolute top-0 bottom-0 w-1 ${phaseData.ready ? 'bg-green-500' : 'bg-orange-500'}`}
                                        style={{ left: `${Math.min(100, Math.max(0, 50 + (phaseData.current - phaseData.required)))}%` }}
                                    />
                                </div>
                                <div className="text-[9px] font-mono w-8 text-right text-slate-400">
                                    {phaseData.error.toFixed(0)}°
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* FLIGHT COMPUTER STATUS Details on maneuver*/}
            {rocket.maneuvers && rocket.maneuvers.some(m => m.status === 'active') && (
                <div className="mt-2 bg-slate-900/30 border border-green-500/50 p-3 rounded-r-xl shadow-lg animate-pulse-slow">
                    <div className="flex items-center justify-between text-green-400 mb-2">
                        <div className="flex items-center gap-2">
                            <Activity size={14} />
                            <span className="text-xs font-bold uppercase">Maneuver Executing</span>
                        </div>
                        {/* Mission Control Buttons */}
                        {onUpdateRocket && (
                            <button
                                onClick={handleStopMission}
                                className="flex items-center gap-1 px-2 py-1 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/50 rounded text-[10px] font-bold text-orange-400 transition-colors pointer-events-auto"
                                title="Stop mission after current step"
                            >
                                <Pause size={12} />
                                STOP
                            </button>
                        )}
                    </div>

                    {/* Takes only the first active maneuver */}
                    {rocket.maneuvers.filter(m => m.status === 'active').slice(0, 1).map(m => {
                        let progressInfo = '';
                        let progressBar = null;
                        let progressPercent = m.progress * 100;

                        // TIME-BASED: wait, burn
                        if (m.type === 'wait' || m.type === 'burn') {
                            const remainingTime = m.duration * (1 - m.progress);
                            const elapsed = m.duration * m.progress;
                            const progressPct = 100 * (m.duration - elapsed) / m.duration; // Logic from RocketPanel
                            progressInfo = `${(m.progress * 100).toFixed(0)}% (${elapsed.toFixed(1)}/${m.duration.toFixed(1)}s)`;
                            progressBar = (
                                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 transition-all duration-100"
                                        style={{ width: `${(m.progress * 100).toFixed(0)}%` }}
                                    />
                                </div>
                            );
                        }
                        // DELTA-V BASED: transfers, intercepts
                        else if (m.targetDeltaV && m.appliedDeltaV !== undefined) {
                            progressInfo = `${(m.progress * 100).toFixed(0)}% (${m.appliedDeltaV.toFixed(1)}/${m.targetDeltaV.toFixed(1)} m/s)`;
                            progressBar = (
                                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                                    <div
                                        className="h-full bg-cyan-500 transition-all duration-100"
                                        style={{ width: `${(m.progress * 100).toFixed(0)}%` }}
                                    />
                                </div>
                            );
                        }
                        // ALTITUDE-BASED: wait_for_altitude, burn_until_altitude
                        else if (m.type === 'wait_for_altitude' || m.type === 'burn_until_altitude') {
                            const parentBody = bodies.find(b => b.id === m.parentBodyId);
                            if (parentBody) {
                                const dx = rocket.position.x - parentBody.position.x;
                                const dy = rocket.position.y - parentBody.position.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                const currentAlt = dist - parentBody.radius;
                                const targetAlt = parseFloat(String(m.param).split(':')[0]) || 100;

                                progressInfo = `${currentAlt.toFixed(1)}/${targetAlt.toFixed(1)}km (${(m.progress * 100).toFixed(1)}%)`;
                                progressBar = (
                                    <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-500 transition-all duration-100"
                                            style={{ width: `${(m.progress * 100).toFixed(0)}%` }}
                                        />
                                    </div>
                                );
                            }
                        }
                        else if (m.type === 'wait_for_transfer') {
                            const target = bodies.find(b => b.id === m.targetBodyId);
                            let refParent = bodies.find(b => b.id === m.parentBodyId);
                            if (!refParent && target) {
                                refParent = bodies.filter(b => !b.isRocket && b.id !== target.id).sort((a, b) => b.mass - a.mass)[0];
                            }

                            if (target && refParent) {
                                const transferInfo = calculateTransferInfo(rocket, refParent, target, physicsConfig.gravitationalConstant);
                                const diffDeg = transferInfo.error;
                                const targetError = parseFloat(String(m.param)) || 5;

                                // Progress bar: inverse of error (closer to 0 error = more progress)
                                // Cap at 10 degrees for visual purposes
                                //progressPercent = 100-Math.min(100, diffDeg);
                                progressInfo = `${diffDeg.toFixed(2)}° error - ${progressPercent.toFixed(0)}% - ${transferInfo.transferTime.toFixed(0)}s`;
                                progressBar = (
                                    <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-100 ${diffDeg < targetError ? 'bg-green-500' : 'bg-orange-500'}`}
                                            style={{ width: `${progressPercent.toFixed(0)}%` }}
                                        />
                                    </div>
                                );
                            }
                        }
                        // GENERIC
                        else {
                            progressInfo = `${(m.progress * 100).toFixed(0)}%`;
                            progressBar = (
                                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 transition-all duration-100"
                                        style={{ width: `${(m.progress * 100).toFixed(0)}%` }}
                                    />
                                </div>
                            );
                        }

                        return (
                            <div key={m.id} className="text-xs">
                                <div className="flex justify-between text-slate-300 mb-1">
                                    <span className="uppercase font-bold text-[10px]">{m.type.replace(/_/g, ' ')}</span>
                                    <span className="font-mono">{progressInfo}</span>
                                </div>
                                {progressBar}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MISSION PAUSED - Show Resume Button */}
            {rocket.maneuvers && !rocket.maneuvers.some(m => m.status === 'active') && rocket.maneuvers.some(m => m.status === 'pending') && onUpdateRocket && (
                <div className="mt-2 bg-slate-900/30 border border-blue-500/50 p-3 rounded-r-xl shadow-lg">
                    <div className="flex items-center justify-between text-blue-400 mb-2">
                        <div className="flex items-center gap-2">
                            <Clock size={14} />
                            <span className="text-xs font-bold uppercase">Mission Paused</span>
                        </div>
                        <button
                            onClick={handleResumeMission}
                            className="flex items-center gap-1 px-2 py-1 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 rounded text-[10px] font-bold text-green-400 transition-colors pointer-events-auto"
                            title="Resume mission execution"
                        >
                            <Play size={12} />
                            RESUME
                        </button>
                    </div>
                    <div className="text-[10px] text-slate-400">
                        {rocket.maneuvers.filter(m => m.status === 'pending').length} pending maneuver(s)
                    </div>
                </div>
            )}



            {/* Manual Controls */}
            {onUpdateRocket && (
                <div className="mt-2 text-right">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Create a new manual node maneuver
                            // Default: 10 minutes from now ? Or 15 min? Or 1/4 orbit?
                            // Let's do 1000s for now, user can drag it
                            const newManeuver = {
                                id: `maneuver_${Date.now()}`,
                                type: 'manual_node',
                                status: 'pending',
                                timeFromNow: 300, // 5 minutes default
                                deltaVPrograde: 0,
                                deltaVRadial: 0,
                                progress: 0,
                                thrust: 0,
                                duration: 0,
                                angleOffset: 0
                            };
                            const newManeuvers = rocket.maneuvers ? [...rocket.maneuvers, newManeuver] : [newManeuver];
                            // FORCE TYPE CASTING for newManeuver to satisfy Maneuver type
                            onUpdateRocket(rocket.id, { maneuvers: newManeuvers as any[] });
                        }}
                        className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 rounded text-[10px] font-bold text-purple-400 transition-colors pointer-events-auto"
                        title="Add Maneuver Node"
                    >
                        + ADD NODE
                    </button>
                    <div className="text-[9px] text-slate-500 mt-1">
                        Drag node to plan. Auto-executes at T-0.
                    </div>
                </div>
            )}
        </div>
    );

    function RocketDataPanelUImobile(): React.ReactNode | Promise<React.ReactNode> {
        return <div className="fixed top-4 left-4 right-4 z-40 font-mono pointer-events-auto">
            <div
                className="bg-slate-900/50 border border-slate-700 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden transition-all duration-300"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Mobile Header (Always Visible) */}
                <div className="p-3 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${rocket.landedOnBodyId ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'}`}>
                            <Rocket size={16} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white leading-none">{rocket.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                                {speed.toFixed(1)} km/s • {rocket.landedOnBodyId ? 'LANDED' : 'IN FLIGHT'}
                            </div>
                        </div>
                    </div>
                    <button className="text-slate-400">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="p-4 border-t border-slate-700/50 space-y-4 animate-in slide-in-from-top-2">
                        {/* Fuel */}
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span className="flex items-center gap-1"><Fuel size={10} /> FUEL</span>
                                <span className={rocket.fuel && rocket.fuel < 10 ? "text-red-400 font-bold" : ""}>
                                    {((rocket.fuel || 0) / (rocket.maxFuel || 1) * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${rocket.fuel && rocket.fuel < 10 ? 'bg-red-500' : 'bg-orange-500'}`}
                                    style={{ width: `${rocket.fuel && rocket.maxFuel ? (rocket.fuel / rocket.maxFuel) * 100 : 0}%` }} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/50 p-2 rounded">
                                <div className="text-[9px] text-slate-500 uppercase">Heading</div>
                                <div className="text-sm text-white font-bold">{heading.toFixed(1)}°</div>
                            </div>
                            <div className="bg-slate-800/50 p-2 rounded">
                                <div className="text-[9px] text-slate-500 uppercase">Altitude</div>
                                <div className="text-sm text-cyan-300 font-bold">{orbitalParams.altitude.toFixed(1)} u</div>
                            </div>
                        </div>

                        {/* Target Info */}
                        {targetBodyId && (
                            <div className="bg-slate-800/30 p-2 rounded border border-slate-700/50">
                                <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1">
                                    <Navigation size={10} /> Target: {targetData.name}
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-[9px] text-slate-500">Distance</div>
                                        <div className="text-xs text-white">{targetData.dist.toFixed(1)} u</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] text-slate-500">Rel Speed</div>
                                        <div className="text-xs text-emerald-300">{targetData.deltaV.toFixed(1)} u/s</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>;
    }
};

export default RocketDataPanel;
