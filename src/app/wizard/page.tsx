'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWizardStore } from '@/lib/store';
import { fetchSectorData, type SectorData } from '@/lib/data';
import { calculate } from '@/lib/calc-engine';
import { calcPeriod } from '@/lib/calc-engine/method-intensity';
import { calcBenchmarkTrajectory } from '@/lib/calc-engine/trajectory';
import { calcAlignmentRatio } from '@/lib/calc-engine/pathway-comparison';
import { calcCapex } from '@/lib/calc-engine/capex-calculator';
import { validateStep, type ValidationError } from '@/lib/validations';
import type {
  ScenarioInput,
  FullCalculationResult,
  PeriodInput,
  PeriodMethodInput,
  MethodData,
  LeverDefinition,
  CapexResult,
} from '@/lib/calc-engine/types';
import { Stepper } from '@/components/wizard/stepper';
import { PeriodInputTable } from '@/components/wizard/period-input-table';
import { KPICards } from '@/components/dashboard/kpi-cards';
import { LeverWaterfallChart } from '@/components/dashboard/lever-waterfall-chart';
import { IntensityTrajectoryChart } from '@/components/dashboard/intensity-trajectory-chart';
import { EmissionsByMethodChart } from '@/components/dashboard/emissions-by-method-chart';
import { PathwayComparisonTable } from '@/components/dashboard/pathway-comparison-table';
import { CapexKpiCards } from '@/components/dashboard/capex-kpi-cards';
import { CapexByPeriodChart } from '@/components/dashboard/capex-by-period-chart';
import { CapexByTechnologyChart } from '@/components/dashboard/capex-by-technology-chart';
import { CapexWaterfallChart } from '@/components/dashboard/capex-waterfall-chart';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Leaf,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

export default function WizardPage() {
  const store = useWizardStore();
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<FullCalculationResult | null>(null);
  const [selectedBenchmarkIds, setSelectedBenchmarkIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSectorData()
      .then(setSectors)
      .finally(() => setLoading(false));
  }, []);

  const selectedSector = sectors.find((s) => s.id === store.sectorId);

  // ── Benchmark pathway selection (all selected by default, resets on sector change) ──
  useEffect(() => {
    if (selectedSector?.pathways) {
      setSelectedBenchmarkIds(new Set(selectedSector.pathways.map((p) => p.id)));
    }
  }, [selectedSector?.pathways]);

  const handleBenchmarkToggle = useCallback((id: string) => {
    setSelectedBenchmarkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ── Merge custom methods and levers with sector data ──
  const allMethods = useMemo((): MethodData[] => {
    if (!selectedSector) return [...store.customMethods];
    return [...selectedSector.methods, ...store.customMethods];
  }, [selectedSector, store.customMethods]);

  const allLevers = useMemo((): LeverDefinition[] => {
    if (!selectedSector) return [...store.customLevers];
    return [...selectedSector.levers, ...store.customLevers];
  }, [selectedSector, store.customLevers]);

  // Build merged method data map with custom lever applicability propagation
  const mergedMethodDataMap = useMemo((): Record<string, MethodData> => {
    const map: Record<string, MethodData> = {};
    for (const m of allMethods) {
      map[m.id] = m;
    }
    // Propagate custom lever applicability into method data
    for (const cl of store.customLevers) {
      if (cl.applicableMethodIds) {
        for (const methodId of cl.applicableMethodIds) {
          if (map[methodId]) {
            const levers = new Set(map[methodId].applicableLevers);
            levers.add(cl.id);
            map[methodId] = { ...map[methodId], applicableLevers: levers };
          }
        }
      }
    }
    return map;
  }, [allMethods, store.customLevers]);

  // Provide allMethods with updated applicableLevers for UI
  const allMethodsWithApplicability = useMemo((): MethodData[] => {
    return allMethods.map((m) => mergedMethodDataMap[m.id] ?? m);
  }, [allMethods, mergedMethodDataMap]);

  // ── Compute base period result for benchmark comparisons on period steps ──
  const basePeriodResult = useMemo(() => {
    if (store.base.methods.length === 0) return null;
    try {
      return calcPeriod(
        { label: 'Base', year: store.base.year, totalProduction: store.base.totalProduction, methods: store.base.methods },
        mergedMethodDataMap,
        allLevers
      );
    } catch { return null; }
  }, [store.base, mergedMethodDataMap, allLevers]);

  // Helper to compute benchmark comparison for a given period
  const computeBenchmarkComparison = useCallback((periodMethods: PeriodMethodInput[], periodYear: number, periodProduction: number, periodLabel: string) => {
    if (!basePeriodResult || !selectedSector || periodMethods.length === 0) return null;
    try {
      const periodResult = calcPeriod(
        { label: periodLabel, year: periodYear, totalProduction: periodProduction, methods: periodMethods },
        mergedMethodDataMap,
        allLevers
      );
      const baseIntensity = basePeriodResult.companyIntensity;
      const companyIntensity = periodResult.companyIntensity;

      const rows = selectedSector.pathways.map((pathway) => {
        const [bmIntensity] = calcBenchmarkTrajectory(baseIntensity, pathway, [periodYear]);
        const ratio = calcAlignmentRatio(companyIntensity, bmIntensity, baseIntensity);
        return { pathwayName: pathway.name, bmIntensity, ratio };
      });

      return { companyIntensity, rows };
    } catch { return null; }
  }, [basePeriodResult, selectedSector, mergedMethodDataMap, allLevers]);

  const runCalculation = useCallback(() => {
    if (!selectedSector) return;

    const periodKeys = ['base', 'shortTerm', 'mediumTerm', 'longTerm'] as const;
    const periodLabels = ['Base', 'ST', 'MT', 'LT'];

    const periods: PeriodInput[] = periodKeys.map((key, i) => ({
      label: periodLabels[i],
      year: store[key].year,
      totalProduction: store[key].totalProduction,
      methods: store[key].methods,
    }));

    const input: ScenarioInput = {
      sectorId: store.sectorId,
      periods,
      benchmarkPathways: selectedSector.pathways,
      leverDefinitions: allLevers,
      methodDataMap: mergedMethodDataMap,
      capexScenario: store.capexScenario,
      capexOverrides: store.capexOverrides,
    };

    setResult(calculate(input));
  }, [selectedSector, store, allLevers, mergedMethodDataMap]);

  // Reactive CAPEX recalculation when scenario changes (without full recalc)
  const capexResult = useMemo((): CapexResult | null => {
    if (!result) return null;
    return calcCapex(
      result.periods,
      mergedMethodDataMap,
      store.capexScenario,
      store.capexOverrides
    );
  }, [result, mergedMethodDataMap, store.capexScenario, store.capexOverrides]);

  // Validation — recomputed on every relevant state change
  const currentErrors = useMemo(
    () => validateStep(store.currentStep, store),
    [store.currentStep, store.sectorId, store.companyName,
     store.base, store.shortTerm, store.mediumTerm, store.longTerm]
  );

  const canProceed = currentErrors.length === 0;

  // Track whether user has attempted to proceed (to show errors only after first attempt)
  const [attempted, setAttempted] = useState(false);

  // Reset attempted state when step changes
  useEffect(() => {
    setAttempted(false);
  }, [store.currentStep]);

  const goNext = () => {
    if (!canProceed) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    const next = store.currentStep + 1;
    if (next === 7) {
      runCalculation();
      store.markSubmitted();
    }
    store.setStep(next);
  };

  const goPrev = () => store.setStep(Math.max(1, store.currentStep - 1));

  const reCalculate = useCallback(() => {
    runCalculation();
    store.markSubmitted();
  }, [runCalculation]);

  const copyMethodsFromPrevious = (
    target: 'shortTerm' | 'mediumTerm' | 'longTerm',
    source: 'base' | 'shortTerm' | 'mediumTerm'
  ) => {
    const srcMethods = store[source].methods.map((m) => ({ ...m }));
    store.setMethodsForPeriod(target, srcMethods);
    if (store[target].totalProduction === 0) {
      store.setPeriod(target, { totalProduction: store[source].totalProduction });
    }
  };

  // Step titles for the main content header
  const stepTitles: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Setup', subtitle: 'Select sector and enter company details' },
    2: { title: 'Base Year Configuration', subtitle: 'Define your current production methods and shares' },
    3: { title: 'Short Term Plan', subtitle: 'Configure your near-term production outlook' },
    4: { title: 'Medium Term Plan', subtitle: 'Set your mid-range decarbonization targets' },
    5: { title: 'Long Term Plan', subtitle: 'Define your long-term transition strategy' },
    6: { title: 'Review Assumptions', subtitle: 'Verify all inputs before generating results' },
    7: { title: 'Analysis Dashboard', subtitle: 'Transition pathway results and benchmarking' },
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading sector data...</p>
        </div>
      </div>
    );
  }

  const currentStepInfo = stepTitles[store.currentStep];

  return (
    <div className="flex min-h-screen bg-background">
      {/* ══════════════ Sidebar ══════════════ */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Leaf className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold tracking-tight text-sidebar-foreground">TP Tool</h1>
            <p className="truncate text-xs text-muted-foreground">
              {store.companyName || 'Climate Transition'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3">
          <p className="mb-2 px-5 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Scenario Builder
          </p>
          <Stepper
            currentStep={store.currentStep}
            hasSubmitted={store.hasSubmitted}
            isDirty={store.isDirty}
            onStepClick={(s) => {
              if (store.hasSubmitted || s <= store.currentStep) {
                store.setStep(s);
              }
            }}
          />
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-sidebar-border p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => { store.reset(); setResult(null); }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All Data
          </Button>
        </div>
      </aside>

      {/* ══════════════ Main Content ══════════════ */}
      <main className="ml-64 flex min-h-screen flex-1 flex-col">
        {/* Top bar */}
        {store.currentStep < 7 && (
          <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center justify-between px-8 py-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{currentStepInfo.title}</h2>
                <p className="text-sm text-muted-foreground">{currentStepInfo.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                  Step {store.currentStep} of 7
                </span>
              </div>
            </div>
          </header>
        )}

        {/* Dashboard header (step 7) */}
        {store.currentStep === 7 && (
          <header className="border-b border-border bg-background">
            <div className="flex items-center justify-between px-8 py-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{currentStepInfo.title}</h2>
                <p className="text-sm text-muted-foreground">{currentStepInfo.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                {store.companyName && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {selectedSector?.name ?? store.sectorId}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {store.companyName}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Content area */}
        <div className="flex-1 px-8 py-6">
          <div className={
            store.currentStep === 1 || store.currentStep === 6
              ? 'mx-auto max-w-2xl'
              : store.currentStep <= 5
                ? 'mx-auto max-w-4xl'
                : ''
          }>
            {/* Step 1: Sector & Company (merged) */}
            {store.currentStep === 1 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Industry Sector</label>
                      <Select value={store.sectorId} onValueChange={(v) => store.setSectorId(v ?? '')}>
                        <SelectTrigger className="h-10">
                          <span className="flex flex-1 text-left">
                            {store.sectorId
                              ? (sectors.find((s) => s.id === store.sectorId)?.name ?? store.sectorId)
                              : <span className="text-muted-foreground">Choose a sector...</span>}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {sectors.map((s) => (
                            <SelectItem key={s.id} value={s.id} label={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedSector && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border bg-muted/50 p-3 text-center">
                          <p className="text-2xl font-bold text-primary">{allMethods.length}</p>
                          <p className="text-xs text-muted-foreground">Methods</p>
                        </div>
                        <div className="rounded-lg border bg-muted/50 p-3 text-center">
                          <p className="text-2xl font-bold text-primary">{allLevers.length}</p>
                          <p className="text-xs text-muted-foreground">Levers</p>
                        </div>
                        <div className="rounded-lg border bg-muted/50 p-3 text-center">
                          <p className="text-2xl font-bold text-primary">{selectedSector.pathways.length}</p>
                          <p className="text-xs text-muted-foreground">Pathways</p>
                        </div>
                      </div>
                    )}

                    <hr className="border-border" />

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Company Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={store.companyName}
                        onChange={(e) => store.setCompanyName(e.target.value)}
                        placeholder="Enter company name"
                        className={`h-10 ${attempted && !store.companyName.trim() ? 'border-destructive' : ''}`}
                      />
                      {attempted && !store.companyName.trim() && (
                        <p className="mt-1.5 text-xs text-destructive">Company name is required.</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-3 block text-sm font-medium">Planning Horizons</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Base Year</label>
                          <Input
                            type="number"
                            value={store.base.year}
                            onChange={(e) => store.setPeriod('base', { year: Number(e.target.value) })}
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Short Term</label>
                          <Input
                            type="number"
                            value={store.shortTerm.year}
                            onChange={(e) => store.setPeriod('shortTerm', { year: Number(e.target.value) })}
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Medium Term</label>
                          <Input
                            type="number"
                            value={store.mediumTerm.year}
                            onChange={(e) => store.setPeriod('mediumTerm', { year: Number(e.target.value) })}
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Long Term</label>
                          <Input
                            type="number"
                            value={store.longTerm.year}
                            onChange={(e) => store.setPeriod('longTerm', { year: Number(e.target.value) })}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    {attempted && currentErrors.filter(e => e.field === 'yearOrder').length > 0 && (
                      <div className="rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        {currentErrors
                          .filter((e) => e.field === 'yearOrder')
                          .map((e, i) => (
                            <p key={i}>{e.message}</p>
                          ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Base Year */}
            {store.currentStep === 2 && selectedSector && (
              <PeriodInputTable
                periodLabel="Base Year"
                year={store.base.year}
                totalProduction={store.base.totalProduction}
                methods={store.base.methods}
                availableMethods={allMethodsWithApplicability}
                leverDefs={allLevers}
                onYearChange={(y) => store.setPeriod('base', { year: y })}
                onProductionChange={(p) => store.setPeriod('base', { totalProduction: p })}
                onMethodsChange={(m) => store.setMethodsForPeriod('base', m)}
                isBaseYear
                showValidation={attempted}
                onAddCustomMethod={(m) => store.addCustomMethod(m)}
                onRemoveCustomMethod={(id) => store.removeCustomMethod(id)}
                onAddCustomLever={(l) => store.addCustomLever(l)}
                onRemoveCustomLever={(id) => store.removeCustomLever(id)}
              />
            )}

            {/* Step 3: Short Term */}
            {store.currentStep === 3 && selectedSector && (
              <div className="space-y-4">
                {store.shortTerm.methods.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyMethodsFromPrevious('shortTerm', 'base')}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Copy from Base Year
                  </Button>
                )}
                <PeriodInputTable
                  periodLabel="Short Term"
                  year={store.shortTerm.year}
                  totalProduction={store.shortTerm.totalProduction}
                  methods={store.shortTerm.methods}
                  availableMethods={allMethodsWithApplicability}
                  leverDefs={allLevers}
                  onYearChange={(y) => store.setPeriod('shortTerm', { year: y })}
                  onProductionChange={(p) => store.setPeriod('shortTerm', { totalProduction: p })}
                  onMethodsChange={(m) => store.setMethodsForPeriod('shortTerm', m)}
                  showValidation={attempted}
                  onAddCustomMethod={(m) => store.addCustomMethod(m)}
                  onRemoveCustomMethod={(id) => store.removeCustomMethod(id)}
                  onAddCustomLever={(l) => store.addCustomLever(l)}
                  onRemoveCustomLever={(id) => store.removeCustomLever(id)}
                />
                {(() => {
                  const bm = computeBenchmarkComparison(store.shortTerm.methods, store.shortTerm.year, store.shortTerm.totalProduction, 'ST');
                  if (!bm) return null;
                  return (
                    <Card className="border-primary/20 bg-primary/[0.02]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold">Benchmark Comparison</CardTitle>
                          <span className="text-xs text-muted-foreground">Your intensity: <span className="font-semibold text-foreground">{bm.companyIntensity.toFixed(3)} tCO₂/tcs</span></span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {bm.rows.map((row) => (
                            <div key={row.pathwayName} className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
                              <span className="text-foreground">{row.pathwayName}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">Target: <span className="font-medium">{row.bmIntensity.toFixed(3)}</span></span>
                                <span className="text-xs text-muted-foreground">Ratio: <span className="font-medium">{row.ratio.toFixed(2)}x</span></span>
                                <Badge variant="outline" className={cn('text-[10px] px-1.5', row.ratio >= 1.0 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : row.ratio >= 0.7 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-red-300 bg-red-50 text-red-700')}>
                                  {row.ratio >= 1.0 ? 'Aligned' : row.ratio >= 0.7 ? 'Partial' : 'Misaligned'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}

            {/* Step 4: Medium Term */}
            {store.currentStep === 4 && selectedSector && (
              <div className="space-y-4">
                {store.mediumTerm.methods.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyMethodsFromPrevious('mediumTerm', 'shortTerm')}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Copy from Short Term
                  </Button>
                )}
                <PeriodInputTable
                  periodLabel="Medium Term"
                  year={store.mediumTerm.year}
                  totalProduction={store.mediumTerm.totalProduction}
                  methods={store.mediumTerm.methods}
                  availableMethods={allMethodsWithApplicability}
                  leverDefs={allLevers}
                  onYearChange={(y) => store.setPeriod('mediumTerm', { year: y })}
                  onProductionChange={(p) => store.setPeriod('mediumTerm', { totalProduction: p })}
                  onMethodsChange={(m) => store.setMethodsForPeriod('mediumTerm', m)}
                  showValidation={attempted}
                  onAddCustomMethod={(m) => store.addCustomMethod(m)}
                  onRemoveCustomMethod={(id) => store.removeCustomMethod(id)}
                  onAddCustomLever={(l) => store.addCustomLever(l)}
                  onRemoveCustomLever={(id) => store.removeCustomLever(id)}
                />
                {(() => {
                  const bm = computeBenchmarkComparison(store.mediumTerm.methods, store.mediumTerm.year, store.mediumTerm.totalProduction, 'MT');
                  if (!bm) return null;
                  return (
                    <Card className="border-primary/20 bg-primary/[0.02]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold">Benchmark Comparison</CardTitle>
                          <span className="text-xs text-muted-foreground">Your intensity: <span className="font-semibold text-foreground">{bm.companyIntensity.toFixed(3)} tCO₂/tcs</span></span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {bm.rows.map((row) => (
                            <div key={row.pathwayName} className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
                              <span className="text-foreground">{row.pathwayName}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">Target: <span className="font-medium">{row.bmIntensity.toFixed(3)}</span></span>
                                <span className="text-xs text-muted-foreground">Ratio: <span className="font-medium">{row.ratio.toFixed(2)}x</span></span>
                                <Badge variant="outline" className={cn('text-[10px] px-1.5', row.ratio >= 1.0 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : row.ratio >= 0.7 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-red-300 bg-red-50 text-red-700')}>
                                  {row.ratio >= 1.0 ? 'Aligned' : row.ratio >= 0.7 ? 'Partial' : 'Misaligned'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}

            {/* Step 5: Long Term */}
            {store.currentStep === 5 && selectedSector && (
              <div className="space-y-4">
                {store.longTerm.methods.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyMethodsFromPrevious('longTerm', 'mediumTerm')}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Copy from Medium Term
                  </Button>
                )}
                <PeriodInputTable
                  periodLabel="Long Term"
                  year={store.longTerm.year}
                  totalProduction={store.longTerm.totalProduction}
                  methods={store.longTerm.methods}
                  availableMethods={allMethodsWithApplicability}
                  leverDefs={allLevers}
                  onYearChange={(y) => store.setPeriod('longTerm', { year: y })}
                  onProductionChange={(p) => store.setPeriod('longTerm', { totalProduction: p })}
                  onMethodsChange={(m) => store.setMethodsForPeriod('longTerm', m)}
                  showValidation={attempted}
                  onAddCustomMethod={(m) => store.addCustomMethod(m)}
                  onRemoveCustomMethod={(id) => store.removeCustomMethod(id)}
                  onAddCustomLever={(l) => store.addCustomLever(l)}
                  onRemoveCustomLever={(id) => store.removeCustomLever(id)}
                />
                {(() => {
                  const bm = computeBenchmarkComparison(store.longTerm.methods, store.longTerm.year, store.longTerm.totalProduction, 'LT');
                  if (!bm) return null;
                  return (
                    <Card className="border-primary/20 bg-primary/[0.02]">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold">Benchmark Comparison</CardTitle>
                          <span className="text-xs text-muted-foreground">Your intensity: <span className="font-semibold text-foreground">{bm.companyIntensity.toFixed(3)} tCO₂/tcs</span></span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {bm.rows.map((row) => (
                            <div key={row.pathwayName} className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
                              <span className="text-foreground">{row.pathwayName}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">Target: <span className="font-medium">{row.bmIntensity.toFixed(3)}</span></span>
                                <span className="text-xs text-muted-foreground">Ratio: <span className="font-medium">{row.ratio.toFixed(2)}x</span></span>
                                <Badge variant="outline" className={cn('text-[10px] px-1.5', row.ratio >= 1.0 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : row.ratio >= 0.7 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-red-300 bg-red-50 text-red-700')}>
                                  {row.ratio >= 1.0 ? 'Aligned' : row.ratio >= 0.7 ? 'Partial' : 'Misaligned'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}

            {/* Step 6: Review */}
            {store.currentStep === 6 && selectedSector && (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {(['base', 'shortTerm', 'mediumTerm', 'longTerm'] as const).map((key, i) => {
                    const period = store[key];
                    const labels = ['Base Year', 'Short Term', 'Medium Term', 'Long Term'];
                    return (
                      <Card key={key}>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between text-sm">
                            <span>{labels[i]}</span>
                            <Badge variant="outline" className="font-mono text-xs">{period.year}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          <p className="text-xs text-muted-foreground">
                            Production: <span className="font-medium text-foreground">{period.totalProduction} MTPA</span>
                          </p>
                          <div className="space-y-1.5">
                            {period.methods.map((m, mi) => {
                              // Find active lever selections (slider value > 0)
                              const activeLeverSelections = Object.entries(m.leverSelections || {})
                                .map(([leverId, value]) => {
                                  const lever = allLevers.find((l) => l.id === leverId);
                                  if (!lever) return null;
                                  const raw = parseInt(value || '0', 10);
                                  const sliderValue = isNaN(raw) ? 0 : raw;
                                  if (sliderValue === 0) return null;
                                  const reductionPct = (sliderValue / 100) * (lever.maxReduction ?? 0) * 100;
                                  return { leverName: lever.displayName, sliderValue, reductionPct };
                                })
                                .filter(Boolean) as { leverName: string; sliderValue: number; reductionPct: number }[];

                              return (
                                <div key={mi} className="rounded-md bg-muted/50 px-2.5 py-1.5 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-foreground flex items-center gap-1.5">
                                      {m.methodName}
                                      {mergedMethodDataMap[m.methodId]?.isCustom && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0">Custom</Badge>
                                      )}
                                    </span>
                                    <span className="font-mono text-xs text-muted-foreground">{Math.round(m.share * 100)}%</span>
                                  </div>
                                  {activeLeverSelections.length > 0 && (
                                    <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-primary/20">
                                      {activeLeverSelections.map((ls) => (
                                        <p key={ls.leverName} className="text-[11px] text-muted-foreground">
                                          {ls.leverName}: <span className="font-medium text-foreground/80">{ls.sliderValue}%</span>
                                          <span className="text-emerald-600 ml-1">(-{ls.reductionPct.toFixed(1)}%)</span>
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {period.methods.length === 0 && (
                            <p className="text-sm text-destructive">No methods configured</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Custom items summary */}
                {(store.customMethods.length > 0 || store.customLevers.length > 0) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Custom Definitions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      {store.customMethods.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Custom Methods ({store.customMethods.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {store.customMethods.map((m) => (
                              <Badge key={m.id} variant="secondary" className="text-xs">
                                {m.name} ({m.baseCO2.toFixed(3)} tCO2/tcs)
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {store.customLevers.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Custom Levers ({store.customLevers.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {store.customLevers.map((l) => (
                              <Badge key={l.id} variant="secondary" className="text-xs">
                                {l.displayName} ({l.leverType ?? 'factor'})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 7: Dashboard */}
            {store.currentStep === 7 && (
              <div className="space-y-6">
                {/* Dirty state banner */}
                {store.isDirty && (
                  <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">
                          Results are out of date
                        </p>
                        <p className="text-sm text-amber-700">
                          You&apos;ve made changes since the last calculation. Re-calculate to see updated results.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={reCalculate}
                      className="shrink-0 gap-1.5"
                    >
                      <Sparkles className="h-4 w-4" />
                      Re-calculate
                    </Button>
                  </div>
                )}

                {result ? (
                  <Tabs defaultValue="emissions">
                    <TabsList>
                      <TabsTrigger value="emissions">Emissions Analysis</TabsTrigger>
                      <TabsTrigger value="capex">
                        CAPEX Analysis
                        {capexResult && capexResult.totalCapex > 0 && (
                          <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                            {(capexResult.totalCapex / 1e6).toFixed(0)}M
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    {/* Emissions Tab */}
                    <TabsContent value="emissions">
                      <div className="space-y-6 pt-4">
                        <KPICards periods={result.periods} />
                        <IntensityTrajectoryChart
                          trajectory={result.trajectory}
                          benchmarks={selectedSector?.pathways ?? []}
                          selectedBenchmarkIds={selectedBenchmarkIds}
                          onBenchmarkToggle={handleBenchmarkToggle}
                        />
                        <div className="grid gap-6 lg:grid-cols-2">
                          <EmissionsByMethodChart
                            transitions={result.waterfallTransitions}
                            periods={result.periods}
                          />
                          <LeverWaterfallChart
                            transitions={result.leverWaterfallTransitions}
                            periods={result.periods}
                            leverDefs={allLevers}
                          />
                        </div>
                        <PathwayComparisonTable
                          comparisons={result.pathwayComparisons}
                          periods={result.periods}
                        />
                      </div>
                    </TabsContent>

                    {/* CAPEX Tab */}
                    <TabsContent value="capex">
                      <div className="space-y-6 pt-4">
                        {/* CAPEX Scenario Selector */}
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium">CAPEX Scenario:</label>
                          <Select
                            value={store.capexScenario}
                            onValueChange={(v) => {
                              if (v) store.setCapexScenario(v as 'low' | 'mid' | 'high');
                            }}
                          >
                            <SelectTrigger className="h-9 w-32">
                              <span className="flex flex-1 text-left text-sm capitalize">
                                {store.capexScenario}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low" label="Low">Low</SelectItem>
                              <SelectItem value="mid" label="Mid">Mid</SelectItem>
                              <SelectItem value="high" label="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {capexResult && capexResult.transitions.some((t) => t.methodCapex.length > 0) ? (
                          <>
                            <CapexKpiCards capex={capexResult} scenario={store.capexScenario} />
                            <div className="grid gap-6 lg:grid-cols-2">
                              <CapexByPeriodChart capex={capexResult} />
                              <CapexByTechnologyChart capex={capexResult} />
                            </div>
                            <CapexWaterfallChart capex={capexResult} />
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-16">
                            <p className="text-sm text-muted-foreground mb-2">
                              No CAPEX data to display
                            </p>
                            <p className="text-xs text-muted-foreground/70 max-w-md text-center">
                              CAPEX is calculated when production capacity is <strong>added</strong> for a method between periods (e.g., switching from BF-BOF to H2-DRI or increasing total production).
                              If methods and shares remain unchanged across all periods, no capacity investment is required.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <p>No results available. Complete the wizard and generate the dashboard.</p>
                  </div>
                )}
              </div>
            )}

            {/* Validation Errors */}
            {attempted && currentErrors.length > 0 && store.currentStep < 7 && (
              <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <p className="mb-1.5 text-sm font-medium text-destructive">Please fix the following:</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-destructive/80">
                  {currentErrors.map((e, i) => (
                    <li key={i}>{e.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Bottom navigation */}
        <footer className="sticky bottom-0 border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-8 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={store.currentStep === 1}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            {store.currentStep < 6 && (
              <Button size="sm" onClick={goNext} className="gap-1.5">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {store.currentStep === 6 && (
              <Button size="sm" onClick={goNext} className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                {store.hasSubmitted ? 'Re-calculate' : 'Generate Dashboard'}
              </Button>
            )}
            {store.currentStep === 7 && <span />}
          </div>
        </footer>
      </main>
    </div>
  );
}
