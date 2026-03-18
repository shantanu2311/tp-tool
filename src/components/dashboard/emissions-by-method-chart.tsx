'use client';

import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import type { WaterfallTransition, PeriodResult, WaterfallMethodRow } from '@/lib/calc-engine/types';

interface WaterfallBarData {
  name: string;
  value: number;
  isTotal: boolean;
  fill: string;
  invisible: number;
  methodRow?: WaterfallMethodRow;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const entry: WaterfallBarData | undefined = payload.find(
    (p: any) => p.dataKey === 'value'
  )?.payload;
  if (!entry) return null;

  return (
    <div
      className="rounded-[10px] border bg-card px-3.5 py-2.5 text-xs shadow-md"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <p className="mb-1.5 font-medium text-foreground">{String(label)}</p>
      {entry.isTotal ? (
        <p className="text-muted-foreground">
          Intensity:{' '}
          <span className="font-semibold text-foreground">
            {entry.value.toFixed(4)} tCO₂/tcs
          </span>
        </p>
      ) : entry.methodRow ? (
        <div className="space-y-1">
          <p className="text-muted-foreground">
            Net change:{' '}
            <span
              className={cn(
                'font-semibold',
                entry.methodRow.net < 0 ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {entry.methodRow.net > 0 ? '+' : ''}
              {entry.methodRow.net.toFixed(4)} tCO₂/tcs
            </span>
          </p>
          {entry.methodRow.dueToLeverChange !== 0 && (
            <p className="text-muted-foreground/80">
              └ Lever:{' '}
              <span className="font-medium">
                {entry.methodRow.dueToLeverChange > 0 ? '+' : ''}
                {entry.methodRow.dueToLeverChange.toFixed(4)}
              </span>
            </p>
          )}
          {entry.methodRow.dueToProportionChange !== 0 && (
            <p className="text-muted-foreground/80">
              └ Mix:{' '}
              <span className="font-medium">
                {entry.methodRow.dueToProportionChange > 0 ? '+' : ''}
                {entry.methodRow.dueToProportionChange.toFixed(4)}
              </span>
            </p>
          )}
          {entry.methodRow.dueToMethodChange !== 0 && (
            <p className="text-muted-foreground/80">
              └ New method:{' '}
              <span className="font-medium">
                {entry.methodRow.dueToMethodChange > 0 ? '+' : ''}
                {entry.methodRow.dueToMethodChange.toFixed(4)}
              </span>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function EmissionsByMethodChart({
  transitions,
  periods,
}: {
  transitions: WaterfallTransition[];
  periods: PeriodResult[];
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (transitions.length === 0 || periods.length < 2) return null;

  const transition = transitions[selectedIndex];
  if (!transition) return null;

  // All transitions are from base (index 0) to ST/MT/LT
  const startPeriod = periods[0];
  const endPeriod = periods[selectedIndex + 1];

  // Build waterfall data: start (full) -> per-method changes (floating) -> end (full)
  const data: WaterfallBarData[] = [];

  let running = startPeriod.companyIntensity;

  // Start bar — full height from 0
  data.push({
    name: `${startPeriod.label} (${startPeriod.year})`,
    value: running,
    isTotal: true,
    fill: '#6366f1',
    invisible: 0,
  });

  // Per-method contribution bars — floating (only show the change)
  for (const row of transition.methodRows) {
    // Show lever change and method/mix change separately per method
    if (Math.abs(row.dueToLeverChange) > 0.00005) {
      const val = row.dueToLeverChange;
      const isNeg = val < 0;
      data.push({
        name: row.methodName,
        value: Math.abs(val),
        isTotal: false,
        fill: isNeg ? '#10b981' : '#f43f5e',
        invisible: isNeg ? running + val : running,
        methodRow: row,
      });
      running += val;
    }

    const mixChange = row.dueToMethodChange + row.dueToProportionChange;
    if (Math.abs(mixChange) > 0.00005) {
      const isNeg = mixChange < 0;
      data.push({
        name: row.dueToMethodChange !== 0
          ? `${row.methodName} (New)`
          : `${row.methodName} (Mix)`,
        value: Math.abs(mixChange),
        isTotal: false,
        fill: isNeg ? '#6ee7b7' : '#fca5a5',
        invisible: isNeg ? running + mixChange : running,
        methodRow: row,
      });
      running += mixChange;
    }
  }

  // End bar — full height from 0
  data.push({
    name: `${endPeriod.label} (${endPeriod.year})`,
    value: endPeriod.companyIntensity,
    isTotal: true,
    fill: '#6366f1',
    invisible: 0,
  });

  const totalChange = endPeriod.companyIntensity - startPeriod.companyIntensity;
  const percentChange =
    startPeriod.companyIntensity > 0
      ? (totalChange / startPeriod.companyIntensity) * 100
      : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold">
              Method Waterfall
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Per-method contribution to intensity change (tCO₂/tcs)
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={cn(
                'text-lg font-bold tabular-nums',
                totalChange < 0 ? 'text-emerald-600' : totalChange > 0 ? 'text-rose-600' : 'text-foreground'
              )}
            >
              {totalChange > 0 ? '+' : ''}
              {percentChange.toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground">net change</span>
          </div>
        </div>

        {/* Term selector pills */}
        <div className="flex flex-wrap gap-1.5 pt-3">
          {transitions.map((tr, i) => {
            const selected = i === selectedIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                  selected
                    ? 'border-border bg-muted/60 text-foreground shadow-sm'
                    : 'border-transparent text-muted-foreground/40 hover:text-muted-foreground/60'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full transition-opacity',
                    selected ? 'opacity-100 bg-indigo-500' : 'opacity-30 bg-muted-foreground'
                  )}
                />
                {tr.fromLabel} → {tr.toLabel}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart
            data={data}
            barSize={40}
            barGap={8}
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
              tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(2)}
              width={50}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--color-muted)', opacity: 0.15 }}
            />
            <Bar dataKey="invisible" stackId="stack" isAnimationActive={false}>
              {data.map((_entry, i) => (
                <Cell key={i} fill="transparent" />
              ))}
            </Bar>
            <Bar dataKey="value" stackId="stack" radius={[3, 3, 0, 0]} isAnimationActive={false}>
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
