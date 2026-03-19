# CLAUDE.md

## Project: TP Tool — Climate Transition Planning

A web application for climate transition planning, converted from an Excel workbook (`Steel Simple model_V1.xlsx`). Models corporate decarbonization pathways across production methods, analyzes emission intensity trajectories, benchmarks against global climate targets, and provides 5-assessment resilience scoring (ITR, LCT, CTA, CVaR, CSA).

## Build & Run Commands

```bash
# Requires Node.js - prefix all commands on this system with:
export PATH="/c/Program Files/nodejs:$PATH"

# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run test             # Run vitest tests
npm run test:watch       # Run tests in watch mode

# Database
npm run db:seed          # Seed database (uses tsx prisma/seed.ts)
npm run db:migrate       # Run prisma migrations
npm run db:generate      # Regenerate prisma client

# Testing
node tests/contradiction-check.mjs  # Run cross-assessment contradiction analysis
```

## Architecture

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (base-ui variant)
- **State**: Zustand for wizard state management
- **Database**: SQLite via Prisma v6 (downgraded from v7 due to tsx compatibility issues)
- **Charts**: Recharts v3
- **Animations**: Framer Motion (page transitions)
- **Command Palette**: cmdk (Cmd+K)
- **Theme**: next-themes (dark mode support)
- **PDF Export**: html2canvas + jsPDF
- **Celebrations**: canvas-confetti (on dashboard generation)
- **Tests**: Vitest

### Key Directory Structure

```
src/
  app/
    page.tsx               # Landing page
    wizard/page.tsx        # 7-step wizard (single page, all steps)
    admin/page.tsx         # Admin panel for managing data
    api/
      sectors/route.ts     # GET sectors with methods/levers/pathways
      levers/route.ts      # GET all levers
      calculate/route.ts   # POST calculation engine
      scenarios/route.ts   # GET climate scenarios (IEA + NGFS)
      diagnostics/route.ts # POST automated testing endpoint (runs all calcs, returns JSON)
      admin/               # CRUD routes for sectors/methods/pathways
  lib/
    calc-engine/           # Pure calculation engine (no side effects)
      types.ts             # All TypeScript interfaces
      lever-factors.ts     # Factor derivation: IF(delta=0, 0, (baseCO2+delta)/baseCO2)
      method-intensity.ts  # Final intensity: baseCO2 * PRODUCT(IF(f=0,1,f))
      waterfall.ts         # Method & lever waterfall decomposition
      trajectory.ts        # Piecewise step + linear interpolation + benchmarks
      pathway-comparison.ts# Alignment ratios
      scenario-analysis.ts # Scenario gaps, acceleration, carbon budget, carbon cost
      itr-assessment.ts    # Implied Temperature Rise (budget ratio method)
      lct-assessment.ts    # Low Carbon Transition Readiness (0-10)
      cta-assessment.ts    # Climate Transition Assessment (Shade of Green + lock-in penalty)
      cvar-assessment.ts   # Climate Value at Risk (% of EV, with cost pass-through)
      csa-assessment.ts    # Sustainability Maturity (0-100, 8 dimensions)
      constants.ts         # Reference constants (TCRE AR6, time-adjusted carbon budget, damage function)
      industry-defaults.ts # Regional financial defaults (6 regions)
      capex-calculator.ts  # CAPEX estimation
      index.ts             # Main orchestrator (sorts leverDefs by displayOrder)
      __tests__/           # Workbook parity tests
    store.ts               # Zustand wizard store (includes companyFinancials)
    templates.ts           # 5 quick-start templates (Indian, EU, Mini Mill, Net Zero, Blank)
    pdf-export.ts          # Branded PDF report generation
    db.ts                  # Prisma singleton
    data.ts                # API data fetching + transformation
  components/
    wizard/                # Wizard UI components
      period-input-table.tsx  # Method cards + lever sliders with contextual tooltips
      live-preview-card.tsx   # Floating intensity preview (steps 2-5)
    dashboard/             # Chart/table components (see Dashboard section below)
    command-palette.tsx    # Cmd+K navigation palette (uses next-themes)
    theme-provider.tsx     # next-themes ThemeProvider wrapper
    ui/                    # shadcn/ui primitives (includes skeleton.tsx)
prisma/
  schema.prisma            # 10 models (6 original + 4 scenario models)
  seed.ts                  # Seeds steel methods, levers, pathways, + 9 climate scenarios
data/
  iea-scenarios.json       # IEA WEO scenario data (NZE, APS, STEPS)
  ngfs-scenarios.json      # NGFS Phase V scenario data (6 scenarios)
tests/
  contradiction-check.mjs  # Cross-assessment contradiction analysis (6 test cases)
```

### Dashboard Tabs (4 tabs)

**Tab 1: Emissions Analysis** (in render order):
- `kpi-cards.tsx` — Period intensity cards + total reduction percentage
- `intensity-trajectory-chart.tsx` — ComposedChart with Area (company) + Lines (BAU + benchmarks); benchmark selector pills
- `emissions-by-method-chart.tsx` — **Method Waterfall**: per-method contribution to intensity change with term selector (Base→ST, ST→MT, MT→LT)
- `lever-waterfall-chart.tsx` — **Lever Waterfall**: per-lever contribution with term selector; includes "Method / Mix" gap bar
- `pathway-comparison-table.tsx` — Alignment badges (Aligned ≥1.0, Partial 0.7–1.0, Misaligned <0.7)

**Tab 2: CAPEX Analysis:**
- `capex-kpi-cards.tsx` — Total + per-transition CAPEX cards
- `capex-by-period-chart.tsx` — Grouped BarChart by transition period
- `capex-by-technology-chart.tsx` — Stacked BarChart by technology across transitions
- `capex-waterfall-chart.tsx` — CAPEX waterfall

**Tab 3: Scenario Analysis** (Phase 2):
- `scenario-selector.tsx` — IEA/NGFS scenario toggle pills with temperature badges
- `scenario-trajectory-chart.tsx` — ComposedChart: company trajectory + scenario overlays
- `scenario-gap-table.tsx` — Per-scenario alignment status at each milestone
- `carbon-budget-chart.tsx` — Cumulative emissions vs fair-share budget (AreaChart)
- `carbon-cost-chart.tsx` — Carbon cost exposure per scenario (BarChart)

**Tab 4: Resilience Assessment** (Phase 2):
- `assessment-summary.tsx` — 5-metric strip: ITR °C, LCT /10, CTA shade, CVaR %EV, CSA /100
- `itr-gauge.tsx` — SVG semicircular temperature gauge with classification
- `itr-details-card.tsx` — Carbon budget breakdown + interpretation + intensityNote
- `lct-score-card.tsx` — 5-category bar chart (0-2 per category)
- `cta-shade-card.tsx` — Shade of Green gradient strip + 6 criteria breakdown
- `cvar-breakdown-card.tsx` — Policy/Tech/Physical risk components
- `cvar-waterfall-chart.tsx` — Risk waterfall decomposition
- `csa-radar-card.tsx` — SVG radar/spider chart with 8 dimensions
- `itr-sensitivity-chart.tsx` — What-if temperature reduction analysis

### Calculation Engine Key Formulas

- **Multiplicative lever application**: `final_intensity = base * PRODUCT(IF(factor=0, 1, factor))`
- **Log-based lever attribution**: `(final-base) * IF(f=0, 0, LN(f)/SUMPRODUCT((f<>0)*LN(IF(f=0,1,f)))) * share`
- **Benchmark trajectory**: `BAU * (1 - cumulative_annual_rates)`
- **Alignment ratio**: `(company/base - 1) / (benchmark/base - 1)`
- **ITR (Budget Ratio)**: `ITR = 1.5 × (cumulativeEmissions / fairShareBudget)`, clamped [1.0, 6.0]
- **Carbon Budget**: Time-adjusted: `remainingGt = 500 - (year - 2020) × 40`; company share uses avg production
- **CVaR**: `(PolicyRisk_NPV × (1 - passThrough) - TechOpportunity_NPV + PhysicalRisk_NPV) / EV × 100`
- **Physical Risk**: Howard & Sterner (2017): `annualDamage = EV × 0.01145 × T² × 1.2`, discounted as NPV stream
- **CTA Lock-in**: >40% BF-BOF in LT → shade capped at Yellow; >20% → capped at Light Green

### Calculation Engine Data Flow

- `index.ts` sorts `leverDefinitions` by `displayOrder` → `sortedLeverDefs`
- `leverWaterfallTransitions[].leverTotals[i]` maps to `sortedLeverDefs[i]` (index by sorted order)
- `WaterfallMethodRow` has: `dueToLeverChange`, `dueToMethodChange`, `dueToProportionChange`, `net`
- `LeverWaterfallTransition` has: `leverTotals: number[]` indexed by sorted lever order
- Scenario/assessment calculations are **separate** from main `calculate()` — lazy-loaded per tab
- Assessment chain: ITR → LCT/CTA (independent) → CVaR (needs ITR + scenarios) → CSA (needs all)

### Assessment Methodology Sources

| Assessment | Real-World Basis | Key Adaptation |
|-----------|-----------------|----------------|
| **ITR** | GFANZ Portfolio Alignment, MSCI ITR | Budget ratio method instead of pure TCRE; uses IPCC AR6 values |
| **LCT** | TPI Management Quality (FTSE Russell) | Simplified from 23 binary indicators to 5 additive categories |
| **CTA** | CICERO Shades of Green | Quantitative scoring (CICERO is qualitative); added fossil lock-in penalty |
| **CVaR** | MSCI Climate VaR | 60% carbon cost pass-through; Howard & Sterner damage function |
| **CSA** | S&P Global CSA | 8 dimensions vs S&P's 23 topics; no social dimension yet |

### Known Intensity vs Absolute Tension

Benchmark alignment (intensity-based) and ITR (absolute cumulative emissions) can give contradictory signals for **growing companies**. A company can match the 1.5°C intensity benchmark while showing ITR > 3°C because production growth increases total emissions. This is a real tension in climate finance, not a bug. The ITR result includes an `intensityNote` field explaining this when detected. Both metrics are valid — they answer different questions (efficiency vs planetary impact).

### Prisma Schema (10 models)

**Original (Phase 1):** Sector, ProductionMethod, Lever, LeverOption, MethodLeverApplicability, BenchmarkPathway, PathwayAnnualRate

**Phase 2 additions:** ScenarioFamily, ClimateScenario, ScenarioDataPoint, ScenarioCarbonPrice

### Chart Design Patterns

All dashboard charts follow a consistent visual language:

**Recharts setup:**
- `ResponsiveContainer` with `width="100%"`, height 380–400px
- `CartesianGrid` with `strokeDasharray="3 3"` and CSS color variables
- Margins: `{ top: 10, right: 16, left: 0, bottom: 5 }`
- Always set `isAnimationActive={false}` on waterfall stacked bars to prevent animation glitches

**Waterfall chart technique (floating bars):**
- Uses two stacked `<Bar>` components with `stackId="stack"`
- Invisible bar: `fill="transparent"` — positions the value bar vertically
- Value bar: colored bar showing the actual change amount
- For negative changes: `invisible = running + change`; for positive: `invisible = running`
- Start and end bars are "total" bars drawn from 0 (invisible = 0)

**Recharts Tooltip formatter typing:**
- Use `(value, name)` without explicit types to avoid Recharts v3 generic issues
- Cast inside: `Number(value).toFixed(4)`, `String(name)`

**Term/benchmark/scenario selector pills:**
- `rounded-full border px-2.5 py-1 text-[11px]` with colored dot indicator
- Selected: `border-border bg-muted/60 text-foreground shadow-sm`
- Unselected: `border-transparent text-muted-foreground/40 hover:text-muted-foreground/60`

**Color palette:**
- Period totals: `#6366f1` (indigo)
- Reductions (lever): `#10b981` (emerald)
- Reductions (mix): `#6ee7b7` (light emerald)
- Increases: `#f43f5e` (rose) / `#fca5a5` (light rose)
- Benchmarks: orange, emerald, amber, pink, cyan, violet
- Scenario colors: defined in `scenario-selector.tsx` `SCENARIO_COLORS` map

**Card wrapper pattern:**
- `<Card>` with `overflow-hidden`
- `<CardHeader className="pb-2">` with title (`text-sm font-semibold`) + subtitle (`text-[11px] text-muted-foreground`)
- `<CardContent className="pt-0">`
- Mini-legend at bottom: `text-[11px] text-muted-foreground` with `border-t`

**Tooltips:**
- Custom tooltip components with `contentStyle`: `borderRadius: '10px'`, `boxShadow: '0 4px 12px -2px ...'`, `padding: '10px 14px'`
- CSS variables: `backgroundColor: 'var(--color-card, white)'`, `border: '1px solid var(--color-border)'`

### Quick-Start Templates

5 pre-built scenarios in `src/lib/templates.ts`:
- **Indian Integrated** — BF-BOF heavy, gradual CCS adoption, growing production
- **EU Green Transition** — Aggressive H2-DRI shift, shrinking BF-BOF share
- **Scrap-EAF Mini Mill** — Already low-emission recycler
- **Net Zero Leader** — Complete tech shift away from BF-BOF by 2050
- **Blank (Custom)** — Empty starting point

Templates use `resolveTemplate()` which maps method names → DB IDs and lever keys → lever IDs at runtime. **Shares must be 0-100 in templates (converted to 0-1 decimal at resolve time).** Lever values are slider integers 0-100 (not option names).

### Important Notes

- shadcn uses `@base-ui/react` — use `render` prop instead of `asChild` for composition
- Select `onValueChange` returns `string | null` — handle null case
- The workbook has a confirmed bug: MT/LT rows reference `B$19` (ST production=60) instead of their own production cells. The app fixes this so each period uses its own production value.
- Dev server config is in `.claude/launch.json` (name: `tp-tool-dev`, port 3000)
- Reference workbook: `Steel Simple model_V1.xlsx` — "Waterfall charts" tab has the reference data structures for both method and lever waterfalls
- **Hooks ordering**: All `useState`/`useMemo`/`useCallback` hooks MUST be placed before any early `return` (e.g., `if (loading) return`) to avoid React hooks order violations
- **Framer Motion**: Use `<AnimatePresence initial={false} mode="wait">` to skip entry animation on first render
- **Prisma DLL lock**: Stop the dev server before running `npx prisma generate` on Windows (DLL is locked by Next.js process)
- **Store**: `companyFinancials` is `Record<string, number | string | boolean>` — cast with `Number()`, `String()`, `Boolean()` when reading fields for type safety
- **Assessment calculations are lazy**: Only computed via `useMemo` when dashboard tab is active, avoiding unnecessary recalculation during wizard steps
- **canvas-confetti**: Needs `@types/canvas-confetti` dev dependency for TypeScript
- **Dark mode**: Handled by next-themes with `ThemeProvider` in layout.tsx; CSS variables in globals.css `.dark` block
- **Em dash in method names**: "Blast Furnace – BOF" uses Unicode em dash `\u2013` — curl may mangle it; use Node.js `fetch` for API testing
- **Lever slider values**: Stored as string integers "0"-"100" in `leverSelections` map (not option IDs). Factor = `1 - (slider/100) * maxReduction`
- **PDF export**: Uses dynamic import `await import('@/lib/pdf-export')` for code splitting
- **Diagnostic endpoint**: POST `/api/diagnostics` accepts method names + lever keys directly, resolves to IDs server-side. Useful for automated testing without UI.

### Testing Learnings

- **ITR was broken** (always returned 1.5°C) because TCRE × company-level overshoot in Gt was negligible. Fixed with budget-ratio method.
- **CVaR was inflated** (>5000% for BAU) because physical risk was a lump sum, not discounted NPV; no carbon cost pass-through; clean companies got zero tech opportunity. Fixed with NPV stream, 60% pass-through, and green intensity threshold.
- **CTA didn't penalize fossil lock-in** — a company with 100% BF-BOF could get Dark Green by just adding levers. Fixed with lock-in cap.
- **Templates stored shares as percentages** (85) but store expects decimals (0.85). Lever values were stored as option names instead of slider integers. Fixed.
- **Edge case: empty methods** produces null CVaR and null pathway ratios. Only affects diagnostic API, not the wizard (which validates before calculation).
