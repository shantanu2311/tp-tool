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

// Short one-line explanations for each metric
const METRIC_EXPLANATIONS = {
  itr: 'What global warming your emissions trajectory implies if all companies behaved similarly',
  lct: 'How prepared the company is for a low-carbon transition (targets, technology, governance)',
  cta: 'Quality and credibility of the transition plan — from Dark Green (exemplary) to Red (inadequate)',
  cvar: 'Net financial impact of climate risks and opportunities as % of enterprise value',
  csa: 'Overall sustainability maturity across environmental, social, and governance dimensions',
};

export function AssessmentSummary({ itr, lct, cta, cvar, csa }: AssessmentSummaryProps) {
  // Generate overall narrative
  const narrative = generateNarrative(itr, lct, cta, cvar, csa);

  return (
    <div className="space-y-3">
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
            <p className="mt-2 text-[9px] text-muted-foreground/70 leading-tight">{METRIC_EXPLANATIONS.itr}</p>
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
            <p className="mt-2 text-[9px] text-muted-foreground/70 leading-tight">{METRIC_EXPLANATIONS.lct}</p>
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
            <p className="mt-2 text-[9px] text-muted-foreground/70 leading-tight">{METRIC_EXPLANATIONS.cta}</p>
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
                  {Math.abs(cvar.totalCVaRPercent) > 999 ? '>999' : cvar.totalCVaRPercent.toFixed(1)}%
                </p>
                <Badge className="mt-1 text-[10px] text-white" style={{ backgroundColor: cvar.classificationColor }}>
                  {cvar.classification}
                </Badge>
              </>
            ) : (
              <p className="mt-2 text-lg text-muted-foreground">--</p>
            )}
            <p className="mt-2 text-[9px] text-muted-foreground/70 leading-tight">{METRIC_EXPLANATIONS.cvar}</p>
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
            <p className="mt-2 text-[9px] text-muted-foreground/70 leading-tight">{METRIC_EXPLANATIONS.csa}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Narrative */}
      {narrative && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-sm leading-relaxed text-foreground">{narrative}</p>
        </div>
      )}
    </div>
  );
}

/** Generate a plain-English narrative summarizing all 5 assessments */
function generateNarrative(
  itr: ITRResult | null,
  lct: LCTResult | null,
  cta: CTAResult | null,
  cvar: CVaRResult | null,
  csa: CSAResult | null,
): string | null {
  if (!itr || !lct || !cta) return null;

  const temp = itr.impliedTemperature;
  const readiness = lct.totalScore;
  const shade = cta.shadeLabel;
  const risk = cvar?.totalCVaRPercent ?? 0;
  const maturity = csa?.totalScore ?? 0;

  let summary = '';

  // Temperature narrative
  if (temp <= 1.5) {
    summary += `This transition plan is aligned with the Paris Agreement's 1.5°C goal. `;
  } else if (temp <= 2.0) {
    summary += `The plan is broadly consistent with a 2°C pathway but falls short of the more ambitious 1.5°C target. `;
  } else if (temp <= 3.0) {
    summary += `At ${temp.toFixed(1)}°C, this plan exceeds the Paris Agreement targets and represents material transition risk. `;
  } else {
    summary += `At ${temp.toFixed(1)}°C, this plan is severely misaligned with global climate goals and poses significant regulatory and financial risk. `;
  }

  // Readiness + plan quality
  if (readiness >= 7 && (shade === 'Dark Green' || shade === 'Green')) {
    summary += `The company shows strong transition readiness (${readiness}/10) with a credible plan (${shade}). `;
  } else if (readiness >= 5) {
    summary += `Transition readiness is moderate (${readiness}/10) with a ${shade.toLowerCase()} plan quality rating. `;
  } else {
    summary += `Transition readiness is low (${readiness}/10) and the plan quality is rated ${shade}. Significant improvements in targets, governance, and technology adoption are needed. `;
  }

  // Financial risk
  if (cvar) {
    if (risk < 0) {
      summary += `Climate transition represents a net financial opportunity (CVaR ${risk.toFixed(0)}%), as technology gains outweigh carbon costs. `;
    } else if (risk <= 15) {
      summary += `Climate-related financial risk is moderate at ${risk.toFixed(0)}% of enterprise value. `;
    } else if (risk <= 50) {
      summary += `Climate financial exposure is significant at ${risk.toFixed(0)}% of EV, driven primarily by carbon pricing costs. `;
    } else {
      summary += `Climate financial risk is critical (${risk > 999 ? '>999' : risk.toFixed(0)}% of EV), indicating potential for substantial value erosion under transition scenarios. `;
    }
  }

  return summary.trim();
}
