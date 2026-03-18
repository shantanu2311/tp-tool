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
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type {
  MethodData,
  LeverDefinition,
  LeverOptionData,
  CustomLeverType,
} from '@/lib/calc-engine/types';
import { ChevronDown, Plus, Trash2, Gauge } from 'lucide-react';

interface CustomLeverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableMethods: MethodData[];
  existingLeverNames: string[];
  onSave: (lever: LeverDefinition) => void;
  editingLever?: LeverDefinition;
}

interface OptionRow {
  id: string;
  name: string;
  value: string; // raw input — interpreted based on lever type
  isDefault: boolean;
  assumptionNote: string;
}

interface FormState {
  name: string;
  displayName: string;
  leverType: CustomLeverType;
  applicableMethodIds: Set<string>;
  options: OptionRow[];
  category: string;
  description: string;
  assumptions: string;
}

function makeDefaultOption(): OptionRow {
  return {
    id: `custom-opt-${crypto.randomUUID()}`,
    name: 'No change',
    value: '',
    isDefault: true,
    assumptionNote: '',
  };
}

export function CustomLeverDialog({
  open,
  onOpenChange,
  availableMethods,
  existingLeverNames,
  onSave,
  editingLever,
}: CustomLeverDialogProps) {
  const [form, setForm] = useState<FormState>(() => {
    if (editingLever) {
      return {
        name: editingLever.name,
        displayName: editingLever.displayName,
        leverType: editingLever.leverType ?? 'factor',
        applicableMethodIds: new Set(editingLever.applicableMethodIds ?? []),
        options: editingLever.options.map((o) => ({
          id: o.id,
          name: o.name,
          value: o.isDefault ? '' : String(o.factor),
          isDefault: o.isDefault,
          assumptionNote: o.assumptionNote ?? '',
        })),
        category: editingLever.category ?? '',
        description: editingLever.description ?? '',
        assumptions: editingLever.assumptions ?? '',
      };
    }
    return {
      name: '',
      displayName: '',
      leverType: 'percentage' as CustomLeverType,
      applicableMethodIds: new Set<string>(),
      options: [makeDefaultOption()],
      category: '',
      description: '',
      assumptions: '',
    };
  });

  const [optionalExpanded, setOptionalExpanded] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleMethod = useCallback((methodId: string) => {
    setForm((prev) => {
      const next = new Set(prev.applicableMethodIds);
      if (next.has(methodId)) next.delete(methodId);
      else next.add(methodId);
      return { ...prev, applicableMethodIds: next };
    });
  }, []);

  const addOption = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        {
          id: `custom-opt-${crypto.randomUUID()}`,
          name: '',
          value: '',
          isDefault: false,
          assumptionNote: '',
        },
      ],
    }));
  }, []);

  const removeOption = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }, []);

  const updateOption = useCallback((index: number, updates: Partial<OptionRow>) => {
    setForm((prev) => {
      const options = [...prev.options];
      options[index] = { ...options[index], ...updates };
      // If setting this as default, unset others
      if (updates.isDefault) {
        options.forEach((o, i) => {
          if (i !== index) o.isDefault = false;
        });
      }
      return { ...prev, options };
    });
  }, []);

  const getValueLabel = (): string => {
    switch (form.leverType) {
      case 'factor': return 'Factor';
      case 'percentage': return 'Reduction %';
      case 'delta': return 'Delta (tCO2/tcs)';
    }
  };

  const getValuePlaceholder = (): string => {
    switch (form.leverType) {
      case 'factor': return 'e.g., 0.90';
      case 'percentage': return 'e.g., 10';
      case 'delta': return 'e.g., -0.15';
    }
  };

  /** Converts raw user input to the stored factor value */
  const toFactor = (rawValue: string, leverType: CustomLeverType): number => {
    const num = parseFloat(rawValue);
    if (isNaN(num)) return 1;
    switch (leverType) {
      case 'factor': return num;
      case 'percentage': return 1 - num / 100;
      case 'delta': return num; // For delta, "factor" stores the delta value
    }
  };

  const validate = useCallback((): string[] => {
    const errs: string[] = [];
    const trimmedName = form.name.trim();
    if (!trimmedName) errs.push('Lever name is required.');
    if (
      trimmedName &&
      existingLeverNames.some((n) => n.toLowerCase() === trimmedName.toLowerCase()) &&
      (!editingLever || editingLever.name.toLowerCase() !== trimmedName.toLowerCase())
    ) {
      errs.push('A lever with this name already exists.');
    }
    if (!form.displayName.trim()) errs.push('Display name is required.');
    if (form.applicableMethodIds.size === 0) errs.push('Select at least one applicable method.');
    if (form.options.length === 0) errs.push('At least one option is required.');
    if (!form.options.some((o) => o.isDefault)) errs.push('Exactly one option must be marked as default.');
    if (form.options.filter((o) => o.isDefault).length > 1) errs.push('Only one option can be the default.');

    // Validate non-default options have names and valid values
    for (const opt of form.options) {
      if (!opt.isDefault && !opt.name.trim()) {
        errs.push('All non-default options must have a name.');
        break;
      }
      if (!opt.isDefault && opt.value) {
        const num = parseFloat(opt.value);
        if (isNaN(num)) {
          errs.push(`Option "${opt.name}" has an invalid value.`);
          break;
        }
      }
    }

    return errs;
  }, [form, existingLeverNames, editingLever]);

  const handleSave = useCallback(() => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);

    // Build lever options
    const leverOptions: LeverOptionData[] = form.options.map((opt, i) => ({
      id: opt.id,
      name: opt.isDefault ? (opt.name.trim() || 'No change') : opt.name.trim(),
      factor: opt.isDefault ? 1.0 : toFactor(opt.value, form.leverType),
      assumptionNote: opt.assumptionNote.trim() || undefined,
      isDefault: opt.isDefault,
    }));

    const lever: LeverDefinition = {
      id: editingLever?.id ?? `custom-lever-${crypto.randomUUID()}`,
      name: form.name.trim(),
      displayName: form.displayName.trim(),
      displayOrder: 999, // Custom levers appear after predefined
      maxReduction: 0.10, // Default 10% max reduction for custom levers
      options: leverOptions,
      isCustom: true,
      leverType: form.leverType,
      applicableMethodIds: new Set(form.applicableMethodIds),
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      assumptions: form.assumptions.trim() || undefined,
    };

    onSave(lever);
    onOpenChange(false);

    // Reset form
    setForm({
      name: '',
      displayName: '',
      leverType: 'percentage',
      applicableMethodIds: new Set<string>(),
      options: [makeDefaultOption()],
      category: '',
      description: '',
      assumptions: '',
    });
    setOptionalExpanded(false);
  }, [form, validate, editingLever, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            {editingLever ? 'Edit Custom Lever' : 'Create Custom Lever'}
          </DialogTitle>
          <DialogDescription>
            Define a custom decarbonisation lever with options and applicable methods.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Required Fields ── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cl-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cl-name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., hydrogen_blend"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cl-display" className="text-sm font-medium">
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cl-display"
                  value={form.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  placeholder="e.g., Hydrogen Blending"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Lever Type */}
            <div>
              <Label className="text-sm font-medium">
                Lever Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.leverType}
                onValueChange={(v) => {
                  if (v) updateField('leverType', v as CustomLeverType);
                }}
              >
                <SelectTrigger className="mt-1 h-9">
                  <span className="flex flex-1 text-left text-sm">
                    {form.leverType === 'factor' && 'Factor (multiplicative)'}
                    {form.leverType === 'percentage' && 'Percentage reduction'}
                    {form.leverType === 'delta' && 'Delta (additive tCO2/tcs)'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage" label="Percentage reduction">
                    <div>
                      <span className="text-sm">Percentage reduction</span>
                      <p className="text-xs text-muted-foreground">Enter reduction %, stored as factor = 1 - %/100</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="factor" label="Factor (multiplicative)">
                    <div>
                      <span className="text-sm">Factor (multiplicative)</span>
                      <p className="text-xs text-muted-foreground">Direct multiplicative factor (e.g., 0.92 = 8% reduction)</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="delta" label="Delta (additive)">
                    <div>
                      <span className="text-sm">Delta (additive tCO2/tcs)</span>
                      <p className="text-xs text-muted-foreground">Additive change to intensity (e.g., -0.15)</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Applicable Methods */}
            <div>
              <Label className="text-sm font-medium">
                Applicable Methods <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select which production methods this lever can be applied to.
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 max-h-36 overflow-y-auto">
                {availableMethods.map((method) => (
                  <label
                    key={method.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1"
                  >
                    <Checkbox
                      checked={form.applicableMethodIds.has(method.id)}
                      onCheckedChange={() => toggleMethod(method.id)}
                    />
                    <span className="truncate">{method.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Options Table */}
            <div>
              <Label className="text-sm font-medium">
                Options <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Define dropdown options. One must be the default (no change).
              </p>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div
                    key={opt.id}
                    className={`rounded-lg border p-3 space-y-2 ${
                      opt.isDefault ? 'border-primary/30 bg-primary/5' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          value={opt.name}
                          onChange={(e) => updateOption(i, { name: e.target.value })}
                          placeholder={opt.isDefault ? 'Default (e.g., No change)' : 'Option name'}
                          className="h-8 text-sm"
                        />
                      </div>
                      {!opt.isDefault && (
                        <div className="w-28">
                          <Input
                            type="number"
                            step="any"
                            value={opt.value}
                            onChange={(e) => updateOption(i, { value: e.target.value })}
                            placeholder={getValuePlaceholder()}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Checkbox
                          checked={opt.isDefault}
                          onCheckedChange={() => updateOption(i, { isDefault: true })}
                        />
                        Default
                      </label>
                      {form.options.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(i)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {!opt.isDefault && (
                      <Input
                        value={opt.assumptionNote}
                        onChange={(e) => updateOption(i, { assumptionNote: e.target.value })}
                        placeholder="Assumption note (optional)"
                        className="h-7 text-xs"
                      />
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Option
                </Button>
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
                optionalExpanded ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cl-category" className="text-xs">Category</Label>
                  <Input
                    id="cl-category"
                    value={form.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    placeholder="e.g., Fuel switching"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="cl-desc" className="text-xs">Description</Label>
                  <textarea
                    id="cl-desc"
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="What this lever represents..."
                    rows={2}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
                <div>
                  <Label htmlFor="cl-assumptions" className="text-xs">Assumptions</Label>
                  <textarea
                    id="cl-assumptions"
                    value={form.assumptions}
                    onChange={(e) => updateField('assumptions', e.target.value)}
                    placeholder="Key assumptions underlying this lever..."
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
            {editingLever ? 'Update Lever' : 'Create Lever'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
