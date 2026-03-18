'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface LeverOption {
  id: string;
  name: string;
  factor: number;
  assumptionNote: string | null;
  isDefault: boolean;
  displayOrder: number;
}

interface Lever {
  id: string;
  name: string;
  displayName: string;
  displayOrder: number;
  options: LeverOption[];
}

interface Applicability {
  lever: { id: string; name: string; displayName: string };
}

interface Method {
  id: string;
  name: string;
  baseCO2: number;
  category: string;
  commercialStatus: string | null;
  trl: string | null;
  capex: string | null;
  energyDemand: string | null;
  deploymentTimeframe: string | null;
  displayOrder: number;
  active: boolean;
  applicability: Applicability[];
}

interface AnnualRate {
  year: number;
  rate: number;
}

interface Pathway {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
  annualRates: AnnualRate[];
}

interface Sector {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  methods: Method[];
  pathways: Pathway[];
  levers: Lever[];
}

export default function AdminPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/sectors');
    const data = await res.json();
    setSectors(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading admin data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">
              Manage sectors, production methods, levers, and benchmark pathways
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-primary hover:underline"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="methods">Methods</TabsTrigger>
            <TabsTrigger value="levers">Levers</TabsTrigger>
            <TabsTrigger value="pathways">Pathways</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {sectors.map((sector) => (
              <Card key={sector.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {sector.name}
                    <Badge variant={sector.active ? 'default' : 'secondary'}>
                      {sector.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">{sector.methods.length} Production Methods</p>
                      <p className="text-muted-foreground">
                        {sector.methods.filter((m) => m.active).length} active
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{sector.levers.length} Levers</p>
                      <p className="text-muted-foreground">
                        {sector.levers.reduce((s, l) => s + l.options.length, 0)} total options
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{sector.pathways.length} Benchmark Pathways</p>
                      <p className="text-muted-foreground">
                        {sector.pathways.filter((p) => p.active).length} active
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="methods" className="mt-4">
            {sectors.map((sector) => (
              <Card key={sector.id} className="mb-6">
                <CardHeader>
                  <CardTitle>{sector.name} — Production Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Base CO2</TableHead>
                        <TableHead>TRL</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Applicable Levers</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sector.methods.map((method) => (
                        <TableRow key={method.id}>
                          <TableCell>{method.displayOrder}</TableCell>
                          <TableCell className="font-medium">{method.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{method.category}</TableCell>
                          <TableCell className="text-right font-mono">
                            {method.baseCO2.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-xs">{method.trl ?? '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={method.active ? 'default' : 'secondary'} className="text-xs">
                              {method.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <MethodApplicabilityDetails applicability={method.applicability} />
                          </TableCell>
                          <TableCell className="text-right">
                            <ToggleActiveButton
                              id={method.id}
                              name={method.name}
                              baseCO2={method.baseCO2}
                              displayOrder={method.displayOrder}
                              active={method.active}
                              onDone={loadData}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="levers" className="mt-4">
            {sectors.length > 0 && sectors[0].levers.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Decarbonization Levers & Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sectors[0].levers.map((lever) => (
                      <div key={lever.id} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="font-medium text-sm">{lever.displayName}</span>
                          <Badge variant="outline" className="text-xs">{lever.options.length} options</Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Option</TableHead>
                              <TableHead className="text-right">Factor</TableHead>
                              <TableHead className="text-right">Mitigation</TableHead>
                              <TableHead>Default</TableHead>
                              <TableHead>Assumption Note</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lever.options.map((opt) => (
                              <TableRow key={opt.id}>
                                <TableCell className="font-medium text-sm">{opt.name}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{opt.factor.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-sm">
                                  {opt.isDefault ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <span className={opt.factor < 1 ? 'text-emerald-600' : opt.factor > 1 ? 'text-red-600' : ''}>
                                      {opt.factor < 1
                                        ? `-${Math.round((1 - opt.factor) * 100)}%`
                                        : `+${Math.round((opt.factor - 1) * 100)}%`}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {opt.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                                  {opt.assumptionNote}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pathways" className="mt-4">
            {sectors.map((sector) => (
              <Card key={sector.id} className="mb-6">
                <CardHeader>
                  <CardTitle>{sector.name} — Benchmark Pathways</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Rate Points</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sector.pathways.map((pathway) => (
                        <TableRow key={pathway.id}>
                          <TableCell>{pathway.displayOrder}</TableCell>
                          <TableCell className="font-medium">{pathway.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={pathway.active ? 'default' : 'secondary'} className="text-xs">
                              {pathway.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <PathwayRatesDetail annualRates={pathway.annualRates} />
                          </TableCell>
                          <TableCell className="text-right">
                            <TogglePathwayButton
                              id={pathway.id}
                              name={pathway.name}
                              displayOrder={pathway.displayOrder}
                              active={pathway.active}
                              annualRates={pathway.annualRates}
                              onDone={loadData}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MethodApplicabilityDetails({ applicability }: { applicability: Applicability[] }) {
  if (applicability.length === 0) return <span className="text-muted-foreground text-xs">None</span>;

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="text-xs" />}
      >
        {applicability.length} lever(s)
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Applicable Levers</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {applicability.map((a) => (
            <Badge key={a.lever.id} variant="outline">
              {a.lever.displayName}
            </Badge>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PathwayRatesDetail({ annualRates }: { annualRates: AnnualRate[] }) {
  if (annualRates.length === 0) return <span className="text-muted-foreground">0</span>;

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="text-xs" />}
      >
        {annualRates.length} rates
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annual Reduction Rates</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Rate (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annualRates.map((ar) => (
                <TableRow key={ar.year}>
                  <TableCell>{ar.year}</TableCell>
                  <TableCell className="text-right font-mono">
                    {(ar.rate * 100).toFixed(3)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToggleActiveButton({
  id,
  name,
  baseCO2,
  displayOrder,
  active,
  onDone,
}: {
  id: string;
  name: string;
  baseCO2: number;
  displayOrder: number;
  active: boolean;
  onDone: () => void;
}) {
  const toggle = async () => {
    await fetch(`/api/admin/methods`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, baseCO2, displayOrder, active: !active }),
    });
    onDone();
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle}>
      {active ? 'Deactivate' : 'Activate'}
    </Button>
  );
}

function TogglePathwayButton({
  id,
  name,
  displayOrder,
  active,
  annualRates,
  onDone,
}: {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
  annualRates: AnnualRate[];
  onDone: () => void;
}) {
  const toggle = async () => {
    await fetch(`/api/admin/pathways`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, displayOrder, active: !active }),
    });
    onDone();
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle}>
      {active ? 'Deactivate' : 'Activate'}
    </Button>
  );
}
