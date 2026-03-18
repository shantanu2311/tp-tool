'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CapexResult, CapexScenario } from '@/lib/calc-engine/types';
import { DollarSign, TrendingUp, Layers } from 'lucide-react';

function formatCapex(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

export function CapexKpiCards({
  capex,
  scenario,
}: {
  capex: CapexResult;
  scenario: CapexScenario;
}) {
  const techCount = Object.keys(capex.byTechnology).length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Total CAPEX */}
      <Card className="relative overflow-hidden bg-blue-50/50 ring-blue-200/30">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-blue-600/70">
              Total CAPEX
            </p>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
              <DollarSign className="h-3.5 w-3.5 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-blue-700">
              ${formatCapex(capex.totalCapex)}
            </p>
            <p className="text-xs text-blue-600/60">USD total investment</p>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-blue-100 pt-3 text-xs text-blue-600/70">
            <Badge variant="outline" className="text-[10px] capitalize border-blue-200 text-blue-600">
              {scenario} scenario
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Per transition KPI cards */}
      {capex.transitions.map((tr, i) => (
        <Card key={i} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {tr.fromLabel} → {tr.toLabel}
              </p>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold tracking-tight">
                ${formatCapex(tr.totalCapex)}
              </p>
              <p className="text-xs text-muted-foreground">USD</p>
            </div>
            <div className="mt-3 flex items-center gap-1 border-t pt-3 text-xs text-muted-foreground">
              <Layers className="h-3 w-3" />
              {tr.methodCapex.length} technolog{tr.methodCapex.length === 1 ? 'y' : 'ies'}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
