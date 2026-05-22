import React from 'react';
import { Month } from '../../types';

interface TopDownViewProps {
  orbitRadius: number;
  starDistance: number;
  currentMonth: Month;
  sunName: string;
  earthName: string;
  starName: string;
  angleJan: number;
  angleJuly: number;
}

export const TopDownView: React.FC<TopDownViewProps> = ({
  orbitRadius,
  starDistance,
  currentMonth,
  sunName,
  earthName,
  starName,
  angleJan,
  angleJuly
}) => {
  // SVG Dimensions - Landscape (2:1 aspect ratio) for "less tall" view
  const width = 800;
  const height = 400;
  const paddingY = 60; // Space for labels

  // Fixed Positions
  const sunX = width / 2;
  const sunY = height - paddingY; // Bottom
  const starX = width / 2;
  const starY = paddingY; // Top

  const visualHeight = sunY - starY;

  // Calculation for Earth's Visual Position
  // To make the math intuitive (tan(p) = r/d), we scale the X-offset based on r/d.
  const exaggerationFactor = 4.0;

  const ratio = orbitRadius / starDistance;
  const earthOffsetPx = visualHeight * ratio * exaggerationFactor;

  // Clamp offset so it stays within bounds
  const maxOffset = (width / 2) - 40;
  const clampedOffset = Math.min(earthOffsetPx, maxOffset);

  const earthX = currentMonth === Month.January
    ? sunX - clampedOffset
    : sunX + clampedOffset;
  const earthY = sunY;

  // Geometry for Angle Arc
  const arcRadius = 80;
  // Calculate end point of arc on the hypotenuse
  const dx = earthX - starX;
  const dy = earthY - starY;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Start point (Vertical line)
  const arcStartX = starX;
  const arcStartY = starY + arcRadius;

  // End point (Hypotenuse)
  const arcEndX = starX + (dx / len) * arcRadius;
  const arcEndY = starY + (dy / len) * arcRadius;

  // Sweep flag
  const sweep = currentMonth === Month.January ? 1 : 0;

  // Angle Display Value
  const displayAngle = currentMonth === Month.January ? angleJan : angleJuly;

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
      <div className="absolute top-4 left-4 pointer-events-none z-10">
        <div className="bg-slate-950/80 backdrop-blur border border-cyan-900/50 px-3 py-1 rounded text-xs font-mono">
          <span className="text-cyan-400 font-bold">SCHÉMA</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">

        {/* Orbit Circle (Restored) */}
        <ellipse
          cx={sunX}
          cy={sunY}
          rx={clampedOffset}
          ry={clampedOffset / 4}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.4"
        />

        {/* Highlight the Active Triangle */}
        <path
          d={`M ${sunX} ${sunY} L ${starX} ${starY} L ${earthX} ${earthY} Z`}
          fill={currentMonth === Month.January ? "url(#gradJan)" : "url(#gradJul)"}
          stroke="none"
          opacity="0.2"
        />
        <defs>
          <linearGradient id="gradJan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradJul" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Right Angle Marker at Sun */}
        <path
          d={`M ${sunX} ${sunY - 20} L ${currentMonth === Month.January ? sunX - 20 : sunX + 20} ${sunY - 20} L ${currentMonth === Month.January ? sunX - 20 : sunX + 20} ${sunY}`}
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
        />

        {/* Distance Line (d) - Center */}
        <line x1={sunX} y1={sunY} x2={starX} y2={starY} stroke="#FDE047" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
        <text x={sunX + 10} y={(sunY + starY) / 2} fill="#FDE047" fontSize="16" fontWeight="bold" fontStyle="italic" opacity="0.9">d</text>

        {/* Radius Line (r) - Baseline */}
        <line x1={sunX} y1={sunY} x2={earthX} y2={earthY} stroke="#06b6d4" strokeWidth="4" />
        <text x={(sunX + earthX) / 2} y={sunY + 30} textAnchor="middle" fill="#06b6d4" fontSize="16" fontWeight="bold" fontStyle="italic">r</text>

        {/* Hypotenuse (Line of Sight) */}
        <line x1={earthX} y1={earthY} x2={starX} y2={starY} stroke="white" strokeWidth="1" opacity="0.6" />

        {/* Angle Arc (p) */}
        <path
          d={`M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 ${sweep} ${arcEndX} ${arcEndY}`}
          fill="none"
          stroke="#4ade80"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <text
          x={starX + (currentMonth === Month.January ? 20 : -20)}
          y={starY + 60}
          textAnchor={currentMonth === Month.January ? "start" : "end"}
          fill="#4ade80"
          fontSize="18"
          fontWeight="bold"
          fontStyle="italic"
        >
          {displayAngle.toFixed(2)}°
        </text>

        {/* Star Icon */}
        <circle cx={starX} cy={starY} r="14" fill="#FDE047" stroke="#F59E0B" strokeWidth="3" />
        <text x={starX} y={starY - 25} textAnchor="middle" fill="#FDE047" fontSize="14" fontWeight="bold">{starName}</text>

        {/* Sun Icon */}
        <circle cx={sunX} cy={sunY} r="8" fill="#F97316" />
        <text x={sunX} y={sunY + 35} textAnchor="middle" fill="#F97316" fontSize="18" fontWeight="bold">{sunName}</text>

        {/* Earth Icon (Active) */}
        <g transform={`translate(${earthX}, ${earthY})`} className="transition-all duration-500 ease-out">
          <circle r="12" fill="#06b6d4" stroke="white" strokeWidth="2" />
          <text x="0" y="32" textAnchor="middle" fill="#06b6d4" fontSize="12" fontWeight="bold">
            {currentMonth === Month.January ? 'JAN' : 'JUIL'}
          </text>
          <text x="0" y="55" textAnchor="middle" fill="#06b6d4" fontSize="16" fontWeight="bold">
            {earthName}
          </text>
        </g>

        {/* Ghost Earth (Inactive Month) */}
        <g opacity="0.2">
          <circle cx={currentMonth === Month.January ? sunX + clampedOffset : sunX - clampedOffset} cy={sunY} r="10" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
          <text x={currentMonth === Month.January ? sunX + clampedOffset : sunX - clampedOffset} y={sunY + 32} textAnchor="middle" fill="#94a3b8" fontSize="12">
            {currentMonth === Month.January ? 'JUIL' : 'JAN'}
          </text>
        </g>

      </svg>
    </div>
  );
};