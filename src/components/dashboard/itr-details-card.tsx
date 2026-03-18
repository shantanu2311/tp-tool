'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ITRResult } from '@/lib/calc-engine/types';

interface ITRDetailsCardProps {
  itr: ITRResult;
}

export function ITRDetailsCard({ itr }: ITRDetailsCardProps) {
  const budgetUsedPercent = itr.companyBudgetMt > 0
    ? Math.min((itr.cumulativeEmissionsMt / itr.companyBudgetMt) * 100, 200)
    : 0;
  const isExceeded = itr.overshootMt > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Carbon Budget Breakdown</CardTitle>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Company fair-share 1.5°C carbon budget analysis
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Budget bar */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">Budget Usage</span>
            <span className={cn('font-semibold', isExceeded ? 'text-red-600' : 'text-emerald-600')}>
              {budgetUsedPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isExceeded ? 'bg-red-500' : budgetUsedPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
              )}
              style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
            />
          </div>
          {isExceeded && (
            <div className="mt-1 h-1 rounded-full bg-red-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${Math.min((budgetUsedPercent - 100) / 100 * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fair-Share Budget</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{itr.companyBudgetMt.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">MtCO₂</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cumulative Emissions</p>
            <p className={cn('mt-0.5 text-lg font-bold tabular-nums', isExceeded ? 'text-red-600' : 'text-foreground')}>
              {itr.cumulativeEmissionsMt.toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground">MtCO₂</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isExceeded ? 'Overshoot' : 'Remaining'}
            </p>
            <p className={cn('mt-0.5 text-lg font-bold tabular-nums', isExceeded ? 'text-red-600' : 'text-emerald-600')}>
              {isExceeded ? '+' : ''}{Math.abs(itr.overshootMt).toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground">MtCO₂</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Implied Warming</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: itr.classificationColor }}>
              {itr.impliedTemperature.toFixed(2)}°C
            </p>
            <p className="text-[10px] text-muted-foreground">{itr.classification}</p>
          </div>
        </div>

        {/* Interpretation */}
        <div className="rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
          {isExceeded ? (
            <p>
              Your cumulative emissions exceed your fair-share 1.5°C budget by{' '}
              <strong className="text-red-600">{itr.overshootMt.toFixed(0)} MtCO₂</strong>.
              This translates to an implied warming contribution of{' '}
              <strong style={{ color: itr.classificationColor }}>{itr.impliedTemperature.toFixed(1)}°C</strong>.
            </p>
          ) : (
            <p>
              Your cumulative emissions are within your fair-share 1.5°C budget with{' '}
              <strong className="text-emerald-600">{Math.abs(itr.overshootMt).toFixed(0)} MtCO₂</strong> remaining.
              Your trajectory is aligned with{' '}
              <strong style={{ color: itr.classificationColor }}>{itr.classification}</strong>.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
