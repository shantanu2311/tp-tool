'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ScenarioGapResult, ScenarioData, PeriodResult } from '@/lib/calc-engine/types';

const STATUS_CONFIG = {
  aligned: { label: 'Aligned', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  at_risk: { label: 'At Risk', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  misaligned: { label: 'Misaligned', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

interface ScenarioGapTableProps {
  gaps: ScenarioGapResult[];
  scenarios: ScenarioData[];
  periods: PeriodResult[];
}

export function ScenarioGapTable({ gaps, scenarios, periods }: ScenarioGapTableProps) {
  if (gaps.length === 0) return null;

  // Period labels (skip base)
  const milestoneLabels = periods.map((p) => ({
    label: p.label,
    year: p.year,
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Scenario Gap Analysis</CardTitle>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Company intensity gap vs. scenario targets at each milestone
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                <th className="py-2.5 pr-4 font-medium">Scenario</th>
                <th className="px-2 py-2.5 text-center font-medium">Temp</th>
                {milestoneLabels.map((m) => (
                  <th key={m.year} className="px-2 py-2.5 text-center font-medium">
                    <div>{m.label}</div>
                    <div className="text-[10px] font-normal">({m.year})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gaps.map((gap) => {
                const sc = scenarios.find((s) => s.id === gap.scenarioId);
                if (!sc) return null;

                return (
                  <tr key={gap.scenarioId} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-[12px]">{sc.shortName}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                        {sc.name}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-medium',
                          sc.temperatureOutcome <= 1.5
                            ? 'border-emerald-300 text-emerald-600'
                            : sc.temperatureOutcome <= 2.0
                              ? 'border-amber-300 text-amber-600'
                              : 'border-red-300 text-red-600'
                        )}
                      >
                        {sc.temperatureOutcome}°C
                      </Badge>
                    </td>
                    {gap.milestones.map((m) => {
                      const status = STATUS_CONFIG[m.alignmentStatus];
                      return (
                        <td key={m.year} className="px-2 py-2.5 text-center">
                          <div className="space-y-1">
                            <Badge className={cn('text-[10px]', status.className)}>
                              {status.label}
                            </Badge>
                            <div className={cn(
                              'text-[11px] font-medium',
                              m.gapAbsolute <= 0 ? 'text-emerald-600' : 'text-red-600'
                            )}>
                              {m.gapAbsolute <= 0 ? '' : '+'}{m.gapAbsolute.toFixed(3)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              ({m.gapPercent > 0 ? '+' : ''}{m.gapPercent.toFixed(1)}%)
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 border-t border-border pt-2 text-[11px] text-muted-foreground">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1">
              <Badge className={cn('h-4 text-[9px]', cfg.className)}>{cfg.label}</Badge>
              {key === 'aligned' && '(company ≤ target)'}
              {key === 'at_risk' && '(within 20%)'}
              {key === 'misaligned' && '(>20% above)'}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
