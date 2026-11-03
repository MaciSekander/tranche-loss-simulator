"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { guarantorName, money, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Scenario, TrancheStatus, WaterfallResult } from "@/lib/waterfall"

type Props = { scenario: Scenario; result: WaterfallResult }

export function Kpis({ scenario: s, result: r }: Props) {
  const senior = r.rows[r.rows.length - 1]
  const g = guarantorName(s)
  const items = [
    { k: "Collateral loss", v: money(r.totalLoss), sub: `${pct(s.lossPct)} of deal`, alert: false },
    { k: `${g} pays`, v: money(r.rvgPaid), sub: r.covered ? `of ${money(r.rvgCap)} cap` : "No guarantee", alert: false },
    { k: `${senior?.name || "Senior"} loss`, v: pct(senior?.netLossPct ?? 0), sub: money(senior?.netLoss ?? 0), alert: (senior?.netLoss ?? 0) > 1e-9 },
    { k: "Senior break-even", v: senior?.breakEvenPct == null ? "Never" : pct(senior.breakEvenPct), sub: "collateral loss", alert: false },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((it) => (
        <Card key={it.k} className="min-w-0 gap-0.5 px-4 py-3">
          <span className="text-muted-foreground truncate text-[11px] tracking-wider uppercase">{it.k}</span>
          <span className={cn("font-mono text-2xl font-medium tabular-nums", it.alert && "text-loss")}>{it.v}</span>
          <span className="text-muted-foreground text-xs">{it.sub}</span>
        </Card>
      ))}
    </div>
  )
}

const STATUS_CLASS: Record<TrancheStatus, string> = {
  intact: "text-muted-foreground",
  impaired: "border-loss text-loss",
  "wiped out": "border-loss bg-loss text-card",
}

export function CapitalStack({ scenario: s, result: r }: Props) {
  const g = guarantorName(s)
  const visible = [...r.rows].reverse().filter((x) => x.sizePct > 0)
  const total = visible.reduce((a, x) => a + x.sizePct, 0) || 1

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="font-display text-base">Capital stack after losses</CardTitle>
        <CardDescription className="text-xs">
          Tower drawn to scale. Break-even is the collateral loss at which a tranche&apos;s investors first lose money.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 px-5 md:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <div role="img" aria-label="Capital stack after losses" className="flex h-[340px] flex-col overflow-hidden rounded-md border">
            {visible.map((x) => {
              const lossH = x.size ? (x.netLoss / x.size) * 100 : 0
              const rvgH = x.size ? (x.rvgCover / x.size) * 100 : 0
              return (
                <div
                  key={x.id}
                  title={`${x.name}: ${pct(x.sizePct)}`}
                  className="border-card relative flex min-h-0 flex-col-reverse overflow-hidden border-t first:border-t-0"
                  style={{ flex: `${x.sizePct / total} 1 0`, background: `color-mix(in srgb, ${x.color} 30%, var(--card))` }}
                >
                  <div className="bg-loss w-full shrink-0 transition-[height] motion-reduce:transition-none" style={{ height: `${lossH}%` }} />
                  <div className="bg-rvg w-full shrink-0 transition-[height] motion-reduce:transition-none" style={{ height: `${rvgH}%` }} />
                  {x.sizePct / total > 0.05 && (
                    <>
                      <span className="absolute top-1 left-2 text-xs font-semibold whitespace-nowrap [text-shadow:0_0_3px_var(--card)]">{x.name}</span>
                      <span className="absolute top-1 right-2 font-mono text-[11px] [text-shadow:0_0_3px_var(--card)]">{pct(x.sizePct)}</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <div className="text-muted-foreground mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5"><i className="bg-loss size-2.5 rounded-[2px]" />Investor loss</span>
            <span className="inline-flex items-center gap-1.5"><i className="bg-rvg size-2.5 rounded-[2px]" />Paid by {g}</span>
          </div>
        </div>

        <div className="min-w-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tranche</TableHead>
                {["Size", "Attach–detach", "Break-even", "Gross loss", `${g} pays`, "Net loss", "% lost"].map((h) => (
                  <TableHead key={h} className="text-right">{h}</TableHead>
                ))}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-[13px] tabular-nums">
              {[...r.rows].reverse().map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="font-sans">
                    <span className="inline-flex items-center gap-2">
                      <i className="size-2.5 rounded-[2px]" style={{ background: x.color }} />
                      {x.name || "Untitled"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{money(x.size)}</TableCell>
                  <TableCell className="text-right">{pct(x.attachPct)}–{pct(x.detachPct)}</TableCell>
                  <TableCell className="text-right">{x.breakEvenPct === null ? "Never" : pct(x.breakEvenPct)}</TableCell>
                  <TableCell className="text-right">{money(x.grossLoss)}</TableCell>
                  <TableCell className="text-right">{x.rvgCover > 0 ? money(x.rvgCover) : "—"}</TableCell>
                  <TableCell className="text-right">{money(x.netLoss)}</TableCell>
                  <TableCell className="text-right">{pct(x.netLossPct)}</TableCell>
                  <TableCell className="font-sans">
                    <Badge variant="outline" className={cn("rounded-full", STATUS_CLASS[x.status])}>{x.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
