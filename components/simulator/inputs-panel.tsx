"use client"

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { guarantorName, money, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  MAX_TRANCHES,
  TRANCHE_COLORS,
  type RvgBasis,
  type Scenario,
  type Tranche,
  type WaterfallResult,
} from "@/lib/waterfall"

type Props = {
  scenario: Scenario
  result: WaterfallResult
  onChange: (patch: Partial<Scenario>) => void
}

const NONE = "none"

export function InputsPanel({ scenario: s, result: r, onChange }: Props) {
  const stackOk = Math.abs(r.stackPct - 100) < 0.01
  const g = guarantorName(s)

  const setTranches = (tranches: Tranche[]) => {
    const rvgOn = tranches.some((t) => t.id === s.rvgOn) ? s.rvgOn : null
    onChange({ tranches, rvgOn })
  }
  const updateTranche = (id: string, patch: Partial<Tranche>) =>
    setTranches(s.tranches.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const move = (i: number, dir: 1 | -1) => {
    const next = [...s.tranches]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setTranches(next)
  }
  const remove = (i: number) => setTranches(s.tranches.filter((_, k) => k !== i))
  const add = () => {
    if (s.tranches.length >= MAX_TRANCHES) return
    const id = "t" + Date.now().toString(36)
    const next = [...s.tranches]
    // A new tranche goes just below the most senior one, as a mezzanine layer.
    next.splice(Math.max(0, next.length - 1), 0, { id, name: "Mezz", sizePct: 0 })
    setTranches(next)
  }

  // Shown senior first, so the editor reads like the capital stack.
  const ordered = s.tranches.map((t, i) => ({ t, i })).reverse()

  return (
    <Card className="gap-0 py-5">
      <CardHeader className="px-5 pb-4">
        <CardTitle className="font-display text-base">Deal</CardTitle>
        <CardDescription className="text-xs">Tranche sizes are % of the total deal.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="deal">Deal size</Label>
          <div className="border-input bg-background focus-within:ring-ring/50 flex items-center gap-1.5 rounded-md border px-3 font-mono text-lg focus-within:ring-[3px]">
            <span className="text-muted-foreground" aria-hidden>$</span>
            <input
              id="deal"
              type="number"
              inputMode="decimal"
              min={0.1}
              step={0.5}
              value={s.dealSize}
              onChange={(e) => onChange({ dealSize: Math.max(0, Number(e.target.value) || 0) })}
              className="min-w-0 flex-1 bg-transparent py-1.5 tabular-nums outline-none"
            />
            <span className="text-muted-foreground" aria-hidden>B</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="loss">Collateral loss</Label>
            <span className="font-mono text-sm tabular-nums">{pct(s.lossPct)}</span>
          </div>
          <Slider
            id="loss"
            min={0}
            max={100}
            step={0.5}
            value={[s.lossPct]}
            onValueChange={([v]) => onChange({ lossPct: v })}
            aria-label="Collateral loss"
          />
          <p className="text-muted-foreground text-xs">
            {money(r.totalLoss)} of the {money(s.dealSize)} deal
          </p>
        </div>

        <section className="flex flex-col gap-3 border-t pt-4">
          <h3 className="font-display text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Capital stack
          </h3>
          <p className="text-muted-foreground -mt-1 text-xs">Senior at top. Losses hit the bottom first.</p>
          <div className="flex flex-col gap-1.5">
            {ordered.map(({ t, i }) => (
              <div key={t.id} className="grid grid-cols-[10px_minmax(0,1fr)_68px_auto] items-center gap-1.5">
                <span className="size-2.5 rounded-[2px]" style={{ background: TRANCHE_COLORS[i % TRANCHE_COLORS.length] }} />
                <Input
                  value={t.name}
                  maxLength={24}
                  onChange={(e) => updateTranche(t.id, { name: e.target.value })}
                  aria-label="Tranche name"
                  className="h-8"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={t.sizePct}
                  onChange={(e) => updateTranche(t.id, { sizePct: Math.max(0, Number(e.target.value) || 0) })}
                  aria-label={`${t.name} size, % of deal`}
                  className="h-8 text-right font-mono tabular-nums"
                />
                <div className="flex">
                  <Button variant="ghost" size="icon-sm" onClick={() => move(i, 1)} disabled={i === s.tranches.length - 1} aria-label={`Move ${t.name} up`}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${t.name} down`}>
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(i)} disabled={s.tranches.length <= 1} aria-label={`Remove ${t.name}`}>
                    <X />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={add} disabled={s.tranches.length >= MAX_TRANCHES}>
              <Plus /> Add tranche
            </Button>
            <span className={cn("font-mono text-xs tabular-nums", stackOk ? "text-muted-foreground" : "text-loss")}>
              Total {pct(r.stackPct)}
            </span>
          </div>
          {!stackOk && (
            <p className="text-loss text-xs">
              Tranches add up to {pct(r.stackPct)} of the deal. Adjust sizes so the stack covers 100%.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4 border-t pt-4">
          <h3 className="font-display text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Residual value guarantee
          </h3>
          <div className="flex flex-col gap-2">
            <Label htmlFor="guarantor">Guarantor</Label>
            <Input
              id="guarantor"
              value={s.guarantor}
              maxLength={40}
              placeholder="e.g. Nvidia"
              onChange={(e) => onChange({ guarantor: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rvgOn">Covers</Label>
            <Select value={s.rvgOn ?? NONE} onValueChange={(v) => onChange({ rvgOn: v === NONE ? null : v })}>
              <SelectTrigger id="rvgOn" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No guarantee</SelectItem>
                {[...s.tranches].reverse().map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name || "Untitled"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="rvg">Guarantee size</Label>
              <span className="font-mono text-sm tabular-nums">{pct(s.rvgPct)}</span>
            </div>
            <Slider
              id="rvg"
              min={0}
              max={100}
              step={0.5}
              value={[s.rvgPct]}
              onValueChange={([v]) => onChange({ rvgPct: v })}
              aria-label="Guarantee size"
            />
            <div role="group" aria-label="Guarantee is a percent of" className="grid grid-cols-2 overflow-hidden rounded-md border">
              {(
                [
                  ["deal", "% of deal"],
                  ["tranche", "% of covered tranche"],
                ] as [RvgBasis, string][]
              ).map(([basis, label]) => (
                <button
                  key={basis}
                  type="button"
                  aria-pressed={s.rvgBasis === basis}
                  onClick={() => onChange({ rvgBasis: basis })}
                  className={cn(
                    "focus-visible:ring-ring/50 px-2 py-1.5 text-xs outline-none focus-visible:ring-[3px] [&+&]:border-l",
                    s.rvgBasis === basis
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              {r.covered
                ? `Caps ${g}'s payments at ${money(r.rvgCap)}, against a ${r.covered.name || "covered"} tranche of ${money(r.covered.size)}.`
                : "No guarantee applied."}
            </p>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
