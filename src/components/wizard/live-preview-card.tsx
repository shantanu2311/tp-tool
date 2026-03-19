'use client';

import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { PeriodMethodInput, MethodData, LeverDefinition } from '@/lib/calc-engine/types';
import { calcFinalIntensity } from '@/lib/calc-engine/method-intensity';

interface Props {
  periodLabel: string;
  methods: PeriodMethodInput[];
  availableMethods: MethodData[];
  leverDefs: LeverDefinition[];
  baseIntensity: number; // company intensity at base year
}

export function LivePreviewCard({ periodLabel, methods, availableMethods, leverDefs, baseIntensity }: Props) {
  const sortedLevers = useMemo(() => [...leverDefs].sort((a, b) => a.displayOrder - b.displayOrder), [leverDefs]);

  const intensity = useMemo(() => {
    if (methods.length === 0) return 0;
    return methods.reduce((sum, m) => {
      const md = availableMethods.find((d) => d.id === m.methodId);
      if (!md) return sum;
      const factors = sortedLevers.map((l) => {
        if (!md.applicableLevers.has(l.id)) return 0;
        const raw = parseInt(m.leverSelections[l.id] || '0', 10);
        const sliderValue = isNaN(raw) ? 0 : raw;
        if (sliderValue === 0) return 0;
        return 1 - (sliderValue / 100) * (l.maxReduction ?? 0);
      });
      const fi = Math.max(0, calcFinalIntensity(md.baseCO2, factors));
      return sum + fi * m.share;
    }, 0);
  }, [methods, availableMethods, sortedLevers]);

  if (methods.length === 0 || baseIntensity === 0) return null;

  const changePct = baseIntensity > 0 ? ((intensity - baseIntensity) / baseIntensity) * 100 : 0;
  const isReduction = changePct < -0.05;
  const isIncrease = changePct > 0.05;

  return (
    <div className="fixed bottom-20 right-8 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg ring-1 ring-foreground/5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
          isReduction ? 'bg-emerald-100 text-emerald-600' :
          isIncrease ? 'bg-red-100 text-red-600' :
          'bg-muted text-muted-foreground'
        }`}>
          {isReduction ? <TrendingDown className="h-4 w-4" /> :
           isIncrease ? <TrendingUp className="h-4 w-4" /> :
           <Minus className="h-4 w-4" />}
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono tabular-nums">{intensity.toFixed(3)}</span>
            <span className="text-xs text-muted-foreground">tCO2/tcs</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">{periodLabel} vs Base:</span>
            <span className={`font-semibold ${
              isReduction ? 'text-emerald-600' :
              isIncrease ? 'text-red-600' :
              'text-muted-foreground'
            }`}>
              {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
