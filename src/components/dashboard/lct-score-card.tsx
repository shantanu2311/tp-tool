'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LCTResult } from '@/lib/calc-engine/types';

function scoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.9) return '#059669';
  if (pct >= 0.5) return '#f59e0b';
  return '#ef4444';
}

function barColor(score: number): string {
  if (score === 2) return 'bg-emerald-500';
  if (score === 1) return 'bg-amber-500';
  return 'bg-red-400';
}

interface LCTScoreCardProps {
  lct: LCTResult;
}

export function LCTScoreCard({ lct }: LCTScoreCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Low Carbon Transition Readiness</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              5-category assessment of transition preparedness (0-10)
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums" style={{ color: lct.classificationColor }}>
              {lct.totalScore}<span className="text-sm text-muted-foreground">/10</span>
            </p>
            <Badge className="text-[10px] text-white" style={{ backgroundColor: lct.classificationColor }}>
              {lct.classification}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {lct.categories.map((cat) => (
          <div key={cat.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium">{cat.name}</span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: scoreColor(cat.score, cat.maxScore) }}>
                {cat.score}/{cat.maxScore}
              </span>
            </div>
            {/* Score bar */}
            <div className="flex gap-1">
              {Array.from({ length: cat.maxScore }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-2 flex-1 rounded-full transition-all',
                    i < cat.score ? barColor(cat.score) : 'bg-muted'
                  )}
                />
              ))}
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{cat.description}</p>
          </div>
        ))}

        {/* Overall score bar */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">Overall Score</span>
            <span className="text-[11px] font-semibold" style={{ color: lct.classificationColor }}>
              {lct.totalScore}/10
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(lct.totalScore / 10) * 100}%`,
                backgroundColor: lct.classificationColor,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
