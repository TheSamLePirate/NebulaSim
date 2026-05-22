import React, { useState, useEffect, useRef } from 'react';
import { Body, Particle, PhysicsConfig, FlightComputerModule, AssistantActions } from '../types';
import { Activity, Clock, Layers, Maximize, Ruler, Zap, Terminal, ChevronRight } from 'lucide-react';

interface DebugPanelProps {
    bodies: Body[];
    particles: Particle[];
    simulationTime: number;
    scale: number;
    speed: number;
    fps: number;
    physicsConfig: PhysicsConfig;
    flightComputerModules: FlightComputerModule[];
    assistantActions: AssistantActions;
    game: any; // Game object exposed from flight computer logic
}

interface CommandHistory {
    type: 'input' | 'output' | 'error' | 'success'; // 'success' is just green output
    content: React.ReactNode;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
    bodies,
    particles,
    simulationTime,
    scale,
    speed,
    fps,
    physicsConfig,
    flightComputerModules,
    assistantActions,
    game
}) => {
    // Format simulation time
    const formatTime = (totalSeconds: number): string => {
        const sign = totalSeconds < 0 ? "-" : "";
        const absSeconds = Math.abs(totalSeconds);

        const years = Math.floor(absSeconds / (365.25 * 24 * 3600));
        const days = Math.floor((absSeconds % (365.25 * 24 * 3600)) / (24 * 3600));
        const hours = Math.floor((absSeconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((absSeconds % 3600) / 60);
        const seconds = Math.floor(absSeconds % 60);

        return `${sign}Y:${years} D:${days} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Calculate legend
    const legendPixels = 200;
    const legendUnits = legendPixels / scale;

    // CLI State
    const [inputValue, setInputValue] = useState('');
    const [history, setHistory] = useState<CommandHistory[]>([
        { type: 'success', content: 'Debug CLI initialized. Type /help for commands.' }
    ]);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const processCommand = async (cmdStr: string) => {
        const trimmed = cmdStr.trim();
        if (!trimmed) return;

        // Add input to history
        const newHistory = [...history, { type: 'input', content: trimmed } as CommandHistory];

        if (trimmed.startsWith('/')) {
            const parts = trimmed.split(' ');
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);

            switch (command) {
                case '/help':
                    newHistory.push({
                        type: 'output',
                        content: (
                            <div className="space-y-1">
                                <p className="font-bold text-blue-400">Available Commands:</p>
                                <p><span className="text-yellow-400">/help</span> - Show this help message</p>
                                <p><span className="text-yellow-400">/clear</span> - Clear the terminal history</p>

                                <p className="text-slate-500 mt-2 font-bold">--- Info ---</p>
                                <p><span className="text-yellow-400">/showbodies</span> - List all bodies with basic stats</p>
                                <p><span className="text-yellow-400">/showbody [name|id]</span> - Show full JSON details for a specific body</p>
                                <p><span className="text-yellow-400">/showrockets</span> - List all rockets in a table</p>
                                <p><span className="text-yellow-400">/showrocket [name|id]</span> - Show full details for a specific rocket</p>
                                <p><span className="text-yellow-400">/showcomputermodules</span> - List all flight computer modules</p>
                                <p><span className="text-yellow-400">/showcomputermodule [id]</span> - Show details for a specific module</p>
                                <p><span className="text-yellow-400">/getmoduledata</span> - Show raw flight computer data</p>

                                <p className="text-slate-500 mt-2 font-bold">--- Simulation & Camera ---</p>
                                <p><span className="text-yellow-400">/setSimState [running: t/f] [speed]</span></p>
                                <p><span className="text-yellow-400">/setCamera [zoom] [reset: t/f]</span></p>
                                <p><span className="text-yellow-400">/changePreset [id]</span></p>
                                <p><span className="text-yellow-400">/configvisuals [json_config]</span></p>
                                <p><span className="text-yellow-400">/configphysics [json_config]</span></p>

                                <p className="text-slate-500 mt-2 font-bold">--- Body Actions ---</p>
                                <p><span className="text-yellow-400">/selectBody [name]</span></p>
                                <p><span className="text-yellow-400">/followBody [name]</span></p>
                                <p><span className="text-yellow-400">/followCoM</span></p>
                                <p><span className="text-yellow-400">/spawnBody [name] [mass] [dist] [vel] [color]</span></p>
                                <p><span className="text-yellow-400">/spawnBodyComplex [name] [m] [r] [col] [px] [py] [vx] [vy] [star?]</span></p>
                                <p><span className="text-yellow-400">/deleteBody [name]</span></p>
                                <p><span className="text-yellow-400">/makeStar [name]</span></p>

                                <p className="text-slate-500 mt-2 font-bold">--- Rocket & Flight ---</p>
                                <p><span className="text-yellow-400">/spawnRocket [parentName]</span></p>
                                <p><span className="text-yellow-400">/controlRocket [name] [rotate|thrust|stop] [val]</span></p>
                                <p><span className="text-yellow-400">/programFlight [rocket] [maneuvers_json]</span></p>
                                <p><span className="text-yellow-400">/execManeuver [rocket]</span></p>
                                <p><span className="text-yellow-400">/manualNode [rocket] [time] [dvPro] [dvRad]</span></p>
                                <p><span className="text-yellow-400">/rocketTelem [rocket] [target?]</span></p>
                                <p><span className="text-yellow-400">/flightPlan [rocket]</span></p>

                                <p className="text-slate-500 mt-2 font-bold">--- Flight Modules ---</p>
                                <p><span className="text-yellow-400">/addModule [type] [rocket] ...</span></p>
                                <p><span className="text-yellow-400">/removeModule [id]</span></p>
                                <p><span className="text-yellow-400">/toggleModule [id] [t/f]</span></p>
                                <p><span className="text-yellow-400">/updateModule [id] [config_json]</span></p>
                                <p><span className="text-yellow-400">/createGroup [name] [color] [parent]</span></p>

                                <p className="text-slate-500 mt-2 font-bold">--- Advanced ---</p>
                                <p><span className="text-yellow-400">/eval [code]</span> - Execute JS code with 'game' context</p>
                            </div>
                        )
                    });
                    setHistory(newHistory);
                    break;

                case '/eval':
                    const code = args.join(' ');
                    try {
                        // Create a function with 'game' and 'actions' in scope
                        const func = new Function('game', 'actions', 'bodies', 'modules', `return (async () => { return ${code} })()`);
                        const result = await func(game, assistantActions, bodies, flightComputerModules);
                        newHistory.push({
                            type: 'success',
                            content: (
                                <div>
                                    <p className="text-slate-400 italic text-[10px]">Result:</p>
                                    <pre className="text-xs">{typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}</pre>
                                </div>
                            )
                        });
                    } catch (e: any) {
                        newHistory.push({ type: 'error', content: `Eval Error: ${e.message}` });
                    }
                    setHistory(newHistory);
                    break;

                case '/spawnbody':
                    if (args.length < 5) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /spawnBody [name] [mass] [dist] [vel] [color]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /spawnBody Moon 7.3e22 384400 1022 white</p>
                                </div>
                            )
                        });
                    } else {
                        const res = assistantActions.spawnBody(args[0], Number(args[1]), Number(args[2]), Number(args[3]), args[4]);
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/deletebody':
                    if (args.length < 1) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /deleteBody [name]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /deleteBody Moon</p>
                                </div>
                            )
                        });
                    } else {
                        const res = assistantActions.deleteBody(args.join(' '));
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/makestar':
                    if (args.length < 1) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /makeStar [name]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /makeStar Sun</p>
                                    <p className="text-slate-400 text-[10px]">Note: Making a body a star gives it light emission and fixed position.</p>
                                </div>
                            )
                        });
                    } else {
                        const res = assistantActions.makeStar(args.join(' '));
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/setsimstate':
                    const isRunning = args[0] === 'true' ? true : args[0] === 'false' ? false : undefined;
                    const speedVal = args[1] ? Number(args[1]) : undefined;
                    const resSim = assistantActions.setSimulationState(isRunning, speedVal);
                    newHistory.push({ type: 'success', content: resSim });
                    setHistory(newHistory);
                    break;

                case '/changepreset':
                    if (args.length < 1) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /changePreset [id]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /changePreset solar_system</p>
                                </div>
                            )
                        });
                    } else {
                        const res = assistantActions.changePreset(args[0]);
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/selectbody':
                    if (args.length < 1) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /selectBody [name]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /selectBody Earth</p>
                                </div>
                            )
                        });
                    } else {
                        const res = assistantActions.selectBody(args.join(' '));
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/followbody':
                    if (args.length < 1) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /followBody [name]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /followBody Mars</p>
                                </div>
                            )
                        });
                    } else {
                        const res = assistantActions.followBody(args.join(' '));
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/followcom':
                    const resCoM = assistantActions.followCenterOfMass();
                    newHistory.push({ type: 'success', content: resCoM });
                    setHistory(newHistory);
                    break;

                case '/spawnrocket':
                    const parentName = args.length > 0 ? args.join(' ') : undefined;
                    const resRocket = assistantActions.spawnRocket(parentName);
                    newHistory.push({ type: 'success', content: resRocket });
                    setHistory(newHistory);
                    break;

                case '/controlrocket':
                    if (args.length < 2) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /controlRocket [name] [rotate|thrust|stop] [value]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /controlRocket Rocket1 rotate 45</p>
                                    <p className="text-slate-400 text-xs">Example: /controlRocket Rocket1 thrust 100</p>
                                </div>
                            )
                        });
                    } else {
                        const rName = args[0];
                        const rAction = args[1] as 'rotate' | 'thrust' | 'stop';
                        const rValue = args[2] ? Number(args[2]) : undefined;
                        const res = assistantActions.controlRocket(rName, rAction, rValue);
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/setcamera':
                    const zoom = args[0] ? Number(args[0]) : undefined;
                    const reset = args[1] === 'true';
                    const resCam = assistantActions.setCamera(zoom, reset);
                    newHistory.push({ type: 'success', content: resCam });
                    setHistory(newHistory);
                    break;

                case '/clear':
                    setHistory([]);
                    break;

                case '/showbodies':
                    newHistory.push({
                        type: 'output',
                        content: (
                            <div className="space-y-2">
                                <p className="font-bold text-blue-400">Active Bodies ({bodies.length}):</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {bodies.map(b => (
                                        <div
                                            key={b.id}
                                            className="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs cursor-pointer hover:border-slate-600 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); appendToInput(b.name); }}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-white max-w-[120px] truncate" title={b.name}>{b.name}</span>
                                                <span className="text-slate-500 font-mono text-[10px]">{b.id.substring(0, 6)}...</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-400">
                                                <span>Mass:</span> <span className="text-slate-200 font-mono">{b.mass.toExponential(2)}</span>
                                                <span>Rad:</span> <span className="text-slate-200 font-mono">{b.radius.toFixed(2)}</span>
                                                <span>Pos:</span> <span className="text-slate-200 font-mono">[{b.position.x.toFixed(0)}, {b.position.y.toFixed(0)}]</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    });
                    setHistory(newHistory);
                    break;

                case '/showrockets':
                    const rockets = bodies.filter(b => b.isRocket);
                    newHistory.push({
                        type: 'output',
                        content: (
                            <div className="space-y-2">
                                <p className="font-bold text-orange-400">Active Rockets ({rockets.length}):</p>
                                {rockets.length === 0 ? (
                                    <p className="text-slate-500 italic">No rockets currently in simulation.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left border-collapse border border-slate-700">
                                            <thead className="bg-slate-800 text-slate-300">
                                                <tr>
                                                    <th className="p-2 border border-slate-700">Name</th>
                                                    <th className="p-2 border border-slate-700">ID</th>
                                                    <th className="p-2 border border-slate-700">Fuel</th>
                                                    <th className="p-2 border border-slate-700">Mass</th>
                                                    <th className="p-2 border border-slate-700">Velocity</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-slate-900/50">
                                                {rockets.map(r => (
                                                    <tr
                                                        key={r.id}
                                                        className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer"
                                                        onClick={(e) => { e.stopPropagation(); appendToInput(r.name); }}
                                                    >
                                                        <td className="p-2 border-r border-slate-800 font-bold text-white">{r.name}</td>
                                                        <td className="p-2 border-r border-slate-800 font-mono text-slate-500">{r.id.substring(0, 8)}...</td>
                                                        <td className="p-2 border-r border-slate-800 text-emerald-400">
                                                            {r.fuel !== undefined ? `${r.fuel.toFixed(1)} / ${r.maxFuel?.toFixed(1) || '?'}` : 'N/A'}
                                                        </td>
                                                        <td className="p-2 border-r border-slate-800 text-slate-300">{r.mass.toExponential(2)}</td>
                                                        <td className="p-2 text-blue-300">
                                                            {Math.sqrt(r.velocity.x ** 2 + r.velocity.y ** 2).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )
                    });
                    setHistory(newHistory);
                    break;

                case '/showrocket':
                    if (args.length === 0) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /showrocket [name or id]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /showrocket Apollo11</p>
                                </div>
                            )
                        });
                        setHistory(newHistory);
                        break;
                    }
                    const rQuery = args.join(' ').toLowerCase();
                    const rocket = bodies.find(
                        b => b.isRocket && (
                            b.id.toLowerCase() === rQuery ||
                            b.name.toLowerCase() === rQuery ||
                            b.name.toLowerCase().includes(rQuery)
                        )
                    );

                    if (rocket) {
                        newHistory.push({
                            type: 'success',
                            content: (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-orange-400">Rocket Details:</p>
                                        <span
                                            className="text-xl font-bold text-white cursor-pointer hover:text-blue-400"
                                            onClick={(e) => { e.stopPropagation(); appendToInput(rocket.name); }}
                                        >{rocket.name}</span>
                                    </div>
                                    <div className="bg-slate-900 p-3 rounded border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <p className="text-slate-500 font-bold mb-1">Status</p>
                                            <p>ID: <span className="font-mono text-slate-300">{rocket.id}</span></p>
                                            <p>Mass: <span className="font-mono text-slate-300">{rocket.mass.toExponential(4)}</span></p>
                                            <p>Fuel: <span className="font-mono text-emerald-400">{rocket.fuel} / {rocket.maxFuel}</span></p>
                                            <p>Stage: <span className="font-mono text-yellow-400">{rocket.stage}</span></p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 font-bold mb-1">Physics</p>
                                            <p>Pos: <span className="font-mono text-blue-300">[{rocket.position.x.toFixed(2)}, {rocket.position.y.toFixed(2)}]</span></p>
                                            <p>Vel: <span className="font-mono text-blue-300">[{rocket.velocity.x.toFixed(2)}, {rocket.velocity.y.toFixed(2)}]</span></p>
                                            <p>Angle: <span className="font-mono text-purple-300">{rocket.angle?.toFixed(2)} rad</span></p>
                                        </div>
                                    </div>
                                    {rocket.maneuvers && rocket.maneuvers.length > 0 && (
                                        <div className="mt-2">
                                            <p className="font-bold text-purple-400 mb-1">Maneuvers ({rocket.maneuvers.length})</p>
                                            <div className="space-y-1">
                                                {rocket.maneuvers.map((m, idx) => (
                                                    <div key={idx} className="bg-slate-800/50 p-2 rounded flex justify-between items-center text-xs">
                                                        <span className="text-white font-mono">{m.type}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${m.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                                                            m.status === 'active' ? 'bg-blue-900/50 text-blue-400 animate-pulse' :
                                                                'bg-slate-700 text-slate-400'
                                                            }`}>{m.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        });
                    } else {
                        newHistory.push({ type: 'error', content: `Rocket not found: "${args.join(' ')}"` });
                    }
                    setHistory(newHistory);
                    break;

                case '/showcomputermodules':
                    newHistory.push({
                        type: 'output',
                        content: (
                            <div className="space-y-2">
                                <p className="font-bold text-cyan-400">Flight Computer Modules ({flightComputerModules.length}):</p>
                                <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                                    {flightComputerModules.map(m => (
                                        <div
                                            key={m.id}
                                            className="flex items-center gap-2 p-1 hover:bg-slate-800/50 rounded cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); appendToInput(m.id); }}
                                        >
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.isEnabled ? '#4ade80' : '#ef4444' }}></div>
                                            <span className="font-mono text-xs text-slate-500 min-w-[60px]">{m.id.substring(0, 6)}...</span>
                                            <span className="text-white text-xs font-bold flex-1">{m.type}</span>
                                            {m.name && <span className="text-slate-400 text-[10px] italic">"{m.name}"</span>}
                                            <div className="w-3 h-3 rounded-sm border border-slate-700" style={{ backgroundColor: m.color }}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    });
                    setHistory(newHistory);
                    break;

                case '/showcomputermodule':
                    if (args.length === 0) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /showcomputermodule [id]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /showcomputermodule a1b2c3d4</p>
                                </div>
                            )
                        });
                        setHistory(newHistory);
                        break;
                    }
                    const mId = args[0].trim();
                    const module = flightComputerModules.find(m => m.id === mId || m.id.includes(mId)); // Allow partial match for convenience

                    if (module) {
                        newHistory.push({
                            type: 'success',
                            content: (
                                <div className="space-y-2">
                                    <p className="font-bold text-cyan-400">Module Details: {module.type}</p>
                                    <pre className="text-[10px] md:text-xs font-mono bg-slate-900 p-3 rounded overflow-x-auto text-slate-300 border border-slate-800">
                                        {JSON.stringify(module, (key, value) => {
                                            // Optional cleaner formatting if needed
                                            return value;
                                        }, 2)}
                                    </pre>
                                </div>
                            )
                        });
                    } else {
                        newHistory.push({ type: 'error', content: `Module not found with ID: "${mId}"` });
                    }
                    setHistory(newHistory);
                    break;



                case '/spawnbodycomplex':
                    if (args.length < 8) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /spawnBodyComplex [name] [mass] [rad] [color] [px] [py] [vx] [vy] [isStar?:t/f]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /spawnBodyComplex TestPlanet 5.97e24 6371 blue 1500 0 0 29 true</p>
                                </div>
                            )
                        });
                    } else {
                        const isStar = args[8] === 'true';
                        assistantActions.spawnBodyComplex(
                            args[0], Number(args[1]), Number(args[2]), args[3],
                            { x: Number(args[4]), y: Number(args[5]) },
                            { x: Number(args[6]), y: Number(args[7]) },
                            isStar
                        );
                        newHistory.push({ type: 'success', content: 'Complex body spawning initiatied.' });
                    }
                    setHistory(newHistory);
                    break;

                case '/configvisuals':
                    try {
                        const config = JSON.parse(args.join(' '));
                        const res = assistantActions.configureVisuals(config);
                        newHistory.push({ type: 'success', content: res });
                    } catch (e) {
                        newHistory.push({ type: 'error', content: 'Invalid JSON config.' });
                    }
                    setHistory(newHistory);
                    break;

                case '/configphysics':
                    try {
                        const config = JSON.parse(args.join(' '));
                        const res = assistantActions.configurePhysics(config);
                        newHistory.push({ type: 'success', content: res });
                    } catch (e) {
                        newHistory.push({ type: 'error', content: 'Invalid JSON config.' });
                    }
                    setHistory(newHistory);
                    break;

                case '/programflight':
                    if (args.length < 2) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /programFlight [rocketName] [maneuvers_json_array]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /programFlight Rocket1 [{`"type":"prograde","deltaV":100,"time":500`}]</p>
                                </div>
                            )
                        });
                    } else {
                        try {
                            const maneuvers = JSON.parse(args.slice(1).join(' '));
                            const res = assistantActions.programAdvancedFlightPlan(args[0], maneuvers);
                            newHistory.push({ type: 'success', content: res });
                        } catch (e) {
                            newHistory.push({ type: 'error', content: 'Invalid JSON for maneuvers.' });
                        }
                    }
                    setHistory(newHistory);
                    break;

                case '/execmaneuver':
                    if (args.length < 1) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /execManeuver [rocketName]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /execManeuver Falcon9</p>
                                </div>
                            )
                        });
                    }
                    else {
                        const res = assistantActions.executeManeuverPlan(args[0]);
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/rockettelem':
                    if (args.length < 1) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /rocketTelem [rocketName] [targetName?]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /rocketTelem Shuttle Earth</p>
                                </div>
                            )
                        });
                    }
                    else {
                        const res = assistantActions.getRocketTelemetry(args[0], args[1]);
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/manualnode':
                    if (args.length < 4) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /manualNode [rocketName] [time] [dvPro] [dvRad]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /manualNode Explorer 120 50 0</p>
                                    <p className="text-slate-400 text-[10px]">Adds a maneuver node at T+120s with 50m/s prograde.</p>
                                </div>
                            )
                        });
                    }
                    else {
                        const res = assistantActions.addManualNode(args[0], Number(args[1]), Number(args[2]), Number(args[3]));
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/flightplan':
                    if (args.length < 1) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /flightPlan [rocketName]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /flightPlan Voyager</p>
                                </div>
                            )
                        });
                    }
                    else {
                        const res = assistantActions.getRocketFlightPlan(args[0]);
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/addmodule':
                    if (args.length < 2) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /addModule [type] [rocketName] [ref?] [target?] [customName?] [color?] [group?] [config?]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /addModule LANDING_GUIDANCE Rocket1 BodyA BodyB "Lander 1" #ff0000</p>
                                </div>
                            )
                        });
                    } else {
                        // args: type, rocketName, ref, target, name, color, group, config
                        // Handle "null" or "undefined" string inputs as undefined
                        const cleanArg = (a: string) => (a === 'null' || a === 'undefined' ? undefined : a);

                        const res = assistantActions.addFlightComputerModule(
                            args[0] as any, // type is checked at runtime/execution mostly or blindly cast
                            args[1],
                            cleanArg(args[2]),
                            cleanArg(args[3]),
                            cleanArg(args[4]),
                            cleanArg(args[5]),
                            cleanArg(args[6]),
                            cleanArg(args[7])
                        );
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/removemodule':
                    if (args.length < 1) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /removeModule [moduleName_or_ID]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /removeModule 1f2e3d</p>
                                </div>
                            )
                        });
                    }
                    else {
                        const res = assistantActions.removeFlightComputerModule(args[0]);
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/togglemodule':
                    if (args.length < 2) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /toggleModule [moduleName] [true/false]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /toggleModule 1f2e3d false</p>
                                </div>
                            )
                        });
                    }
                    else {
                        const res = assistantActions.toggleFlightComputerModule(args[0], args[1] === 'true');
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/updatemodule':
                    if (args.length < 2) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /updateModule [moduleName] [config_string]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /updateModule 1f2e3d {`{"p_gain":1.5}`}</p>
                                </div>
                            )
                        });
                    }
                    else {
                        const res = assistantActions.updateFlightComputerModule(args[0], args.slice(1).join(' '));
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/creategroup':
                    if (args.length < 1) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /createGroup [name] [color?] [parent?]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /createGroup "Guidance" #00ff00</p>
                                </div>
                            )
                        });
                    }
                    else {
                        const cleanArg = (a: string) => (a === 'null' || a === 'undefined' ? undefined : a);
                        const res = assistantActions.createModuleGroup(args[0], cleanArg(args[1]), cleanArg(args[2]));
                        newHistory.push({ type: 'success', content: res });
                    }
                    setHistory(newHistory);
                    break;

                case '/getmoduledata':
                    const resData = assistantActions.getFlightComputerData();
                    newHistory.push({ type: 'success', content: resData });
                    setHistory(newHistory);
                    break;

                case '/showbody':
                    if (args.length === 0) {
                        newHistory.push({
                            type: 'error',
                            content: (
                                <div>
                                    <p>Usage: /showbody [name or id]</p>
                                    <p className="text-slate-400 text-xs mt-1">Example: /showbody Earth</p>
                                </div>
                            )
                        });
                        setHistory(newHistory);
                        break;
                    }
                    const query = args.join(' ').toLowerCase();
                    const body = bodies.find(
                        b => b.id.toLowerCase() === query ||
                            b.name.toLowerCase() === query ||
                            b.name.toLowerCase().includes(query)
                    );

                    if (body) {
                        newHistory.push({
                            type: 'success',
                            content: (
                                <div className="space-y-2">
                                    <p className="font-bold text-green-400">
                                        Found Body: <span
                                            className="cursor-pointer hover:underline text-white"
                                            onClick={(e) => { e.stopPropagation(); appendToInput(body.name); }}
                                        >{body.name}</span>
                                    </p>
                                    <pre className="text-[10px] md:text-xs font-mono bg-slate-900 p-3 rounded overflow-x-auto text-slate-300 border border-slate-800">
                                        {JSON.stringify(body, (key, value) => {
                                            if (key === 'trail') return `Array(${value.length})`; // Truncate trail for readability
                                            if (typeof value === 'number') return Number(value.toPrecision(6));
                                            return value;
                                        }, 2)}
                                    </pre>
                                </div>
                            )
                        });
                    } else {
                        newHistory.push({ type: 'error', content: `Body not found: "${args.join(' ')}"` });
                    }
                    setHistory(newHistory);
                    break;

                default:
                    newHistory.push({ type: 'error', content: `Unknown command: ${command}. Type /help for options.` });
                    setHistory(newHistory);
            }
        } else {
            // Echo non-commands
            newHistory.push({ type: 'output', content: trimmed });
            setHistory(newHistory);
        }

        if (trimmed) {
            setCommandHistory(prev => [...prev, trimmed]);
            setHistoryIndex(-1);
        }

        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            processCommand(inputValue);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length === 0) return;

            const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
            setHistoryIndex(newIndex);
            setInputValue(commandHistory[newIndex]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (commandHistory.length === 0 || historyIndex === -1) return;

            const newIndex = historyIndex + 1;
            if (newIndex >= commandHistory.length) {
                setHistoryIndex(-1);
                setInputValue('');
            } else {
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[newIndex]);
            }
        }
    };

    const appendToInput = (text: string) => {
        setInputValue(prev => {
            const trailingSpace = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + trailingSpace + text;
        });
        inputRef.current?.focus();
    };

    const handleOutputClick = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            return;
        }
        inputRef.current?.focus();
    };

    return (
        <div className="fixed top-0 left-0 right-0 bottom-24 z-[60] flex flex-col font-mono text-sm bg-slate-950/50 backdrop-blur-sm text-slate-200 pointer-events-auto">
            {/* Header / StatusBar */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-900/30">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-orange-400 flex items-center gap-2">
                        <Terminal size={16} /> GAME TERMINAL
                    </span>
                    <div className="hidden md:flex gap-4 text-xs text-slate-400 border-l border-slate-700 pl-4">
                        <span className="flex items-center gap-1">
                            <Layers size={12} /> Bodies: <span className="text-white">{bodies.length}</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock size={12} /> Time: <span className="text-white">{formatTime(simulationTime)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <Zap size={12} /> G: <span className="text-white">{physicsConfig.gravitationalConstant.toExponential(2)}</span>
                        </span>

                        <div className="flex flex-col items-center ml-4 pl-4 border-l border-slate-700">
                            <div className="flex items-end mb-[2px]">
                                <div className="w-px h-2 bg-slate-500"></div>
                                <div style={{ width: '200px' }} className="h-px bg-slate-500"></div>
                                <div className="w-px h-2 bg-slate-500"></div>
                            </div>
                            <span className="text-[10px] leading-none text-slate-400">{legendUnits.toExponential(2)} Units</span>
                        </div>
                    </div>
                </div>
                <span className={`font-bold ${fps < 30 ? 'text-red-400' : 'text-green-400'}`}>
                    {fps.toFixed(0)} FPS
                </span>
            </div>

            {/* Main Output Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth select-text"
                onClick={handleOutputClick}
            >
                {history.map((entry, idx) => (
                    <div key={idx} className="break-words">
                        {entry.type === 'input' && (
                            <div className="flex gap-2 text-slate-500 mt-4 mb-1">
                                <span className="text-slate-600">$</span>
                                <span>{entry.content}</span>
                            </div>
                        )}
                        {entry.type === 'output' && (
                            <div className="text-slate-300 ml-4 border-l-2 border-slate-800 pl-2">
                                {entry.content}
                            </div>
                        )}
                        {entry.type === 'error' && (
                            <div className="text-red-400 ml-4 bg-red-950/20 p-2 rounded border border-red-900/30 inline-block">
                                {entry.content}
                            </div>
                        )}
                        {entry.type === 'success' && (
                            <div className="text-green-400 ml-4">
                                {entry.content}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900/30 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                    <ChevronRight size={18} className="text-green-500 animate-pulse" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter command..."
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600"
                        autoFocus
                    />
                </div>
            </div>
        </div>
    );
};

export default DebugPanel;
