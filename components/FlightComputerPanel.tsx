import React, { useState } from 'react';
import { Body, FlightComputerModule, FlightComputerModuleType, PhysicsConfig, FlightComputerInput, ModuleGroup, RendezvousSolution } from '../types';
import { ChevronDown, ChevronUp, Plus, FolderPlus, Upload, GripVertical, X, Trash2, CheckSquare, Download, Settings, CloudDownload, CloudUpload } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { useFlightComputerLogic } from '../hooks/useFlightComputerLogic';
import ModuleContent from './flight_computer/ModuleContent';
import InputSelector from './flight_computer/InputSelector';
import { getInput, getUpdateForInput, MODULE_ICONS, isModuleActive } from './flight_computer/utils';
import { resolveScalarInput, resolveBooleanInput, resolveStringInput } from '../services/orbitalMath';


interface FlightComputerPanelProps {
    modules: FlightComputerModule[];
    groups: ModuleGroup[];
    bodies: Body[];
    physicsConfig: PhysicsConfig;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
    onRemoveModule: (id: string) => void;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onToggleModule: (id: string) => void;
    onAddGroup: () => void;
    onRemoveGroup: (groupId: string) => void;
    onUpdateGroup: (groupId: string, updates: Partial<ModuleGroup>) => void;
    onMoveModuleToGroup: (moduleId: string, groupId: string | null) => void;
    onMoveGroupToGroup: (groupId: string, parentGroupId: string | null) => void;
    onExportGroup: (groupId: string) => void;
    onImportGroup: () => void;
    rendezvousPoints?: RendezvousSolution[];
    onSetFollowingBody?: (bodyId: string | null) => void;
    fps: number;
    simulationTime: number;
    scale: number;
    showUI: boolean;
    updateRocket?: (id: string, updates: Partial<Body>) => void;
    handlePresetChange?: (preset: string) => void;
    setSpeed?: (speed: number) => void;
    setIsRunning?: (isRunning: boolean) => void;
    isRunning?: boolean;
    speed?: number;
    onReset?: () => void;
    onTimeReverse?: () => void;
    onZoom?: (factor: number) => void;
    nbColumns?: number;
    nbRows?: number;
    gap?: number;
    setNbColumns?: (nbColumns: number) => void;
    setNbRows?: (nbRows: number) => void;
    setGap?: (gap: number) => void;
    handleUpdateCandidate?: (candidate: Partial<Body>) => void;
    handleSpawnManual?: () => void;
    setCreationCandidate?: (candidate: Body | null) => void;
    createAndSpawnBody?: (name: string, mass: number, radius: number, color: string, position: { x: number, y: number }, velocity: { x: number, y: number }, description: string) => void;
    setShowImageSlideShow?: (show: boolean) => void;
    nextImage?: () => void;
    prevImage?: () => void;
    handleJumpToImage?: (imageId: string) => void;
    setShowCameraViewer?: (show: boolean) => void;
    setShowParralaxe?: (show: boolean) => void;
    handleStageRocket?: (rocketId: string) => void;
    // Puter Props
    onPuterExportGroup?: (groupId: string) => void;
    onPuterImportGroup?: () => void;
    // Lifted Logic Props -- isModuleActive removed as it's imported from utils
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
    followModuleTriggerStateRef: React.MutableRefObject<Map<string, boolean>>;
}

const MODULE_TYPES: { value: FlightComputerModuleType; label: string; category: string }[] = [
    { value: 'orbit_info', label: 'Orbit Info', category: 'Info' },
    { value: 'transfer_window', label: 'Transfer Window', category: 'Info' },
    { value: 'rendezvous_tracker', label: 'Rendezvous Tracker', category: 'Info' },
    { value: 'track_distance', label: 'Track Distance', category: 'Info' },
    { value: 'track_velocity', label: 'Track Velocity', category: 'Info' },
    { value: 'body_info', label: 'Body Info', category: 'Info' },
    { value: 'body_by', label: 'Body By', category: 'Info' },
    { value: 'marker', label: 'Marker', category: 'Visual' },
    { value: 'line_drawer', label: 'Line Drawer', category: 'Visual' },
    { value: 'circle_drawer', label: 'Circle Drawer', category: 'Visual' },
    { value: 'horizontal_bar', label: 'Horizontal Bar', category: 'Visual' },
    { value: 'logic_gate', label: 'Logic Gate', category: 'Logic' },
    { value: 'maths', label: 'Math Operation', category: 'Logic' },
    { value: 'button', label: 'Button', category: 'Logic' },
    { value: 'selector', label: 'Selector', category: 'Logic' },
    { value: 'keyboard', label: 'Keyboard Handler', category: 'Logic' },
    { value: 'slider', label: 'Slider', category: 'Logic' },
    { value: 'notify', label: 'Notify', category: 'Actions' },
    { value: 'beep', label: 'Beep', category: 'Actions' },
    { value: 'thrust_burst', label: 'Thrust Burst', category: 'Actions' },
    { value: 'maneuver_executor', label: 'Maneuver Executor', category: 'Actions' },
    { value: 'follow', label: 'Follow', category: 'Actions' },
    { value: 'music_controller', label: 'Music Controller', category: 'Actions' },
    { value: 'edge_detector', label: 'Edge Detector', category: 'Logic' },
    { value: 'change_detector', label: 'Change Detector', category: 'Logic' },
    { value: 'custom_script', label: 'Custom Script', category: 'Advanced' },
    { value: 'wait', label: 'Wait / Timer', category: 'Logic' },
    { value: 'system_monitor', label: 'System Monitor', category: 'Advanced' },
    { value: 'lagrange_calculator', label: 'Lagrange Points', category: 'Info' },
];

const FlightComputerPanel: React.FC<FlightComputerPanelProps> = ({
    modules,
    groups,
    bodies,
    physicsConfig,
    onAddModule,
    onRemoveModule,
    onUpdateModule,
    onToggleModule,
    onAddGroup,
    onRemoveGroup,
    onUpdateGroup,
    onMoveModuleToGroup,
    onMoveGroupToGroup,
    onExportGroup,
    onImportGroup,
    onPuterExportGroup,
    onPuterImportGroup,
    rendezvousPoints,
    onSetFollowingBody,
    fps,
    simulationTime,
    scale,
    showUI,
    updateRocket,
    handlePresetChange,
    setSpeed,
    setIsRunning,
    isRunning,
    speed,
    onReset,
    onTimeReverse,
    onZoom,
    nbColumns,
    nbRows,
    gap,
    setNbColumns,
    setNbRows,
    setGap,
    handleUpdateCandidate,
    handleSpawnManual,
    setCreationCandidate,
    createAndSpawnBody,
    setShowImageSlideShow,
    nextImage,
    prevImage,
    handleJumpToImage,
    setShowCameraViewer,
    setShowParralaxe,
    handleStageRocket,
    // Lifted props
    rendezvousSolutionMap,
    followModuleTriggerStateRef
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const isMobile = useIsMobile();

    const [expandedModules, setExpandedModules] = useState<string[]>([]);
    const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
    const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
    const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

    // Helper to get display value for collapsed group
    const getGroupDisplayValue = (group: ModuleGroup): string => {
        if (!group.displayOutput) return '—';
        const { moduleId, outputKey } = group.displayOutput;
        const module = modules.find(m => m.id === moduleId);
        if (!module) return '—';

        // Simplified display logic - resolve the output value
        const input = { type: 'module_output', value: `${moduleId}:${outputKey}` } as FlightComputerInput;

        // Try string first
        const strValue = resolveStringInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);
        if (strValue !== null) return strValue;

        // Try boolean
        const boolValue = resolveBooleanInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);
        if (boolValue !== null) return boolValue ? 'TRUE' : 'FALSE';

        // Try scalar
        const value = resolveScalarInput(
            input,
            bodies,
            modules,
            physicsConfig.gravitationalConstant,
            rendezvousSolutionMap
        );

        if (typeof value === 'number') return value.toFixed(2);
        return String(value ?? '—');
    };

    // Render function for a single module
    const renderModule = (module: FlightComputerModule) => {
        const isExpanded = expandedModules.includes(module.id);
        const Icon = MODULE_ICONS[module.type] || Settings;
        const moduleActiveState = isModuleActive(module, bodies, modules, physicsConfig, rendezvousSolutionMap);
        const isFollowing = module.type === 'follow' && followModuleTriggerStateRef?.current?.get(module.id);

        const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
            onUpdateModule(moduleId, getUpdateForInput(module, key, input));
        };

        return (
            <div
                key={module.id}
                draggable
                onDragStart={() => setDraggedModuleId(module.id)}
                onDragEnd={() => setDraggedModuleId(null)}
                className={`bg-slate-800/40 backdrop-blur-sm rounded border transition-all ${module.isEnabled ? 'border-slate-700/50' : 'border-slate-800/30 opacity-50'
                    } ${draggedModuleId === module.id ? 'opacity-40' : ''}`}
            >
                <div className="p-2">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <GripVertical size={12} className="text-slate-600 cursor-move" />
                        <div className="flex-1 flex items-center gap-2">
                            {React.createElement(Icon as React.ElementType, { size: 14, style: { color: module.color } })}
                            <input
                                type="text"
                                value={module.name || MODULE_TYPES.find(t => t.value === module.type)?.label || module.type}
                                onChange={(e) => onUpdateModule(module.id, { name: e.target.value })}
                                className="flex-1 bg-transparent border-none text-xs text-slate-200 outline-none"
                                placeholder="Module name..."
                            />
                        </div>
                        <input
                            type="color"
                            value={module.color}
                            onChange={(e) => onUpdateModule(module.id, { color: e.target.value })}
                            className="w-6 h-6 rounded cursor-pointer"
                        />
                        <button
                            onClick={() => onToggleModule(module.id)}
                            className={`p-1 rounded ${module.isEnabled ? 'text-green-400 bg-green-900/20' : 'text-slate-500 bg-slate-800'}`}
                        >
                            <CheckSquare size={14} />
                        </button>
                        <button
                            onClick={() => setExpandedModules(expanded =>
                                isExpanded ? expanded.filter(id => id !== module.id) : [...expanded, module.id]
                            )}
                            className="p-1 hover:bg-slate-700/50 rounded text-slate-400"
                        >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button
                            onClick={() => onRemoveModule(module.id)}
                            className="p-1 hover:bg-red-900/30 rounded text-red-400"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Activation Input (for all modules) */}
                    {isExpanded && (
                        <div className="mb-2 pb-2 border-b border-slate-700/30">
                            <InputSelector
                                label="Activate (Boolean)"
                                value={getInput(module, 'activate')}
                                onChange={(input) => updateInput(module.id, 'activate', input)}
                                bodies={bodies}
                                modules={modules}
                                currentModuleId={module.id}
                                allowedTypes={['boolean', 'module_output']}
                            />
                            {getInput(module, 'activate') && (
                                <div className="mt-1 flex items-center justify-between text-[10px]">
                                    <span className="text-slate-500">Status:</span>
                                    <span className={`font-mono ${moduleActiveState ? 'text-green-400' : 'text-red-400'}`}>
                                        {moduleActiveState ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Primary Inputs (target, primary, reference) */}
                    {isExpanded && ['orbit_info', 'transfer_window', 'rendezvous_tracker', 'track_distance', 'track_velocity', 'marker', 'maneuver_executor'].includes(module.type) && (
                        <div className="space-y-2 mb-2 pb-2 border-b border-slate-700/30">
                            {['orbit_info', 'marker', 'maneuver_executor'].includes(module.type) && (
                                <InputSelector
                                    label={module.type === 'marker' ? 'Marker Target' : 'Primary Body/Ship'}
                                    value={getInput(module, 'primary')}
                                    onChange={(input) => updateInput(module.id, 'primary', input)}
                                    bodies={bodies}
                                    modules={modules}
                                    currentModuleId={module.id}
                                    allowedTypes={['body', 'module_output']}
                                />
                            )}
                            {['orbit_info', 'transfer_window', 'rendezvous_tracker', 'track_distance', 'track_velocity'].includes(module.type) && module.type !== 'marker' && (
                                <>
                                    <InputSelector
                                        label="Primary Body/Ship"
                                        value={getInput(module, 'primary')}
                                        onChange={(input) => updateInput(module.id, 'primary', input)}
                                        bodies={bodies}
                                        modules={modules}
                                        currentModuleId={module.id}
                                        allowedTypes={['body', 'module_output']}
                                    />
                                    {['orbit_info', 'transfer_window'].includes(module.type) && (
                                        <InputSelector
                                            label="Reference Body"
                                            value={getInput(module, 'reference')}
                                            onChange={(input) => updateInput(module.id, 'reference', input)}
                                            bodies={bodies}
                                            modules={modules}
                                            currentModuleId={module.id}
                                            allowedTypes={['body', 'module_output']}
                                        />
                                    )}
                                    {['transfer_window', 'rendezvous_tracker', 'track_distance', 'track_velocity'].includes(module.type) && (
                                        <InputSelector
                                            label="Target"
                                            value={getInput(module, 'target')}
                                            onChange={(input) => updateInput(module.id, 'target', input)}
                                            bodies={bodies}
                                            modules={modules}
                                            currentModuleId={module.id}
                                            allowedTypes={['body', 'module_output']}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Module-specific content */}
                    {isExpanded && (
                        <ModuleContent
                            module={module}
                            bodies={bodies}
                            modules={modules}
                            physicsConfig={physicsConfig}
                            rendezvousSolutionMap={rendezvousSolutionMap}
                            onUpdateModule={onUpdateModule}
                            onAddModule={onAddModule}
                            isFollowing={isFollowing}
                        />
                    )}
                </div>
            </div>
        );
    };

    // Render group recursively
    const renderGroup = (group: ModuleGroup, depth: number = 0): React.ReactElement => {
        const childGroups = groups.filter(g => g.parentGroupId === group.id);
        const groupModules = modules.filter(m => m.groupId === group.id);

        return (
            <div
                key={group.id}
                className={`bg-slate-900/40 rounded border border-slate-700/30 mb-2 ${group.isCollapsed ? '' : 'col-span-full'}`}
                style={{ marginLeft: group.isCollapsed ? 0 : depth * 12 }}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverGroupId(group.id);
                }}
                onDragLeave={() => setDragOverGroupId(null)}
                onDrop={(e) => {
                    e.preventDefault();
                    if (draggedModuleId) {
                        onMoveModuleToGroup(draggedModuleId, group.id);
                    } else if (draggedGroupId && draggedGroupId !== group.id) {
                        onMoveGroupToGroup(draggedGroupId, group.id);
                    }
                    setDragOverGroupId(null);
                }}
            >
                <div className="p-2">
                    {/* Group Header */}
                    <div className="flex gap-2 mb-2">
                        <div
                            draggable
                            onDragStart={() => setDraggedGroupId(group.id)}
                            onDragEnd={() => setDraggedGroupId(null)}
                            className="cursor-move"
                        >
                            <GripVertical size={12} className="text-slate-600" />
                        </div>
                        {group.isCollapsed && (
                            <div className="text-xs text-slate-400 font-mono">
                                {group.name}
                            </div>
                        )}
                        {!group.isCollapsed && (
                            <>
                                <input
                                    type="text"
                                    value={group.name}
                                    onChange={(e) => onUpdateGroup(group.id, { name: e.target.value })}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                                />
                                <input
                                    type="color"
                                    value={group.color}
                                    onChange={(e) => onUpdateGroup(group.id, { color: e.target.value })}
                                    className="w-6 h-6 rounded cursor-pointer"
                                />
                            </>
                        )}

                        {group.isCollapsed && (
                            <div className="text-xs text-slate-400 font-mono">
                                {getGroupDisplayValue(group)}
                            </div>
                        )}

                        {/* align right */}

                        <button
                            onClick={() => onUpdateGroup(group.id, { isCollapsed: !group.isCollapsed })}
                            className="p-1 hover:bg-slate-700/50 rounded text-slate-400"
                        >
                            {group.isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                        <button
                            onClick={() => onExportGroup(group.id)}
                            className="p-1 hover:bg-slate-700/50 rounded text-slate-400"
                            title="Export Group to JSON"
                        >
                            <Download size={14} />
                        </button>
                        {onPuterExportGroup && (
                            <button
                                onClick={() => onPuterExportGroup(group.id)}
                                className="p-1 hover:bg-purple-900/30 rounded text-purple-400"
                                title="Save Group to Cloud"
                            >
                                <CloudUpload size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => onRemoveGroup(group.id)}
                            className="p-1 hover:bg-red-900/30 rounded text-red-400"
                        >
                            <Trash2 size={14} />
                        </button>

                    </div>

                    {/* Group Content */}
                    {!group.isCollapsed && (
                        <div className="space-y-2">
                            {/* Display Output Selector */}
                            <div className="bg-slate-800/30 p-2 rounded border border-slate-700/30">
                                <label className="text-[9px] text-slate-500 uppercase block mb-1">Display Output (When Collapsed)</label>
                                <select
                                    value={group.displayOutput ? `${group.displayOutput.moduleId}:${group.displayOutput.outputKey}` : ''}
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            onUpdateGroup(group.id, { displayOutput: undefined });
                                        } else {
                                            const [moduleId, outputKey] = e.target.value.split(':');
                                            onUpdateGroup(group.id, {
                                                displayOutput: { moduleId, outputKey }
                                            });
                                        }
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                                >
                                    <option value="">None</option>
                                    {groupModules.flatMap(m => {
                                        const outputs: { key: string; label: string }[] = [];

                                        // Add common outputs based on module type
                                        if (m.type === 'orbit_info') {
                                            outputs.push(
                                                { key: 'altitude', label: `${m.name || 'Orbit'} - Altitude` },
                                                { key: 'period', label: `${m.name || 'Orbit'} - Period` },
                                                { key: 'apoapsis', label: `${m.name || 'Orbit'} - Apoapsis` },
                                                { key: 'periapsis', label: `${m.name || 'Orbit'} - Periapsis` }
                                            );
                                        } else if (m.type === 'transfer_window') {
                                            outputs.push(
                                                { key: 'phase_angle', label: `${m.name || 'Transfer'} - Phase Angle` },
                                                { key: 'wait_time', label: `${m.name || 'Transfer'} - Wait Time` },
                                                { key: 'ready', label: `${m.name || 'Transfer'} - Ready` }
                                            );
                                        } else if (m.type === 'rendezvous_tracker') {
                                            outputs.push(
                                                { key: 'time', label: `${m.name || 'Rendezvous'} - Time` },
                                                { key: 'distance', label: `${m.name || 'Rendezvous'} - Distance` },
                                                { key: 'delta_v_total', label: `${m.name || 'Rendezvous'} - ΔV Total` }
                                            );
                                        } else if (m.type === 'track_distance') {
                                            outputs.push({ key: 'distance', label: `${m.name || 'Distance'} - Distance` });
                                        } else if (m.type === 'track_velocity') {
                                            outputs.push({ key: 'velocity', label: `${m.name || 'Velocity'} - Velocity` });
                                        } else if (m.type === 'logic_gate') {
                                            outputs.push({ key: 'result', label: `${m.name || 'Logic'} - Result` });
                                        }
                                        else if (m.type === 'notify') {
                                            outputs.push({ key: 'triggered', label: `${m.name || 'Notify'} - Triggered` });
                                        }
                                        else if (m.type === 'button') {
                                            outputs.push({ key: 'state', label: `${m.name || 'Button'} - State` });
                                        } else if (m.type === 'maths') {
                                            outputs.push({ key: 'result', label: `${m.name || 'Math'} - Result` });
                                        } else if (m.type === 'custom_script') {
                                            outputs.push({ key: 'result', label: `${m.name || 'Script'} - Result` });
                                        } else if (m.type === 'maneuver_executor') {
                                            outputs.push(
                                                { key: 'status', label: `${m.name || 'Executor'} - Status` },
                                                { key: 'progress', label: `${m.name || 'Executor'} - Progress` }
                                            );
                                        } else if (m.type === 'selector') {
                                            outputs.push({ key: 'body', label: `${m.name || 'Selector'} - Body` });
                                        } else if (m.type === 'keyboard') {
                                            outputs.push(
                                                { key: 'state', label: `${m.name || 'Keyboard'} - State` },
                                                { key: 'key', label: `${m.name || 'Keyboard'} - Key Name` }
                                            );
                                        } else if (m.type === 'slider') {
                                            outputs.push({ key: 'value', label: `${m.name || 'Slider'} - Value` });
                                        } else if (m.type === 'music_controller') {
                                            outputs.push(
                                                { key: 'volume', label: `${m.name || 'Music'} - Volume` },
                                                { key: 'state', label: `${m.name || 'Music'} - Playing` }
                                            );
                                        } else if (m.type === 'circle_drawer') {
                                            outputs.push(
                                                { key: 'foundObject', label: `${m.name || 'Circle'} - Found Object` },
                                                { key: 'objectId', label: `${m.name || 'Circle'} - Object ID` },
                                                { key: 'closestPoint', label: `${m.name || 'Circle'} - Closest Point` }
                                            );
                                        } else if (m.type === 'lagrange_calculator') {
                                            outputs.push(
                                                { key: 'l1', label: `${m.name || 'Lagrange'} - L1` },
                                                { key: 'l2', label: `${m.name || 'Lagrange'} - L2` },
                                                { key: 'l3', label: `${m.name || 'Lagrange'} - L3` },
                                                { key: 'l4', label: `${m.name || 'Lagrange'} - L4` },
                                                { key: 'l5', label: `${m.name || 'Lagrange'} - L5` }
                                            );
                                        }

                                        return outputs.map(o => ({ ...o, moduleId: m.id }));
                                    }).map(({ moduleId, key, label }) => (
                                        <option key={`${moduleId}:${key}`} value={`${moduleId}:${key}`}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {groupModules.map(renderModule)}
                            {childGroups.map(childGroup => renderGroup(childGroup, depth + 1))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Top-level groups and ungrouped modules
    const topLevelGroups = groups.filter(g => !g.parentGroupId);
    const ungroupedModules = modules.filter(m => !m.groupId);

    return (
        <div className={`fixed z-[60] transition-all duration-300 ${isExpanded
            ? 'inset-0 bg-slate-900/10 backdrop-blur-xs bottom-16'
            : 'top-0 right-0 w-auto bg-slate-900/10 backdrop-blur-xs rounded-lg shadow-2xl'
            } flex flex-col overflow-hidden`}>
            {/* Header - Always visible */}
            <div className="flex-shrink-0 p-4 border-b border-slate-700/50 bg-slate-900/50">
                <div className="flex items-center justify-between gap-">
                    <div className="flex gap-0">
                        {isExpanded && (
                            <>
                                <button
                                    onClick={() => setIsAdding(!isAdding)}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${isAdding
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                >
                                    <Plus size={16} className="inline mr-1" />
                                    Add Module
                                </button>
                                <button
                                    onClick={onAddGroup}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300"
                                >
                                    <FolderPlus size={16} className="inline mr-1" />
                                    New Group
                                </button>
                                <button
                                    onClick={onImportGroup}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300"
                                    title="Import Group from JSON"
                                >
                                    <Upload size={16} />
                                </button>
                                {onPuterImportGroup && (
                                    <button
                                        onClick={onPuterImportGroup}
                                        className="px-3 py-1.5 bg-slate-800 hover:bg-purple-900/30 rounded text-sm text-purple-400"
                                        title="Import Group from Cloud"
                                    >
                                        <CloudDownload size={16} />
                                    </button>
                                )}
                            </>
                        )}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300"
                            title={isExpanded ? 'Minimize' : 'Maximize'}
                        >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>

                {/* Module Type Selector - Only when expanded */}
                {isExpanded && isAdding && (
                    <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                            {['Info', 'Visual', 'Logic', 'Actions', 'Advanced'].map(category => (
                                <div key={category} className="space-y-1">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">{category}</div>
                                    <div className="space-y-1">
                                        {MODULE_TYPES.filter(t => t.category === category).map(moduleType => {
                                            const Icon = MODULE_ICONS[moduleType.value] || Settings;
                                            return (
                                                <button
                                                    key={moduleType.value}
                                                    onClick={() => {
                                                        onAddModule(moduleType.value);
                                                        setIsAdding(false);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
                                                >
                                                    {React.createElement(Icon as React.ElementType, { size: 12 })}
                                                    <span className="truncate">{moduleType.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content - Always rendered but hidden if not expanded */}
            <div className={`flex-1 overflow-y-auto p-4 ${isExpanded ? '' : 'hidden'}`}>
                {modules.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-slate-500">
                            <Settings className="mx-auto mb-2 opacity-50" size={48} />
                            <p className="text-sm">No modules yet</p>
                            <p className="text-xs mt-1">Click "Add Module" to get started</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 auto-rows-min">
                        {/* Render Groups */}
                        {topLevelGroups.map(group => renderGroup(group, 0))}

                        {/* Render Ungrouped Modules */}
                        {ungroupedModules.map(renderModule)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlightComputerPanel;

