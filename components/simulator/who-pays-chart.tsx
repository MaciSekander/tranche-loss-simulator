"use client"

import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { money } from "@/lib/format"
import { runWaterfall, whoPaysLayers, whoPaysSweep, type Scenario, type WaterfallResult } from "@/lib/waterfall"

type Props = { scenario: Scenario; result: WaterfallResult }

export function WhoPaysChart({ scenario: s, result: r }: Props) {
  const layers = whoPaysLayers(s, r.stackPct)
  const data = useMemo(() => whoPaysSweep(s), [s])
  const config: ChartConfig = Object.fromEntries(layers.map((l) => [l.key, { label: l.label, color: l.color }]))
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => s.dealSize * f)

  // What each layer pays at the current scenario, for the legend.
  const current = runWaterfall(s)
  const paidNow: Record<string, number> = { rvg: current.rvgPaid, unabsorbed: current.unallocated }
  for (const row of current.rows) paidNow[row.id] = row.netLoss

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="font-display text-base">Who pays the loss</CardTitle>
        <CardDescription className="text-xs">
          $ absorbed by each layer as collateral loss rises from 0% to 100%, stacked in the order losses are paid.
          The dashed line is the current scenario; the legend shows who pays there.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
          <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="loss"
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
            />
            <YAxis
              domain={[0, Math.max(s.dealSize, 0.0001)]}
              ticks={yTicks}
              tickFormatter={(v) => money(Number(v))}
              width={60}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, p) => `Collateral loss ${p?.[0]?.payload?.loss}%`}
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">{config[String(name)]?.label ?? String(name)}</span>
                      <span className="font-mono tabular-nums">{money(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            {layers.map((l) => (
              <Area
                key={l.key}
                dataKey={l.key}
                type="linear"
                stackId="loss"
                stroke={`var(--color-${l.key})`}
                fill={`var(--color-${l.key})`}
                fillOpacity={0.8}
                isAnimationActive={false}
              />
            ))}
            <ReferenceLine x={s.lossPct} stroke="var(--foreground)" strokeDasharray="4 4" />
          </AreaChart>
        </ChartContainer>
        <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {layers.map((l) => (
            <span key={l.key} className="inline-flex items-center gap-1.5">
              <i className="size-2.5 rounded-[2px]" style={{ background: l.color }} />
              {l.label}
              <span className="text-foreground font-mono tabular-nums">{money(paidNow[l.key] ?? 0)}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
