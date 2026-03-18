import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data in correct order (foreign key deps)
  await prisma.scenarioCarbonPrice.deleteMany();
  await prisma.scenarioDataPoint.deleteMany();
  await prisma.climateScenario.deleteMany();
  await prisma.scenarioFamily.deleteMany();
  await prisma.pathwayAnnualRate.deleteMany();
  await prisma.benchmarkPathway.deleteMany();
  await prisma.methodLeverApplicability.deleteMany();
  await prisma.leverOption.deleteMany();
  await prisma.productionMethod.deleteMany();
  await prisma.lever.deleteMany();
  await prisma.sector.deleteMany();

  // ── Sector ────────────────────────────────────────────────────────────
  const steel = await prisma.sector.create({
    data: { name: 'Steel', description: 'Iron and steel production sector' },
  });

  // ── 14 Levers ─────────────────────────────────────────────────────────
  const leverDefs = [
    { name: 'RE', displayName: 'RE Procurement', displayOrder: 1, maxReduction: 0.08 },
    { name: 'CCS', displayName: 'CCS Capture Rate', displayOrder: 2, maxReduction: 0.90 },
    { name: 'EE', displayName: 'Energy Efficiency', displayOrder: 3, maxReduction: 0.10 },
    { name: 'ME', displayName: 'Material Efficiency', displayOrder: 4, maxReduction: 0.07 },
    { name: 'H2_SWITCH', displayName: 'Hydrogen Switching', displayOrder: 5, maxReduction: 0.45 },
    { name: 'H2_SOURCE', displayName: 'Hydrogen Source', displayOrder: 6, maxReduction: 0.45 },
    { name: 'BIOMASS', displayName: 'Biomass Substitution', displayOrder: 7, maxReduction: 0.15 },
    { name: 'SCRAP', displayName: 'Scrap Ratio Increase', displayOrder: 8, maxReduction: 0.12 },
    { name: 'RAW_MAT', displayName: 'Raw Material Quality', displayOrder: 9, maxReduction: 0.06 },
    { name: 'WHR', displayName: 'Waste Heat Recovery', displayOrder: 10, maxReduction: 0.08 },
    { name: 'COKE', displayName: 'Coke Replacement', displayOrder: 11, maxReduction: 0.10 },
    { name: 'TGR', displayName: 'Top Gas Recycling', displayOrder: 12, maxReduction: 0.15 },
    { name: 'GRID', displayName: 'Grid Decarbonisation', displayOrder: 13, maxReduction: 0.35 },
    { name: 'YIELD', displayName: 'Yield Improvement', displayOrder: 14, maxReduction: 0.05 },
  ];

  const levers: Record<string, string> = {};
  for (const l of leverDefs) {
    const lever = await prisma.lever.create({ data: l });
    levers[l.name] = lever.id;
  }

  // ── Lever Options ─────────────────────────────────────────────────────
  // Format: [leverName, [[optionName, factor, assumptionNote, isDefault], ...]]
  const leverOptions: [string, [string, number, string, boolean][]][] = [
    ['RE', [
      ['Current / none', 1, 'No dedicated renewable electricity procurement beyond current grid mix', true],
      ['Partial RE PPA', 0.97, 'Assumes partial renewable electricity procurement or wheeling for process electricity needs', false],
      ['100% RE PPA', 0.92, 'Assumes dedicated renewable electricity procurement for process and auxiliary electricity needs', false],
    ]],
    ['CCS', [
      ['None', 1, 'No carbon capture', true],
      ['30% capture', 0.7, 'Assumes capture applied to direct/process emissions portion of the route with 30% capture rate', false],
      ['60% capture', 0.4, 'Assumes medium capture system performance', false],
      ['90% capture', 0.1, 'Assumes high-performance capture on capturable emissions', false],
    ]],
    ['EE', [
      ['None / current', 1, 'No incremental efficiency improvement beyond baseline', true],
      ['BAT', 0.95, 'Assumes best available technology upgrade package', false],
      ['Advanced BAT', 0.9, 'Assumes aggressive efficiency upgrades and operations improvement', false],
    ]],
    ['ME', [
      ['None / current', 1, 'No additional material efficiency or design optimisation', true],
      ['Moderate', 0.97, 'Assumes moderate reduction in virgin steel requirement / improved design', false],
      ['Aggressive', 0.93, 'Assumes strong material efficiency and product-design optimisation', false],
    ]],
    ['H2_SWITCH', [
      ['None / current', 1, 'No additional hydrogen substitution beyond baseline route', true],
      ['Partial switch', 0.9, 'Assumes partial fossil reductant replacement with hydrogen', false],
      ['High switch', 0.75, 'Assumes high hydrogen substitution short of full route conversion', false],
      ['Full switch', 0.55, 'Assumes route-level hydrogen use subject to hydrogen-source lever', false],
    ]],
    ['H2_SOURCE', [
      ['Grey H2', 1, 'Hydrogen produced from unabated fossil gas', true],
      ['Blue H2', 0.8, 'Hydrogen produced from fossil feedstock with CCS', false],
      ['Brown H2', 1.15, 'Hydrogen produced from coal or high-emission feedstock', false],
      ['Green H2', 0.55, 'Hydrogen produced via electrolysis with low-carbon electricity', false],
    ]],
    ['BIOMASS', [
      ['None / current', 1, 'No additional biomass substitution', true],
      ['Partial sustainable biomass', 0.95, 'Assumes limited sustainable biomass substitution', false],
      ['High sustainable biomass', 0.85, 'Assumes high but sustainable biomass availability and quality', false],
    ]],
    ['SCRAP', [
      ['None / current', 1, 'No additional scrap share increase', true],
      ['+10 percentage points', 0.96, 'Assumes ten-point scrap increase where metallurgically feasible', false],
      ['+20 percentage points', 0.92, 'Assumes twenty-point scrap increase', false],
      ['+30 percentage points', 0.88, 'Assumes thirty-point scrap increase', false],
    ]],
    ['RAW_MAT', [
      ['None / current', 1, 'No change in iron ore / pellet quality', true],
      ['Better pellets', 0.97, 'Assumes improved burden quality and lower gangue', false],
      ['High-grade ore / pelletised', 0.94, 'Assumes high-grade ore or pelletisation and improved permeability', false],
    ]],
    ['WHR', [
      ['None / current', 1, 'No additional WHR or process integration', true],
      ['Standard WHR', 0.96, 'Assumes standard waste heat recovery and hot charging / integration', false],
      ['Advanced WHR', 0.92, 'Assumes advanced recovery and process integration', false],
    ]],
    ['COKE', [
      ['None / current', 1, 'No reductant / fuel injection change', true],
      ['Natural gas injection', 0.97, 'Assumes partial coke replacement via natural gas injection', false],
      ['Biomass injection', 0.93, 'Assumes partial coke replacement with sustainable biomass', false],
      ['Hydrogen injection', 0.9, 'Assumes hydrogen injection / tuyere substitution where feasible', false],
    ]],
    ['TGR', [
      ['None / current', 1, 'No top-gas recycling', true],
      ['Standard TGR', 0.92, 'Assumes standard top-gas recycling and recovery', false],
      ['Advanced TGR', 0.85, 'Assumes more extensive top-gas recycling system', false],
    ]],
    ['GRID', [
      ['Current grid', 1, 'Current India grid emissions intensity', true],
      ['Lower-carbon grid', 0.9, 'Assumes moderate decline in grid CO2 intensity', false],
      ['Low-carbon grid', 0.8, 'Assumes strong grid decarbonisation', false],
      ['Near-zero grid', 0.65, 'Assumes very low-carbon electricity system', false],
    ]],
    ['YIELD', [
      ['None / current', 1, 'No additional steel yield improvement', true],
      ['Moderate', 0.98, 'Assumes moderate casting / rolling yield gain', false],
      ['Aggressive', 0.95, 'Assumes strong yield improvement and near-net-shape gains', false],
    ]],
  ];

  // Store lever option IDs for reference
  for (const [leverName, options] of leverOptions) {
    for (let i = 0; i < options.length; i++) {
      const [name, factor, assumptionNote, isDefault] = options[i];
      await prisma.leverOption.create({
        data: {
          leverId: levers[leverName],
          name,
          factor,
          assumptionNote,
          displayOrder: i + 1,
          isDefault,
        },
      });
    }
  }

  // ── 14 Production Methods ────────────────────────────────────────────
  interface MethodDef {
    name: string;
    baseCO2: number;
    category: string;
    commercialStatus: string;
    trl: string;
    capex: string;
    energyDemand: string;
    deploymentTimeframe: string;
    description: string;
    baselineAssumptions: string;
    references: string;
  }

  const methodDefs: MethodDef[] = [
    {
      name: 'Blast Furnace – BOF',
      baseCO2: 2.7,
      category: 'Primary integrated',
      commercialStatus: 'Commercial',
      trl: '9',
      capex: '900–1200',
      energyDemand: '20–25 GJ/t',
      deploymentTimeframe: 'Current',
      description: 'Iron ore is reduced with coke in a blast furnace to produce pig iron, then converted to steel in a basic oxygen furnace.',
      baselineAssumptions: 'Base intensity assumes typical India coal-based BF-BOF operation with current average grid electricity.',
      references: 'https://iea.blob.core.windows.net/assets/eb0c8ec1-3665-4959-97d0-187ceca189a8/IronandSteelTechnologyRoadmap.pdf',
    },
    {
      name: 'COREX / FINEX Smelting Reduction',
      baseCO2: 2.3,
      category: 'Primary integrated',
      commercialStatus: 'Commercial',
      trl: '8',
      capex: '950–1200',
      energyDemand: '18–22 GJ/t',
      deploymentTimeframe: 'Current',
      description: 'Iron ore is reduced using coal in a smelting reduction reactor, bypassing the need for coke ovens and sinter plants.',
      baselineAssumptions: 'Base intensity assumes current commercial smelting-reduction operations using coal.',
      references: 'https://iea.blob.core.windows.net/assets/eb0c8ec1-3665-4959-97d0-187ceca189a8/IronandSteelTechnologyRoadmap.pdf',
    },
    {
      name: 'Gas-DRI + EAF',
      baseCO2: 1.4,
      category: 'Primary transition',
      commercialStatus: 'Commercial',
      trl: '9',
      capex: '700–1000',
      energyDemand: '12–16 GJ/t',
      deploymentTimeframe: 'Current / growing',
      description: 'Iron ore pellets are reduced using natural gas in a shaft furnace to produce direct reduced iron, then melted in an electric arc furnace.',
      baselineAssumptions: 'Base intensity assumes natural-gas-based DRI with current India grid electricity for EAF.',
      references: 'https://iea.blob.core.windows.net/assets/eb0c8ec1-3665-4959-97d0-187ceca189a8/IronandSteelTechnologyRoadmap.pdf',
    },
    {
      name: 'Coal-DRI + EAF',
      baseCO2: 3.0,
      category: 'Secondary sector',
      commercialStatus: 'Commercial',
      trl: '9',
      capex: '500–700',
      energyDemand: '22–28 GJ/t',
      deploymentTimeframe: 'Current',
      description: 'Sponge iron produced using coal is melted in an electric arc furnace.',
      baselineAssumptions: 'Base intensity assumes non-coking coal-based DRI with current India grid electricity.',
      references: 'https://energyforum.in/fileadmin/india/media_elements/publications/2021_Steel_Decarbonisation.pdf',
    },
    {
      name: 'Coal-DRI + Induction Furnace',
      baseCO2: 3.3,
      category: 'Secondary sector',
      commercialStatus: 'Commercial',
      trl: '9',
      capex: '450–650',
      energyDemand: '24–30 GJ/t',
      deploymentTimeframe: 'Current',
      description: 'Coal-based DRI is melted in induction furnaces, common in India small-scale steel sector.',
      baselineAssumptions: 'Base intensity assumes coal-based sponge iron into induction furnace with current India grid.',
      references: 'https://steel.gov.in/green-steel-initiative',
    },
    {
      name: 'Scrap-EAF',
      baseCO2: 0.7,
      category: 'Recycling',
      commercialStatus: 'Commercial',
      trl: '9',
      capex: '300–600',
      energyDemand: '3–5 GJ/t',
      deploymentTimeframe: 'Current / expanding',
      description: 'Steel scrap is melted in an electric arc furnace using electricity as the primary energy source.',
      baselineAssumptions: 'Base intensity assumes high-scrap EAF with current India grid electricity.',
      references: 'https://worldsteel.org/wider-sustainability/sustainability/',
    },
    {
      name: 'Scrap-Induction Furnace',
      baseCO2: 0.9,
      category: 'Recycling',
      commercialStatus: 'Commercial',
      trl: '9',
      capex: '300–500',
      energyDemand: '4–6 GJ/t',
      deploymentTimeframe: 'Current',
      description: 'Scrap is melted in induction furnaces commonly used in India small-scale steel operations.',
      baselineAssumptions: 'Base intensity assumes current India grid electricity and typical induction furnace operations.',
      references: 'https://steel.gov.in/green-steel-initiative',
    },
    {
      name: 'Hydrogen DRI + EAF',
      baseCO2: 0.4,
      category: 'Low-carbon primary',
      commercialStatus: 'Demonstration',
      trl: '6–7',
      capex: '1000–1400',
      energyDemand: '10–13 GJ/t',
      deploymentTimeframe: '2030–2040',
      description: 'Iron ore is reduced using hydrogen instead of fossil fuels in a shaft furnace, then melted in an EAF.',
      baselineAssumptions: 'Base intensity assumes green hydrogen plus low-carbon electricity for EAF.',
      references: 'https://iea.blob.core.windows.net/assets/eb0c8ec1-3665-4959-97d0-187ceca189a8/IronandSteelTechnologyRoadmap.pdf',
    },
    {
      name: 'Gas-DRI + Hydrogen Blending',
      baseCO2: 1.1,
      category: 'Transitional',
      commercialStatus: 'Pilot',
      trl: '7',
      capex: '900–1200',
      energyDemand: '11–14 GJ/t',
      deploymentTimeframe: '2030+',
      description: 'Natural-gas DRI plants partially substitute hydrogen into the reducing gas mixture.',
      baselineAssumptions: 'Base intensity assumes moderate hydrogen blend into gas-DRI with current India grid electricity.',
      references: 'https://iea.blob.core.windows.net/assets/eb0c8ec1-3665-4959-97d0-187ceca189a8/IronandSteelTechnologyRoadmap.pdf',
    },
    {
      name: 'Biomass-based DRI',
      baseCO2: 0.6,
      category: 'Transitional',
      commercialStatus: 'Pilot',
      trl: '5–6',
      capex: '700–1000',
      energyDemand: '15–20 GJ/t',
      deploymentTimeframe: '2030+',
      description: 'Biomass or charcoal substitutes fossil carbon in iron reduction processes.',
      baselineAssumptions: 'Base intensity assumes high sustainable biomass substitution and current grid.',
      references: 'https://www.ieabioenergy.com/',
    },
    {
      name: 'Biochar Ironmaking',
      baseCO2: 0.6,
      category: 'Transitional',
      commercialStatus: 'Pilot',
      trl: '4–5',
      capex: '700–1000',
      energyDemand: '15–20 GJ/t',
      deploymentTimeframe: '2030+',
      description: 'Biochar derived from biomass replaces fossil reductants in iron reduction.',
      baselineAssumptions: 'Base intensity assumes sustainably sourced biochar and current grid electricity.',
      references: 'https://www.ieabioenergy.com/',
    },
    {
      name: 'Plasma Smelting Reduction',
      baseCO2: 0.3,
      category: 'Breakthrough',
      commercialStatus: 'R&D',
      trl: '3–4',
      capex: '1200–1800',
      energyDemand: '8–12 GJ/t',
      deploymentTimeframe: '2040+',
      description: 'Plasma torches generate extremely high temperatures to reduce iron ore using renewable electricity.',
      baselineAssumptions: 'Base intensity assumes renewable electricity and advanced reactor design.',
      references: 'https://iea.blob.core.windows.net/assets/eb0c8ec1-3665-4959-97d0-187ceca189a8/IronandSteelTechnologyRoadmap.pdf',
    },
    {
      name: 'Molten Oxide Electrolysis',
      baseCO2: 0.2,
      category: 'Breakthrough',
      commercialStatus: 'Pilot',
      trl: '4–5',
      capex: '1500–2000',
      energyDemand: '4–6 MWh/t',
      deploymentTimeframe: '2040+',
      description: 'Iron ore is electrolyzed in molten oxide producing liquid iron directly without carbon reductants.',
      baselineAssumptions: 'Base intensity assumes low-carbon electricity; upstream processing emissions only.',
      references: 'https://bostonmetal.com/',
    },
    {
      name: 'Low-Temperature Electrolysis',
      baseCO2: 0.2,
      category: 'Breakthrough',
      commercialStatus: 'Research',
      trl: '3–4',
      capex: '1300–1800',
      energyDemand: '3–5 MWh/t',
      deploymentTimeframe: '2040+',
      description: 'Electrochemical processes convert iron ore to iron at lower temperatures using renewable electricity.',
      baselineAssumptions: 'Base intensity assumes low-carbon electricity and successful scale-up.',
      references: 'https://iea.blob.core.windows.net/assets/eb0c8ec1-3665-4959-97d0-187ceca189a8/IronandSteelTechnologyRoadmap.pdf',
    },
  ];

  // Create methods and store their IDs
  const methodIds: Record<string, string> = {};
  for (let i = 0; i < methodDefs.length; i++) {
    const md = methodDefs[i];
    const method = await prisma.productionMethod.create({
      data: {
        name: md.name,
        sectorId: steel.id,
        baseCO2: md.baseCO2,
        category: md.category,
        commercialStatus: md.commercialStatus,
        trl: md.trl,
        capex: md.capex,
        energyDemand: md.energyDemand,
        deploymentTimeframe: md.deploymentTimeframe,
        description: md.description,
        baselineAssumptions: md.baselineAssumptions,
        references: md.references,
        displayOrder: i + 1,
      },
    });
    methodIds[md.name] = method.id;
  }

  // ── Applicability Matrix ──────────────────────────────────────────────
  // From the Applicability sheet: 1 = applicable, 0 = not applicable
  // Lever order: RE, CCS, EE, ME, H2_SWITCH, H2_SOURCE, BIOMASS, SCRAP, RAW_MAT, WHR, COKE, TGR, GRID, YIELD
  const applicabilityMatrix: [string, number[]][] = [
    ['Blast Furnace – BOF',            [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]],
    ['COREX / FINEX Smelting Reduction',[1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1]],
    ['Gas-DRI + EAF',                  [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1]],
    ['Coal-DRI + EAF',                 [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1]],
    ['Coal-DRI + Induction Furnace',   [1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1]],
    ['Scrap-EAF',                      [1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1]],
    ['Scrap-Induction Furnace',        [1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1]],
    ['Hydrogen DRI + EAF',             [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1]],
    ['Gas-DRI + Hydrogen Blending',    [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1]],
    ['Biomass-based DRI',              [1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1]],
    ['Biochar Ironmaking',             [1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1]],
    ['Plasma Smelting Reduction',       [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1]],
    ['Molten Oxide Electrolysis',       [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1]],
    ['Low-Temperature Electrolysis',    [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1]],
  ];

  const leverKeys = ['RE', 'CCS', 'EE', 'ME', 'H2_SWITCH', 'H2_SOURCE', 'BIOMASS', 'SCRAP', 'RAW_MAT', 'WHR', 'COKE', 'TGR', 'GRID', 'YIELD'];

  let applicabilityCount = 0;
  for (const [methodName, row] of applicabilityMatrix) {
    for (let j = 0; j < leverKeys.length; j++) {
      if (row[j] === 1) {
        await prisma.methodLeverApplicability.create({
          data: {
            methodId: methodIds[methodName],
            leverId: levers[leverKeys[j]],
          },
        });
        applicabilityCount++;
      }
    }
  }

  // ── Benchmark Pathways ────────────────────────────────────────────────
  // (Retained from previous dataset — 6 pathways unchanged)
  const baseYear = 2026;

  // 1. 1.5°C Paris (Net Zero 2050)
  const p15 = await prisma.benchmarkPathway.create({
    data: {
      name: '1.5°C Paris Aligned (Net Zero 2050)',
      sectorId: steel.id,
      displayOrder: 1,
    },
  });
  {
    const s30 = 100 * (1 - 16 * 0.0225);
    const w30 = 100 * (1 - 20 * 0.0225);
    const aq30 = 3.2;
    const ag30 = (w30 + aq30) / 2;
    const c21 = -(w30 / s30 - 1);
    const d21 = -(ag30 / s30 - 1);
    const e21 = -(aq30 / s30 - 1);
    const rate1 = c21 / (2030 - (baseYear - 1));
    const rate2 = (d21 - c21) / (2040 - 2030);
    const rate3 = (e21 - d21) / (2050 - 2040);
    for (let y = baseYear; y <= 2070; y++) {
      let rate = 0;
      if (y <= 2030) rate = rate1;
      else if (y <= 2040) rate = rate2;
      else if (y <= 2050) rate = rate3;
      await prisma.pathwayAnnualRate.create({ data: { pathwayId: p15.id, year: y, rate } });
    }
  }

  // 2. 2°C Pathway
  const p2 = await prisma.benchmarkPathway.create({
    data: { name: '2°C Pathway', sectorId: steel.id, displayOrder: 2 },
  });
  {
    const s32 = 100 * (1 - 16 * 0.0125);
    const w32 = 100 * (1 - 20 * 0.0125);
    const bk32 = 4.0;
    const aq32 = (w32 + bk32) / 2;
    const ag32 = (w32 + aq32) / 2;
    const c22 = -(w32 / s32 - 1);
    const d22 = -(ag32 / s32 - 1);
    const e22 = -(aq32 / s32 - 1);
    const f22 = -(bk32 / s32 - 1);
    const rate1 = c22 / (2030 - (baseYear - 1));
    const rate2 = (d22 - c22) / (2040 - 2030);
    const rate3 = (e22 - d22) / (2050 - 2040);
    const rate4 = (f22 - e22) / (2070 - 2050);
    for (let y = baseYear; y <= 2070; y++) {
      let rate = 0;
      if (y <= 2030) rate = rate1;
      else if (y <= 2040) rate = rate2;
      else if (y <= 2050) rate = rate3;
      else if (y <= 2070) rate = rate4;
      await prisma.pathwayAnnualRate.create({ data: { pathwayId: p2.id, year: y, rate } });
    }
  }

  // 3. IEA Net Zero Emissions
  const pIEA = await prisma.benchmarkPathway.create({
    data: { name: 'IEA Net Zero Emissions Scenario', sectorId: steel.id, displayOrder: 3 },
  });
  {
    const iea_s = 100 * (1 - 7 * (0.4 / 11));
    const iea_w = 100 * (1 - 11 * (0.4 / 11));
    const iea_aq = 3.727;
    const iea_ag = (iea_w + iea_aq) / 2;
    const c23 = -(iea_w / iea_s - 1);
    const d23 = -(iea_ag / iea_s - 1);
    const e23 = -(iea_aq / iea_s - 1);
    const rate1 = c23 / (2030 - (baseYear - 1));
    const rate2 = (d23 - c23) / (2040 - 2030);
    const rate3 = (e23 - d23) / (2050 - 2040);
    for (let y = baseYear; y <= 2070; y++) {
      let rate = 0;
      if (y <= 2030) rate = rate1;
      else if (y <= 2040) rate = rate2;
      else if (y <= 2050) rate = rate3;
      await prisma.pathwayAnnualRate.create({ data: { pathwayId: pIEA.id, year: y, rate } });
    }
  }

  // 4. SBTi SDA
  const pSBTi = await prisma.benchmarkPathway.create({
    data: { name: 'SBTi Sectoral Decarbonisation Approach', sectorId: steel.id, displayOrder: 4 },
  });
  {
    const sbti_s = 100 * (1 - 6 * 0.042);
    const sbti_w = 100 * (1 - 10 * 0.042);
    const sbti_aq = 7.48;
    const sbti_ag = (sbti_w + sbti_aq) / 2;
    const c24 = -(sbti_w / sbti_s - 1);
    const d24 = -(sbti_ag / sbti_s - 1);
    const e24 = -(sbti_aq / sbti_s - 1);
    const rate1 = c24 / (2030 - (baseYear - 1));
    const rate2 = (d24 - c24) / (2040 - 2030);
    const rate3 = (e24 - d24) / (2050 - 2040);
    for (let y = baseYear; y <= 2070; y++) {
      let rate = 0;
      if (y <= 2030) rate = rate1;
      else if (y <= 2040) rate = rate2;
      else if (y <= 2050) rate = rate3;
      await prisma.pathwayAnnualRate.create({ data: { pathwayId: pSBTi.id, year: y, rate } });
    }
  }

  // 5. India Net Zero 2070
  const pIndia = await prisma.benchmarkPathway.create({
    data: { name: 'India Net Zero 2070', sectorId: steel.id, displayOrder: 5 },
  });
  {
    const uniformRate = 1 / (2070 - (baseYear - 1));
    for (let y = baseYear; y <= 2070; y++) {
      await prisma.pathwayAnnualRate.create({ data: { pathwayId: pIndia.id, year: y, rate: uniformRate } });
    }
  }

  // 6. India Net Zero 2070 (Accelerated)
  const pIndiaAcc = await prisma.benchmarkPathway.create({
    data: { name: 'India Net Zero 2070 (Accelerated)', sectorId: steel.id, displayOrder: 6 },
  });
  {
    const rate1 = 0.15 / (2030 - (baseYear - 1));
    const rate2 = (0.4 - 0.15) / (2040 - 2030);
    const rate3 = (0.65 - 0.4) / (2050 - 2040);
    const rate4 = (1.0 - 0.65) / (2070 - 2050);
    for (let y = baseYear; y <= 2070; y++) {
      let rate = 0;
      if (y <= 2030) rate = rate1;
      else if (y <= 2040) rate = rate2;
      else if (y <= 2050) rate = rate3;
      else if (y <= 2070) rate = rate4;
      await prisma.pathwayAnnualRate.create({ data: { pathwayId: pIndiaAcc.id, year: y, rate } });
    }
  }

  // ── Climate Scenarios (Phase 2) ──────────────────────────────────────
  // Helper: linearly interpolate between milestones to get yearly data
  function interpolateYearly(milestones: Record<string, number>, startYear: number, endYear: number): { year: number; value: number }[] {
    const years = Object.keys(milestones).map(Number).sort((a, b) => a - b);
    const result: { year: number; value: number }[] = [];
    for (let y = startYear; y <= endYear; y++) {
      // Find surrounding milestones
      let lo = years[0], hi = years[years.length - 1];
      for (let i = 0; i < years.length - 1; i++) {
        if (y >= years[i] && y <= years[i + 1]) { lo = years[i]; hi = years[i + 1]; break; }
      }
      if (y <= years[0]) { result.push({ year: y, value: milestones[String(years[0])] }); continue; }
      if (y >= years[years.length - 1]) { result.push({ year: y, value: milestones[String(years[years.length - 1])] }); continue; }
      const t = (y - lo) / (hi - lo);
      const val = milestones[String(lo)] + t * (milestones[String(hi)] - milestones[String(lo)]);
      result.push({ year: y, value: Math.round(val * 1000) / 1000 });
    }
    return result;
  }

  let scenarioCount = 0;
  const dataDir = path.join(__dirname, '..', 'data');

  for (const filename of ['iea-scenarios.json', 'ngfs-scenarios.json']) {
    const raw = JSON.parse(fs.readFileSync(path.join(dataDir, filename), 'utf-8'));
    const family = await prisma.scenarioFamily.create({
      data: {
        name: raw.family.name,
        source: raw.family.source,
        description: raw.family.description ?? null,
        version: raw.family.version ?? null,
        dataSource: raw.family.dataSource ?? null,
      },
    });

    for (const sc of raw.scenarios) {
      const scenario = await prisma.climateScenario.create({
        data: {
          familyId: family.id,
          name: sc.name,
          shortName: sc.shortName,
          temperatureOutcome: sc.temperatureOutcome,
          riskCategory: sc.riskCategory ?? null,
          description: sc.description ?? null,
          displayOrder: sc.displayOrder,
          isDefault: sc.isDefault ?? false,
        },
      });

      // Seed yearly intensity data points (interpolated)
      const intensityPoints = interpolateYearly(sc.milestones, 2025, 2070);
      for (const pt of intensityPoints) {
        await prisma.scenarioDataPoint.create({
          data: { scenarioId: scenario.id, year: pt.year, intensity: pt.value },
        });
      }

      // Seed yearly carbon prices (interpolated)
      if (sc.carbonPriceMilestones) {
        const pricePoints = interpolateYearly(sc.carbonPriceMilestones, 2025, 2070);
        for (const pt of pricePoints) {
          await prisma.scenarioCarbonPrice.create({
            data: { scenarioId: scenario.id, year: pt.year, priceUSD: pt.value },
          });
        }
      }

      scenarioCount++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const optionCount = leverOptions.reduce((sum, [, opts]) => sum + opts.length, 0);
  console.log('Seed completed successfully.');
  console.log(`Created: 1 sector, ${methodDefs.length} methods, ${leverDefs.length} levers, ${optionCount} lever options, ${applicabilityCount} applicability records, 6 benchmark pathways, ${scenarioCount} climate scenarios`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
