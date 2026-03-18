'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CVaRResult } from '@/lib/calc-engine/types';

interface CVaRBreakdownCardProps {
  cvar: CVaRResult;
}

export function CVaRBreakdownCard({ cvar }: CVaRBreakdownCardProps) {
  const components = [
    { name: 'Policy Risk', value: cvar.policyRisk.npv, color: '#ef4444', desc: 'NPV of carbon pricing costs' },
    { name: 'Tech Opportunity', value: -cvar.techOpportunity.npv, color: '#10b981', desc: 'NPV of green premium revenue' },
    { name: 'Physical Risk', value: cvar.physicalRisk.estimatedDamage, color: '#f97316', desc: `Warming damage (${cvar.physicalRisk.temperatureBasis.toFixed(1)}°C)` },
  ];

  const maxAbsValue = Math.max(...components.map((c) => Math.abs(c.value)), 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Climate Value at Risk</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Three-component climate financial risk assessment
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums" style={{ color: cvar.classificationColor }}>
              {cvar.totalCVaRPercent.toFixed(1)}%
            </p>
            <Badge className="text-[10px] text-white" style={{ backgroundColor: cvar.classificationColor }}>
              {cvar.classification} Risk
            </Badge>
            <p className="mt-0.5 text-[10px] text-muted-foreground">of enterprise value</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Component bars */}
        <div className="space-y-3">
          {components.map((c) => (
            <div key={c.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium">{c.name}</span>
                <span className={cn('text-[11px] font-semibold tabular-nums', c.value > 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {c.value > 0 ? '+' : ''}{(c.value / 1e6).toFixed(0)}M
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute h-full rounded-full transition-all"
                  style={{
                    width: `${(Math.abs(c.value) / maxAbsValue) * 100}%`,
                    backgroundColor: c.color,
                    left: c.value < 0 ? 'auto' : '0',
                    right: c.value < 0 ? '0' : 'auto',
                  }}
                />
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
          <div className="rounded-lg border border-border p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Policy</p>
            <p className="text-sm font-bold text-red-600 tabular-nums">${(cvar.policyRisk.npv / 1e6).toFixed(0)}M</p>
          </div>
          <div className="rounded-lg border border-border p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Tech Opp.</p>
            <p className="text-sm font-bold text-emerald-600 tabular-nums">-${(cvar.techOpportunity.npv / 1e6).toFixed(0)}M</p>
          </div>
          <div className="rounded-lg border border-border p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Physical</p>
            <p className="text-sm font-bold text-orange-600 tabular-nums">${(cvar.physicalRisk.estimatedDamage / 1e6).toFixed(0)}M</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Net Climate Value at Risk</p>
          <p className="text-xl font-bold tabular-nums" style={{ color: cvar.classificationColor }}>
            ${(cvar.totalCVaRAbsolute / 1e6).toFixed(0)}M
            <span className="ml-2 text-sm">({cvar.totalCVaRPercent.toFixed(1)}% EV)</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
