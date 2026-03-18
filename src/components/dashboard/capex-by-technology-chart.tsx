'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CapexResult } from '@/lib/calc-engine/types';

const TECH_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f97316', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f59e0b', '#3b82f6',
  '#14b8a6', '#e11d48',
];

function formatCapex(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

export function CapexByTechnologyChart({ capex }: { capex: CapexResult }) {
  // Collect all unique methods across transitions
  const allTechs = new Map<string, string>(); // id -> name
  for (const tr of capex.transitions) {
    for (const mc of tr.methodCapex) {
      if (!allTechs.has(mc.methodId)) {
        allTechs.set(mc.methodId, mc.methodName);
      }
    }
  }

  const techEntries = Array.from(allTechs.entries());
  if (techEntries.length === 0) return null;

  const data = capex.transitions.map((tr) => {
    const point: Record<string, string | number> = {
      name: `${tr.fromLabel} → ${tr.toLabel}`,
    };
    for (const [id] of techEntries) {
      const mc = tr.methodCapex.find((m) => m.methodId === id);
      point[id] = mc ? mc.totalCapex : 0;
    }
    return point;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">CAPEX by Technology</CardTitle>
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
              formatter={(value, name) => {
                const techName = allTechs.get(String(name)) ?? String(name);
                return [`$${formatCapex(Number(value))} USD`, techName];
              }}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
              }}
            />
            <Legend
              formatter={(value) => allTechs.get(String(value)) ?? String(value)}
              wrapperStyle={{ fontSize: '11px' }}
            />
            {techEntries.map(([id], i) => (
              <Bar
                key={id}
                dataKey={id}
                stackId="capex"
                fill={TECH_COLORS[i % TECH_COLORS.length]}
                radius={i === techEntries.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
