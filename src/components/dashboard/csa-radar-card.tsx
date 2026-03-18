'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CSAResult } from '@/lib/calc-engine/types';

interface CSARadarCardProps {
  csa: CSAResult;
}

/**
 * SVG radar/spider chart for 8 CSA dimensions + dimension breakdown bars.
 */
export function CSARadarCard({ csa }: CSARadarCardProps) {
  const dims = csa.dimensions;
  const n = dims.length;
  const cx = 150, cy = 140, maxR = 105;

  // Calculate polygon points for the data
  function getPoint(index: number, value: number): { x: number; y: number } {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2; // start from top
    const r = (value / 100) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [25, 50, 75, 100];

  // Data polygon path
  const dataPoints = dims.map((d, i) => getPoint(i, d.score));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Sustainability Maturity</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              8-dimension climate maturity assessment (0-100)
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums" style={{ color: csa.classificationColor }}>
              {csa.totalScore.toFixed(0)}<span className="text-sm text-muted-foreground">/100</span>
            </p>
            <Badge className="text-[10px] text-white" style={{ backgroundColor: csa.classificationColor }}>
              {csa.classification}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* SVG Radar Chart */}
        <div className="flex justify-center">
          <svg width="300" height="280" viewBox="0 0 300 280">
            {/* Grid rings */}
            {rings.map((ring) => {
              const points = Array.from({ length: n }, (_, i) => getPoint(i, ring));
              const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
              return (
                <path
                  key={ring}
                  d={path}
                  fill="none"
                  stroke="var(--color-border, #e5e7eb)"
                  strokeWidth={ring === 100 ? 1.5 : 0.75}
                  opacity={0.5}
                />
              );
            })}

            {/* Axis lines */}
            {dims.map((_, i) => {
              const p = getPoint(i, 100);
              return (
                <line
                  key={i}
                  x1={cx} y1={cy}
                  x2={p.x} y2={p.y}
                  stroke="var(--color-border, #e5e7eb)"
                  strokeWidth={0.75}
                  opacity={0.4}
                />
              );
            })}

            {/* Data polygon */}
            <path
              d={dataPath}
              fill={csa.classificationColor}
              fillOpacity={0.15}
              stroke={csa.classificationColor}
              strokeWidth={2}
            />

            {/* Data points */}
            {dataPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x} cy={p.y}
                r={3}
                fill={csa.classificationColor}
              />
            ))}

            {/* Dimension labels */}
            {dims.map((d, i) => {
              const labelR = maxR + 22;
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
              const lx = cx + labelR * Math.cos(angle);
              const ly = cy + labelR * Math.sin(angle);
              // Short names for radar
              const shortNames = ['Emission', 'Targets', 'Tech', 'Finance', 'Gov.', 'Scenarios', 'Risk', 'Transparency'];
              return (
                <text
                  key={i}
                  x={lx} y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fill="var(--color-muted-foreground, #9ca3af)"
                >
                  {shortNames[i] ?? d.name.substring(0, 8)}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Dimension breakdown bars */}
        <div className="mt-2 space-y-2 border-t border-border pt-3">
          {dims.map((d) => (
            <div key={d.name}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-medium">
                  {d.name}
                  <span className="ml-1 text-[9px] text-muted-foreground">({(d.weight * 100).toFixed(0)}%)</span>
                </span>
                <span className="text-[10px] font-semibold tabular-nums">{d.score.toFixed(0)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${d.score}%`,
                    backgroundColor: d.score >= 70 ? '#10b981' : d.score >= 40 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
