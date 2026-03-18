'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CTAResult } from '@/lib/calc-engine/types';

const SHADE_GRADIENT = [
  { shade: 'dark_green', color: '#065f46', label: 'Dark Green' },
  { shade: 'green', color: '#059669', label: 'Green' },
  { shade: 'light_green', color: '#84cc16', label: 'Light Green' },
  { shade: 'yellow', color: '#eab308', label: 'Yellow' },
  { shade: 'orange', color: '#f97316', label: 'Orange' },
  { shade: 'red', color: '#ef4444', label: 'Red' },
];

interface CTAShadeCardProps {
  cta: CTAResult;
}

export function CTAShadeCard({ cta }: CTAShadeCardProps) {
  const shadeIndex = SHADE_GRADIENT.findIndex((s) => s.shade === cta.shade);
  const pointerPercent = shadeIndex >= 0 ? ((shadeIndex + 0.5) / SHADE_GRADIENT.length) * 100 : 50;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Transition Plan Quality</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Shade of Green assessment across 6 weighted criteria
            </p>
          </div>
          <div className="text-right">
            <Badge
              className="text-sm font-bold text-white px-3 py-1"
              style={{ backgroundColor: cta.shadeColor }}
            >
              {cta.shadeLabel}
            </Badge>
            <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
              Score: {cta.weightedScore.toFixed(0)}/100
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Shade gradient strip */}
        <div className="relative">
          <div className="flex h-4 rounded-full overflow-hidden">
            {SHADE_GRADIENT.map((s) => (
              <div key={s.shade} className="flex-1" style={{ backgroundColor: s.color }} />
            ))}
          </div>
          {/* Pointer */}
          <div
            className="absolute -top-1 w-0.5 h-6 bg-foreground rounded-full"
            style={{ left: `${pointerPercent}%`, transform: 'translateX(-50%)' }}
          />
          <div
            className="absolute top-6 text-[9px] font-bold"
            style={{ left: `${pointerPercent}%`, transform: 'translateX(-50%)', color: cta.shadeColor }}
          >
            {cta.shadeLabel}
          </div>
        </div>

        {/* Criteria breakdown */}
        <div className="mt-6 space-y-2.5">
          {cta.criteria.map((c) => (
            <div key={c.name}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-medium">
                  {c.name}
                  <span className="ml-1 text-[9px] text-muted-foreground">({(c.weight * 100).toFixed(0)}%)</span>
                </span>
                <span className="text-[11px] font-semibold tabular-nums">
                  {c.score.toFixed(0)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${c.score}%`,
                    backgroundColor: c.score >= 70 ? '#10b981' : c.score >= 40 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <p className="mt-0.5 text-[9px] text-muted-foreground">{c.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
