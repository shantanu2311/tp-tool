'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { PeriodResult } from '@/lib/calc-engine/types';
import { TrendingDown, Zap, Factory, ArrowDown } from 'lucide-react';

export function KPICards({ periods }: { periods: PeriodResult[] }) {
  if (periods.length === 0) return null;

  const base = periods[0];
  const latest = periods[periods.length - 1];
  const reduction = base.companyIntensity > 0
    ? ((base.companyIntensity - latest.companyIntensity) / base.companyIntensity) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {/* Period KPI cards */}
      {periods.map((p, i) => (
        <Card key={i} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {p.label}
              </p>
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {p.year}
              </span>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold tracking-tight">
                {p.companyIntensity.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">tCO2/tcs</p>
            </div>
            <div className="mt-3 flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {p.estimatedEmissions.toFixed(1)} MtCO2
              </span>
              <span className="flex items-center gap-1">
                <Factory className="h-3 w-3" />
                {p.totalProduction} MTPA
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Total Reduction card */}
      <Card className="relative overflow-hidden bg-primary/5 ring-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-primary/70">
              Reduction
            </p>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
              <ArrowDown className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-primary">
              {reduction.toFixed(1)}%
            </p>
            <p className="text-xs text-primary/60">total intensity reduction</p>
          </div>
          <div className="mt-3 flex items-center gap-1 border-t border-primary/10 pt-3 text-xs text-primary/70">
            <TrendingDown className="h-3 w-3" />
            {base.companyIntensity.toFixed(3)} → {latest.companyIntensity.toFixed(3)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
