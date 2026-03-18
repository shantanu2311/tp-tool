import type { PeriodMethodResult, PeriodResult, PeriodInput, MethodData, LeverDefinition } from './types';
import { getSelectedFactor } from './lever-factors';

/**
 * Calculates final intensity for a method after applying all lever factors.
 * Matches workbook array formula: =K4*(PRODUCT(IF(M4:S4=0,1,M4:S4)))
 * Zero factors are treated as 1 (no effect) in the product.
 */
export function calcFinalIntensity(baseCO2: number, leverFactors: number[]): number {
  const product = leverFactors.reduce((acc, f) => acc * (f === 0 ? 1 : f), 1);
  return baseCO2 * product;
}

/**
 * Calculates company-level intensity as weighted average.
 * Matches workbook: =SUMPRODUCT(B4:B13, T4:T13)
 */
export function calcCompanyIntensity(shares: number[], intensities: number[]): number {
  return shares.reduce((sum, s, i) => sum + s * intensities[i], 0);
}

/**
 * Calculates all results for a single period.
 */
export function calcPeriod(
  input: PeriodInput,
  methodDataMap: Record<string, MethodData>,
  leverDefs: LeverDefinition[]
): PeriodResult {
  const sortedLevers = [...leverDefs].sort((a, b) => a.displayOrder - b.displayOrder);
  const leverIds = sortedLevers.map((l) => l.id);

  const methods: PeriodMethodResult[] = input.methods
    .filter((m) => m.share > 0)
    .map((m) => {
      const data = methodDataMap[m.methodId];
      if (!data) {
        throw new Error(`Method data not found for ${m.methodId}`);
      }

      const absoluteProduction = m.share * input.totalProduction;
      const baseCO2Intensity = data.baseCO2;
      const baseCO2Absolute = absoluteProduction * baseCO2Intensity;

      // Compute lever factors from slider values (0-100%)
      const leverFactors = leverIds.map((leverId, idx) => {
        const applicable = data.applicableLevers.has(leverId);
        if (!applicable) return 0; // 0 = no effect (treated as 1 in product)

        const leverDef = sortedLevers[idx];
        const raw = parseInt(m.leverSelections[leverId] || '0', 10);
        const sliderValue = isNaN(raw) ? 0 : raw;
        if (sliderValue === 0 || !leverDef) return 0; // No effect

        // factor = 1 - (slider% / 100) * maxReduction
        return 1 - (sliderValue / 100) * (leverDef.maxReduction ?? 0);
      });

      let finalIntensity = calcFinalIntensity(baseCO2Intensity, leverFactors);
      finalIntensity = Math.max(0, finalIntensity); // Intensity cannot be negative
      const finalAbsoluteEmissions = absoluteProduction * finalIntensity;

      return {
        methodId: m.methodId,
        methodName: m.methodName,
        share: m.share,
        absoluteProduction,
        baseCO2Intensity,
        baseCO2Absolute,
        leverFactors,
        finalIntensity,
        finalAbsoluteEmissions,
      };
    });

  const shares = methods.map((m) => m.share);
  const intensities = methods.map((m) => m.finalIntensity);
  const companyIntensity = calcCompanyIntensity(shares, intensities);
  const estimatedEmissions = companyIntensity * input.totalProduction;

  return {
    label: input.label,
    year: input.year,
    totalProduction: input.totalProduction,
    methods,
    companyIntensity,
    estimatedEmissions,
  };
}
