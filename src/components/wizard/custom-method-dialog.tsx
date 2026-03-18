'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { MethodData, LeverDefinition, CapexNumeric } from '@/lib/calc-engine/types';
import { ChevronDown, Wrench } from 'lucide-react';

interface CustomMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leverDefs: LeverDefinition[];
  existingMethodNames: string[];
  onSave: (method: MethodData) => void;
  editingMethod?: MethodData;
}

interface FormState {
  name: string;
  baseCO2: string;
  category: string;
  trl: string;
  capexLow: string;
  capexMid: string;
  capexHigh: string;
  energyDemand: string;
  deploymentTimeframe: string;
  description: string;
  references: string;
  applicableLeverIds: Set<string>;
}

const emptyForm: FormState = {
  name: '',
  baseCO2: '',
  category: '',
  trl: '',
  capexLow: '',
  capexMid: '',
  capexHigh: '',
  energyDemand: '',
  deploymentTimeframe: '',
  description: '',
  references: '',
  applicableLeverIds: new Set(),
};

export function CustomMethodDialog({
  open,
  onOpenChange,
  leverDefs,
  existingMethodNames,
  onSave,
  editingMethod,
}: CustomMethodDialogProps) {
  const [form, setForm] = useState<FormState>(() => {
    if (editingMethod) {
      return {
        name: editingMethod.name,
        baseCO2: String(editingMethod.baseCO2),
        category: editingMethod.category || '',
        trl: editingMethod.trl || '',
        capexLow: editingMethod.capexNumeric?.low ? String(editingMethod.capexNumeric.low) : '',
        capexMid: editingMethod.capexNumeric?.mid ? String(editingMethod.capexNumeric.mid) : '',
        capexHigh: editingMethod.capexNumeric?.high ? String(editingMethod.capexNumeric.high) : '',
        energyDemand: editingMethod.energyDemand || '',
        deploymentTimeframe: editingMethod.deploymentTimeframe || '',
        description: editingMethod.description || '',
        references: editingMethod.references || '',
        applicableLeverIds: new Set(editingMethod.applicableLevers),
      };
    }
    return { ...emptyForm, applicableLeverIds: new Set<string>() };
  });

  const [optionalExpanded, setOptionalExpanded] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleLever = useCallback((leverId: string) => {
    setForm((prev) => {
      const next = new Set(prev.applicableLeverIds);
      if (next.has(leverId)) {
        next.delete(leverId);
      } else {
        next.add(leverId);
      }
      return { ...prev, applicableLeverIds: next };
    });
  }, []);

  const validate = useCallback((): string[] => {
    const errs: string[] = [];
    const trimmedName = form.name.trim();
    if (!trimmedName) errs.push('Method name is required.');
    if (
      trimmedName &&
      existingMethodNames.some((n) => n.toLowerCase() === trimmedName.toLowerCase()) &&
      (!editingMethod || editingMethod.name.toLowerCase() !== trimmedName.toLowerCase())
    ) {
      errs.push('A method with this name already exists.');
    }
    const baseCO2 = parseFloat(form.baseCO2);
    if (isNaN(baseCO2) || baseCO2 <= 0) {
      errs.push('Base CO2 intensity must be a positive number.');
    }
    // Validate CAPEX if any provided
    const capexLow = form.capexLow ? parseFloat(form.capexLow) : null;
    const capexMid = form.capexMid ? parseFloat(form.capexMid) : null;
    const capexHigh = form.capexHigh ? parseFloat(form.capexHigh) : null;
    if (capexLow !== null && (isNaN(capexLow) || capexLow < 0)) errs.push('CAPEX Low must be a non-negative number.');
    if (capexMid !== null && (isNaN(capexMid) || capexMid < 0)) errs.push('CAPEX Mid must be a non-negative number.');
    if (capexHigh !== null && (isNaN(capexHigh) || capexHigh < 0)) errs.push('CAPEX High must be a non-negative number.');
    if (capexLow !== null && capexHigh !== null && capexLow > capexHigh) {
      errs.push('CAPEX Low cannot be greater than CAPEX High.');
    }
    return errs;
  }, [form, existingMethodNames, editingMethod]);

  const handleSave = useCallback(() => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);

    const baseCO2 = parseFloat(form.baseCO2);
    const capexLow = form.capexLow ? parseFloat(form.capexLow) : null;
    const capexMid = form.capexMid ? parseFloat(form.capexMid) : null;
    const capexHigh = form.capexHigh ? parseFloat(form.capexHigh) : null;

    let capexNumeric: CapexNumeric | undefined;
    if (capexLow !== null || capexMid !== null || capexHigh !== null) {
      const low = capexLow ?? capexMid ?? capexHigh ?? 0;
      const high = capexHigh ?? capexMid ?? capexLow ?? 0;
      const mid = capexMid ?? (low + high) / 2;
      capexNumeric = { low, mid, high };
    }

    // Build display string for capex
    let capexStr: string | undefined;
    if (capexNumeric) {
      capexStr = capexNumeric.low === capexNumeric.high
        ? `${capexNumeric.low}`
        : `${capexNumeric.low}–${capexNumeric.high}`;
    }

    const method: MethodData = {
      id: editingMethod?.id ?? `custom-method-${crypto.randomUUID()}`,
      name: form.name.trim(),
      baseCO2,
      category: form.category.trim() || 'Custom',
      commercialStatus: undefined,
      trl: form.trl.trim() || undefined,
      capex: capexStr,
      capexNumeric,
      energyDemand: form.energyDemand.trim() || undefined,
      deploymentTimeframe: form.deploymentTimeframe.trim() || undefined,
      description: form.description.trim() || undefined,
      references: form.references.trim() || undefined,
      applicableLevers: new Set(form.applicableLeverIds),
      isCustom: true,
    };

    onSave(method);
    onOpenChange(false);

    // Reset form
    setForm({ ...emptyForm, applicableLeverIds: new Set<string>() });
    setOptionalExpanded(false);
  }, [form, validate, editingMethod, onSave, onOpenChange]);

  const sortedLevers = [...leverDefs].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {editingMethod ? 'Edit Custom Method' : 'Create Custom Method'}
          </DialogTitle>
          <DialogDescription>
            Define a custom production method with its emission intensity and lever applicability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Required Fields ── */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="cm-name" className="text-sm font-medium">
                Method Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cm-name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Hydrogen DRI – Green"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="cm-baseco2" className="text-sm font-medium">
                Base CO2 Intensity (tCO2/tcs) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cm-baseco2"
                type="number"
                step="0.001"
                min="0"
                value={form.baseCO2}
                onChange={(e) => updateField('baseCO2', e.target.value)}
                placeholder="e.g., 0.400"
                className="mt-1"
              />
            </div>

            {/* Lever Applicability */}
            <div>
              <Label className="text-sm font-medium">Lever Applicability</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select which decarbonisation levers apply to this method.
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 max-h-48 overflow-y-auto">
                {sortedLevers.map((lever) => (
                  <label
                    key={lever.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1"
                  >
                    <Checkbox
                      checked={form.applicableLeverIds.has(lever.id)}
                      onCheckedChange={() => toggleLever(lever.id)}
                    />
                    <span className="truncate">{lever.displayName}</span>
                  </label>
                ))}
                {sortedLevers.length === 0 && (
                  <p className="text-xs text-muted-foreground col-span-2">No levers available</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Optional Fields (collapsible) ── */}
          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setOptionalExpanded(!optionalExpanded)}
              className="flex w-full items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <span>Optional Details</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  optionalExpanded ? '' : '-rotate-90'
                }`}
              />
            </button>

            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                optionalExpanded ? 'max-h-[1000px] opacity-100 mt-3' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cm-category" className="text-xs">Category</Label>
                    <Input
                      id="cm-category"
                      value={form.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      placeholder="e.g., Low-carbon primary"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cm-trl" className="text-xs">TRL</Label>
                    <Input
                      id="cm-trl"
                      value={form.trl}
                      onChange={(e) => updateField('trl', e.target.value)}
                      placeholder="e.g., 6-7"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>

                {/* CAPEX Low/Mid/High */}
                <div>
                  <Label className="text-xs">CAPEX (USD/tpa)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div>
                      <span className="text-xs text-muted-foreground">Low</span>
                      <Input
                        type="number"
                        min="0"
                        value={form.capexLow}
                        onChange={(e) => updateField('capexLow', e.target.value)}
                        placeholder="300"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Mid</span>
                      <Input
                        type="number"
                        min="0"
                        value={form.capexMid}
                        onChange={(e) => updateField('capexMid', e.target.value)}
                        placeholder="450"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">High</span>
                      <Input
                        type="number"
                        min="0"
                        value={form.capexHigh}
                        onChange={(e) => updateField('capexHigh', e.target.value)}
                        placeholder="600"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cm-energy" className="text-xs">Energy Demand</Label>
                    <Input
                      id="cm-energy"
                      value={form.energyDemand}
                      onChange={(e) => updateField('energyDemand', e.target.value)}
                      placeholder="e.g., 3.5 GJ/tcs"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cm-timeframe" className="text-xs">Deployment Timeframe</Label>
                    <Input
                      id="cm-timeframe"
                      value={form.deploymentTimeframe}
                      onChange={(e) => updateField('deploymentTimeframe', e.target.value)}
                      placeholder="e.g., 2030+"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cm-desc" className="text-xs">Description</Label>
                  <textarea
                    id="cm-desc"
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Brief description of this production method..."
                    rows={2}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>

                <div>
                  <Label htmlFor="cm-refs" className="text-xs">References</Label>
                  <textarea
                    id="cm-refs"
                    value={form.references}
                    onChange={(e) => updateField('references', e.target.value)}
                    placeholder="Sources, papers, links..."
                    rows={2}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive space-y-0.5">
              {errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleSave}>
            {editingMethod ? 'Update Method' : 'Create Method'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
