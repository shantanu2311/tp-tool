import Link from 'next/link';
import {
  Leaf,
  ArrowRight,
  BarChart3,
  Layers,
  GitCompareArrows,
  Gauge,
  Shield,
  Zap,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">TP Tool</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin
            </Link>
            <Link
              href="/wizard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Launch App
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <Zap className="h-3 w-3 text-primary" />
            Enterprise-grade climate analytics
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Climate Transition
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Planning Tool
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Model corporate decarbonization pathways across production methods,
            analyze emission intensity trajectories, and benchmark against
            global climate targets.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/wizard"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              Start Analysis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-6 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
            >
              Manage Data
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-card/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              Everything you need for transition planning
            </h2>
            <p className="mt-2 text-muted-foreground">
              Built for sustainability teams and climate strategists.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Layers}
              title="Multi-Period Modeling"
              description="Configure production methods and decarbonization levers across Base, Short, Medium, and Long Term horizons."
            />
            <FeatureCard
              icon={GitCompareArrows}
              title="Waterfall Decomposition"
              description="Understand exactly what drives emission changes — method shifts, lever application, or proportion changes."
            />
            <FeatureCard
              icon={Gauge}
              title="Pathway Benchmarking"
              description="Compare your trajectory against Paris 1.5C, IEA NZE, SBTi SDA, and other global benchmarks."
            />
            <FeatureCard
              icon={BarChart3}
              title="Interactive Dashboard"
              description="Visualize results with KPIs, trajectory charts, and waterfall decompositions in a single view."
            />
            <FeatureCard
              icon={Shield}
              title="Scenario Builder"
              description="Step-by-step wizard guides you through building complete transition scenarios with validation."
            />
            <FeatureCard
              icon={Zap}
              title="Instant Calculations"
              description="Real-time calculation engine with live intensity previews as you configure methods and levers."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf className="h-3.5 w-3.5" />
            TP Tool
          </div>
          <p className="text-xs text-muted-foreground">
            Climate Transition Planning
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
