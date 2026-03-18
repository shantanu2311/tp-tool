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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CapexResult } from '@/lib/calc-engine/types';

const PERIOD_COLORS = ['#6366f1', '#f97316', '#10b981'];

function formatCapex(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

export function CapexByPeriodChart({ capex }: { capex: CapexResult }) {
  const data = capex.transitions.map((tr, i) => ({
    name: `${tr.fromLabel} → ${tr.toLabel}`,
    capex: tr.totalCapex,
    color: PERIOD_COLORS[i % PERIOD_COLORS.length],
  }));

  if (data.every((d) => d.capex === 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">CAPEX by Period</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
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
              formatter={(value) => [`$${formatCapex(Number(value))} USD`, 'CAPEX']}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="capex" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
