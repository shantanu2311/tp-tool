/**
 * Workbook Parity Validation Tests (Updated for new India steel dataset)
 *
 * These tests verify that the calculation engine produces correct outputs
 * using the new lever option model with dropdown selections.
 *
 * Key change from previous tests:
 * - Levers now have dropdown OPTIONS with individual factors (not boolean on/off)
 * - Factors are universal (same for all methods), not method-specific deltas
 * - Applicability matrix determines which levers apply to which methods
 */

import { describe, it, expect } from 'vitest';
import { getSelectedFactor } from '../lever-factors';
import { calcFinalIntensity, calcCompanyIntensity, calcPeriod } from '../method-intensity';
import { calcMethodWaterfall, calcLeverAttribution } from '../waterfall';
import { calcActualIntensity, calcInterpolatedIntensity, calcBenchmarkTrajectory } from '../trajectory';
import { calcAlignmentRatio } from '../pathway-comparison';
import { calculate } from '../index';
import type { ScenarioInput, PeriodInput, MethodData, LeverDefinition, LeverOptionData, BenchmarkPathway } from '../types';

// ============================================================
// NEW INDIA DATASET VALUES (from Methods_Library)
// ============================================================

const BF_BASE = 2.7;     // Blast Furnace – BOF
const GAS_DRI_BASE = 1.4; // Gas-DRI + EAF
const COAL_DRI_BASE = 3.0; // Coal-DRI + EAF
const SCRAP_EAF_BASE = 0.7; // Scrap-EAF
const H2_DRI_BASE = 0.4;  // Hydrogen DRI + EAF

// ============================================================
// LEVER OPTION FACTORS (from Lever_Options sheet)
// ============================================================

// RE Procurement options
const RE_NONE = 1.0;    // Current / none (default)
const RE_PARTIAL = 0.97; // Partial RE PPA
const RE_FULL = 0.92;    // 100% RE PPA

// CCS options
const CCS_NONE = 1.0;   // None (default)
const CCS_30 = 0.7;     // 30% capture
const CCS_60 = 0.4;     // 60% capture
const CCS_90 = 0.1;     // 90% capture

// Energy Efficiency
const EE_NONE = 1.0;    // None (default)
const EE_BAT = 0.95;    // BAT
const EE_ADV = 0.9;     // Advanced BAT

// Material Efficiency
const ME_NONE = 1.0;    // None (default)
const ME_MOD = 0.97;    // Moderate
const ME_AGG = 0.93;    // Aggressive

// Hydrogen Source (NOTE: Brown H2 > 1, increases emissions)
const H2S_GREY = 1.0;   // Grey H2 (default)
const H2S_BLUE = 0.8;   // Blue H2
const H2S_BROWN = 1.15; // Brown H2 (INCREASES emissions)
const H2S_GREEN = 0.55; // Green H2

// ============================================================
// TEST FIXTURES
// ============================================================

function makeOptions(specs: [string, number, boolean][]): LeverOptionData[] {
  return specs.map(([name, factor, isDefault], i) => ({
    id: `opt-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    factor,
    isDefault,
  }));
}

const leverDefs: LeverDefinition[] = [
  {
    id: 're', name: 'RE', displayName: 'RE Procurement', displayOrder: 1,
    options: makeOptions([['Current / none', 1.0, true], ['Partial RE PPA', 0.97, false], ['100% RE PPA', 0.92, false]]),
  },
  {
    id: 'ccs', name: 'CCS', displayName: 'CCS Capture Rate', displayOrder: 2,
    options: makeOptions([['None', 1.0, true], ['30% capture', 0.7, false], ['60% capture', 0.4, false], ['90% capture', 0.1, false]]),
  },
  {
    id: 'ee', name: 'EE', displayName: 'Energy Efficiency', displayOrder: 3,
    options: makeOptions([['None / current', 1.0, true], ['BAT', 0.95, false], ['Advanced BAT', 0.9, false]]),
  },
  {
    id: 'me', name: 'ME', displayName: 'Material Efficiency', displayOrder: 4,
    options: makeOptions([['None / current', 1.0, true], ['Moderate', 0.97, false], ['Aggressive', 0.93, false]]),
  },
  {
    id: 'h2_switch', name: 'H2_SWITCH', displayName: 'Hydrogen Switching', displayOrder: 5,
    options: makeOptions([['None / current', 1.0, true], ['Partial switch', 0.9, false], ['Full switch', 0.55, false]]),
  },
  {
    id: 'h2_source', name: 'H2_SOURCE', displayName: 'Hydrogen Source', displayOrder: 6,
    options: makeOptions([['Grey H2', 1.0, true], ['Blue H2', 0.8, false], ['Brown H2', 1.15, false], ['Green H2', 0.55, false]]),
  },
  {
    id: 'grid', name: 'GRID', displayName: 'Grid Decarbonisation', displayOrder: 7,
    options: makeOptions([['Current grid', 1.0, true], ['Low-carbon grid', 0.8, false], ['Near-zero grid', 0.65, false]]),
  },
  {
    id: 'yield', name: 'YIELD', displayName: 'Yield Improvement', displayOrder: 8,
    options: makeOptions([['None / current', 1.0, true], ['Moderate', 0.98, false], ['Aggressive', 0.95, false]]),
  },
];

/** Helper to get option ID by lever ID and option name */
function optId(leverId: string, optionName: string): string {
  const lever = leverDefs.find(l => l.id === leverId);
  const opt = lever?.options.find(o => o.name === optionName);
  return opt?.id ?? '';
}

/** Build default lever selections (all defaults) */
function defaultSelections(): Record<string, string> {
  const selections: Record<string, string> = {};
  for (const l of leverDefs) {
    const def = l.options.find(o => o.isDefault);
    if (def) selections[l.id] = def.id;
  }
  return selections;
}

// BF-BOF: applicable levers = RE, CCS, EE, ME, Grid, Yield (not H2_switch, H2_source)
const bfMethod: MethodData = {
  id: 'bf', name: 'Blast Furnace – BOF', baseCO2: BF_BASE, category: 'Primary integrated',
  applicableLevers: new Set(['re', 'ccs', 'ee', 'me', 'grid', 'yield']),
};

// Gas-DRI + EAF: applicable levers = RE, CCS, EE, ME, H2_switch, H2_source, Grid, Yield
const gasDriMethod: MethodData = {
  id: 'gasDri', name: 'Gas-DRI + EAF', baseCO2: GAS_DRI_BASE, category: 'Primary transition',
  applicableLevers: new Set(['re', 'ccs', 'ee', 'me', 'h2_switch', 'h2_source', 'grid', 'yield']),
};

// Scrap-EAF: applicable levers = RE, EE, ME, Grid, Yield (no CCS, no H2, no biomass)
const scrapEafMethod: MethodData = {
  id: 'scrapEaf', name: 'Scrap-EAF', baseCO2: SCRAP_EAF_BASE, category: 'Recycling',
  applicableLevers: new Set(['re', 'ee', 'me', 'grid', 'yield']),
};

const methodDataMap: Record<string, MethodData> = {
  bf: bfMethod,
  gasDri: gasDriMethod,
  scrapEaf: scrapEafMethod,
};

// ============================================================
// TESTS
// ============================================================

describe('Selected Factor Logic', () => {
  it('should return 0 when lever is not applicable', () => {
    expect(getSelectedFactor(false, 0.7, false)).toBe(0);
  });

  it('should return 0 when selected option is default', () => {
    expect(getSelectedFactor(true, 1.0, true)).toBe(0);
  });

  it('should return factor when applicable and non-default', () => {
    expect(getSelectedFactor(true, 0.7, false)).toBe(0.7);
  });

  it('should return factor > 1 when emission-increasing option selected', () => {
    // Brown H2 = 1.15
    expect(getSelectedFactor(true, 1.15, false)).toBe(1.15);
  });
});

describe('Final Intensity Calculation', () => {
  it('should return baseCO2 when all factors are 0 (all defaults)', () => {
    const result = calcFinalIntensity(BF_BASE, [0, 0, 0, 0, 0, 0, 0, 0]);
    expect(result).toBeCloseTo(BF_BASE, 4);
  });

  it('should apply single lever correctly', () => {
    // BF with 100% RE PPA (0.92): 2.7 * 0.92 = 2.484
    const factors = [0.92, 0, 0, 0, 0, 0, 0, 0];
    expect(calcFinalIntensity(BF_BASE, factors)).toBeCloseTo(2.484, 4);
  });

  it('should apply multiple levers multiplicatively', () => {
    // BF with RE=0.92, CCS 90%=0.1, BAT=0.95
    // 2.7 * 0.92 * 0.1 * 0.95 = 0.23598
    const factors = [0.92, 0.1, 0.95, 0, 0, 0, 0, 0];
    expect(calcFinalIntensity(BF_BASE, factors)).toBeCloseTo(0.23598, 4);
  });

  it('should handle factor > 1 correctly (Brown H2)', () => {
    // Gas-DRI with Brown H2 (1.15): increases intensity
    // 1.4 * 1.15 = 1.61
    const factors = [0, 0, 0, 0, 0, 1.15, 0, 0];
    expect(calcFinalIntensity(GAS_DRI_BASE, factors)).toBeCloseTo(1.61, 4);
  });
});

describe('Company Intensity (Weighted Average)', () => {
  it('should compute base year company intensity', () => {
    // BF 50% * 2.7 + Gas-DRI 25% * 1.4 + Scrap-EAF 25% * 0.7
    // = 1.35 + 0.35 + 0.175 = 1.875
    const shares = [0.5, 0.25, 0.25];
    const intensities = [2.7, 1.4, 0.7];
    expect(calcCompanyIntensity(shares, intensities)).toBeCloseTo(1.875, 4);
  });
});

describe('Full Period Calculation', () => {
  it('should compute base year period correctly (all defaults)', () => {
    const input: PeriodInput = {
      label: 'Base', year: 2026, totalProduction: 50,
      methods: [
        { methodId: 'bf', methodName: 'BF', share: 0.5, leverSelections: defaultSelections() },
        { methodId: 'gasDri', methodName: 'Gas-DRI', share: 0.25, leverSelections: defaultSelections() },
        { methodId: 'scrapEaf', methodName: 'Scrap-EAF', share: 0.25, leverSelections: defaultSelections() },
      ],
    };

    const result = calcPeriod(input, methodDataMap, leverDefs);

    // All defaults → factor = 0 for each lever → final = base
    expect(result.methods[0].finalIntensity).toBeCloseTo(BF_BASE, 4);
    expect(result.methods[1].finalIntensity).toBeCloseTo(GAS_DRI_BASE, 4);
    expect(result.methods[2].finalIntensity).toBeCloseTo(SCRAP_EAF_BASE, 4);

    // Company = 0.5*2.7 + 0.25*1.4 + 0.25*0.7 = 1.875
    expect(result.companyIntensity).toBeCloseTo(1.875, 4);
    expect(result.estimatedEmissions).toBeCloseTo(1.875 * 50, 2);
  });

  it('should compute period with levers selected', () => {
    const selections = defaultSelections();
    // Select 100% RE PPA and BAT for BF
    selections['re'] = optId('re', '100% RE PPA');
    selections['ee'] = optId('ee', 'BAT');

    const input: PeriodInput = {
      label: 'ST', year: 2030, totalProduction: 60,
      methods: [
        { methodId: 'bf', methodName: 'BF', share: 1.0, leverSelections: selections },
      ],
    };

    const result = calcPeriod(input, methodDataMap, leverDefs);

    // BF: RE=0.92, EE=0.95, all others default (0)
    // Final = 2.7 * 0.92 * 0.95 = 2.3598
    expect(result.methods[0].finalIntensity).toBeCloseTo(2.7 * 0.92 * 0.95, 4);
    expect(result.companyIntensity).toBeCloseTo(2.7 * 0.92 * 0.95, 4);
  });

  it('should ignore non-applicable lever selections', () => {
    const selections = defaultSelections();
    // Try to set H2 switching for BF (not applicable)
    selections['h2_switch'] = optId('h2_switch', 'Full switch');

    const input: PeriodInput = {
      label: 'ST', year: 2030, totalProduction: 60,
      methods: [
        { methodId: 'bf', methodName: 'BF', share: 1.0, leverSelections: selections },
      ],
    };

    const result = calcPeriod(input, methodDataMap, leverDefs);

    // H2 switching is NOT applicable to BF, so factor = 0 (treated as 1)
    // Final = 2.7 (no levers applied)
    expect(result.methods[0].finalIntensity).toBeCloseTo(BF_BASE, 4);
  });

  it('should handle Brown H2 factor > 1 correctly', () => {
    const selections = defaultSelections();
    // Select Brown H2 for Gas-DRI (increases emissions)
    selections['h2_source'] = optId('h2_source', 'Brown H2');

    const input: PeriodInput = {
      label: 'ST', year: 2030, totalProduction: 60,
      methods: [
        { methodId: 'gasDri', methodName: 'Gas-DRI', share: 1.0, leverSelections: selections },
      ],
    };

    const result = calcPeriod(input, methodDataMap, leverDefs);

    // Gas-DRI with Brown H2: 1.4 * 1.15 = 1.61
    expect(result.methods[0].finalIntensity).toBeCloseTo(1.4 * 1.15, 4);
    // Intensity should be HIGHER than base
    expect(result.methods[0].finalIntensity).toBeGreaterThan(GAS_DRI_BASE);
  });
});

describe('Waterfall Decomposition', () => {
  it('should decompose changes correctly for existing methods', () => {
    const basePeriod = {
      label: 'Base', year: 2026, totalProduction: 50,
      methods: [
        { methodId: 'bf', methodName: 'BF', share: 0.5, absoluteProduction: 25,
          baseCO2Intensity: 2.7, baseCO2Absolute: 67.5,
          leverFactors: [0, 0, 0, 0, 0, 0, 0, 0], finalIntensity: 2.7, finalAbsoluteEmissions: 67.5 },
      ],
      companyIntensity: 2.7 * 0.5,
      estimatedEmissions: 2.7 * 0.5 * 50,
    };

    const stFinal = 2.7 * 0.92 * 0.95; // RE + EE applied
    const stPeriod = {
      label: 'ST', year: 2030, totalProduction: 60,
      methods: [
        { methodId: 'bf', methodName: 'BF', share: 0.5, absoluteProduction: 30,
          baseCO2Intensity: 2.7, baseCO2Absolute: 81,
          leverFactors: [0.92, 0, 0.95, 0, 0, 0, 0, 0], finalIntensity: stFinal, finalAbsoluteEmissions: 30 * stFinal },
      ],
      companyIntensity: stFinal * 0.5,
      estimatedEmissions: stFinal * 0.5 * 60,
    };

    const wf = calcMethodWaterfall(basePeriod, stPeriod);

    // BF existing: prev_intensity = 2.7 > 0
    // Lever change = (stFinal - 2.7) * 0.5
    // Proportion change = (0.5 - 0.5) * 2.7 = 0
    expect(wf.methodRows[0].dueToMethodChange).toBeCloseTo(0, 4);
    expect(wf.methodRows[0].dueToLeverChange).toBeCloseTo((stFinal - 2.7) * 0.5, 4);
    expect(wf.methodRows[0].dueToProportionChange).toBeCloseTo(0, 4);
  });
});

describe('Lever Attribution (Log-based)', () => {
  it('should attribute intensity change proportionally by lever', () => {
    // BF with RE=0.92 and EE=0.95
    const baseCO2 = 2.7;
    const factors = [0.92, 0, 0.95, 0, 0, 0, 0, 0]; // only RE and EE active
    const finalIntensity = calcFinalIntensity(baseCO2, factors);
    const share = 0.5;

    const attrib = calcLeverAttribution(baseCO2, finalIntensity, factors, share);

    // Total change = (finalIntensity - baseCO2) * share
    const totalChange = (finalIntensity - baseCO2) * share;
    const totalAttrib = attrib.reduce((s, a) => s + a, 0);
    expect(totalAttrib).toBeCloseTo(totalChange, 6);

    // RE and EE should both have negative attribution (they reduce intensity)
    expect(attrib[0]).toBeLessThan(0); // RE
    expect(attrib[2]).toBeLessThan(0); // EE

    // Zero factors should have zero attribution
    expect(attrib[1]).toBe(0); // CCS not applied
    expect(attrib[3]).toBe(0); // ME not applied
  });

  it('should handle factor > 1 in attribution', () => {
    // Gas-DRI with Brown H2 (1.15) and Green H2 switch (0.55)
    const baseCO2 = 1.4;
    const factors = [0, 0, 0, 0, 0.55, 1.15, 0, 0]; // H2 switch + Brown H2 source
    const finalIntensity = calcFinalIntensity(baseCO2, factors);
    const share = 1.0;

    const attrib = calcLeverAttribution(baseCO2, finalIntensity, factors, share);

    // H2 switch (0.55) reduces, Brown H2 (1.15) increases
    // Net effect: 1.4 * 0.55 * 1.15 = 0.8855 (net reduction)
    // Attribution of Brown H2 should be positive (increases emissions)
    expect(attrib[5]).toBeGreaterThan(0); // Brown H2 increases
    expect(attrib[4]).toBeLessThan(0);    // H2 switching reduces

    // Total still matches
    const totalChange = (finalIntensity - baseCO2) * share;
    const totalAttrib = attrib.reduce((s, a) => s + a, 0);
    expect(totalAttrib).toBeCloseTo(totalChange, 6);
  });
});

describe('Trajectory', () => {
  it('should use step function for actual intensity', () => {
    const milestones = [
      { year: 2026, intensity: 1.875, production: 50 },
      { year: 2030, intensity: 0.5, production: 60 },
      { year: 2040, intensity: 0.3, production: 70 },
    ];

    expect(calcActualIntensity(2028, milestones)).toBeCloseTo(1.875, 4);
    expect(calcActualIntensity(2030, milestones)).toBeCloseTo(0.5, 4);
    expect(calcActualIntensity(2035, milestones)).toBeCloseTo(0.5, 4);
    expect(calcActualIntensity(2040, milestones)).toBeCloseTo(0.3, 4);
  });

  it('should use linear interpolation for interpolated intensity', () => {
    const milestones = [
      { year: 2026, intensity: 1.875, production: 50 },
      { year: 2030, intensity: 0.5, production: 60 },
    ];

    // At midpoint (2028): 1.875 + (2028-2026)/(2030-2026) * (0.5-1.875)
    // = 1.875 + 0.5 * (-1.375) = 1.875 - 0.6875 = 1.1875
    expect(calcInterpolatedIntensity(2028, milestones)).toBeCloseTo(1.1875, 4);
  });

  it('should compute benchmark trajectory correctly', () => {
    const pathway: BenchmarkPathway = {
      id: 'test', name: 'Test', annualRates: {},
    };
    for (let y = 2021; y <= 2030; y++) {
      pathway.annualRates[y] = 0.042;
    }

    const baseIntensity = 1.875;
    const result = calcBenchmarkTrajectory(baseIntensity, pathway, [2026, 2030]);

    // At 2026: cumulative = 6 years * 0.042 = 0.252
    expect(result[0]).toBeCloseTo(baseIntensity * (1 - 6 * 0.042), 4);
    // At 2030: cumulative = 10 years * 0.042 = 0.42
    expect(result[1]).toBeCloseTo(baseIntensity * (1 - 10 * 0.042), 4);
  });
});

describe('Pathway Alignment Ratio', () => {
  it('should compute alignment ratio correctly', () => {
    const baseIntensity = 1.875;
    const companyIntensity = 0.5;
    const benchmarkIntensity = 1.4;

    const ratio = calcAlignmentRatio(companyIntensity, benchmarkIntensity, baseIntensity);

    const companyChange = 0.5 / 1.875 - 1;
    const benchmarkChange = 1.4 / 1.875 - 1;
    expect(ratio).toBeCloseTo(companyChange / benchmarkChange, 4);
  });

  it('should return > 1 when company outperforms benchmark', () => {
    const ratio = calcAlignmentRatio(0.3, 1.5, 1.875);
    expect(ratio).toBeGreaterThan(1);
  });
});

describe('Full Orchestrator (calculate)', () => {
  const noLevers = defaultSelections();

  const withLevers = (() => {
    const s = defaultSelections();
    s['re'] = optId('re', '100% RE PPA');
    s['ee'] = optId('ee', 'BAT');
    s['me'] = optId('me', 'Moderate');
    return s;
  })();

  const input: ScenarioInput = {
    sectorId: 'steel',
    periods: [
      {
        label: 'Base', year: 2026, totalProduction: 50,
        methods: [
          { methodId: 'bf', methodName: 'BF', share: 0.5, leverSelections: noLevers },
          { methodId: 'gasDri', methodName: 'Gas-DRI', share: 0.25, leverSelections: noLevers },
          { methodId: 'scrapEaf', methodName: 'Scrap-EAF', share: 0.25, leverSelections: noLevers },
        ],
      },
      {
        label: 'ST', year: 2030, totalProduction: 60,
        methods: [
          { methodId: 'bf', methodName: 'BF', share: 0.5, leverSelections: withLevers },
          { methodId: 'gasDri', methodName: 'Gas-DRI', share: 0.25, leverSelections: withLevers },
          { methodId: 'scrapEaf', methodName: 'Scrap-EAF', share: 0.25, leverSelections: withLevers },
        ],
      },
    ],
    benchmarkPathways: [],
    leverDefinitions: leverDefs,
    methodDataMap,
  };

  it('should produce 2 period results', () => {
    const result = calculate(input);
    expect(result.periods).toHaveLength(2);
  });

  it('should produce 1 waterfall transition', () => {
    const result = calculate(input);
    expect(result.waterfallTransitions).toHaveLength(1);
  });

  it('should have correct base company intensity', () => {
    const result = calculate(input);
    // 0.5*2.7 + 0.25*1.4 + 0.25*0.7 = 1.875
    expect(result.periods[0].companyIntensity).toBeCloseTo(1.875, 4);
  });

  it('should show intensity reduction from base to ST', () => {
    const result = calculate(input);
    expect(result.periods[1].companyIntensity).toBeLessThan(result.periods[0].companyIntensity);
  });

  it('should have waterfall net matching actual change', () => {
    const result = calculate(input);
    const actualChange = result.periods[1].companyIntensity - result.periods[0].companyIntensity;
    expect(result.waterfallTransitions[0].totalNet).toBeCloseTo(actualChange, 3);
  });

  it('should produce trajectory points from base to long-term year', () => {
    const result = calculate(input);
    // 2 periods: 2026 and 2030 → trajectory spans 2026..2030 = 5 points
    expect(result.trajectory.length).toBe(5);
    expect(result.trajectory[0].year).toBe(2026);
    expect(result.trajectory[4].year).toBe(2030);
  });

  it('should include BAU intensity equal to base year across all trajectory points', () => {
    const result = calculate(input);
    const baseIntensity = result.periods[0].companyIntensity;
    for (const point of result.trajectory) {
      expect(point.bau).toBe(baseIntensity);
    }
  });
});
