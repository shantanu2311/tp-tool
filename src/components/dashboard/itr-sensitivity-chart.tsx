'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ITRResult } from '@/lib/calc-engine/types';

interface ITRSensitivityChartProps {
  itr: ITRResult;
}

export function ITRSensitivityChart({ itr }: ITRSensitivityChartProps) {
  if (itr.sensitivity.length === 0) return null;

  const data = itr.sensitivity.map((s) => ({
    rate: s.rateChange,
    temp: s.resultingTemp,
  }));

  // Find the rate needed to reach 2.0°C and 1.5°C
  const rateFor2C = itr.sensitivity.find((s) => s.resultingTemp <= 2.0);
  const rateFor15C = itr.sensitivity.find((s) => s.resultingTemp <= 1.5);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">ITR Sensitivity Analysis</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              How additional annual reduction impacts implied temperature
            </p>
          </div>
          <div className="text-right space-y-0.5">
            {rateFor2C && (
              <p className="text-[11px]">
                <span className="text-muted-foreground">2°C target: </span>
                <span className="font-semibold text-amber-600">+{rateFor2C.rateChange.toFixed(1)}%/yr</span>
              </p>
            )}
            {rateFor15C && (
              <p className="text-[11px]">
                <span className="text-muted-foreground">1.5°C target: </span>
                <span className="font-semibold text-emerald-600">+{rateFor15C.rateChange.toFixed(1)}%/yr</span>
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              strokeOpacity={0.35}
              vertical={false}
            />
            <XAxis
              dataKey="rate"
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `+${v}%`}
              label={{
                value: 'Additional Annual Reduction Rate',
                position: 'insideBottom',
                offset: -2,
                fontSize: 10,
                fill: 'var(--color-muted-foreground)',
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}°C`}
              width={50}
              domain={['auto', 'auto']}
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
              formatter={(value) => [`${Number(value).toFixed(2)}°C`, 'Implied Temperature']}
              labelFormatter={(label) => `+${label}% annual reduction`}
            />

            {/* 2°C reference line */}
            <ReferenceLine
              y={2.0}
              stroke="#f59e0b"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{ value: '2.0°C', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
            />

            {/* 1.5°C reference line */}
            <ReferenceLine
              y={1.5}
              stroke="#10b981"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{ value: '1.5°C', position: 'insideTopRight', fontSize: 10, fill: '#10b981' }}
            />

            <Line
              type="monotone"
              dataKey="temp"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1' }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
          Shows how your ITR changes if you increase your annual emission reduction rate beyond current plans.
          {rateFor2C && !rateFor15C && (
            <span className="ml-1">
              You need <strong className="text-amber-600">+{rateFor2C.rateChange.toFixed(1)}%</strong> additional annual reduction to reach 2°C alignment.
            </span>
          )}
          {rateFor15C && (
            <span className="ml-1">
              You need <strong className="text-emerald-600">+{rateFor15C.rateChange.toFixed(1)}%</strong> additional annual reduction to reach 1.5°C alignment.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
