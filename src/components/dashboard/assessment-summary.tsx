'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ITRResult, LCTResult, CTAResult, CVaRResult, CSAResult } from '@/lib/calc-engine/types';

interface AssessmentSummaryProps {
  itr: ITRResult | null;
  lct: LCTResult | null;
  cta: CTAResult | null;
  cvar: CVaRResult | null;
  csa: CSAResult | null;
}

export function AssessmentSummary({ itr, lct, cta, cvar, csa }: AssessmentSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* ITR */}
      <Card className="overflow-hidden border-2" style={{ borderColor: itr?.classificationColor ?? 'var(--color-border)' }}>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Implied Temperature
          </p>
          {itr ? (
            <>
              <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color: itr.classificationColor }}>
                {itr.impliedTemperature.toFixed(1)}°C
              </p>
              <Badge className="mt-1 text-[10px] text-white" style={{ backgroundColor: itr.classificationColor }}>
                {itr.classification}
              </Badge>
            </>
          ) : (
            <p className="mt-2 text-lg text-muted-foreground">--</p>
          )}
        </CardContent>
      </Card>

      {/* LCT */}
      <Card className="overflow-hidden border-2" style={{ borderColor: lct?.classificationColor ?? 'var(--color-border)' }}>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Transition Readiness
          </p>
          {lct ? (
            <>
              <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color: lct.classificationColor }}>
                {lct.totalScore}<span className="text-sm text-muted-foreground">/10</span>
              </p>
              <Badge className="mt-1 text-[10px] text-white" style={{ backgroundColor: lct.classificationColor }}>
                {lct.classification}
              </Badge>
            </>
          ) : (
            <p className="mt-2 text-lg text-muted-foreground">--</p>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="overflow-hidden border-2" style={{ borderColor: cta?.shadeColor ?? 'var(--color-border)' }}>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Plan Quality
          </p>
          {cta ? (
            <>
              <p className="mt-1 text-3xl font-bold" style={{ color: cta.shadeColor }}>
                {cta.shadeLabel}
              </p>
              <Badge className="mt-1 text-[10px] text-white" style={{ backgroundColor: cta.shadeColor }}>
                {cta.weightedScore.toFixed(0)}/100
              </Badge>
            </>
          ) : (
            <p className="mt-2 text-lg text-muted-foreground">--</p>
          )}
        </CardContent>
      </Card>

      {/* CVaR */}
      <Card className="overflow-hidden border-2" style={{ borderColor: cvar?.classificationColor ?? 'var(--color-border)' }}>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Value at Risk
          </p>
          {cvar ? (
            <>
              <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color: cvar.classificationColor }}>
                {cvar.totalCVaRPercent.toFixed(1)}%
              </p>
              <Badge className="mt-1 text-[10px] text-white" style={{ backgroundColor: cvar.classificationColor }}>
                {cvar.classification}
              </Badge>
            </>
          ) : (
            <p className="mt-2 text-lg text-muted-foreground">--</p>
          )}
        </CardContent>
      </Card>

      {/* CSA */}
      <Card className="overflow-hidden border-2" style={{ borderColor: csa?.classificationColor ?? 'var(--color-border)' }}>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sustainability
          </p>
          {csa ? (
            <>
              <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color: csa.classificationColor }}>
                {csa.totalScore.toFixed(0)}<span className="text-sm text-muted-foreground">/100</span>
              </p>
              <Badge className="mt-1 text-[10px] text-white" style={{ backgroundColor: csa.classificationColor }}>
                {csa.classification}
              </Badge>
            </>
          ) : (
            <p className="mt-2 text-lg text-muted-foreground">--</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
