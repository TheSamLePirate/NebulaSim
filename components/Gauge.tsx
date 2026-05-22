import React from 'react';

interface GaugeProps {
    score: number; // 0 to 1
}

export const Gauge: React.FC<GaugeProps> = ({ score }) => {
    // Clamp score
    const clampedScore = Math.min(Math.max(score, 0), 1);

    // Angle: -90deg (0) to 90deg (1)
    const angle = -90 + (clampedScore * 180);

    // Determine color based on score (Comic Colors)
    let color = '#4ade80'; // Green
    let text = "OK";

    if (clampedScore > 0.3) { color = '#facc15'; text = "MOUAIS..."; } // Yellow
    if (clampedScore > 0.6) { color = '#fb923c'; text = "OUILLE!"; } // Orange
    if (clampedScore > 0.8) { color = '#ef4444'; text = "CATA!"; } // Red

    const radius = 120; // Bigger
    const strokeWidth = 24; // Thicker
    const center = 150; // Adjusted center

    // Helper for arc path
    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
    };

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    return (
        <div className="relative w-80 h-48 flex flex-col items-center justify-end transform hover:scale-105 transition-transform duration-300 z-[80]">

            <svg width="300" height="160" viewBox="0 0 300 160" className="overflow-visible drop-shadow-2xl">
                {/* Background Arc - Black Outline */}
                <path
                    d={describeArc(center, center, radius + 2, -94, 94)}
                    fill="none"
                    stroke="#000"
                    strokeWidth={strokeWidth + 8}
                    strokeLinecap="butt"
                />

                {/* Colored Sections */}
                <path d={describeArc(center, center, radius, -90, -30)} fill="none" stroke="#4ade80" strokeWidth={strokeWidth} />
                <path d={describeArc(center, center, radius, -30, 30)} fill="none" stroke="#facc15" strokeWidth={strokeWidth} />
                <path d={describeArc(center, center, radius, 30, 70)} fill="none" stroke="#fb923c" strokeWidth={strokeWidth} />
                <path d={describeArc(center, center, radius, 70, 90)} fill="none" stroke="#ef4444" strokeWidth={strokeWidth} />

                {/* Needle Shadow */}
                <g
                    style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${center}px ${center}px` }}
                    className="gauge-needle opacity-50"
                >
                    <line x1={center + 4} y1={center + 4} x2={center + 4} y2={24} stroke="#000" strokeWidth="8" strokeLinecap="round" />
                </g>

                {/* Needle */}
                <g
                    className="gauge-needle"
                    style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${center}px ${center}px` }}
                >
                    {/* Needle Line */}
                    <line x1={center} y1={center} x2={center} y2={20} stroke="#fff" strokeWidth="6" strokeLinecap="round" />
                    <line x1={center} y1={center} x2={center} y2={20} stroke={color} strokeWidth="4" strokeLinecap="round" />
                    {/* Center Pivot */}
                    <circle cx={center} cy={center} r="12" fill="#fff" stroke="#000" strokeWidth="3" />
                </g>

            </svg>

            <div className="absolute -bottom-10 text-center flex flex-col items-center">
                <div
                    className="text-6xl font-comic text-white"
                    style={{
                        textShadow: `4px 4px 0px #000, -2px -2px 0 ${color}`
                    }}
                >
                    {text}
                </div>
            </div>
        </div>
    );
};
