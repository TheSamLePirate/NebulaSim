import React, { useState, useRef, useEffect } from 'react';
import { Body, FlightComputerModule, PhysicsConfig, FlightComputerInput, RendezvousSolution } from '../types';
import { Edit, X, GripVertical, Check, Plus, Trash2, Settings } from 'lucide-react';
import { MODULE_ICONS, isModuleActive, getUpdateForInput, getInput, interpolateColor } from './flight_computer/utils';
import { resolveScalarInput, resolveBooleanInput, resolveStringInput, resolveInput } from '../services/orbitalMath';
import InputSelector from './flight_computer/InputSelector';

interface FlightComputerDashboardProps {
    modules: FlightComputerModule[];
    bodies: Body[];
    physicsConfig: PhysicsConfig;
    rendezvousPoints?: RendezvousSolution[];
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onToggleModule: (id: string) => void;
    showUI: boolean;
    nbColumns: number;
    nbRows: number;
    gap: number;
}

const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;




const FlightComputerDashboard: React.FC<FlightComputerDashboardProps> = ({
    modules,
    bodies,
    physicsConfig,
    rendezvousPoints,
    onUpdateModule,
    onToggleModule,
    showUI,
    nbColumns,
    nbRows,
    gap,
}) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
    const [dragOverCell, setDragOverCell] = useState<{ x: number, y: number } | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null); // For configuring card


    const CELL_WIDTH = screenWidth / nbColumns;
    const CELL_HEIGHT = screenHeight / nbRows;
    const GRID_GAP = gap;

    // Memoize rendezvous map
    const rendezvousSolutionMap = useRef<Record<string, RendezvousSolution>>({});
    useEffect(() => {
        const map: Record<string, RendezvousSolution> = {};
        if (rendezvousPoints) {
            rendezvousPoints.forEach(point => {
                map[point.moduleId] = point;
            });
        }
        rendezvousSolutionMap.current = map;
    }, [rendezvousPoints]);

    const dashboardModules = modules.filter(m => m.dashboardConfig);
    const availableModules = modules.filter(m => !m.dashboardConfig);

    const handleDragStart = (e: React.DragEvent, moduleId: string) => {
        setDraggedModuleId(moduleId);
        e.dataTransfer.effectAllowed = 'move';
        // Create a custom drag image if needed, or let browser handle it
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Calculate grid cell
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / (CELL_WIDTH + GRID_GAP));
        const y = Math.floor((e.clientY - rect.top) / (CELL_HEIGHT + GRID_GAP));

        if (!dragOverCell || dragOverCell.x !== x || dragOverCell.y !== y) {
            setDragOverCell({ x, y });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedModuleId && dragOverCell) {
            onUpdateModule(draggedModuleId, {
                dashboardConfig: {
                    x: dragOverCell.x,
                    y: dragOverCell.y,
                    showTitle: true
                }
            });
        }
        setDraggedModuleId(null);
        setDragOverCell(null);
    };

    const handleRemoveFromDashboard = (moduleId: string) => {
        onUpdateModule(moduleId, { dashboardConfig: undefined });
        if (selectedModuleId === moduleId) setSelectedModuleId(null);
    };

    const getModuleOutputValue = (module: FlightComputerModule, key: string): string => {
        const input = { type: 'module_output', value: `${module.id}:${key}` } as FlightComputerInput;

        // Try string
        const strValue = resolveStringInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap.current);
        if (strValue !== null) return strValue;

        // Try boolean
        const boolValue = resolveBooleanInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap.current);
        if (boolValue !== null) return boolValue ? 'TRUE' : 'FALSE';

        // Try scalar
        const val = resolveScalarInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap.current);
        if (typeof val === 'number') return val.toFixed(2);

        // Try body or vector
        const result = resolveInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap.current);
        if (result) {
            if ('name' in result) return result.name;
            if ('x' in result && 'y' in result) return `(${result.x.toFixed(1)}, ${result.y.toFixed(1)})`;
        }

        return '—';
    };

    const renderCardContent = (module: FlightComputerModule) => {
        // Special handling for interactive modules

        if (module.isEnabled === false) {
            return (<></>)

        }

        if (module.type === 'button') {
            const customLabel = module.dashboardConfig?.customLabel;
            return (
                <button
                    className={`w-full h-full rounded flex items-center justify-center font-bold transition-colors ${module.buttonState
                        ? 'bg-green-500/80 text-white hover:bg-green-600/80'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                        }`}
                    onClick={(e) => {
                        if (isEditMode) return;
                        e.stopPropagation();
                        // Toggle logic is handled in hook normally via input, but for dashboard click we might want to force state?
                        // Actually FlightComputerModule structure uses inputs. But if we want to "Click" it, we update state directly?
                        // The hook's button logic (lines 126-138) handles Reset input.
                        // Clicking here updates 'buttonState'. The hook mostly READS buttonState.
                        onUpdateModule(module.id, { buttonState: !module.buttonState });
                    }}
                    style={{ pointerEvents: isEditMode ? 'none' : 'auto' }}
                >
                    {module.buttonState ? customLabel || 'ON' : customLabel || 'OFF'}
                </button>
            );
        }

        if (module.type === 'slider') {
            return (
                <div className="flex flex-col h-full justify-center px-2" style={{ pointerEvents: isEditMode ? 'none' : 'auto' }}>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{module.sliderMin ?? 0}</span>
                        <span className="font-mono text-white">{module.sliderValue ?? 0}</span>
                        <span>{module.sliderMax ?? 100}</span>
                    </div>
                    <input
                        type="range"
                        min={module.sliderMin ?? 0}
                        max={module.sliderMax ?? 100}
                        step={module.sliderStep ?? 1}
                        value={module.sliderValue ?? 0}
                        onChange={(e) => onUpdateModule(module.id, { sliderValue: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>
            );
        }

        if (module.type === 'selector') {
            return (
                <div className="h-full flex items-center justify-center" style={{ pointerEvents: isEditMode ? 'none' : 'auto' }}>
                    <select
                        value={module.selectorBodyId || ''}
                        onChange={(e) => onUpdateModule(module.id, { selectorBodyId: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs text-white"
                    >
                        <option value="">Select...</option>
                        {bodies.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
            )
        }

        if (module.type === 'horizontal_bar') {
            const min = module.barMin ?? 0;
            const max = module.barMax ?? 100;
            const colorLow = module.barColorLow ?? '#ff0000';
            const colorMid = module.barColorMid ?? '#ffff00';
            const colorHigh = module.barColorHigh ?? '#00ff00';
            const outputLabel = module.dashboardConfig?.displayOutput?.label;
            const customLabel = module.dashboardConfig?.customLabel;

            let displayLabel = customLabel || outputLabel || 'Value';

            const input = getInput(module, 'value');
            const currentValue = input
                ? resolveScalarInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap.current) ?? 0
                : 0;

            const range = max - min;
            const percentage = range === 0 ? 0 : Math.max(0, Math.min(1, (currentValue - min) / range));

            let barColor = colorLow;
            if (percentage < 0.5) {
                barColor = interpolateColor(colorLow, colorMid, percentage * 2);
            } else {
                barColor = interpolateColor(colorMid, colorHigh, (percentage - 0.5) * 2);
            }

            return (
                <div className="flex flex-col h-full justify-center px-0">
                    <div className="h-full w-full bg-slate-900 border border-slate-700 overflow-hidden shadow-inner">
                        <div
                            className="h-full transition-all duration-300 flex items-center justify-center font-bold "
                            style={{
                                width: `${percentage * 100}%`,
                                backgroundColor: barColor,
                                boxShadow: `0 0 10px ${barColor}40`
                            }}
                        >

                        </div>
                        <div className="absolute bottom-0 h-full w-full flex items-center justify-center font-bold">
                            {displayLabel}
                        </div>
                    </div>
                </div>
            );
        }

        // Default: Show configured output
        const outputKey = module.dashboardConfig?.displayOutput?.key;
        const outputLabel = module.dashboardConfig?.displayOutput?.label;
        const customLabel = module.dashboardConfig?.customLabel;

        let displayValue = '—';
        let displayLabel = customLabel || outputLabel || 'Value';

        if (outputKey) {
            displayValue = getModuleOutputValue(module, outputKey);
        } else {
            // Auto-detect best output if none configured
            if (module.type === 'orbit_info') {
                displayValue = getModuleOutputValue(module, 'altitude');
                displayLabel = 'Altitude';
            } else if (module.type === 'track_velocity') {
                displayValue = getModuleOutputValue(module, 'speed');
                displayLabel = 'Velocity';
            }
            else if (module.type === 'track_distance') {
                displayValue = getModuleOutputValue(module, 'distance');
                displayLabel = 'Distance';
            } else if (module.type === 'logic_gate' || module.type === 'maths') {
                displayValue = getModuleOutputValue(module, 'result');
                displayLabel = 'Result';
            }
            else if (module.type === 'custom_script') {
                displayValue = getModuleOutputValue(module, 'result');
                displayLabel = '';
            }
            else if (module.type === 'body_by') {
                displayValue = getModuleOutputValue(module, 'body');
                displayLabel = '';
            } else if (module.type === 'rendezvous_tracker') {
                displayValue = getModuleOutputValue(module, 'time');
                displayLabel = 'Time to Rvz';
            }
            else {
                // Fallback
                displayValue = '...';
            }
        }
        displayLabel = customLabel || displayLabel;

        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{displayLabel}</div>
                <div className="text-lg font-mono font-bold text-white truncate w-full text-center">
                    {displayValue}
                </div>
            </div>
        );
    };

    return (
        <div className="absolute inset-0 z-[150] pointer-events-none overflow-hidden">
            {/* Edit Mode Toggle - Always visible and interactive */}
            {showUI && (
                <div className="absolute top-4 left-4 pointer-events-auto z-[60]">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${isEditMode
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 backdrop-blur'
                            }`}
                    >
                        {isEditMode ? <Check size={16} /> : <Edit size={16} />}
                        <span className="font-medium text-sm">{isEditMode ? 'Done' : 'Edit'}</span>
                    </button>
                </div>
            )}

            {/* Main Dashboard Area */}
            <div
                className={`w-full h-full transition-all duration-300 ${isEditMode ? 'bg-slate-900/60 backdrop-blur-sm pointer-events-auto' : 'pointer-events-none'
                    }`}
                onDragOver={isEditMode ? handleDragOver : undefined}
                onDrop={isEditMode ? handleDrop : undefined}
            >
                {/* Grid Background (Edit Mode Only) */}
                {isEditMode && (
                    <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                            backgroundSize: `${CELL_WIDTH + GRID_GAP}px ${CELL_HEIGHT + GRID_GAP}px`,
                            backgroundPosition: `${GRID_GAP / 2}px ${GRID_GAP / 2}px`
                        }}
                    />
                )}

                {/* Drag Preview Highlight */}
                {isEditMode && dragOverCell && draggedModuleId && (
                    <div
                        className="absolute border-2 border-blue-400 bg-blue-500/20 rounded-lg transition-all duration-75"
                        style={{
                            left: dragOverCell.x * (CELL_WIDTH + GRID_GAP) + GRID_GAP,
                            top: dragOverCell.y * (CELL_HEIGHT + GRID_GAP) + GRID_GAP,
                            width: CELL_WIDTH,
                            height: CELL_HEIGHT
                        }}
                    />
                )}

                {/* Dashboard Cards */}
                {dashboardModules.map(module => {
                    const { x, y } = module.dashboardConfig!;
                    const Icon = (MODULE_ICONS[module.type] || Settings) as any;
                    const isSelected = selectedModuleId === module.id;


                    const activateInput = getInput(module, 'activate');
                    const activateValue = activateInput
                        ? resolveBooleanInput(activateInput, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap.current) ?? 0
                        : 0;


                    if (module.isEnabled === false || activateValue === false) {
                        console.log(module);
                        console.log(activateValue);
                        return null;
                    }

                    return (
                        <div
                            key={module.id}
                            draggable={isEditMode}
                            onDragStart={(e) => handleDragStart(e, module.id)}
                            onClick={() => isEditMode && setSelectedModuleId(module.id)}
                            className={`absolute rounded-lg shadow-lg overflow-hidden transition-all ${isEditMode ? 'cursor-move hover:ring-2 hover:ring-blue-400' : 'pointer-events-auto'
                                } ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}`}
                            style={{
                                left: x * (CELL_WIDTH + GRID_GAP) + GRID_GAP,
                                top: y * (CELL_HEIGHT + GRID_GAP) + GRID_GAP,
                                width: CELL_WIDTH,
                                height: CELL_HEIGHT,
                                backgroundColor: isEditMode ? '#1e293b' : (module.color + '20'), // Transparent-ish in view mode
                                borderColor: module.color,
                                borderWidth: '1px',
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            {/* Card Header (Title) */}
                            {module.dashboardConfig?.showTitle && (
                                <div
                                    className="h-6 px-2 flex items-center justify-between text-[10px] font-bold text-white/80"
                                    style={{ backgroundColor: module.color + '40' }}
                                >
                                    <div className="flex items-center gap-1 truncate">
                                        <Icon size={10} />
                                        <span className="truncate">{module.name || module.type}</span>
                                    </div>
                                    {isEditMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFromDashboard(module.id); }}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Card Content */}
                            <div className={`${module.dashboardConfig?.showTitle ? 'h-[calc(100%-24px)]' : 'h-full'} w-full`}>
                                {renderCardContent(module)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Unused Modules Drawer (Edit Mode Only) */}
            {isEditMode && (
                <div className="absolute bottom-40 left-40 right-40 h-64 bg-slate-900 border-t border-slate-700 p-4 transform transition-transform duration-300 pointer-events-auto flex flex-col z-[60]">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-slate-300">Available Modules</h3>
                        <div className="text-xs text-slate-500">Drag modules to the grid above</div>
                    </div>

                    <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                        <div className="flex gap-3 h-full items-center">
                            {availableModules.length === 0 && (
                                <div className="text-slate-500 text-sm italic w-full text-center">
                                    All modules are on the dashboard.
                                </div>
                            )}
                            {availableModules.map(module => {
                                const Icon = (MODULE_ICONS[module.type] || Settings) as any;
                                return (
                                    <div
                                        key={module.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, module.id)}
                                        className="flex-shrink-0 w-32 h-24 bg-slate-800 rounded border border-slate-700 hover:border-slate-500 cursor-move flex flex-col items-center justify-center gap-2 p-2 group"
                                    >
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: module.color + '20' }}>
                                            <Icon size={16} style={{ color: module.color }} />
                                        </div>
                                        <div className="text-xs font-medium text-slate-300 text-center truncate w-full">
                                            {module.name || module.type}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-400 transition-opacity">
                                            Drag to add
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Configuration Panel for Selected Module (Edit Mode Only) */}
            {isEditMode && selectedModuleId && (
                <div className="absolute top-16 right-4 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4 pointer-events-auto z-[60]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-200">Card Settings</h3>
                        <button onClick={() => setSelectedModuleId(null)} className="text-slate-500 hover:text-slate-300">
                            <X size={14} />
                        </button>
                    </div>

                    {(() => {
                        const module = modules.find(m => m.id === selectedModuleId);
                        if (!module) return null;

                        // Get available outputs for this module type
                        // This logic is similar to FlightComputerPanel's group display selector
                        // We should probably extract this to a helper, but for now inline is fine for speed
                        const getOutputs = (m: FlightComputerModule) => {
                            const outputs: { key: string; label: string }[] = [];
                            if (m.type === 'orbit_info') {
                                outputs.push(
                                    { key: 'altitude', label: 'Altitude' },
                                    { key: 'period', label: 'Period' },
                                    { key: 'apoapsis', label: 'Apoapsis' },
                                    { key: 'periapsis', label: 'Periapsis' },
                                    { key: 'eccentricity', label: 'Eccentricity' },
                                    { key: 'pe_point', label: 'Periapsis Point' },
                                    { key: 'pa_point', label: 'Apoapsis Point' },
                                    { key: 'primary_body', label: 'Primary Body' },
                                    { key: 'reference_body', label: 'Reference Body' }
                                );
                            } else if (m.type === 'transfer_window') {
                                outputs.push(
                                    { key: 'current_phase', label: 'Current Phase' },
                                    { key: 'required_phase', label: 'Required Phase' },
                                    { key: 'error_angle', label: 'Error Angle' },
                                    { key: 'wait_time', label: 'Wait Time' },
                                    { key: 'transfer_time', label: 'Transfer Time' },
                                    { key: 'arrival_time', label: 'Arrival Time' },
                                    { key: 'ready', label: 'Ready Status' },
                                    { key: 'error', label: 'Error (Deg)' },
                                    { key: 'insertion_point', label: 'Insertion Point' },
                                    { key: 'intercept_point', label: 'Intercept Point' }
                                );
                            } else if (m.type === 'track_velocity') {
                                outputs.push(
                                    { key: 'speed', label: 'Speed' },
                                    { key: 'primary_body', label: 'Primary Body' },
                                    { key: 'target_body', label: 'Target Body' }
                                );
                            } else if (m.type === 'track_distance') {
                                outputs.push(
                                    { key: 'distance', label: 'Distance' },
                                    { key: 'primary_body', label: 'Primary Body' },
                                    { key: 'target_body', label: 'Target Body' }
                                );
                            } else if (m.type === 'logic_gate' || m.type === 'maths') {
                                outputs.push({ key: 'result', label: 'Result' });
                            } else if (m.type === 'custom_script') {
                                outputs.push(
                                    { key: 'result', label: 'Result' },
                                    { key: 'state', label: 'Async State' }
                                );
                            } else if (m.type === 'body_info') {
                                outputs.push(
                                    { key: 'name', label: 'Name' },
                                    { key: 'mass', label: 'Mass' },
                                    { key: 'radius', label: 'Radius' },
                                    { key: 'fuel', label: 'Fuel' },
                                    { key: 'max_fuel', label: 'Max Fuel' },
                                    { key: 'dry_mass', label: 'Dry Mass' },
                                    { key: 'landed_on', label: 'Landed On' },
                                    { key: 'sas_mode', label: 'SAS Mode' },
                                    { key: 'pos_x', label: 'Pos X' },
                                    { key: 'pos_y', label: 'Pos Y' },
                                    { key: 'vel_x', label: 'Vel X' },
                                    { key: 'vel_y', label: 'Vel Y' },
                                    { key: 'angle', label: 'Angle' },
                                    { key: 'thrust_x', label: 'Thrust X' },
                                    { key: 'thrust_y', label: 'Thrust Y' }
                                );
                            } else if (m.type === 'rendezvous_tracker') {
                                outputs.push(
                                    { key: 'time', label: 'Time to Rvz' },
                                    { key: 'distance', label: 'Distance' },
                                    { key: 'delta_v_total', label: 'Delta V Total' },
                                    { key: 'delta_v_prograde', label: 'Delta V Prograde' },
                                    { key: 'delta_v_radial', label: 'Delta V Radial' },
                                    { key: 'position', label: 'Rendezvous Point' }
                                );
                            } else if (m.type === 'line_drawer') {
                                outputs.push(
                                    { key: 'length', label: 'Length' },
                                    { key: 'distance', label: 'Distance' },
                                    { key: 'hit', label: 'Hit' },
                                    { key: 'vector', label: 'Vector (B-A)' },
                                    { key: 'hit_position', label: 'Hit Position' }
                                );
                            } else if (m.type === 'circle_drawer') {
                                outputs.push(
                                    { key: 'foundObject', label: 'Found Object' },
                                    { key: 'objectId', label: 'Object ID' },
                                    { key: 'closestPoint', label: 'Closest Point' }
                                );
                            } else if (m.type === 'selector' || m.type === 'body_by') {
                                outputs.push({ key: 'body', label: 'Selected Body' });
                            } else if (m.type === 'slider') {
                                outputs.push({ key: 'value', label: 'Value' });
                            } else if (m.type === 'button') {
                                outputs.push({ key: 'state', label: 'State' });
                            } else if (m.type === 'music_controller') {
                                outputs.push(
                                    { key: 'volume', label: 'Volume' },
                                    { key: 'state', label: 'Playing' }
                                );
                            } else if (m.type === 'edge_detector' || m.type === 'change_detector' || m.type === 'wait' || m.type === 'notify') {
                                outputs.push({ key: 'triggered', label: 'Triggered' });
                            } else if (m.type === 'maneuver_executor') {
                                outputs.push({ key: 'progress', label: 'Progress (%)' });
                            } else if (m.type === 'keyboard') {
                                outputs.push(
                                    { key: 'state', label: 'Is Pressed' },
                                    { key: 'key', label: 'Key Char' }
                                );
                            } else if (m.type === 'marker') {
                                outputs.push(
                                    { key: 'visible', label: 'Visible' },
                                    { key: 'title', label: 'Title' },
                                    { key: 'description', label: 'Description' },
                                    { key: 'color', label: 'Color' },
                                    { key: 'position', label: 'Position' },
                                    { key: 'pulse', label: 'Pulse' }
                                );
                            } else if (m.type === 'thrust_burst') {
                                outputs.push({ key: 'done', label: 'Done' });
                            }

                            // Add more as needed
                            return outputs;
                        };

                        const outputs = getOutputs(module);

                        return (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Card Label</label>
                                    <input
                                        type="text"
                                        value={module.dashboardConfig?.customLabel || module.name || ''}
                                        onChange={(e) => onUpdateModule(module.id, {
                                            dashboardConfig: { ...module.dashboardConfig!, customLabel: e.target.value }
                                        })}
                                        placeholder="Custom Label"
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                    />
                                </div>

                                {outputs.length > 0 && (
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Displayed Value</label>
                                        <select
                                            value={module.dashboardConfig?.displayOutput?.key || ''}
                                            onChange={(e) => {
                                                const key = e.target.value;
                                                const label = outputs.find(o => o.key === key)?.label || key;
                                                onUpdateModule(module.id, {
                                                    dashboardConfig: {
                                                        ...module.dashboardConfig!,
                                                        displayOutput: { key, label }
                                                    }
                                                });
                                            }}
                                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                        >
                                            <option value="">Default</option>
                                            {outputs.map(o => (
                                                <option key={o.key} value={o.key}>{o.label}</option>
                                            ))}
                                        </select>

                                    </div>

                                )}

                                <label className="text-xs text-slate-500 block mb-1">Show Title</label>
                                <input
                                    type="checkbox"
                                    checked={module.dashboardConfig?.showTitle}
                                    onChange={(e) => onUpdateModule(module.id, { dashboardConfig: { ...module.dashboardConfig!, showTitle: e.target.checked } })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                />

                                <button
                                    onClick={() => handleRemoveFromDashboard(module.id)}
                                    className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs transition-colors"
                                >
                                    <Trash2 size={12} />
                                    Remove from Dashboard
                                </button>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default FlightComputerDashboard;
