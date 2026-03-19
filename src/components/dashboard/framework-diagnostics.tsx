'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, XCircle, AlertTriangle, TrendingDown, Shield,
  Target, Factory, BarChart3, Award, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import type { PeriodResult, CapexResult, MethodData, ITRResult } from '@/lib/calc-engine/types';
import { calcSBTiAlignment } from '@/lib/calc-engine/assessment-sbti';
import { calcSelfDecarbRate, calcGreenBrownRatio, calcLockedInEmissions, calcSectorPercentile } from '@/lib/calc-engine/assessment-diagnostics';
import { calcCAPEXAlignment } from '@/lib/calc-engine/assessment-capex-alignment';
import { calcManagementQuality } from '@/lib/calc-engine/assessment-tpi';
import { calcCDPReadiness } from '@/lib/calc-engine/assessment-cdp';

interface Props {
  periods: PeriodResult[];
  capexResult?: CapexResult | null;
  methodDataMap: Record<string, MethodData>;
  financials: Record<string, number | string | boolean>;
  itrResult: ITRResult | null;
}

// ── Badge Helper ──
function StatusBadge({ status, label }: { status: 'pass' | 'partial' | 'fail' | 'none'; label: string }) {
  const styles = {
    pass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    partial: 'bg-amber-100 text-amber-700 border-amber-200',
    fail: 'bg-red-100 text-red-700 border-red-200',
    none: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const icons = {
    pass: <CheckCircle className="h-3 w-3" />,
    partial: <AlertTriangle className="h-3 w-3" />,
    fail: <XCircle className="h-3 w-3" />,
    none: <AlertTriangle className="h-3 w-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}>
      {icons[status]} {label}
    </span>
  );
}

// ── Collapsible Section ──
function CollapsibleSection({ title, subtitle, defaultOpen, children }: { title: string; subtitle: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
        <div className="text-left">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t px-5 pb-5 pt-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function FrameworkDiagnostics({ periods, capexResult, methodDataMap, financials, itrResult }: Props) {
  const fin = financials;

  const sbti = useMemo(() => calcSBTiAlignment(periods), [periods]);
  const decarb = useMemo(() => calcSelfDecarbRate(periods), [periods]);
  const greenBrown = useMemo(() => calcGreenBrownRatio(periods, {
    annualRevenue: Number(fin.annualRevenue ?? 0),
    revenueLowCarbonPercent: Number(fin.revenueLowCarbonPercent ?? 0),
  }), [periods, fin.annualRevenue, fin.revenueLowCarbonPercent]);
  const lockedIn = useMemo(() => calcLockedInEmissions(periods, methodDataMap, {
    bfBofAssetLifetime: Number(fin.bfBofAssetLifetime ?? 20),
  }), [periods, methodDataMap, fin.bfBofAssetLifetime]);
  const percentile = useMemo(() => calcSectorPercentile(periods), [periods]);
  const capexAlign = useMemo(() => calcCAPEXAlignment(periods, capexResult ?? null, methodDataMap), [periods, capexResult, methodDataMap]);
  const tpi = useMemo(() => calcManagementQuality(fin as Record<string, unknown> as Parameters<typeof calcManagementQuality>[0]), [fin]);
  const cdp = useMemo(() => calcCDPReadiness(periods, fin as Record<string, unknown> as Parameters<typeof calcCDPReadiness>[1], itrResult), [periods, fin, itrResult]);

  return (
    <div className="space-y-4">
      {/* ══════════ Tier 1: Executive Summary Strip ══════════ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* SBTi */}
        <div className="rounded-lg border bg-card p-3 text-center">
          <Target className="mx-auto h-5 w-5 mb-1" style={{ color: sbti.classificationColor }} />
          <p className="text-xs text-muted-foreground">SBTi Alignment</p>
          <StatusBadge
            status={sbti.overallClassification === 'aligned' ? 'pass' : sbti.overallClassification === 'partial' ? 'partial' : 'fail'}
            label={sbti.overallClassification === 'aligned' ? 'Aligned' : sbti.overallClassification === 'partial' ? 'Partial' : 'Not Aligned'}
          />
        </div>

        {/* 7% Decarb */}
        <div className="rounded-lg border bg-card p-3 text-center">
          <TrendingDown className="mx-auto h-5 w-5 mb-1" style={{ color: decarb.classificationColor }} />
          <p className="text-xs text-muted-foreground">7% PAB Decarb</p>
          <StatusBadge
            status={decarb.passes7Percent ? 'pass' : decarb.classification === 'marginal' ? 'partial' : 'fail'}
            label={`${decarb.annualRate}%/yr`}
          />
        </div>

        {/* Sector Percentile */}
        <div className="rounded-lg border bg-card p-3 text-center">
          <BarChart3 className="mx-auto h-5 w-5 mb-1" style={{ color: percentile.classificationColor }} />
          <p className="text-xs text-muted-foreground">Sector Rank</p>
          <p className="text-lg font-bold" style={{ color: percentile.classificationColor }}>
            {percentile.percentile}<span className="text-xs font-normal">th</span>
          </p>
        </div>

        {/* TPI Level */}
        <div className="rounded-lg border bg-card p-3 text-center">
          <Shield className="mx-auto h-5 w-5 mb-1" style={{ color: tpi.classificationColor }} />
          <p className="text-xs text-muted-foreground">TPI Level</p>
          <p className="text-lg font-bold" style={{ color: tpi.classificationColor }}>
            {tpi.level}<span className="text-xs font-normal">/4</span>
          </p>
        </div>
      </div>

      {/* ══════════ Tier 2: Investor Readiness ══════════ */}
      <CollapsibleSection title="Investor Readiness" subtitle="CDP, TPI, SBTi alignment details" defaultOpen={true}>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* SBTi Details */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" style={{ color: sbti.classificationColor }} />
                SBTi v2.0 Alignment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Near-term (≥4.2%/yr)</span>
                <StatusBadge status={sbti.nearTermAligned ? 'pass' : 'fail'} label={`${sbti.annualReductionRate}%/yr`} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Long-term (≤0.4 tCO₂)</span>
                <StatusBadge status={sbti.longTermAligned ? 'pass' : 'fail'} label={`${sbti.longTermIntensity} tCO₂`} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">{sbti.details}</p>
            </CardContent>
          </Card>

          {/* CDP Readiness */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4" style={{ color: cdp.levelColor }} />
                CDP Climate Readiness
                <span className="ml-auto text-lg font-bold" style={{ color: cdp.levelColor }}>{cdp.level}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex gap-1 flex-wrap">
                {cdp.modules.map((m) => (
                  <span key={m.name} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                    m.level === 'A' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    m.level === 'B' ? 'bg-green-50 text-green-700 border-green-200' :
                    m.level === 'C' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {m.name}: {m.level}
                  </span>
                ))}
              </div>
              {cdp.recommendations.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">To improve:</p>
                  {cdp.recommendations.slice(0, 3).map((r, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground">• {r}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* TPI Management Quality */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" style={{ color: tpi.classificationColor }} />
                TPI Management Quality
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {/* Level progress bar */}
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((l) => (
                  <div key={l} className={`h-2 flex-1 rounded-full ${l <= tpi.level ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>
              <p className="text-sm font-medium" style={{ color: tpi.classificationColor }}>
                Level {tpi.level}: {tpi.classification}
              </p>
              {/* Criteria checklist */}
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {tpi.criteria.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px]">
                    {c.met
                      ? <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                      : <XCircle className="h-3 w-3 text-red-400 shrink-0" />}
                    <span className={c.met ? 'text-foreground' : 'text-muted-foreground'}>{c.name}</span>
                    <span className="text-muted-foreground/50 ml-auto">L{c.level}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CAPEX Alignment */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Factory className="h-4 w-4" style={{ color: capexAlign.classificationColor }} />
                CAPEX Pathway Alignment
                <span className="ml-auto text-lg font-bold" style={{ color: capexAlign.classificationColor }}>{capexAlign.score}<span className="text-xs font-normal">/100</span></span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {capexAlign.totalCapex > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, capexAlign.alignedCapexPercent)}%` }} />
                    </div>
                    <span className="text-sm font-mono font-medium">{capexAlign.alignedCapexPercent}%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{capexAlign.details}</p>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">No CAPEX data available. Complete the CAPEX analysis to see alignment scoring.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </CollapsibleSection>

      {/* ══════════ Tier 3: Deep Analytics ══════════ */}
      <CollapsibleSection title="Deep Analytics" subtitle="Locked-in emissions, revenue mix, sector position" defaultOpen={false}>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Locked-in Emissions */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Locked-In Emissions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold" style={{ color: lockedIn.classificationColor }}>
                {lockedIn.bfBofShareLT}%
              </p>
              <p className="text-xs text-muted-foreground">BF-BOF share in LT period</p>
              <StatusBadge
                status={lockedIn.classification === 'low' ? 'pass' : lockedIn.classification === 'moderate' ? 'partial' : 'fail'}
                label={lockedIn.classification}
              />
              <p className="text-[11px] text-muted-foreground mt-2">{lockedIn.details}</p>
            </CardContent>
          </Card>

          {/* Green-to-Brown */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Green-to-Brown Revenue</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold" style={{ color: greenBrown.classificationColor }}>
                {greenBrown.ratio}<span className="text-sm font-normal">:1</span>
              </p>
              <p className="text-xs text-muted-foreground">Target: 4:1 for PAB</p>
              <StatusBadge
                status={greenBrown.passes4x ? 'pass' : greenBrown.ratio >= 1 ? 'partial' : 'fail'}
                label={greenBrown.classification}
              />
            </CardContent>
          </Card>

          {/* Sector Percentile */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Sector Position</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold" style={{ color: percentile.classificationColor }}>
                {percentile.percentile}<span className="text-sm font-normal">th</span>
              </p>
              <p className="text-xs text-muted-foreground">{percentile.intensityVsGlobal}× global average</p>
              <StatusBadge
                status={percentile.percentile >= 50 ? 'pass' : percentile.percentile >= 25 ? 'partial' : 'fail'}
                label={percentile.classification.replace('_', ' ')}
              />
              <p className="text-[11px] text-muted-foreground mt-2">{percentile.details}</p>
            </CardContent>
          </Card>
        </div>
      </CollapsibleSection>
    </div>
  );
}
