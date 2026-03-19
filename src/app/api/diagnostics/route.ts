/**
 * Diagnostic endpoint for automated testing.
 * POST /api/diagnostics — accepts a test scenario, runs all calculations,
 * returns complete results as JSON for verification without UI.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculate } from '@/lib/calc-engine';
import { calcITR } from '@/lib/calc-engine/itr-assessment';
import { calcLCT } from '@/lib/calc-engine/lct-assessment';
import { calcCTA } from '@/lib/calc-engine/cta-assessment';
import { calcCVaR } from '@/lib/calc-engine/cvar-assessment';
import { calcCSA } from '@/lib/calc-engine/csa-assessment';
import { calcSBTiAlignment } from '@/lib/calc-engine/assessment-sbti';
import { calcSelfDecarbRate, calcGreenBrownRatio, calcLockedInEmissions, calcSectorPercentile } from '@/lib/calc-engine/assessment-diagnostics';
import { calcCAPEXAlignment } from '@/lib/calc-engine/assessment-capex-alignment';
import { calcManagementQuality } from '@/lib/calc-engine/assessment-tpi';
import { calcCDPReadiness } from '@/lib/calc-engine/assessment-cdp';
import type {
  ScenarioInput,
  PeriodInput,
  MethodData,
  LeverDefinition,
  BenchmarkPathway,
  ScenarioData,
} from '@/lib/calc-engine/types';

interface DiagnosticRequest {
  companyName: string;
  region?: string;
  periods: {
    label: string;
    year: number;
    totalProduction: number;
    methods: {
      methodName: string;
      share: number; // 0-100
      levers: Record<string, number>; // leverKey -> slider value 0-100
    }[];
  }[];
  financials?: Record<string, number | string | boolean>;
}

export async function POST(req: Request) {
  try {
    const body: DiagnosticRequest = await req.json();

    // Load sector data
    const sector = await prisma.sector.findFirst({
      where: { active: true },
      include: {
        methods: { where: { active: true }, orderBy: { displayOrder: 'asc' }, include: { applicability: true } },
        pathways: { where: { active: true }, orderBy: { displayOrder: 'asc' }, include: { annualRates: { orderBy: { year: 'asc' } } } },
      },
    });
    if (!sector) return NextResponse.json({ error: 'No sector found' }, { status: 404 });

    const levers = await prisma.lever.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    });

    // Build method data map
    const methodDataMap: Record<string, MethodData> = {};
    const methodByName: Record<string, typeof sector.methods[0]> = {};
    for (const m of sector.methods) {
      methodByName[m.name] = m;
      methodDataMap[m.id] = {
        id: m.id,
        name: m.name,
        baseCO2: m.baseCO2,
        category: m.category,
        applicableLevers: new Set(m.applicability.map((a) => a.leverId)),
      };
    }

    // Build lever definitions
    const leverByKey: Record<string, typeof levers[0]> = {};
    const leverDefs: LeverDefinition[] = levers.map((l) => {
      leverByKey[l.name] = l;
      return {
        id: l.id,
        name: l.name,
        displayName: l.displayName,
        displayOrder: l.displayOrder,
        maxReduction: l.maxReduction,
        options: l.options.map((o) => ({
          id: o.id,
          name: o.name,
          factor: o.factor,
          assumptionNote: o.assumptionNote ?? undefined,
          isDefault: o.isDefault,
        })),
      };
    });

    // Build benchmark pathways
    const pathways: BenchmarkPathway[] = sector.pathways.map((p) => {
      const annualRates: Record<number, number> = {};
      for (const ar of p.annualRates) annualRates[ar.year] = ar.rate;
      return { id: p.id, name: p.name, annualRates };
    });

    // Resolve periods
    const resolvedPeriods: PeriodInput[] = body.periods.map((p) => ({
      label: p.label,
      year: p.year,
      totalProduction: p.totalProduction,
      methods: p.methods.map((pm) => {
        const md = methodByName[pm.methodName];
        if (!md) throw new Error(`Unknown method: ${pm.methodName}`);

        const leverSelections: Record<string, string> = {};
        for (const [leverKey, sliderValue] of Object.entries(pm.levers)) {
          const lever = leverByKey[leverKey];
          if (lever) leverSelections[lever.id] = String(sliderValue);
        }

        return {
          methodId: md.id,
          methodName: md.name,
          share: pm.share / 100,
          leverSelections,
        };
      }),
    }));

    // Run main calculation
    const input: ScenarioInput = {
      sectorId: sector.id,
      periods: resolvedPeriods,
      benchmarkPathways: pathways,
      leverDefinitions: leverDefs,
      methodDataMap,
    };

    const result = calculate(input);

    // Run assessments
    const itr = calcITR(result.periods);

    const fin = body.financials ?? {};
    const lct = calcLCT(result.periods, {
      capexLowCarbonPercent: Number(fin.capexLowCarbonPercent ?? 5),
      emissionTargetType: String(fin.emissionTargetType ?? 'none'),
      hasBoardClimateOversight: Boolean(fin.hasBoardClimateOversight ?? false),
      netZeroYear: Number(fin.netZeroYear ?? 0) || undefined,
    });

    const cta = calcCTA(result.periods, itr, {
      capexLowCarbonPercent: Number(fin.capexLowCarbonPercent ?? 5),
      revenueLowCarbonPercent: Number(fin.revenueLowCarbonPercent ?? 5),
      emissionTargetType: String(fin.emissionTargetType ?? 'none'),
      hasBoardClimateOversight: Boolean(fin.hasBoardClimateOversight ?? false),
      netZeroYear: Number(fin.netZeroYear ?? 0) || undefined,
      interimTargetYear: Number(fin.interimTargetYear ?? 0) || undefined,
      interimTargetReduction: Number(fin.interimTargetReduction ?? 0) || undefined,
    });

    // Load scenarios for CVaR
    const scenarioFamilies = await prisma.scenarioFamily.findMany({
      include: {
        scenarios: {
          where: { active: true },
          include: { dataPoints: { orderBy: { year: 'asc' } }, carbonPrices: { orderBy: { year: 'asc' } } },
        },
      },
    });
    const allScenarios: ScenarioData[] = scenarioFamilies.flatMap((f) =>
      f.scenarios.map((sc) => ({
        id: sc.id,
        familyName: f.name,
        name: sc.name,
        shortName: sc.shortName,
        temperatureOutcome: sc.temperatureOutcome,
        riskCategory: sc.riskCategory as ScenarioData['riskCategory'],
        description: sc.description ?? undefined,
        isDefault: sc.isDefault,
        dataPoints: sc.dataPoints.map((dp) => ({ year: dp.year, intensity: dp.intensity })),
        carbonPrices: sc.carbonPrices.map((cp) => ({ year: cp.year, priceUSD: cp.priceUSD })),
      }))
    );

    const cvar = calcCVaR(result.periods, allScenarios, itr, {
      enterpriseValue: Number(fin.enterpriseValue ?? 1000),
      annualRevenue: Number(fin.annualRevenue ?? 500),
      wacc: Number(fin.wacc ?? 10),
      greenPremiumPercent: Number(fin.greenPremiumPercent ?? 20),
      revenueLowCarbonPercent: Number(fin.revenueLowCarbonPercent ?? 5),
    });

    const csa = calcCSA(result.periods, itr, lct, cta, cvar, {
      emissionTargetType: String(fin.emissionTargetType ?? 'none'),
      netZeroYear: Number(fin.netZeroYear ?? 0) || undefined,
      capexLowCarbonPercent: Number(fin.capexLowCarbonPercent ?? 5),
      revenueLowCarbonPercent: Number(fin.revenueLowCarbonPercent ?? 5),
      hasBoardClimateOversight: Boolean(fin.hasBoardClimateOversight ?? false),
    });

    // Build summary
    const summary = {
      company: body.companyName,
      region: body.region ?? 'global',
      periodSummary: result.periods.map((p) => ({
        label: p.label,
        year: p.year,
        intensity: Number(p.companyIntensity.toFixed(4)),
        totalEmissions: Number((p.companyIntensity * p.totalProduction).toFixed(2)),
        production: p.totalProduction,
        methodCount: p.methods.length,
      })),
      totalReduction: result.periods.length >= 2
        ? Number((((result.periods[0].companyIntensity - result.periods[result.periods.length - 1].companyIntensity) / result.periods[0].companyIntensity) * 100).toFixed(1))
        : 0,
      pathwayAlignment: result.pathwayComparisons.map((pc) => ({
        pathway: pc.pathwayName,
        ratios: pc.alignmentRatios,
        milestones: pc.milestoneIntensities,
      })),
      assessments: {
        itr: {
          temperature: Number(itr.impliedTemperature.toFixed(2)),
          classification: itr.classification,
          companyBudgetMt: Number(itr.companyBudgetMt.toFixed(2)),
          cumulativeEmissionsMt: Number(itr.cumulativeEmissionsMt.toFixed(2)),
          overshootMt: Number(itr.overshootMt.toFixed(2)),
        },
        lct: {
          score: Number(lct.totalScore.toFixed(1)),
          classification: lct.classification,
          categories: lct.categories.map((c) => ({ name: c.name, score: c.score, max: c.maxScore })),
        },
        cta: {
          shade: cta.shade,
          label: cta.shadeLabel,
          weightedScore: Number(cta.weightedScore.toFixed(2)),
          criteria: cta.criteria.map((c) => ({ name: c.name, score: Number(c.score.toFixed(2)), weight: c.weight })),
        },
        cvar: {
          totalPercent: Number(cvar.totalCVaRPercent.toFixed(2)),
          classification: cvar.classification,
          policyRiskNPV: Number(cvar.policyRisk.npv.toFixed(0)),
          techOpportunityNPV: Number(cvar.techOpportunity.npv.toFixed(0)),
          physicalRiskDamage: Number(cvar.physicalRisk.estimatedDamage.toFixed(0)),
        },
        csa: {
          score: Number(csa.totalScore.toFixed(1)),
          classification: csa.classification,
          dimensions: csa.dimensions.map((d) => ({ name: d.name, score: Number(d.score.toFixed(1)), weight: d.weight })),
        },
      },
      // Framework diagnostics (Sprint 1)
      frameworkDiagnostics: (() => {
        const sbti = calcSBTiAlignment(result.periods);
        const decarb = calcSelfDecarbRate(result.periods);
        const greenBrown = calcGreenBrownRatio(result.periods, {
          annualRevenue: Number(fin.annualRevenue ?? 500),
          revenueLowCarbonPercent: Number(fin.revenueLowCarbonPercent ?? 5),
        });
        const lockedIn = calcLockedInEmissions(result.periods, methodDataMap, {
          bfBofAssetLifetime: Number(fin.bfBofAssetLifetime ?? 20),
        });
        const percentile = calcSectorPercentile(result.periods);
        const capexAlign = calcCAPEXAlignment(result.periods, result.capex ?? null, methodDataMap);

        return {
          sbti: { classification: sbti.overallClassification, nearTerm: sbti.nearTermAligned, longTerm: sbti.longTermAligned, annualRate: sbti.annualReductionRate, required: sbti.requiredRate, details: sbti.details },
          selfDecarb: { rate: decarb.annualRate, passes7pct: decarb.passes7Percent, classification: decarb.classification },
          greenBrown: { ratio: greenBrown.ratio, passes4x: greenBrown.passes4x, classification: greenBrown.classification },
          lockedIn: { mt: lockedIn.lockedInMt, bfBofShareLT: lockedIn.bfBofShareLT, classification: lockedIn.classification },
          sectorPercentile: { percentile: percentile.percentile, vsGlobal: percentile.intensityVsGlobal, classification: percentile.classification },
          capexAlignment: { score: capexAlign.score, alignedPct: capexAlign.alignedCapexPercent, classification: capexAlign.classification },

          // Sprint 2: Investor Readiness
          tpiLevel: (() => {
            const tpi = calcManagementQuality(fin);
            return { level: tpi.level, classification: tpi.classification, nextNeeded: tpi.nextLevelCriteria };
          })(),
          cdpReadiness: (() => {
            const cdp = calcCDPReadiness(result.periods, fin, itr);
            return { level: cdp.level, label: cdp.levelLabel, score: cdp.score, modules: cdp.modules.map(m => m.name + '=' + m.level), recommendations: cdp.recommendations };
          })(),
        };
      })(),
      waterfallTransitions: result.waterfallTransitions.length,
      trajectoryPoints: result.trajectory.length,
    };

    return NextResponse.json(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
