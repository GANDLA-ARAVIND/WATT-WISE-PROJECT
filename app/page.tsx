import Link from "next/link";
import { ArrowRight, BarChart3, Cpu, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/Logo";

export default function LandingPage() {
  const uploadRedirect = encodeURIComponent("/dashboard");
  const loginRedirect = `/login?redirectedFrom=${uploadRedirect}`;
  const signupRedirect = `/register?redirectedFrom=${uploadRedirect}`;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link href={signupRedirect} className="hover:text-foreground">
            Get Started
          </Link>
          <Link href={loginRedirect} className="hover:text-foreground">
            Analyze Bill
          </Link>
          <Link href={signupRedirect} className="hover:text-foreground">
            Dashboard Preview
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={signupRedirect}>Start free</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-20 pt-6 sm:px-6">
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <Badge className="w-fit">AI-Powered Energy Intelligence</Badge>
            <h1 className="text-balance text-4xl font-semibold leading-tight md:text-5xl">
              Upload a bill. Understand the cost. See what changes next.
            </h1>
            <p className="text-lg text-muted">
              WattWise is a guided household energy workspace that turns one bill into forecasts, recommendations, and appliance-level estimates users can actually understand.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href={signupRedirect}>
                  Upload a bill <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href={loginRedirect}>I already have an account</Link>
              </Button>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted">
              <div>
                <div className="text-2xl font-semibold text-foreground">$312</div>
                <div>avg annual savings</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground">24/7</div>
                <div>automated monitoring</div>
              </div>
            </div>
          </div>

          <Card className="relative overflow-hidden">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted">Home Energy Score</div>
                  <div className="text-3xl font-semibold">A-</div>
                </div>
                <Badge variant="success">+12% month over month</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Smart HVAC", value: "Optimized" },
                  { label: "Peak Load", value: "1.4 kW" },
                  { label: "Solar Offset", value: "38%" },
                  { label: "EV Charge", value: "Scheduled" }
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-background p-3">
                    <div className="text-muted">{item.label}</div>
                    <div className="font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 p-4 text-sm">
                AI forecast: Next month is trending higher, with cooling likely driving most of the increase.
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Cpu,
              title: "Predictive automation",
              description:
                "WattWise learns your household rhythm and automates savings while keeping comfort intact."
            },
            {
              icon: BarChart3,
              title: "Granular analytics",
              description:
                "Daily usage, device-level breakdowns, and AI forecasts in one unified dashboard."
            },
            {
              icon: Shield,
              title: "Secure by design",
              description:
                "Enterprise-grade privacy controls and encrypted household energy data."
            }
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardContent className="space-y-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-lg font-semibold">{feature.title}</div>
                  <p className="text-sm text-muted">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="rounded-3xl border border-border bg-gradient-to-r from-secondary/15 via-transparent to-primary/15 p-10 text-center">
          <h2 className="text-3xl font-semibold">
            Ready to unlock AI-powered energy clarity?
          </h2>
          <p className="mt-3 text-sm text-muted">
            Launch WattWise in minutes and watch your energy intelligence evolve.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
              <Link href={signupRedirect}>Create account</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href={loginRedirect}>Sign in to upload a bill</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
