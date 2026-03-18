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
import type { TrajectoryPoint, ScenarioData } from '@/lib/calc-engine/types';
import { getScenarioColor } from './scenario-selector';

interface ScenarioTrajectoryChartProps {
  trajectory: TrajectoryPoint[];
  scenarios: ScenarioData[];
  selectedScenarioIds: Set<string>;
}

export function ScenarioTrajectoryChart({
  trajectory,
  scenarios,
  selectedScenarioIds,
}: ScenarioTrajectoryChartProps) {
  if (trajectory.length === 0) return null;

  const selectedScenarios = scenarios.filter((s) => selectedScenarioIds.has(s.id));

  // Build chart data: company + BAU + scenario overlays
  const data = trajectory.map((t) => {
    const point: Record<string, number> = {
      year: t.year,
      company: Number(t.interpolated?.toFixed(4) ?? 0),
      bau: Number(t.bau?.toFixed(4) ?? 0),
    };
    for (const sc of selectedScenarios) {
      // Interpolate scenario intensity at this year
      const dp = sc.dataPoints;
      if (dp.length === 0) continue;
      const sorted = [...dp].sort((a, b) => a.year - b.year);
      let val = 0;
      if (t.year <= sorted[0].year) val = sorted[0].intensity;
      else if (t.year >= sorted[sorted.length - 1].year) val = sorted[sorted.length - 1].intensity;
      else {
        for (let i = 0; i < sorted.length - 1; i++) {
          if (t.year >= sorted[i].year && t.year <= sorted[i + 1].year) {
            const frac = (t.year - sorted[i].year) / (sorted[i + 1].year - sorted[i].year);
            val = sorted[i].intensity + frac * (sorted[i + 1].intensity - sorted[i].intensity);
            break;
          }
        }
      }
      point[sc.id] = Number(val.toFixed(4));
    }
    return point;
  });

  let colorIndex = 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Scenario Trajectory Overlay
        </CardTitle>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Company pathway vs. climate scenario trajectories (tCO₂/tcs)
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="scenarioCompanyGradient" x1="0" y1="0" x2="0" y2="1">
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
                const n = String(name);
                const sc = selectedScenarios.find((s) => s.id === n);
                const displayName = sc ? `${sc.shortName} (${sc.temperatureOutcome}°C)` : n === 'company' ? 'Company' : n === 'bau' ? 'BAU' : n;
                return [`${Number(value).toFixed(4)} tCO₂/tcs`, displayName];
              }}
            />

            {/* Company trajectory */}
            <Area
              type="monotone"
              dataKey="company"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#scenarioCompanyGradient)"
              name="company"
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1' }}
            />

            {/* BAU reference line */}
            <Line
              type="monotone"
              dataKey="bau"
              stroke="var(--color-muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              name="bau"
            />

            {/* Scenario lines */}
            {selectedScenarios.map((sc) => {
              const color = getScenarioColor(sc.shortName, colorIndex++);
              return (
                <Line
                  key={sc.id}
                  type="monotone"
                  dataKey={sc.id}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: color }}
                  name={sc.id}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Mini legend */}
        <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-5 rounded-sm bg-indigo-500/30 border border-indigo-500" />
            Company (Modelled)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-5 border-t-2 border-dashed border-muted-foreground" />
            BAU (No Action)
          </span>
          {(() => { colorIndex = 0; return null; })()}
          {selectedScenarios.map((sc) => {
            const color = getScenarioColor(sc.shortName, colorIndex++);
            return (
              <span key={sc.id} className="flex items-center gap-1.5">
                <span className="inline-block h-0 w-5 border-t-2" style={{ borderColor: color }} />
                {sc.shortName} ({sc.temperatureOutcome}°C)
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
