'use client';

import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PeriodMethodInput, MethodData, LeverDefinition } from '@/lib/calc-engine/types';
import { calcFinalIntensity } from '@/lib/calc-engine/method-intensity';
import { getSelectedFactor } from '@/lib/calc-engine/lever-factors';
import { CustomMethodDialog } from './custom-method-dialog';
import { CustomLeverDialog } from './custom-lever-dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Plus, Trash2, CheckCircle, ChevronDown, ArrowRight, Factory, Wrench, Gauge, Pencil, Info } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  periodLabel: string;
  year: number;
  totalProduction: number;
  methods: PeriodMethodInput[];
  availableMethods: MethodData[];
  leverDefs: LeverDefinition[];
  onYearChange: (year: number) => void;
  onProductionChange: (production: number) => void;
  onMethodsChange: (methods: PeriodMethodInput[]) => void;
  isBaseYear?: boolean;
  showValidation?: boolean;
  // Custom method/lever callbacks
  onAddCustomMethod?: (method: MethodData) => void;
  onUpdateCustomMethod?: (id: string, updates: Partial<MethodData>) => void;
  onRemoveCustomMethod?: (id: string) => void;
  onAddCustomLever?: (lever: LeverDefinition) => void;
  onUpdateCustomLever?: (id: string, updates: Partial<LeverDefinition>) => void;
  onRemoveCustomLever?: (id: string) => void;
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

export function PeriodInputTable({
  periodLabel,
  year,
  totalProduction,
  methods,
  availableMethods,
  leverDefs,
  onYearChange,
  onProductionChange,
  onMethodsChange,
  showValidation = false,
  onAddCustomMethod,
  onRemoveCustomMethod,
  onAddCustomLever,
  onRemoveCustomLever,
}: Props) {
  const sortedLevers = [...leverDefs].sort((a, b) => a.displayOrder - b.displayOrder);
  const [customMethodOpen, setCustomMethodOpen] = useState(false);
  const [customLeverOpen, setCustomLeverOpen] = useState(false);

  const updateMethod = useCallback(
    (index: number, updates: Partial<PeriodMethodInput>) => {
      const updated = [...methods];
      updated[index] = { ...updated[index], ...updates };
      onMethodsChange(updated);
    },
    [methods, onMethodsChange]
  );

  const addMethod = useCallback(() => {
    const usedIds = new Set(methods.map((m) => m.methodId));
    const available = availableMethods.find((m) => !usedIds.has(m.id));
    if (!available) return;

    const leverSelections: Record<string, string> = {};
    sortedLevers.forEach((l) => {
      const defaultOpt = l.options.find((o) => o.isDefault);
      if (defaultOpt) leverSelections[l.id] = defaultOpt.id;
    });

    onMethodsChange([
      ...methods,
      { methodId: available.id, methodName: available.name, share: 0, leverSelections },
    ]);
  }, [methods, availableMethods, sortedLevers, onMethodsChange]);

  const removeMethod = useCallback(
    (index: number) => onMethodsChange(methods.filter((_, i) => i !== index)),
    [methods, onMethodsChange]
  );

  // ── Computed values ──
  const totalShare = methods.reduce((s, m) => s + m.share, 0);
  const roundedShare = Math.round(totalShare * 100);
  const shareValid = roundedShare === 100;

  const methodResults = methods.map((m) => {
    const data = availableMethods.find((d) => d.id === m.methodId);
    if (!data) return { finalIntensity: 0, contribution: 0 };

    // Compute lever factors from slider values
    const leverFactors = sortedLevers.map((l) => {
      const applicable = data.applicableLevers.has(l.id);
      if (!applicable) return 0; // 0 = no effect (treated as 1 in product)

      const raw = parseInt(m.leverSelections[l.id] || '0', 10);
      const sliderValue = isNaN(raw) ? 0 : raw;
      if (sliderValue === 0) return 0; // No effect

      // factor = 1 - (slider% / 100) * maxReduction
      return 1 - (sliderValue / 100) * (l.maxReduction ?? 0);
    });

    const finalIntensity = Math.max(0, calcFinalIntensity(data.baseCO2, leverFactors));
    return { finalIntensity, contribution: finalIntensity * m.share };
  });

  const companyIntensity = methodResults.reduce((s, r) => s + r.contribution, 0);

  const existingMethodNames = availableMethods.map((m) => m.name);
  const existingLeverNames = leverDefs.map((l) => l.name);

  // ── Render ──
  return (
    <Card>
      {/* Period Header */}
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{periodLabel}</CardTitle>
        <CardAction>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Year</label>
              <Input
                type="number"
                value={year}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="h-9 w-20"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Production (MTPA)</label>
              <Input
                type="number"
                value={totalProduction}
                onChange={(e) => onProductionChange(Number(e.target.value))}
                className="h-9 w-24"
              />
            </div>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Bar */}
        {methods.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-1.5">
              {shareValid && <CheckCircle className="h-4 w-4 text-emerald-600" />}
              <span className={`text-sm font-medium ${shareValid ? 'text-emerald-600' : 'text-destructive'}`}>
                Share: {roundedShare}%
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="text-sm">
              <span className="text-muted-foreground">Intensity: </span>
              <span className="font-semibold font-mono">{companyIntensity.toFixed(3)}</span>
              <span className="text-muted-foreground ml-1">tCO2/tcs</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="text-sm">
              <span className="text-muted-foreground">Emissions: </span>
              <span className="font-semibold font-mono">{(companyIntensity * totalProduction).toFixed(1)}</span>
              <span className="text-muted-foreground ml-1">MtCO2</span>
            </div>
          </div>
        )}

        {/* Method Cards Stack */}
        <div className="space-y-4">
          {methods.map((method, i) => {
            const data = availableMethods.find((d) => d.id === method.methodId);
            const applicableLevers = sortedLevers.filter(
              (l) => data?.applicableLevers.has(l.id)
            );
            return (
              <MethodCard
                key={i}
                method={method}
                index={i}
                methodData={data}
                applicableLevers={applicableLevers}
                allMethods={availableMethods}
                sortedLevers={sortedLevers}
                finalIntensity={methodResults[i].finalIntensity}
                onUpdate={updateMethod}
                onRemove={removeMethod}
                onRemoveCustomMethod={onRemoveCustomMethod}
              />
            );
          })}
        </div>

        {/* Empty State */}
        {methods.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-12">
            <Factory className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No production methods added yet
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={addMethod} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Production Method
              </Button>
              {onAddCustomMethod && (
                <Button variant="outline" onClick={() => setCustomMethodOpen(true)} className="gap-2">
                  <Wrench className="h-4 w-4" />
                  Create Custom Method
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {methods.length > 0 && (() => {
          const hasDuplicates = new Set(methods.map(m => m.methodId)).size !== methods.length;
          const hasNegative = methods.some(m => m.share < 0);
          const hasOver100 = methods.some(m => m.share > 1);
          const showErrors = showValidation && (!shareValid || hasDuplicates || hasNegative || hasOver100 || totalProduction <= 0);

          return showErrors ? (
            <div className="rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive space-y-0.5">
              {!shareValid && <p>Method shares must total 100% (currently {roundedShare}%).</p>}
              {hasDuplicates && <p>Duplicate methods detected. Each method can only appear once.</p>}
              {hasNegative && <p>Share values cannot be negative.</p>}
              {hasOver100 && <p>Individual share cannot exceed 100%.</p>}
              {totalProduction <= 0 && <p>Production must be greater than 0.</p>}
            </div>
          ) : null;
        })()}

        {/* Footer — Add Method + Custom buttons */}
        {methods.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={addMethod}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Method
              </Button>
              {onAddCustomMethod && (
                <Button
                  variant="outline"
                  onClick={() => setCustomMethodOpen(true)}
                  className="gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  Custom Method
                </Button>
              )}
              {onAddCustomLever && (
                <Button
                  variant="outline"
                  onClick={() => setCustomLeverOpen(true)}
                  className="gap-2"
                >
                  <Gauge className="h-4 w-4" />
                  Custom Lever
                </Button>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {methods.length} method{methods.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardContent>

      {/* Custom Method Dialog */}
      {onAddCustomMethod && (
        <CustomMethodDialog
          open={customMethodOpen}
          onOpenChange={setCustomMethodOpen}
          leverDefs={leverDefs}
          existingMethodNames={existingMethodNames}
          onSave={onAddCustomMethod}
        />
      )}

      {/* Custom Lever Dialog */}
      {onAddCustomLever && (
        <CustomLeverDialog
          open={customLeverOpen}
          onOpenChange={setCustomLeverOpen}
          availableMethods={availableMethods}
          existingLeverNames={existingLeverNames}
          onSave={onAddCustomLever}
        />
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MethodCard — individual method card with metadata + levers
   ═══════════════════════════════════════════════════════════════ */

interface MethodCardProps {
  method: PeriodMethodInput;
  index: number;
  methodData: MethodData | undefined;
  applicableLevers: LeverDefinition[];
  allMethods: MethodData[];
  sortedLevers: LeverDefinition[];
  finalIntensity: number;
  onUpdate: (index: number, updates: Partial<PeriodMethodInput>) => void;
  onRemove: (index: number) => void;
  onRemoveCustomMethod?: (id: string) => void;
}

function MethodCard({
  method,
  index,
  methodData,
  applicableLevers,
  allMethods,
  sortedLevers,
  finalIntensity,
  onUpdate,
  onRemove,
  onRemoveCustomMethod,
}: MethodCardProps) {
  const [leversExpanded, setLeversExpanded] = useState(true);

  const isCustomMethod = methodData?.isCustom === true;

  // Count how many applicable levers have been changed from default
  const activeCount = applicableLevers.filter((l) => {
    const selectedId = method.leverSelections[l.id];
    const selectedOpt = l.options.find((o) => o.id === selectedId);
    return selectedOpt && !selectedOpt.isDefault;
  }).length;

  const reductionPct = methodData
    ? ((methodData.baseCO2 - finalIntensity) / methodData.baseCO2) * 100
    : 0;

  const handleMethodChange = (newMethodId: string | null) => {
    if (!newMethodId) return;
    const md = allMethods.find((d) => d.id === newMethodId);
    if (!md) return;

    const leverSelections: Record<string, string> = {};
    sortedLevers.forEach((l) => {
      const defaultOpt = l.options.find((o) => o.isDefault);
      if (defaultOpt) leverSelections[l.id] = defaultOpt.id;
    });

    onUpdate(index, { methodId: md.id, methodName: md.name, leverSelections });
  };

  const handleLeverChange = (leverId: string, optionId: string) => {
    onUpdate(index, {
      leverSelections: { ...method.leverSelections, [leverId]: optionId },
    });
  };

  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/5 overflow-hidden">
      {/* ── Card Header: Method select + Share + Delete ── */}
      <div className="flex items-start gap-4 px-5 pt-4 pb-3">
        <div className={`mt-2.5 h-3 w-3 shrink-0 rounded-full ${getCategoryColor(methodData?.category)}`} />
        <div className="flex-1 min-w-0">
          <Select value={method.methodId} onValueChange={handleMethodChange}>
            <SelectTrigger className="h-9 w-full">
              <span className="flex flex-1 text-left truncate text-sm font-medium">
                {method.methodName || allMethods.find((d) => d.id === method.methodId)?.name || 'Select method'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {/* Predefined methods */}
              {allMethods.filter((m) => !m.isCustom).map((m) => (
                <SelectItem key={m.id} value={m.id} label={m.name}>
                  <span className="text-sm">{m.name}</span>
                </SelectItem>
              ))}
              {/* Custom methods */}
              {allMethods.some((m) => m.isCustom) && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                    Custom Methods
                  </div>
                  {allMethods.filter((m) => m.isCustom).map((m) => (
                    <SelectItem key={m.id} value={m.id} label={m.name}>
                      <span className="text-sm flex items-center gap-1.5">
                        {m.name}
                        <Badge variant="outline" className="text-[10px] px-1 py-0">Custom</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-muted-foreground">Share</label>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(method.share * 100)}
              onChange={(e) => onUpdate(index, { share: Number(e.target.value) / 100 })}
              className="h-9 w-20 text-right"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Metadata Section ── */}
      {methodData && (
        <div className="px-5 pb-3 space-y-2">
          {/* Badge row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getCategoryBadgeClasses(methodData.category)}`}>
              {methodData.category}
            </span>
            {isCustomMethod && (
              <Badge variant="secondary" className="text-[10px]">Custom</Badge>
            )}
            {methodData.trl && (
              <Badge variant="outline" className="text-xs">TRL {methodData.trl}</Badge>
            )}
            {methodData.commercialStatus && (
              <Badge variant={methodData.commercialStatus === 'Commercial' ? 'secondary' : 'outline'} className="text-xs">
                {methodData.commercialStatus}
              </Badge>
            )}
            {methodData.deploymentTimeframe && (
              <Badge variant="outline" className="text-xs">{methodData.deploymentTimeframe}</Badge>
            )}
            {/* Delete custom method */}
            {isCustomMethod && onRemoveCustomMethod && (
              <button
                onClick={() => {
                  onRemoveCustomMethod(methodData.id);
                  onRemove(index);
                }}
                className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
                title="Delete custom method"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Detail line */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {methodData.capex && <span>CAPEX: {methodData.capex} USD/tpa</span>}
            {methodData.energyDemand && <span>Energy: {methodData.energyDemand}</span>}
          </div>

          {/* Description */}
          {methodData.description && (
            <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2">
              {methodData.description}
            </p>
          )}

          {/* References & Assumptions tooltip */}
          {(methodData.references || methodData.baselineAssumptions) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="inline-flex items-center gap-1 text-xs text-primary/60 hover:text-primary transition-colors cursor-help">
                  <Info className="h-3 w-3" />
                  <span>Assumptions & References</span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  {methodData.baselineAssumptions && (
                    <div className="mb-1"><strong>Assumptions:</strong> {methodData.baselineAssumptions}</div>
                  )}
                  {methodData.references && (
                    <div><strong>References:</strong> {methodData.references}</div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* ── Intensity Result Bar ── */}
      {methodData && (
        <div className="mx-5 mb-3 flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3">
          <div className="text-center">
            <p className="text-lg font-bold font-mono">{methodData.baseCO2.toFixed(3)}</p>
            <p className="text-xs text-muted-foreground">base tCO2/tcs</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="text-center">
            <p className="text-lg font-bold font-mono">{finalIntensity.toFixed(3)}</p>
            <p className="text-xs text-muted-foreground">final tCO2/tcs</p>
          </div>
          {Math.abs(reductionPct) > 0.05 && (
            <div className="ml-auto">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                reductionPct > 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {reductionPct > 0 ? '\u2193' : '\u2191'} {Math.abs(reductionPct).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Collapsible Lever Section ── */}
      {applicableLevers.length > 0 && (
        <div className="border-t">
          {/* Toggle Button */}
          <button
            type="button"
            onClick={() => setLeversExpanded(!leversExpanded)}
            className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${leversExpanded ? '' : '-rotate-90'}`} />
              <span>Decarbonisation Levers</span>
              <Badge variant="outline" className="text-xs">
                {activeCount > 0
                  ? `${activeCount} of ${applicableLevers.length} changed`
                  : `${applicableLevers.length} available`
                }
              </Badge>
            </div>
          </button>

          {/* Collapsible Content */}
          <div
            className={`overflow-hidden transition-all duration-200 ease-in-out ${
              leversExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2">
              {applicableLevers.map((lever) => {
                const rawSlider = parseInt(method.leverSelections[lever.id] || '0', 10);
                const sliderValue = isNaN(rawSlider) ? 0 : rawSlider;
                const isChanged = sliderValue > 0;
                const reductionPct = (sliderValue / 100) * (lever.maxReduction ?? 0) * 100;
                const isCustomLever = lever.isCustom === true;

                return (
                  <div
                    key={lever.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      isChanged ? 'border-primary/30 bg-primary/5' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-sm font-medium text-foreground flex-1">
                        {lever.displayName}
                      </label>
                      {(lever.description || lever.assumptions) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="text-muted-foreground/50 hover:text-primary transition-colors cursor-help">
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              {lever.description && <div className="mb-1">{lever.description}</div>}
                              {lever.assumptions && <div className="text-muted-foreground"><strong>Assumptions:</strong> {lever.assumptions}</div>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {isCustomLever && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">Custom</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mb-2">
                      0% = no action → 100% = up to {((lever.maxReduction ?? 0) * 100).toFixed(0)}% emission reduction
                    </p>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={sliderValue}
                        onChange={(v) => handleLeverChange(lever.id, String(v))}
                        min={0}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-10 text-right text-sm font-mono font-medium tabular-nums">
                        {sliderValue}%
                      </span>
                    </div>
                    {isChanged && (
                      <p className="mt-1.5 text-xs text-emerald-600 font-medium">
                        -{reductionPct.toFixed(1)}% emission reduction
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

function formatOptionLabel(name: string, factor: number, isDefault: boolean, leverType?: string): string {
  if (isDefault) return name;
  return `${name} (${formatMitigation(factor, leverType)})`;
}

function formatMitigation(factor: number, leverType?: string): string {
  if (leverType === 'delta') {
    if (factor < 0) return `${factor.toFixed(3)} tCO2/tcs`;
    if (factor > 0) return `+${factor.toFixed(3)} tCO2/tcs`;
    return '0 tCO2/tcs';
  }
  const pct = Math.round((1 - factor) * 100);
  if (pct > 0) return `-${pct}%`;
  if (pct < 0) return `+${Math.abs(pct)}%`;
  return '0%';
}

function getCategoryColor(category?: string): string {
  switch (category) {
    case 'Primary integrated':  return 'bg-amber-500';
    case 'Primary transition':  return 'bg-orange-500';
    case 'Secondary sector':    return 'bg-rose-500';
    case 'Recycling':           return 'bg-emerald-500';
    case 'Low-carbon primary':  return 'bg-teal-500';
    case 'Transitional':        return 'bg-blue-500';
    case 'Breakthrough':        return 'bg-violet-500';
    case 'Custom':              return 'bg-purple-500';
    default:                    return 'bg-gray-400';
  }
}

function getCategoryBadgeClasses(category?: string): string {
  switch (category) {
    case 'Primary integrated':  return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Primary transition':  return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Secondary sector':    return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'Recycling':           return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Low-carbon primary':  return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'Transitional':        return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Breakthrough':        return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'Custom':              return 'bg-purple-100 text-purple-800 border-purple-200';
    default:                    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
