'use client';

import type { ITRResult } from '@/lib/calc-engine/types';

interface ITRGaugeProps {
  itr: ITRResult;
}

/**
 * SVG semicircular gauge showing Implied Temperature Rise.
 * Arc goes from green (1.0°C) through amber to red (4.0°C+).
 */
export function ITRGauge({ itr }: ITRGaugeProps) {
  const minTemp = 1.0;
  const maxTemp = 4.0;
  const clampedTemp = Math.min(Math.max(itr.impliedTemperature, minTemp), maxTemp);
  const percent = (clampedTemp - minTemp) / (maxTemp - minTemp);

  // SVG arc geometry
  const cx = 150, cy = 140, r = 110;
  const startAngle = Math.PI; // 180° (left)
  const endAngle = 0;        // 0° (right)
  const needleAngle = startAngle - percent * Math.PI;

  // Arc path for the background
  function describeArc(startA: number, endA: number): string {
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy - r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy - r * Math.sin(endA);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  }

  // Needle endpoint
  const needleLen = r - 15;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width="300" height="180" viewBox="0 0 300 180">
        {/* Gradient arc background */}
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="25%" stopColor="#84cc16" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Background arc (gray) */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="var(--color-muted, #e5e7eb)"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* Colored arc */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="18"
          strokeLinecap="round"
          opacity={0.85}
        />

        {/* Tick marks */}
        {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0].map((temp) => {
          const p = (temp - minTemp) / (maxTemp - minTemp);
          const a = startAngle - p * Math.PI;
          const innerR = r - 25;
          const outerR = r + 5;
          return (
            <g key={temp}>
              <line
                x1={cx + innerR * Math.cos(a)}
                y1={cy - innerR * Math.sin(a)}
                x2={cx + outerR * Math.cos(a)}
                y2={cy - outerR * Math.sin(a)}
                stroke="var(--color-muted-foreground, #9ca3af)"
                strokeWidth={temp % 1 === 0 ? 2 : 1}
                opacity={0.5}
              />
              <text
                x={cx + (r + 18) * Math.cos(a)}
                y={cy - (r + 18) * Math.sin(a)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill="var(--color-muted-foreground, #9ca3af)"
              >
                {temp}°
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={itr.classificationColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="6" fill={itr.classificationColor} />
        <circle cx={cx} cy={cy} r="3" fill="var(--color-card, white)" />

        {/* Temperature value */}
        <text
          x={cx}
          y={cy + 30}
          textAnchor="middle"
          fontSize="32"
          fontWeight="bold"
          fill={itr.classificationColor}
        >
          {itr.impliedTemperature.toFixed(1)}°C
        </text>
      </svg>

      {/* Classification label */}
      <div
        className="mt-1 rounded-full px-4 py-1 text-sm font-semibold text-white"
        style={{ backgroundColor: itr.classificationColor }}
      >
        {itr.classification}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground text-center max-w-[250px]">
        Implied Temperature Rise based on TCRE method (IPCC AR6 / GFANZ)
      </p>
    </div>
  );
}
