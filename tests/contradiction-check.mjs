// Contradiction analysis across benchmarking, scenarios, and assessments

const BF = 'Blast Furnace \u2013 BOF';

async function test(name, payload) {
  const r = await fetch('http://localhost:3000/api/diagnostics', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const d = await r.json();
  if (d.error) { console.log(`=== ${name} === ERROR: ${d.error}`); return; }

  const reduction = d.totalReduction;
  const p15 = d.pathwayAlignment.find(p => p.pathway.includes('1.5'));
  const pIEA = d.pathwayAlignment.find(p => p.pathway.includes('IEA'));
  const p2C = d.pathwayAlignment.find(p => p.pathway.includes('2\u00b0C'));

  console.log(`=== ${name} ===`);
  console.log(`  Intensity: ${d.periodSummary[0].intensity} -> ${d.periodSummary[d.periodSummary.length-1].intensity} (${reduction}% reduction)`);
  console.log(`  BENCHMARKING:`);
  if(p15) console.log(`    1.5C: ST=${p15.ratios.ST?.toFixed(2)} MT=${p15.ratios.MT?.toFixed(2)} LT=${p15.ratios.LT?.toFixed(2)} ${p15.ratios.LT>=1?'ALIGNED':'MISALIGNED'}`);
  if(pIEA) console.log(`    IEA:  ST=${pIEA.ratios.ST?.toFixed(2)} MT=${pIEA.ratios.MT?.toFixed(2)} LT=${pIEA.ratios.LT?.toFixed(2)} ${pIEA.ratios.LT>=1?'ALIGNED':'MISALIGNED'}`);
  if(p2C) console.log(`    2C:   ST=${p2C.ratios.ST?.toFixed(2)} MT=${p2C.ratios.MT?.toFixed(2)} LT=${p2C.ratios.LT?.toFixed(2)} ${p2C.ratios.LT>=1?'ALIGNED':'MISALIGNED'}`);
  console.log(`  ASSESSMENTS:`);
  console.log(`    ITR: ${d.assessments.itr.temperature}C ${d.assessments.itr.classification}`);
  console.log(`    LCT: ${d.assessments.lct.score}/10 ${d.assessments.lct.classification}`);
  console.log(`    CTA: ${d.assessments.cta.shade} (${d.assessments.cta.weightedScore})`);
  console.log(`    CVaR: ${d.assessments.cvar.totalPercent}% ${d.assessments.cvar.classification}`);
  console.log(`    CSA: ${d.assessments.csa.score}/100 ${d.assessments.csa.classification}`);

  const flags = [];

  // Benchmark vs ITR contradictions
  if (p15 && p15.ratios.LT >= 0.7 && d.assessments.itr.temperature > 2.5)
    flags.push(`BENCHMARK vs ITR: LT 1.5C ratio=${p15.ratios.LT.toFixed(2)} (near-aligned) but ITR=${d.assessments.itr.temperature}C`);
  if (pIEA && pIEA.ratios.ST >= 1.0 && pIEA.ratios.MT >= 0.7 && d.assessments.itr.temperature > 2.5)
    flags.push(`BENCHMARK vs ITR: IEA NZE aligned (ST=${pIEA.ratios.ST.toFixed(2)}) but ITR=${d.assessments.itr.temperature}C`);

  // LCT vs CTA contradictions
  if (d.assessments.lct.score >= 7 && d.assessments.cta.weightedScore < 40)
    flags.push(`LCT vs CTA: LCT=${d.assessments.lct.score}/10 (${d.assessments.lct.classification}) but CTA=${d.assessments.cta.shade} (${d.assessments.cta.weightedScore})`);
  if (d.assessments.lct.score <= 3 && d.assessments.cta.weightedScore >= 55)
    flags.push(`LCT vs CTA: LCT=${d.assessments.lct.score}/10 (bad) but CTA=${d.assessments.cta.weightedScore} (decent)`);

  // ITR vs CVaR contradictions
  if (d.assessments.itr.temperature <= 2.0 && d.assessments.cvar.totalPercent > 100)
    flags.push(`ITR vs CVaR: ITR=${d.assessments.itr.temperature}C (good) but CVaR=${d.assessments.cvar.totalPercent}% (critical)`);
  if (d.assessments.itr.temperature > 3.0 && d.assessments.cvar.totalPercent < 0)
    flags.push(`ITR vs CVaR: ITR=${d.assessments.itr.temperature}C (bad) but CVaR=${d.assessments.cvar.totalPercent}% (opportunity?)`);

  // CVaR vs CTA
  if (d.assessments.cvar.totalPercent < 0 && d.assessments.cta.shade !== 'dark_green' && d.assessments.cta.shade !== 'green')
    flags.push(`CVaR vs CTA: CVaR=${d.assessments.cvar.totalPercent}% (net opportunity) but CTA=${d.assessments.cta.shade}`);

  // CSA vs ITR
  if (d.assessments.csa.score >= 60 && d.assessments.itr.temperature > 3.5)
    flags.push(`CSA vs ITR: CSA=${d.assessments.csa.score} (strong) but ITR=${d.assessments.itr.temperature}C (bad)`);

  // Reduction vs assessments
  if (reduction >= 70 && d.assessments.csa.score < 45)
    flags.push(`REDUCTION vs CSA: ${reduction}% intensity reduction but CSA only ${d.assessments.csa.score}/100`);
  if (reduction >= 70 && d.assessments.cta.shade === 'red')
    flags.push(`REDUCTION vs CTA: ${reduction}% reduction but CTA=red`);
  if (reduction < 20 && d.assessments.cta.shade === 'dark_green')
    flags.push(`REDUCTION vs CTA: Only ${reduction}% reduction but CTA=dark_green`);

  // Benchmark vs CTA
  if (p2C && p2C.ratios.LT >= 1.0 && (d.assessments.cta.shade === 'red' || d.assessments.cta.shade === 'orange'))
    flags.push(`BENCHMARK vs CTA: 2C aligned (LT ratio ${p2C.ratios.LT.toFixed(2)}) but CTA=${d.assessments.cta.shade}`);

  if (flags.length > 0) {
    console.log(`  ** ${flags.length} CONTRADICTIONS:`);
    flags.forEach(f => console.log(`    - ${f}`));
  } else {
    console.log(`  ** No contradictions detected`);
  }
  console.log('');
}

// === TEST CASES ===

// 1. Growing company with strong intensity reduction
await test('Tata Steel (growing, 78% reduction)', {
  companyName: 'Tata', region: 'india',
  periods: [
    { label: 'Base', year: 2024, totalProduction: 18.6, methods: [{ methodName: BF, share: 85, levers: {} }, { methodName: 'Scrap-EAF', share: 15, levers: {} }] },
    { label: 'ST', year: 2030, totalProduction: 25, methods: [{ methodName: BF, share: 70, levers: { CCS: 30, RE: 20, EE: 15 } }, { methodName: 'Gas-DRI + EAF', share: 15, levers: { RE: 30, H2_SWITCH: 30 } }, { methodName: 'Scrap-EAF', share: 15, levers: { RE: 40 } }] },
    { label: 'MT', year: 2040, totalProduction: 30, methods: [{ methodName: BF, share: 50, levers: { CCS: 60, RE: 40, EE: 20 } }, { methodName: 'Gas-DRI + EAF', share: 30, levers: { RE: 50, H2_SWITCH: 60, H2_SOURCE: 50 } }, { methodName: 'Scrap-EAF', share: 20, levers: { RE: 60, EE: 20 } }] },
    { label: 'LT', year: 2050, totalProduction: 35, methods: [{ methodName: BF, share: 30, levers: { CCS: 90, RE: 60, EE: 30 } }, { methodName: 'Gas-DRI + EAF', share: 40, levers: { RE: 80, H2_SWITCH: 100, H2_SOURCE: 80 } }, { methodName: 'Scrap-EAF', share: 30, levers: { RE: 80, EE: 30 } }] }
  ],
  financials: { enterpriseValue: 25000, annualRevenue: 25000, wacc: 12, capexLowCarbonPercent: 3, revenueLowCarbonPercent: 2, emissionTargetType: 'public', hasBoardClimateOversight: true, netZeroYear: 2045 }
});

// 2. Shrinking production, strong transition
await test('ArcelorMittal (shrinking, 81% reduction)', {
  companyName: 'AM', region: 'eu',
  periods: [
    { label: 'Base', year: 2024, totalProduction: 68, methods: [{ methodName: BF, share: 75, levers: {} }, { methodName: 'Gas-DRI + EAF', share: 15, levers: {} }, { methodName: 'Scrap-EAF', share: 10, levers: {} }] },
    { label: 'ST', year: 2030, totalProduction: 65, methods: [{ methodName: BF, share: 55, levers: { CCS: 40, RE: 30, EE: 20 } }, { methodName: 'Gas-DRI + EAF', share: 25, levers: { RE: 40, H2_SWITCH: 50, H2_SOURCE: 30 } }, { methodName: 'Scrap-EAF', share: 20, levers: { RE: 50, EE: 20 } }] },
    { label: 'MT', year: 2040, totalProduction: 60, methods: [{ methodName: BF, share: 30, levers: { CCS: 80, RE: 50, EE: 30 } }, { methodName: 'Gas-DRI + EAF', share: 40, levers: { RE: 70, H2_SWITCH: 80, H2_SOURCE: 70 } }, { methodName: 'Scrap-EAF', share: 30, levers: { RE: 70, EE: 30 } }] },
    { label: 'LT', year: 2050, totalProduction: 55, methods: [{ methodName: BF, share: 10, levers: { CCS: 90, RE: 70, EE: 30 } }, { methodName: 'Gas-DRI + EAF', share: 55, levers: { RE: 90, H2_SWITCH: 100, H2_SOURCE: 90 } }, { methodName: 'Scrap-EAF', share: 35, levers: { RE: 90, EE: 30, GRID: 80 } }] }
  ],
  financials: { enterpriseValue: 40000, annualRevenue: 65000, wacc: 9, capexLowCarbonPercent: 12, revenueLowCarbonPercent: 8, emissionTargetType: 'science_based', hasBoardClimateOversight: true, netZeroYear: 2050 }
});

// 3. Near-zero leader - complete tech shift, no BF-BOF in LT
await test('Near-Zero Leader (95% reduction, full tech shift)', {
  companyName: 'NZLeader', region: 'eu',
  periods: [
    { label: 'Base', year: 2026, totalProduction: 5, methods: [{ methodName: BF, share: 70, levers: {} }, { methodName: 'Scrap-EAF', share: 30, levers: {} }] },
    { label: 'ST', year: 2030, totalProduction: 5, methods: [{ methodName: BF, share: 30, levers: { CCS: 60, RE: 50 } }, { methodName: 'Gas-DRI + EAF', share: 40, levers: { RE: 60, H2_SWITCH: 60, H2_SOURCE: 50 } }, { methodName: 'Scrap-EAF', share: 30, levers: { RE: 60, EE: 20 } }] },
    { label: 'MT', year: 2040, totalProduction: 5, methods: [{ methodName: 'Gas-DRI + EAF', share: 60, levers: { RE: 80, H2_SWITCH: 100, H2_SOURCE: 80 } }, { methodName: 'Scrap-EAF', share: 40, levers: { RE: 80, EE: 30 } }] },
    { label: 'LT', year: 2050, totalProduction: 5, methods: [{ methodName: 'Gas-DRI + EAF', share: 65, levers: { RE: 95, H2_SWITCH: 100, H2_SOURCE: 95, EE: 30 } }, { methodName: 'Scrap-EAF', share: 35, levers: { RE: 95, EE: 30, GRID: 90 } }] }
  ],
  financials: { enterpriseValue: 5000, annualRevenue: 3500, wacc: 8, capexLowCarbonPercent: 25, revenueLowCarbonPercent: 15, emissionTargetType: 'science_based', hasBoardClimateOversight: true, netZeroYear: 2045, interimTargetYear: 2030, interimTargetReduction: 50 }
});

// 4. Moderate transition - 50% reduction, still BF-BOF heavy
await test('Moderate Steelmaker (50% reduction, 45% BF-BOF LT)', {
  companyName: 'Moderate', region: 'global',
  periods: [
    { label: 'Base', year: 2026, totalProduction: 15, methods: [{ methodName: BF, share: 100, levers: {} }] },
    { label: 'ST', year: 2030, totalProduction: 15, methods: [{ methodName: BF, share: 85, levers: { CCS: 20, RE: 15 } }, { methodName: 'Scrap-EAF', share: 15, levers: { RE: 30 } }] },
    { label: 'MT', year: 2040, totalProduction: 15, methods: [{ methodName: BF, share: 65, levers: { CCS: 40, RE: 30, EE: 15 } }, { methodName: 'Gas-DRI + EAF', share: 20, levers: { RE: 40, H2_SWITCH: 40 } }, { methodName: 'Scrap-EAF', share: 15, levers: { RE: 50 } }] },
    { label: 'LT', year: 2050, totalProduction: 15, methods: [{ methodName: BF, share: 45, levers: { CCS: 60, RE: 40, EE: 20 } }, { methodName: 'Gas-DRI + EAF', share: 30, levers: { RE: 60, H2_SWITCH: 60, H2_SOURCE: 40 } }, { methodName: 'Scrap-EAF', share: 25, levers: { RE: 70, EE: 20 } }] }
  ],
  financials: { enterpriseValue: 8000, annualRevenue: 8000, wacc: 10, capexLowCarbonPercent: 5, revenueLowCarbonPercent: 3, emissionTargetType: 'internal', hasBoardClimateOversight: false, netZeroYear: 2060 }
});

// 5. Pure Recycler
await test('Pure Recycler (already clean, 35% reduction)', {
  companyName: 'Recycler', region: 'us',
  periods: [
    { label: 'Base', year: 2026, totalProduction: 2, methods: [{ methodName: 'Scrap-EAF', share: 100, levers: {} }] },
    { label: 'ST', year: 2030, totalProduction: 2.5, methods: [{ methodName: 'Scrap-EAF', share: 100, levers: { RE: 60, EE: 20, SCRAP: 10 } }] },
    { label: 'MT', year: 2040, totalProduction: 3, methods: [{ methodName: 'Scrap-EAF', share: 100, levers: { RE: 80, EE: 30, SCRAP: 20 } }] },
    { label: 'LT', year: 2050, totalProduction: 3.5, methods: [{ methodName: 'Scrap-EAF', share: 100, levers: { RE: 90, EE: 30, SCRAP: 20, GRID: 80 } }] }
  ],
  financials: { enterpriseValue: 500, annualRevenue: 300, wacc: 10, capexLowCarbonPercent: 15, revenueLowCarbonPercent: 10, emissionTargetType: 'science_based', hasBoardClimateOversight: true, netZeroYear: 2040 }
});

// 6. India laggard
await test('India Laggard (20% reduction, growing, no targets)', {
  companyName: 'Laggard', region: 'india',
  periods: [
    { label: 'Base', year: 2026, totalProduction: 8, methods: [{ methodName: BF, share: 95, levers: {} }, { methodName: 'Scrap-EAF', share: 5, levers: {} }] },
    { label: 'ST', year: 2030, totalProduction: 10, methods: [{ methodName: BF, share: 90, levers: { EE: 10 } }, { methodName: 'Scrap-EAF', share: 10, levers: {} }] },
    { label: 'MT', year: 2040, totalProduction: 12, methods: [{ methodName: BF, share: 85, levers: { EE: 15, RE: 10 } }, { methodName: 'Scrap-EAF', share: 15, levers: { RE: 20 } }] },
    { label: 'LT', year: 2050, totalProduction: 15, methods: [{ methodName: BF, share: 80, levers: { EE: 20, RE: 15, CCS: 10 } }, { methodName: 'Scrap-EAF', share: 20, levers: { RE: 30 } }] }
  ],
  financials: { enterpriseValue: 5000, annualRevenue: 4000, wacc: 14, capexLowCarbonPercent: 1, revenueLowCarbonPercent: 1, emissionTargetType: 'none', hasBoardClimateOversight: false }
});
