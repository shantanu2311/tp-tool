'use client';

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TrajectoryPoint, BenchmarkPathway } from '@/lib/calc-engine/types';

// Benchmark colors — indigo excluded (used for company area)
const BENCHMARK_COLORS = [
  '#f97316', // orange
  '#10b981', // emerald
  '#eab308', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#8b5cf6', // violet
];

interface IntensityTrajectoryChartProps {
  trajectory: TrajectoryPoint[];
  benchmarks: BenchmarkPathway[];
  selectedBenchmarkIds: Set<string>;
  onBenchmarkToggle: (id: string) => void;
}

export function IntensityTrajectoryChart({
  trajectory,
  benchmarks,
  selectedBenchmarkIds,
  onBenchmarkToggle,
}: IntensityTrajectoryChartProps) {
  if (trajectory.length === 0) return null;

  // Build chart data — company + BAU + selected benchmarks
  const data = trajectory.map((t) => {
    const point: Record<string, number> = {
      year: t.year,
      interpolated: Number(t.interpolated?.toFixed(4) ?? 0),
      bau: Number(t.bau?.toFixed(4) ?? 0),
    };
    for (const bm of benchmarks) {
      if (selectedBenchmarkIds.has(bm.id)) {
        point[bm.id] = Number(t.benchmarks[bm.id]?.toFixed(4) ?? 0);
      }
    }
    return point;
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold">
              Emission Intensity Trajectory
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Modelled pathway vs. benchmark scenarios (tCO₂/tcs)
            </p>
          </div>
        </div>

        {/* Benchmark filter pills */}
        {benchmarks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-3">
            {benchmarks.map((bm, i) => {
              const selected = selectedBenchmarkIds.has(bm.id);
              const color = BENCHMARK_COLORS[i % BENCHMARK_COLORS.length];
              return (
                <button
                  key={bm.id}
                  type="button"
                  onClick={() => onBenchmarkToggle(bm.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                    selected
                      ? 'border-border bg-muted/60 text-foreground shadow-sm'
                      : 'border-transparent text-muted-foreground/40 line-through hover:text-muted-foreground/60'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-2 w-2 rounded-full transition-opacity',
                      selected ? 'opacity-100' : 'opacity-30'
                    )}
                    style={{ backgroundColor: color }}
                  />
                  {bm.name}
                </button>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="companyAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              strokeOpacity={0.35}
              vertical={false}
            />

            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(1)}
              width={45}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card, white)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                fontSize: '12px',
                boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
                padding: '10px 14px',
              }}
              labelFormatter={(label) => `Year ${label}`}
              formatter={(value, name) => {
                const formatted = Number(value).toFixed(4);
                return [`${formatted} tCO₂/tcs`, String(name)];
              }}
            />

            {/* Company modelled intensity — filled area */}
            <Area
              type="monotone"
              dataKey="interpolated"
              name="Company (Modelled)"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#companyAreaGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* BAU reference — dashed line */}
            <Line
              type="monotone"
              dataKey="bau"
              name="BAU (No Action)"
              stroke="var(--color-muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
            />

            {/* Benchmark pathway lines — only selected */}
            {benchmarks
              .filter((bm) => selectedBenchmarkIds.has(bm.id))
              .map((bm) => {
                const originalIndex = benchmarks.indexOf(bm);
                return (
                  <Line
                    key={bm.id}
                    type="monotone"
                    dataKey={bm.id}
                    name={bm.name}
                    stroke={BENCHMARK_COLORS[originalIndex % BENCHMARK_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                );
              })}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Inline mini-legend for Company + BAU */}
        <div className="flex items-center gap-5 border-t pt-3 mt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-5 rounded-full bg-indigo-500" />
            Company (Modelled)
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0 w-5"
              style={{
                borderTop: '2px dashed var(--color-muted-foreground)',
              }}
            />
            BAU (No Action)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
