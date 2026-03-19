'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer, ComposedChart, Area, Line, Bar, BarChart,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Cell, ReferenceLine,
} from 'recharts';
import type { PeriodResult, ScenarioData, TASResult } from '@/lib/calc-engine/types';
import { calcTAS } from '@/lib/calc-engine/cti-temperature';

interface Props {
  periods: PeriodResult[];
  scenarios: ScenarioData[];
}

// ═══════════════════════════════════════════════════════════════
//  Main TAS Dashboard
// ═══════════════════════════════════════════════════════════════

export function TASDashboard({ periods, scenarios }: Props) {
  const tas = useMemo(() => calcTAS(periods, scenarios), [periods, scenarios]);

  if (periods.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Row 1: Main Gauge + Method Comparison */}
      <div className="grid gap-4 lg:grid-cols-3">
        <TASGauge tas={tas} />
        <MethodComparisonCard tas={tas} />
        <UncertaintyCard tas={tas} />
      </div>

      {/* Row 2: Cumulative Emissions vs Budget + Sensitivity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CumulativeChart tas={tas} />
        <SensitivityChart tas={tas} />
      </div>

      {/* Note */}
      {tas.intensityNote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>Methodology Note:</strong> {tas.intensityNote}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TAS Gauge (enhanced SVG with confidence band)
// ═══════════════════════════════════════════════════════════════

function TASGauge({ tas }: { tas: TASResult }) {
  const minTemp = 1.0;
  const maxTemp = 5.0;
  const clampedTemp = Math.min(Math.max(tas.temperature, minTemp), maxTemp);
  const percent = (clampedTemp - minTemp) / (maxTemp - minTemp);

  // Confidence band
  const p10Pct = Math.min(1, Math.max(0, (tas.uncertainty.p10 - minTemp) / (maxTemp - minTemp)));
  const p90Pct = Math.min(1, Math.max(0, (tas.uncertainty.p90 - minTemp) / (maxTemp - minTemp)));

  const cx = 150, cy = 140, r = 110;
  const startAngle = Math.PI;
  const needleAngle = startAngle - percent * Math.PI;

  function describeArc(startA: number, endA: number): string {
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy - r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy - r * Math.sin(endA);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  }

  // Confidence band arc (inner arc)
  const bandR = r - 18;
  const bandStart = startAngle - p10Pct * Math.PI;
  const bandEnd = startAngle - p90Pct * Math.PI;
  function describeBandArc(sA: number, eA: number): string {
    const x1 = cx + bandR * Math.cos(sA);
    const y1 = cy - bandR * Math.sin(sA);
    const x2 = cx + bandR * Math.cos(eA);
    const y2 = cy - bandR * Math.sin(eA);
    return `M ${x1} ${y1} A ${bandR} ${bandR} 0 0 1 ${x2} ${y2}`;
  }

  const needleLen = r - 15;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Temperature Alignment Score</CardTitle>
        <p className="text-[11px] text-muted-foreground">CTI multi-method estimation (3 approaches + Monte Carlo)</p>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col items-center">
        <svg width="300" height="185" viewBox="0 0 300 185">
          <defs>
            <linearGradient id="tasGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="15%" stopColor="#059669" />
              <stop offset="30%" stopColor="#84cc16" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Background arc */}
          <path d={describeArc(Math.PI, 0)} fill="none" stroke="url(#tasGaugeGrad)" strokeWidth="22" strokeLinecap="round" />

          {/* Confidence band */}
          <path d={describeBandArc(bandStart, bandEnd)} fill="none" stroke={tas.classificationColor} strokeWidth="6" strokeLinecap="round" opacity="0.3" />

          {/* Temperature markers */}
          {[1.5, 2.0, 3.0].map((temp) => {
            const pct = (temp - minTemp) / (maxTemp - minTemp);
            const angle = Math.PI - pct * Math.PI;
            const mx = cx + (r + 14) * Math.cos(angle);
            const my = cy - (r + 14) * Math.sin(angle);
            return (
              <text key={temp} x={mx} y={my} textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)" opacity="0.6">
                {temp}°
              </text>
            );
          })}

          {/* Needle */}
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={tas.classificationColor} strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="6" fill={tas.classificationColor} />
          <circle cx={cx} cy={cy} r="3" fill="var(--color-card)" />

          {/* Temperature value */}
          <text x={cx} y={cy + 30} textAnchor="middle" fontSize="28" fontWeight="bold" fill={tas.classificationColor}>
            {tas.temperature.toFixed(1)}°C
          </text>
          <text x={cx} y={cy + 46} textAnchor="middle" fontSize="11" fill="var(--color-muted-foreground)">
            {tas.classification}
          </text>

          {/* Confidence range */}
          <text x={cx} y={cy + 62} textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)" opacity="0.7">
            80% CI: {tas.uncertainty.p10.toFixed(1)}° – {tas.uncertainty.p90.toFixed(1)}°C
          </text>
        </svg>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Method Comparison Card
// ═══════════════════════════════════════════════════════════════

function MethodComparisonCard({ tas }: { tas: TASResult }) {
  const methods = [
    { name: 'Budget Ratio', temp: tas.methods.budgetRatio.temperature, weight: '45%', color: '#6366f1', desc: 'Fair-share carbon budget (C&C allocation)' },
    { name: 'Benchmark CBD', temp: tas.methods.benchmarkDivergence.temperature, weight: '35%', color: '#10b981', desc: 'Cumulative divergence vs IEA/NGFS scenarios' },
    { name: 'Rate Analysis', temp: tas.methods.rateOfReduction.temperature, weight: '20%', color: '#f59e0b', desc: `${tas.methods.rateOfReduction.annualRate}%/yr vs sector pathways` },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Three Independent Methods</CardTitle>
        <p className="text-[11px] text-muted-foreground">Cross-validation across different methodological approaches</p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {methods.map((m) => {
          const pct = Math.min(100, Math.max(0, ((m.temp - 1.0) / 5.0) * 100));
          return (
            <div key={m.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{m.name}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{m.weight}</Badge>
                  <span className="text-sm font-bold font-mono" style={{ color: m.color }}>{m.temp.toFixed(1)}°C</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: m.color }} />
              </div>
              <p className="text-[10px] text-muted-foreground">{m.desc}</p>
            </div>
          );
        })}

        {/* Divergence indicator */}
        {(() => {
          const temps = methods.map(m => m.temp);
          const maxDiv = Math.max(...temps) - Math.min(...temps);
          return maxDiv > 0.5 ? (
            <div className="rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-2 py-1.5 text-[10px] text-amber-700 dark:text-amber-300">
              ⚠ Methods diverge by {maxDiv.toFixed(1)}°C — indicates tension between intensity and absolute emissions
            </div>
          ) : (
            <div className="rounded border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-2 py-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
              ✓ Methods converge within {maxDiv.toFixed(1)}°C — high confidence in combined estimate
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Uncertainty Distribution Card
// ═══════════════════════════════════════════════════════════════

function UncertaintyCard({ tas }: { tas: TASResult }) {
  const data = tas.uncertainty.distribution
    .filter(d => d.count > 0 || (d.tempBucket >= tas.uncertainty.p10 - 0.5 && d.tempBucket <= tas.uncertainty.p90 + 0.5))
    .map(d => ({
      temp: `${d.tempBucket.toFixed(1)}°`,
      count: d.count,
      fill: d.tempBucket <= 1.5 ? '#065f46' :
            d.tempBucket <= 2.0 ? '#059669' :
            d.tempBucket <= 2.5 ? '#84cc16' :
            d.tempBucket <= 3.0 ? '#f59e0b' :
            d.tempBucket <= 4.0 ? '#f97316' : '#ef4444',
    }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Uncertainty Distribution</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Monte Carlo simulation ({tas.uncertainty.iterations} iterations)
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-[10px]">Optimistic: {tas.uncertainty.p10.toFixed(1)}°C</Badge>
          <Badge className="text-[10px]">Median: {tas.uncertainty.median.toFixed(1)}°C</Badge>
          <Badge variant="outline" className="text-[10px]">Pessimistic: {tas.uncertainty.p90.toFixed(1)}°C</Badge>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis dataKey="temp" tick={{ fontSize: 9 }} interval={1} />
            <YAxis tick={{ fontSize: 9 }} />
            <Bar dataKey="count" isAnimationActive={false} radius={[2, 2, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Perturbs: budget ±20%, depletion ±10%, sector share ±15%, production ±5%
        </p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Cumulative Emissions vs Budget Chart
// ═══════════════════════════════════════════════════════════════

function CumulativeChart({ tas }: { tas: TASResult }) {
  // Sample every 2 years for readability
  const data = tas.yearlyBreakdown
    .filter((_, i) => i % 2 === 0 || i === tas.yearlyBreakdown.length - 1)
    .map(y => ({
      year: y.year,
      emissions: y.cumulative,
      budget: y.budgetRemaining > 0 ? y.cumulative - y.overshoot : y.cumulative - y.overshoot,
      overshoot: Math.max(0, y.overshoot),
    }));

  // Compute budget line (cumulative budget used)
  let budgetCum = 0;
  const budgetData = tas.yearlyBreakdown
    .filter((_, i) => i % 2 === 0 || i === tas.yearlyBreakdown.length - 1)
    .map(y => {
      const budgetUsed = y.cumulative - y.overshoot;
      return { year: y.year, budgetLine: Math.max(0, budgetUsed) };
    });

  const merged = data.map((d, i) => ({ ...d, budgetLine: budgetData[i]?.budgetLine ?? 0 }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Cumulative Emissions vs Carbon Budget</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Company emissions trajectory against fair-share carbon budget allocation
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={merged} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} label={{ value: 'MtCO₂', angle: -90, position: 'insideLeft', fontSize: 10 }} />
            <RechartsTooltip
              contentStyle={{
                borderRadius: '10px', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.15)',
                padding: '10px 14px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)',
              }}
            />
            <Area type="monotone" dataKey="emissions" fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeWidth={2} name="Cumulative Emissions" />
            <Line type="monotone" dataKey="budgetLine" stroke="#10b981" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Carbon Budget" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Sensitivity Analysis Chart
// ═══════════════════════════════════════════════════════════════

function SensitivityChart({ tas }: { tas: TASResult }) {
  // Production sensitivity data
  const prodData = tas.sensitivity.production.map(p => ({
    label: `${p.growthFactor}x`,
    temperature: p.temperature,
    fill: p.temperature <= 1.5 ? '#065f46' :
          p.temperature <= 2.0 ? '#059669' :
          p.temperature <= 2.5 ? '#f59e0b' :
          p.temperature <= 3.0 ? '#f97316' : '#ef4444',
  }));

  // Budget sensitivity data
  const budgetData = tas.sensitivity.budget.map(b => ({
    label: `${b.budgetGt}Gt`,
    temperature: b.temperature,
    fill: b.temperature <= 1.5 ? '#065f46' :
          b.temperature <= 2.0 ? '#059669' :
          b.temperature <= 2.5 ? '#f59e0b' :
          b.temperature <= 3.0 ? '#f97316' : '#ef4444',
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Sensitivity Analysis</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          How TAS changes with production growth and carbon budget assumptions
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          {/* Production sensitivity */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Production Growth Multiplier</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={prodData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} domain={[0, 6]} />
                <ReferenceLine y={1.5} stroke="#059669" strokeDasharray="3 3" />
                <ReferenceLine y={2.0} stroke="#84cc16" strokeDasharray="3 3" />
                <Bar dataKey="temperature" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                  {prodData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Budget sensitivity */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Carbon Budget Assumption</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={budgetData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} domain={[0, 6]} />
                <ReferenceLine y={1.5} stroke="#059669" strokeDasharray="3 3" />
                <ReferenceLine y={2.0} stroke="#84cc16" strokeDasharray="3 3" />
                <Bar dataKey="temperature" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                  {budgetData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground border-t pt-2">
          <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-emerald-600 inline-block" /> 1.5°C Paris</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-lime-500 inline-block" /> 2.0°C</span>
        </div>
      </CardContent>
    </Card>
  );
}
