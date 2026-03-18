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
import type { CVaRResult } from '@/lib/calc-engine/types';

interface CVaRWaterfallChartProps {
  cvar: CVaRResult;
}

export function CVaRWaterfallChart({ cvar }: CVaRWaterfallChartProps) {
  const policy = cvar.policyRisk.npv;
  const tech = cvar.techOpportunity.npv;
  const physical = cvar.physicalRisk.estimatedDamage;
  const net = cvar.totalCVaRAbsolute;

  // Waterfall data: invisible bar positions the value bar
  const data = [
    {
      name: 'Policy Risk',
      invisible: 0,
      value: policy,
      fill: '#ef4444',
      isTotal: false,
    },
    {
      name: 'Tech Opportunity',
      invisible: policy - tech,
      value: tech,
      fill: '#10b981',
      isTotal: false,
    },
    {
      name: 'Physical Risk',
      invisible: policy - tech,
      value: physical,
      fill: '#f97316',
      isTotal: false,
    },
    {
      name: 'Net CVaR',
      invisible: 0,
      value: net,
      fill: cvar.classificationColor,
      isTotal: true,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">CVaR Waterfall</CardTitle>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Risk component decomposition (USD M)
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              strokeOpacity={0.35}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              width={60}
              tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`}
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
              formatter={(value) => [`$${(Number(value) / 1e6).toFixed(1)}M`, 'Value']}
            />

            {/* Invisible positioning bar */}
            <Bar dataKey="invisible" stackId="stack" fill="transparent" isAnimationActive={false} />

            {/* Value bar */}
            <Bar dataKey="value" stackId="stack" isAnimationActive={false} radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-2 flex items-center gap-4 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" /> Policy Risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Tech Opportunity (offset)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-500" /> Physical Risk
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
