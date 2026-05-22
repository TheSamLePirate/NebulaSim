import React, { useState, useEffect } from 'react';
import { Body, FlightComputerModule, FlightComputerInput } from '../../types';

interface InputSelectorProps {
    label: string;
    value: FlightComputerInput | undefined;
    onChange: (input: FlightComputerInput) => void;
    bodies: Body[];
    modules: FlightComputerModule[];
    currentModuleId: string;
    allowedTypes?: ('body' | 'module_output' | 'scalar' | 'boolean' | 'string' | 'vector')[];
}

const InputSelector: React.FC<InputSelectorProps> = ({ label, value, onChange, bodies, modules, currentModuleId, allowedTypes = ['body', 'module_output'] }) => {
    const [mode, setMode] = useState<'body' | 'module'>('body');
    const bodyAllowed = allowedTypes.includes('body');
    const moduleOutputsAllowed = allowedTypes.includes('module_output');
    const scalarAllowed = allowedTypes.includes('scalar');
    const booleanAllowed = allowedTypes.includes('boolean');
    const stringAllowed = allowedTypes.includes('string');
    const vectorAllowed = allowedTypes.includes('vector');
    const moduleSelectorEnabled = moduleOutputsAllowed || scalarAllowed || booleanAllowed || stringAllowed || vectorAllowed;

    // Initialize / sync mode based on current value, but keep user choice when empty
    useEffect(() => {
        if (value?.type === 'module_output' && moduleSelectorEnabled) {
            setMode('module');
            return;
        }
        if (value?.type === 'body' && bodyAllowed) {
            setMode('body');
            return;
        }
        if (!value) {
            if (!bodyAllowed && moduleSelectorEnabled) {
                setMode('module');
            } else if (bodyAllowed && !moduleSelectorEnabled) {
                setMode('body');
            }
        }
    }, [value?.type, bodyAllowed, moduleSelectorEnabled]);

    const availableModules = modules.filter(m => m.id !== currentModuleId);

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="text-[9px] text-slate-500 uppercase">{label}</label>
                {bodyAllowed && moduleSelectorEnabled && (
                    <div className="flex bg-slate-800 rounded p-0.5">
                        <button
                            onClick={() => setMode('body')}
                            className={`px-1.5 py-0.5 text-[8px] rounded ${mode === 'body' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            BODY
                        </button>
                        <button
                            onClick={() => setMode('module')}
                            className={`px-1.5 py-0.5 text-[8px] rounded ${mode === 'module' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            MODULE
                        </button>
                    </div>
                )}
            </div>

            {mode === 'body' && bodyAllowed ? (
                <select
                    value={value?.type === 'body' ? value.value : ''}
                    onChange={(e) => onChange({ type: 'body', value: e.target.value, label: bodies.find(b => b.id === e.target.value)?.name })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300 focus:border-purple-500 outline-none"
                >
                    <option value="">Select Body...</option>
                    {bodies.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
            ) : moduleSelectorEnabled ? (
                <select
                    value={value?.type === 'module_output' ? value.value : ''}
                    onChange={(e) => {
                        const [modId, key] = e.target.value.split(':');
                        const mod = modules.find(m => m.id === modId);
                        let label = `${mod?.name || 'Module'} - ${key}`;
                        if (key === 'pe_point') label = `${mod?.name || 'Orbit'} Pe`;
                        if (key === 'pa_point') label = `${mod?.name || 'Orbit'} Pa`;
                        if (mod?.type === 'rendezvous_tracker') {
                            if (key === 'position') label = `${mod?.name || 'Rendezvous'} Position`;
                            if (key === 'time') label = `${mod?.name || 'Rendezvous'} Time`;
                            if (key === 'distance') label = `${mod?.name || 'Rendezvous'} Distance`;
                            if (key === 'delta_v_total') label = `${mod?.name || 'Rendezvous'} ΔV Total`;
                            if (key === 'delta_v_prograde') label = `${mod?.name || 'Rendezvous'} ΔV Prograde`;
                            if (key === 'delta_v_radial') label = `${mod?.name || 'Rendezvous'} ΔV Radial`;
                        }

                        onChange({
                            type: 'module_output',
                            value: e.target.value,
                            label: label
                        });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300 focus:border-purple-500 outline-none"
                >
                    <option value="">Select Output...</option>
                    {availableModules.map(m => {
                        const options = [];

                        // Vector/Point Outputs
                        if (!scalarAllowed || vectorAllowed) {
                            if (m.type === 'orbit_info') {
                                options.push(<option key={`${m.id}:pe_point`} value={`${m.id}:pe_point`}>{m.name || 'Orbit'} - Periapsis Point</option>);
                                options.push(<option key={`${m.id}:pa_point`} value={`${m.id}:pa_point`}>{m.name || 'Orbit'} - Apoapsis Point</option>);
                                options.push(<option key={`${m.id}:primary_body`} value={`${m.id}:primary_body`}>{m.name || 'Orbit'} - Subject Body</option>);
                                options.push(<option key={`${m.id}:reference_body`} value={`${m.id}:reference_body`}>{m.name || 'Orbit'} - Reference Body</option>);
                            }
                            if (m.type === 'transfer_window') {
                                options.push(<option key={`${m.id}:primary_body`} value={`${m.id}:primary_body`}>{m.name || 'Transfer'} - Subject Body</option>);
                                options.push(<option key={`${m.id}:reference_body`} value={`${m.id}:reference_body`}>{m.name || 'Transfer'} - Reference Body</option>);
                                options.push(<option key={`${m.id}:target_body`} value={`${m.id}:target_body`}>{m.name || 'Transfer'} - Target Body</option>);
                                options.push(<option key={`${m.id}:insertion_point`} value={`${m.id}:insertion_point`}>{m.name || 'Transfer'} - Insertion Point</option>);
                                options.push(<option key={`${m.id}:intercept_point`} value={`${m.id}:intercept_point`}>{m.name || 'Transfer'} - Intercept Target</option>);
                                options.push(<option key={`${m.id}:intercept_point_transfer`} value={`${m.id}:intercept_point_transfer`}>{m.name || 'Transfer'} - Transfer Apoapsis</option>);
                            }
                            if (m.type === 'marker') {
                                options.push(<option key={`${m.id}:position`} value={`${m.id}:position`}>{m.name || 'Marker'} - Position</option>);
                            }
                            if (m.type === 'rendezvous_tracker') {
                                options.push(<option key={`${m.id}:position`} value={`${m.id}:position`}>{m.name || 'Rendezvous'} - Position</option>);
                                options.push(<option key={`${m.id}:primary_body`} value={`${m.id}:primary_body`}>{m.name || 'Rendezvous'} - Rocket Body</option>);
                                options.push(<option key={`${m.id}:target_body`} value={`${m.id}:target_body`}>{m.name || 'Rendezvous'} - Target Body</option>);
                            }
                            if (m.type === 'track_distance' || m.type === 'track_velocity') {
                                const labelBase = m.name || (m.type === 'track_distance' ? 'Distance' : 'Velocity');
                                options.push(<option key={`${m.id}:primary_body`} value={`${m.id}:primary_body`}>{labelBase} - From Body</option>);
                                options.push(<option key={`${m.id}:target_body`} value={`${m.id}:target_body`}>{labelBase} - To Body</option>);
                            }
                            if (m.type === 'selector') {
                                options.push(<option key={`${m.id}:body`} value={`${m.id}:body`}>{m.name || 'Selector'} - Body</option>);
                            }
                            // Add Body By Module
                            if (m.type === 'body_by') {
                                options.push(<option key={`${m.id}:body`} value={`${m.id}:body`}>{m.name || 'Body By'} - Body</option>);
                            }
                            if (m.type === 'custom_script') {
                                if (m.customScriptOutputType === 'vector') {
                                    options.push(<option key={`${m.id}:result`} value={`${m.id}:result`}>{m.name || 'Script'} - Result (Vector)</option>);
                                }
                                if (m.customScriptOutputType === 'body') {
                                    options.push(<option key={`${m.id}:result`} value={`${m.id}:result`}>{m.name || 'Script'} - Result (Body)</option>);
                                }
                            }
                            if (m.type === 'line_drawer') {
                                options.push(<option key={`${m.id}:vector`} value={`${m.id}:vector`}>{m.name || 'Line'} - Vector (A to B)</option>);
                                options.push(<option key={`${m.id}:hit_position`} value={`${m.id}:hit_position`}>{m.name || 'Line'} - Hit Position</option>);
                            }
                            if (m.type === 'circle_drawer') {
                                options.push(<option key={`${m.id}:closestPoint`} value={`${m.id}:closestPoint`}>{m.name || 'Circle'} - Closest Point (Vector)</option>);
                            }
                            if (m.type === 'lagrange_calculator') {
                                options.push(<option key={`${m.id}:l1`} value={`${m.id}:l1`}>{m.name || 'Lagrange'} - L1 Point</option>);
                                options.push(<option key={`${m.id}:l2`} value={`${m.id}:l2`}>{m.name || 'Lagrange'} - L2 Point</option>);
                                options.push(<option key={`${m.id}:l3`} value={`${m.id}:l3`}>{m.name || 'Lagrange'} - L3 Point</option>);
                                options.push(<option key={`${m.id}:l4`} value={`${m.id}:l4`}>{m.name || 'Lagrange'} - L4 Point</option>);
                                options.push(<option key={`${m.id}:l5`} value={`${m.id}:l5`}>{m.name || 'Lagrange'} - L5 Point</option>);
                                options.push(<option key={`${m.id}:body`} value={`${m.id}:body`}>{m.name || 'Lagrange'} - Body</option>);
                                options.push(<option key={`${m.id}:reference_body`} value={`${m.id}:reference_body`}>{m.name || 'Lagrange'} - Reference Body</option>);
                            }
                        }

                        // Scalar Outputs
                        if (allowedTypes.includes('scalar')) {
                            if (m.type === 'track_distance') {
                                options.push(<option key={`${m.id}:distance`} value={`${m.id}:distance`}>{m.name || 'Distance'} - Value</option>);
                            }
                            if (m.type === 'track_velocity') {
                                options.push(<option key={`${m.id}:speed`} value={`${m.id}:speed`}>{m.name || 'Velocity'} - Speed</option>);
                            }
                            if (m.type === 'orbit_info') {
                                options.push(<option key={`${m.id}:altitude`} value={`${m.id}:altitude`}>{m.name || 'Orbit'} - Altitude</option>);
                                options.push(<option key={`${m.id}:periapsis`} value={`${m.id}:periapsis`}>{m.name || 'Orbit'} - Periapsis Alt</option>);
                                options.push(<option key={`${m.id}:apoapsis`} value={`${m.id}:apoapsis`}>{m.name || 'Orbit'} - Apoapsis Alt</option>);
                                options.push(<option key={`${m.id}:period`} value={`${m.id}:period`}>{m.name || 'Orbit'} - Period</option>);
                            }
                            if (m.type === 'transfer_window') {
                                options.push(<option key={`${m.id}:error`} value={`${m.id}:error`}>{m.name || 'Transfer'} - Phase Error (°)</option>);
                                options.push(<option key={`${m.id}:wait_time`} value={`${m.id}:wait_time`}>{m.name || 'Transfer'} - Wait Time (s)</option>);
                                options.push(<option key={`${m.id}:transfer_time`} value={`${m.id}:transfer_time`}>{m.name || 'Transfer'} - Transfer Time (s)</option>);
                                options.push(<option key={`${m.id}:arrival_time`} value={`${m.id}:arrival_time`}>{m.name || 'Transfer'} - Arrival Time (s)</option>);
                                options.push(<option key={`${m.id}:current_phase`} value={`${m.id}:current_phase`}>{m.name || 'Transfer'} - Current Phase (rad)</option>);
                                options.push(<option key={`${m.id}:required_phase`} value={`${m.id}:required_phase`}>{m.name || 'Transfer'} - Required Phase (rad)</option>);
                                options.push(<option key={`${m.id}:error_angle`} value={`${m.id}:error_angle`}>{m.name || 'Transfer'} - Error Angle (rad)</option>);
                                options.push(<option key={`${m.id}:insertion_angle`} value={`${m.id}:insertion_angle`}>{m.name || 'Transfer'} - Insertion Angle (rad)</option>);
                                options.push(<option key={`${m.id}:intercept_angle_target`} value={`${m.id}:intercept_angle_target`}>{m.name || 'Transfer'} - Target Angle (rad)</option>);
                                options.push(<option key={`${m.id}:intercept_angle_transfer`} value={`${m.id}:intercept_angle_transfer`}>{m.name || 'Transfer'} - Transfer Angle (rad)</option>);
                            }
                            if (m.type === 'rendezvous_tracker') {
                                options.push(<option key={`${m.id}:time`} value={`${m.id}:time`}>{m.name || 'Rendezvous'} - Time</option>);
                                options.push(<option key={`${m.id}:distance`} value={`${m.id}:distance`}>{m.name || 'Rendezvous'} - Distance</option>);
                                options.push(<option key={`${m.id}:delta_v_total`} value={`${m.id}:delta_v_total`}>{m.name || 'Rendezvous'} - ΔV Total</option>);
                                options.push(<option key={`${m.id}:delta_v_prograde`} value={`${m.id}:delta_v_prograde`}>{m.name || 'Rendezvous'} - ΔV Prograde</option>);
                                options.push(<option key={`${m.id}:delta_v_radial`} value={`${m.id}:delta_v_radial`}>{m.name || 'Rendezvous'} - ΔV Radial</option>);
                            }
                            if (m.type === 'maneuver_executor') {
                                options.push(<option key={`${m.id}:progress`} value={`${m.id}:progress`}>{m.name || 'Executor'} - Progress</option>);
                            }
                            if (m.type === 'maths') {
                                options.push(<option key={`${m.id}:result`} value={`${m.id}:result`}>{m.name || 'Maths'} - Result</option>);
                            }
                            if (m.type === 'body_info') {
                                options.push(<option key={`${m.id}:mass`} value={`${m.id}:mass`}>{m.name || 'Body Info'} - Mass</option>);
                                options.push(<option key={`${m.id}:radius`} value={`${m.id}:radius`}>{m.name || 'Body Info'} - Radius</option>);
                                options.push(<option key={`${m.id}:pos_x`} value={`${m.id}:pos_x`}>{m.name || 'Body Info'} - Pos X</option>);
                                options.push(<option key={`${m.id}:pos_y`} value={`${m.id}:pos_y`}>{m.name || 'Body Info'} - Pos Y</option>);
                                options.push(<option key={`${m.id}:vel_x`} value={`${m.id}:vel_x`}>{m.name || 'Body Info'} - Vel X</option>);
                                options.push(<option key={`${m.id}:vel_y`} value={`${m.id}:vel_y`}>{m.name || 'Body Info'} - Vel Y</option>);
                                options.push(<option key={`${m.id}:angle`} value={`${m.id}:angle`}>{m.name || 'Body Info'} - Angle</option>);
                                options.push(<option key={`${m.id}:thrust_x`} value={`${m.id}:thrust_x`}>{m.name || 'Body Info'} - Thrust X</option>);
                                options.push(<option key={`${m.id}:thrust_y`} value={`${m.id}:thrust_y`}>{m.name || 'Body Info'} - Thrust Y</option>);
                                options.push(<option key={`${m.id}:fuel`} value={`${m.id}:fuel`}>{m.name || 'Body Info'} - Fuel</option>);
                                options.push(<option key={`${m.id}:max_fuel`} value={`${m.id}:max_fuel`}>{m.name || 'Body Info'} - Max Fuel</option>);
                                options.push(<option key={`${m.id}:dry_mass`} value={`${m.id}:dry_mass`}>{m.name || 'Body Info'} - Dry Mass</option>);
                            }
                            if (m.type === 'custom_script') {
                                if (!m.customScriptOutputType || m.customScriptOutputType === 'scalar') {
                                    options.push(<option key={`${m.id}:result`} value={`${m.id}:result`}>{m.name || 'Script'} - Result (Number)</option>);
                                }
                            }
                            if (m.type === 'slider') {
                                options.push(<option key={`${m.id}:value`} value={`${m.id}:value`}>{m.name || 'Slider'} - Value</option>);
                            }
                            if (m.type === 'wait') {
                                options.push(<option key={`${m.id}:remaining_time`} value={`${m.id}:remaining_time`}>{m.name || 'Wait'} - Remaining Time (ms)</option>);
                            }
                            if (m.type === 'line_drawer') {
                                options.push(<option key={`${m.id}:length`} value={`${m.id}:length`}>{m.name || 'Line'} - Length</option>);
                                options.push(<option key={`${m.id}:distance`} value={`${m.id}:distance`}>{m.name || 'Line'} - Distance</option>);
                            }
                        }

                        // Boolean Outputs
                        if (allowedTypes.includes('boolean')) {
                            if (m.type === 'transfer_window') {
                                options.push(<option key={`${m.id}:ready`} value={`${m.id}:ready`}>{m.name || 'Transfer'} - Ready</option>);
                            }
                            if (m.type === 'marker') {
                                options.push(<option key={`${m.id}:visible`} value={`${m.id}:visible`}>{m.name || 'Marker'} - Visible</option>);
                                options.push(<option key={`${m.id}:pulse`} value={`${m.id}:pulse`}>{m.name || 'Marker'} - Pulse</option>);
                            }
                            if (m.type === 'notify') {
                                options.push(<option key={`${m.id}:triggered`} value={`${m.id}:triggered`}>{m.name || 'Notify'} - Triggered</option>);
                            }
                            if (m.type === 'logic_gate') {
                                options.push(<option key={`${m.id}:result`} value={`${m.id}:result`}>{m.name || 'Logic'} - Result</option>);
                            }
                            if (m.type === 'thrust_burst') {
                                options.push(<option key={`${m.id}:done`} value={`${m.id}:done`}>{m.name || 'Burst'} - Done</option>);
                            }
                            if (m.type === 'button') {
                                options.push(<option key={`${m.id}:state`} value={`${m.id}:state`}>{m.name || 'Button'} - State</option>);
                            }
                            if (m.type === 'custom_script') {
                                if (m.customScriptOutputType === 'boolean') {
                                    options.push(<option key={`${m.id}:result`} value={`${m.id}:result`}>{m.name || 'Script'} - Result (Boolean)</option>);
                                }
                                options.push(<option key={`${m.id}:state`} value={`${m.id}:state`}>{m.name || 'Script'} - State (Ready)</option>);
                            }
                            if (m.type === 'keyboard') {
                                options.push(<option key={`${m.id}:state`} value={`${m.id}:state`}>{m.name || 'Keyboard'} - State (Pressed)</option>);
                            }
                            if (m.type === 'edge_detector') {
                                options.push(<option key={`${m.id}:triggered`} value={`${m.id}:triggered`}>{m.name || 'Edge Detector'} - Triggered</option>);
                            }
                            if (m.type === 'change_detector') {
                                options.push(<option key={`${m.id}:triggered`} value={`${m.id}:triggered`}>{m.name || 'Change Detector'} - Triggered</option>);
                            }
                            if (m.type === 'wait') {
                                options.push(<option key={`${m.id}:triggered`} value={`${m.id}:triggered`}>{m.name || 'Wait'} - Triggered</option>);
                            }
                            if (m.type === 'line_drawer') {
                                options.push(<option key={`${m.id}:hit`} value={`${m.id}:hit`}>{m.name || 'Line'} - Hit (Intersect)</option>);
                            }
                            if (m.type === 'circle_drawer') {
                                options.push(<option key={`${m.id}:foundObject`} value={`${m.id}:foundObject`}>{m.name || 'Circle'} - Found Object (Bool)</option>);
                            }
                        }

                        // String Outputs
                        if (allowedTypes.includes('string')) {
                            if (m.type === 'body_info') {
                                options.push(<option key={`${m.id}:name`} value={`${m.id}:name`}>{m.name || 'Body Info'} - Name</option>);
                                options.push(<option key={`${m.id}:id`} value={`${m.id}:id`}>{m.name || 'Body Info'} - ID</option>);
                                options.push(<option key={`${m.id}:mass`} value={`${m.id}:mass`}>{m.name || 'Body Info'} - Mass</option>);
                                options.push(<option key={`${m.id}:radius`} value={`${m.id}:radius`}>{m.name || 'Body Info'} - Radius</option>);
                                options.push(<option key={`${m.id}:pos_x`} value={`${m.id}:pos_x`}>{m.name || 'Body Info'} - Pos X</option>);
                                options.push(<option key={`${m.id}:pos_y`} value={`${m.id}:pos_y`}>{m.name || 'Body Info'} - Pos Y</option>);
                                options.push(<option key={`${m.id}:vel_x`} value={`${m.id}:vel_x`}>{m.name || 'Body Info'} - Vel X</option>);
                                options.push(<option key={`${m.id}:vel_y`} value={`${m.id}:vel_y`}>{m.name || 'Body Info'} - Vel Y</option>);
                                options.push(<option key={`${m.id}:angle`} value={`${m.id}:angle`}>{m.name || 'Body Info'} - Angle</option>);
                                options.push(<option key={`${m.id}:fuel`} value={`${m.id}:fuel`}>{m.name || 'Body Info'} - Fuel</option>);
                                options.push(<option key={`${m.id}:max_fuel`} value={`${m.id}:max_fuel`}>{m.name || 'Body Info'} - Max Fuel</option>);
                                options.push(<option key={`${m.id}:dry_mass`} value={`${m.id}:dry_mass`}>{m.name || 'Body Info'} - Dry Mass</option>);
                                options.push(<option key={`${m.id}:landed_on`} value={`${m.id}:landed_on`}>{m.name || 'Body Info'} - Landed On</option>);
                                options.push(<option key={`${m.id}:sas_mode`} value={`${m.id}:sas_mode`}>{m.name || 'Body Info'} - SAS Mode</option>);
                            }
                            if (m.type === 'marker') {
                                options.push(<option key={`${m.id}:title`} value={`${m.id}:title`}>{m.name || 'Marker'} - Title</option>);
                                options.push(<option key={`${m.id}:description`} value={`${m.id}:description`}>{m.name || 'Marker'} - Description</option>);
                                options.push(<option key={`${m.id}:color`} value={`${m.id}:color`}>{m.name || 'Marker'} - Color</option>);
                            }
                            if (m.type === 'custom_script') {
                                if (m.customScriptOutputType === 'string') {
                                    options.push(<option key={`${m.id}:result`} value={`${m.id}:result`}>{m.name || 'Script'} - Result (String)</option>);
                                }
                            }
                            if (m.type === 'keyboard') {
                                options.push(<option key={`${m.id}:key`} value={`${m.id}:key`}>{m.name || 'Keyboard'} - Key Name</option>);
                            }
                            if (m.type === 'circle_drawer') {
                                options.push(<option key={`${m.id}:objectId`} value={`${m.id}:objectId`}>{m.name || 'Circle'} - Object ID (String)</option>);
                            }
                        }

                        return options;
                    })}
                </select>
            ) : null}
        </div>
    );
};

export default InputSelector;
