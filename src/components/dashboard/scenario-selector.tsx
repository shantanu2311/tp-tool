'use client';

import { cn } from '@/lib/utils';
import type { ScenarioFamilyData, ScenarioData } from '@/lib/calc-engine/types';

const SCENARIO_COLORS: Record<string, string> = {
  // IEA
  NZE: '#10b981',   // emerald
  APS: '#f59e0b',   // amber
  STEPS: '#ef4444', // red
  // NGFS
  NZ2050: '#059669', // emerald-600
  B2C: '#0d9488',    // teal
  DNZ: '#8b5cf6',    // violet
  DT: '#f97316',     // orange
  NDCs: '#dc2626',   // red-600
  CP: '#991b1b',     // red-800
};

export function getScenarioColor(shortName: string, index: number): string {
  return SCENARIO_COLORS[shortName] ?? ['#6366f1', '#f97316', '#10b981', '#ec4899', '#06b6d4', '#eab308'][index % 6];
}

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  orderly: { label: 'Orderly', color: 'text-emerald-600' },
  disorderly: { label: 'Disorderly', color: 'text-amber-600' },
  hot_house: { label: 'Hot House', color: 'text-red-600' },
};

interface ScenarioSelectorProps {
  families: ScenarioFamilyData[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function ScenarioSelector({ families, selectedIds, onToggle }: ScenarioSelectorProps) {
  let globalIndex = 0;

  return (
    <div className="space-y-3">
      {families.map((family) => (
        <div key={family.id}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {family.name}
            {family.version && (
              <span className="ml-1.5 font-normal normal-case tracking-normal">({family.version})</span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {family.scenarios.map((sc) => {
              const selected = selectedIds.has(sc.id);
              const color = getScenarioColor(sc.shortName, globalIndex++);
              const risk = sc.riskCategory ? RISK_LABELS[sc.riskCategory] : null;

              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => onToggle(sc.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                    selected
                      ? 'border-border bg-muted/60 text-foreground shadow-sm'
                      : 'border-transparent text-muted-foreground/40 line-through hover:text-muted-foreground/60'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-2 w-2 rounded-full transition-opacity',
                      selected ? 'opacity-100' : 'opacity-30'
                    )}
                    style={{ backgroundColor: color }}
                  />
                  <span>{sc.shortName}</span>
                  <span className={cn('text-[9px]', selected ? 'text-muted-foreground' : 'opacity-50')}>
                    {sc.temperatureOutcome}°C
                  </span>
                  {risk && selected && (
                    <span className={cn('text-[9px]', risk.color)}>{risk.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
