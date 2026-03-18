'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WaterfallTransition, PeriodResult } from '@/lib/calc-engine/types';

export function MethodWaterfallChart({
  transitions,
  periods,
}: {
  transitions: WaterfallTransition[];
  periods: PeriodResult[];
}) {
  if (transitions.length === 0 || periods.length < 2) return null;

  const data: Array<{
    name: string;
    value: number;
    isTotal: boolean;
    fill: string;
    invisible: number;
  }> = [];

  let running = periods[0].companyIntensity;
  data.push({
    name: `${periods[0].label} (${periods[0].year})`,
    value: running,
    isTotal: true,
    fill: '#6366f1',
    invisible: 0,
  });

  for (let t = 0; t < transitions.length; t++) {
    const tr = transitions[t];

    if (tr.totalDueToLever !== 0) {
      const isNeg = tr.totalDueToLever < 0;
      data.push({
        name: `Lever (${periods[t + 1].year})`,
        value: Math.abs(tr.totalDueToLever),
        isTotal: false,
        fill: isNeg ? '#10b981' : '#f43f5e',
        invisible: isNeg ? running + tr.totalDueToLever : running,
      });
      running += tr.totalDueToLever;
    }

    const methodProportion = tr.totalDueToMethod + tr.totalDueToProportion;
    if (methodProportion !== 0) {
      const isNeg = methodProportion < 0;
      data.push({
        name: `Mix (${periods[t + 1].year})`,
        value: Math.abs(methodProportion),
        isTotal: false,
        fill: isNeg ? '#6ee7b7' : '#fca5a5',
        invisible: isNeg ? running + methodProportion : running,
      });
      running += methodProportion;
    }

    data.push({
      name: `${periods[t + 1].label} (${periods[t + 1].year})`,
      value: periods[t + 1].companyIntensity,
      isTotal: true,
      fill: '#6366f1',
      invisible: 0,
    });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">
            Lever vs Mix Decomposition
          </CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Intensity changes by driver type across all periods (tCO₂/tcs)
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              strokeOpacity={0.35}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              angle={-20}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(2)}
              width={50}
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
              formatter={(value, name) => {
                if (String(name) === 'invisible') return [null, null];
                return [`${Number(value).toFixed(4)} tCO₂/tcs`, 'Change'];
              }}
            />
            <ReferenceLine
              y={0}
              stroke="var(--color-muted-foreground)"
              strokeOpacity={0.3}
            />
            <Bar dataKey="invisible" stackId="stack" fill="transparent" />
            <Bar dataKey="value" stackId="stack" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Mini legend */}
        <div className="flex items-center gap-5 border-t pt-3 mt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500" />
            Period Total
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Lever (↓)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#6ee7b7' }} />
            Mix (↓)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500" />
            Increase
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
