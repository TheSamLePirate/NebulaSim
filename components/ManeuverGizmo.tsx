import React, { useState, useEffect, useRef } from 'react';
import { Maneuver, Vector2D } from '../types';

interface ManeuverGizmoProps {
    maneuver: Maneuver;
    screenPosition: Vector2D;
    onUpdate: (updates: Partial<Maneuver>) => void;
    onDelete: () => void;
    zoom: number;
}

const ManeuverGizmo: React.FC<ManeuverGizmoProps> = ({ maneuver, screenPosition, onUpdate, onDelete, zoom }) => {
    const [dragging, setDragging] = useState<'prograde' | 'radial' | 'center' | null>(null);
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);
    const initialValuesRef = useRef<{ p: number, r: number, t: number } | null>(null);

    // Scaling factor for sensitivity
    const SENSITIVITY = 0.05;

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragging || !dragStartRef.current || !initialValuesRef.current) return;

            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            if (dragging === 'prograde') {
                // Drag Up/Down controls Prograde (Yellow)
                // Up (-y) = Increase Prograde
                // Down (+y) = Decrease Prograde
                const change = -dy * SENSITIVITY;
                onUpdate({
                    deltaVPrograde: (initialValuesRef.current.p || 0) + change
                });
            } else if (dragging === 'radial') {
                // Drag Left/Right controls Radial (Blue)
                // Right (+x) = Increase Radial Out
                // Left (-x) = Increase Radial In
                const change = dx * SENSITIVITY;
                onUpdate({
                    deltaVRadial: (initialValuesRef.current.r || 0) + change
                });
            } else if (dragging === 'center') {
                // Drag Left/Right to change time
                // Right (+x) = Increase Time (Move further into future)
                // Left (-x) = Decrease Time (Move closer to now)

                // Sensitivity: 1px = 5 seconds
                const TIME_SENSITIVITY = 5;
                const change = dx * TIME_SENSITIVITY;
                const newTime = Math.max(1, (initialValuesRef.current.t || 0) + change);

                onUpdate({
                    timeFromNow: newTime
                });
            }
        };

        const handleMouseUp = () => {
            setDragging(null);
            dragStartRef.current = null;
            initialValuesRef.current = null;
        };

        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, onUpdate]);

    const startDrag = (e: React.MouseEvent, type: 'prograde' | 'radial' | 'center') => {
        e.stopPropagation();
        setDragging(type);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialValuesRef.current = {
            p: maneuver.deltaVPrograde || 0,
            r: maneuver.deltaVRadial || 0,
            t: maneuver.timeFromNow || 0
        };
    };

    if (maneuver.status !== 'pending' && maneuver.type !== 'manual_node') return null;

    const size = 60; // Base size of the gizmo

    return (
        <div
            style={{
                position: 'absolute',
                left: screenPosition.x,
                top: screenPosition.y,
                transform: 'translate(-50%, -50%)',
                width: size * 2,
                height: size * 2,
                pointerEvents: 'none', // Allow clicking through empty space
                zIndex: 100
            }}
        >
            <svg width="100%" height="100%" viewBox="-50 -50 100 100" style={{ overflow: 'visible' }}>
                {/* Center Node */}
                <circle
                    cx="0" cy="0" r="8"
                    fill="#444" stroke="#fff" strokeWidth="2"
                    style={{ pointerEvents: 'auto', cursor: 'ew-resize' }}
                    onMouseDown={(e) => startDrag(e, 'center')}
                />

                {/* Time Adjustment Buttons */}
                <g transform="translate(0, 55)" style={{ pointerEvents: 'auto' }}>
                    <rect x="-30" y="-10" width="60" height="20" rx="4" fill="#00000080" />

                    {/* -10s */}
                    <g onClick={() => onUpdate({ timeFromNow: Math.max(0, (maneuver.timeFromNow || 0) - 10) })} style={{ cursor: 'pointer' }}>
                        <rect x="-28" y="-8" width="16" height="16" fill="transparent" />
                        <path d="M-20 0 L-24 4 L-20 8" stroke="white" strokeWidth="2" fill="none" transform="translate(0, -4)" />
                    </g>

                    {/* +10s */}
                    <g onClick={() => onUpdate({ timeFromNow: (maneuver.timeFromNow || 0) + 10 })} style={{ cursor: 'pointer' }}>
                        <rect x="12" y="-8" width="16" height="16" fill="transparent" />
                        <path d="M20 0 L24 4 L20 8" stroke="white" strokeWidth="2" fill="none" transform="translate(0, -4)" />
                    </g>

                    <text x="0" y="5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">T</text>
                </g>

                {/* Prograde Handle (Yellow) - Points Up (Local Prograde) */}
                <g transform="translate(0, -35)" style={{ pointerEvents: 'auto', cursor: 'ns-resize' }} onMouseDown={(e) => startDrag(e, 'prograde')}>
                    <line x1="0" y1="27" x2="0" y2="0" stroke="#fbbf24" strokeWidth="3" />
                    <circle cx="0" cy="0" r="6" fill="#fbbf24" />
                    {/* Retrograde ghost handle */}
                    <circle cx="0" cy="70" r="4" fill="#fbbf24" opacity="0.5" />
                </g>

                {/* Radial Handle (Blue) - Points Right (Local Radial Out) */}
                <g transform="translate(35, 0)" style={{ pointerEvents: 'auto', cursor: 'ew-resize' }} onMouseDown={(e) => startDrag(e, 'radial')}>
                    <line x1="-27" y1="0" x2="0" y2="0" stroke="#3b82f6" strokeWidth="3" />
                    <circle cx="0" cy="0" r="6" fill="#3b82f6" />
                    {/* Radial In ghost handle */}
                    <circle cx="-70" cy="0" r="4" fill="#3b82f6" opacity="0.5" />
                </g>

                {/* Labels */}
                <text x="0" y="-45" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold">PROGRADE</text>
                <text x="45" y="4" textAnchor="start" fill="#3b82f6" fontSize="10" fontWeight="bold">RADIAL</text>

                {/* Info Text */}
                <text x="0" y="30" textAnchor="middle" fill="white" fontSize="10" style={{ textShadow: '0 0 3px black' }}>
                    t: {maneuver.timeFromNow?.toFixed(0)}s
                </text>
                <text x="0" y="42" textAnchor="middle" fill="white" fontSize="10" style={{ textShadow: '0 0 3px black' }}>
                    dV: {Math.sqrt((maneuver.deltaVPrograde || 0) ** 2 + (maneuver.deltaVRadial || 0) ** 2).toFixed(1)}
                </text>

                {/* Delete Button */}
                <g transform="translate(25, 25)" style={{ pointerEvents: 'auto', cursor: 'pointer' }} onClick={onDelete}>
                    <circle cx="0" cy="0" r="8" fill="#ef4444" />
                    <path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="white" strokeWidth="2" />
                </g>
            </svg>
        </div>
    );
};

export default ManeuverGizmo;
