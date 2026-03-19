/**
 * CAPEX Pathway Alignment Assessment
 *
 * Tests whether capital expenditure is aligned with a 1.5°C pathway.
 * Multiple frameworks require this: MSCI PAB, CDP Module 5, ACT Module 2,
 * Climate Action 100+ Indicator 6, Carbon Tracker.
 *
 * Key question: What % of total CAPEX goes to low-carbon methods
 * (methods with final intensity < 0.4 tCO2/tcs)?
 */

import type { PeriodResult, CapexResult, MethodData } from './types';

/** Intensity threshold below which a method is considered "low-carbon" */
const LOW_CARBON_INTENSITY_THRESHOLD = 0.4; // tCO2/tcs

export interface CAPEXAlignmentResult {
  score: number; // 0-100
  alignedCapexPercent: number;
  totalCapex: number;
  alignedCapex: number;
  misalignedCapex: number;
  classification: 'strong' | 'moderate' | 'weak' | 'none';
  classificationColor: string;
  details: string;
  byMethod: {
    methodName: string;
    capex: number;
    finalIntensity: number;
    isAligned: boolean;
  }[];
}

export function calcCAPEXAlignment(
  periods: PeriodResult[],
  capexResult: CapexResult | null | undefined,
  methodDataMap: Record<string, MethodData>
): CAPEXAlignmentResult {
  if (!capexResult || capexResult.totalCapex <= 0) {
    return {
      score: 0, alignedCapexPercent: 0, totalCapex: 0, alignedCapex: 0, misalignedCapex: 0,
      classification: 'none', classificationColor: '#9ca3af',
      details: 'No CAPEX data available', byMethod: [],
    };
  }

  const byMethod: CAPEXAlignmentResult['byMethod'] = [];
  let alignedCapex = 0;
  let misalignedCapex = 0;

  // Analyze CAPEX by method across all period transitions
  for (const transition of capexResult.transitions) {
    for (const mc of transition.methodCapex) {
      const md = methodDataMap[mc.methodId];
      if (!md) continue;

      // Find the final intensity for this method in the target period
      const targetPeriod = periods.find(p => p.label === transition.toLabel);
      const methodResult = targetPeriod?.methods.find(m => m.methodId === mc.methodId);
      const finalIntensity = methodResult?.finalIntensity ?? md.baseCO2;

      const isAligned = finalIntensity < LOW_CARBON_INTENSITY_THRESHOLD;

      if (isAligned) {
        alignedCapex += mc.totalCapex;
      } else {
        misalignedCapex += mc.totalCapex;
      }

      byMethod.push({
        methodName: mc.methodName,
        capex: Math.round(mc.totalCapex),
        finalIntensity: Math.round(finalIntensity * 1000) / 1000,
        isAligned,
      });
    }
  }

  const totalCapex = capexResult.totalCapex;
  const alignedPct = totalCapex > 0 ? (alignedCapex / totalCapex) * 100 : 0;

  // Score: linear scale 0-100, with bonus for exceeding 50%
  const score = Math.min(100, Math.round(alignedPct * 1.25)); // 80% aligned → 100 score

  let classification: CAPEXAlignmentResult['classification'];
  let color: string;
  if (alignedPct >= 60) { classification = 'strong'; color = '#059669'; }
  else if (alignedPct >= 30) { classification = 'moderate'; color = '#f59e0b'; }
  else { classification = 'weak'; color = '#ef4444'; }

  return {
    score,
    alignedCapexPercent: Math.round(alignedPct * 10) / 10,
    totalCapex: Math.round(totalCapex),
    alignedCapex: Math.round(alignedCapex),
    misalignedCapex: Math.round(misalignedCapex),
    classification,
    classificationColor: color,
    details: `${alignedPct.toFixed(1)}% of total CAPEX ($${Math.round(totalCapex)}M) is allocated to low-carbon methods (intensity < ${LOW_CARBON_INTENSITY_THRESHOLD} tCO2/tcs)`,
    byMethod,
  };
}
