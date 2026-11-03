"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Copy, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { summaryText } from "@/lib/format"
import { EXAMPLE, isScenario, runWaterfall, type Scenario } from "@/lib/waterfall"

import { InputsPanel } from "./inputs-panel"
import { ModelNotes } from "./model-notes"
import { CapitalStack, Kpis } from "./results"
import { WhoPaysChart } from "./who-pays-chart"

const STORE_KEY = "tranche-loss-simulator:v1"

export function TrancheSimulator() {
  const [scenario, setScenario] = useState<Scenario>(EXAMPLE)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [fallbackText, setFallbackText] = useState<string | null>(null)
  const fallbackRef = useRef<HTMLTextAreaElement>(null)

  // Restore the viewer's last scenario after mount, so server and client render the same first frame.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) {
        const saved: unknown = JSON.parse(raw)
        if (isScenario(saved)) setScenario(saved)
      }
    } catch {
      // Storage unavailable (private window, blocked site data): keep the example.
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(scenario))
    } catch {
      // Not saving is fine; the tool still works.
    }
  }, [scenario, loaded])

  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(null), 1800)
    return () => clearTimeout(t)
  }, [status])

  useEffect(() => {
    if (fallbackText !== null) fallbackRef.current?.select()
  }, [fallbackText])

  const result = useMemo(() => runWaterfall(scenario), [scenario])
  const update = (patch: Partial<Scenario>) => setScenario((s) => ({ ...s, ...patch }))

  const copySummary = async () => {
    const text = summaryText(scenario, result)
    try {
      await navigator.clipboard.writeText(text)
      setFallbackText(null)
      setStatus("Summary copied")
    } catch {
      setFallbackText(text)
    }
  }

  const reset = () => {
    setScenario(EXAMPLE)
    setFallbackText(null)
    setStatus("Reset to the example deal")
  }

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-7 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-primary font-mono text-[11px] tracking-[0.08em] uppercase">GPU-backed structured credit</span>
          <h1 className="font-display text-3xl leading-tight font-semibold">Tranche Loss Simulator</h1>
          <p className="text-muted-foreground max-w-[72ch] text-sm">
            Model how losses on a GPU and data center financing flow through the capital stack, and how much a
            residual value guarantee absorbs. Set the deal, shape the tranches, choose where the guarantee sits, then
            stress the collateral.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span role="status" className="text-muted-foreground text-xs">
            {status && (
              <span className="inline-flex items-center gap-1">
                <Check className="size-3.5" />
                {status}
              </span>
            )}
          </span>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw /> Reset to example
          </Button>
          <Button size="sm" onClick={copySummary}>
            <Copy /> Copy summary
          </Button>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <InputsPanel scenario={scenario} result={result} onChange={update} />
        <div className="flex min-w-0 flex-col gap-5">
          <Kpis scenario={scenario} result={result} />
          <CapitalStack scenario={scenario} result={result} />
          <WhoPaysChart scenario={scenario} result={result} />
          <ModelNotes scenario={scenario} result={result} />
          {fallbackText !== null && (
            <Card className="gap-3 py-5">
              <CardHeader className="px-5">
                <CardTitle className="font-display text-base">Scenario summary</CardTitle>
                <CardDescription className="text-xs">
                  Your browser blocked copying. Select the text and copy it with Ctrl+C or Cmd+C.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5">
                <textarea
                  ref={fallbackRef}
                  readOnly
                  value={fallbackText}
                  aria-label="Scenario summary"
                  className="bg-background min-h-40 w-full rounded-md border p-2.5 font-mono text-xs"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
