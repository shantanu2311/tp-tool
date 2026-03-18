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
import type { CapexResult } from '@/lib/calc-engine/types';

function formatCapex(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

export function CapexWaterfallChart({ capex }: { capex: CapexResult }) {
  if (capex.transitions.length === 0) return null;

  // Build waterfall data: each transition's method contributions, plus total
  const bars: Array<{
    name: string;
    invisible: number;
    value: number;
    isTotal: boolean;
  }> = [];

  let running = 0;
  for (const tr of capex.transitions) {
    // Add transition label as a segment
    bars.push({
      name: `${tr.fromLabel} → ${tr.toLabel}`,
      invisible: running,
      value: tr.totalCapex,
      isTotal: false,
    });
    running += tr.totalCapex;
  }

  // Add total bar
  bars.push({
    name: 'Total',
    invisible: 0,
    value: capex.totalCapex,
    isTotal: true,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">CAPEX Waterfall</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={bars} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${formatCapex(v)}`}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'invisible') return [null, null];
                return [`$${formatCapex(Number(value))} USD`, 'CAPEX'];
              }}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
              }}
            />
            <ReferenceLine y={0} stroke="#9ca3af" />
            {/* Invisible base bar */}
            <Bar dataKey="invisible" stackId="waterfall" isAnimationActive={false}>
              {bars.map((_entry, i) => (
                <Cell key={i} fill="transparent" />
              ))}
            </Bar>
            {/* Visible value bar */}
            <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {bars.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isTotal ? '#3b82f6' : '#6366f1'}
                  fillOpacity={entry.isTotal ? 1 : 0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
