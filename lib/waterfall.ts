// Loss waterfall for a GPU-backed financing.
//
// Losses on the collateral (GPUs and data center assets) hit the most junior
// tranche first, then move up the stack. An optional residual value guarantee
// (RVG) covers one tranche: losses landing on that tranche are paid by the
// guarantor first, up to the guarantee's cap.
//
// Tranche sizes and the loss are % of total deal size. Money is in $B.

export type Tranche = {
  id: string
  name: string
  sizePct: number
}

/** What the guarantee size is a percentage of. */
export type RvgBasis = "deal" | "tranche"

export type Scenario = {
  dealSize: number // $B
  lossPct: number // collateral loss, % of deal
  guarantor: string
  rvgOn: string | null // id of the covered tranche; null = no guarantee
  rvgPct: number
  rvgBasis: RvgBasis
  tranches: Tranche[] // ordered most junior -> most senior
}

export type TrancheStatus = "intact" | "impaired" | "wiped out"

export type TrancheResult = Tranche & {
  color: string
  size: number // $B
  attachPct: number
  detachPct: number
  /** Collateral loss % at which this tranche's investors first lose money; null = never. */
  breakEvenPct: number | null
  grossLoss: number // $B before the guarantee
  rvgCover: number // $B paid by the guarantor
  netLoss: number // $B lost by investors
  netLossPct: number // % of the tranche
  status: TrancheStatus
}

export type WaterfallResult = {
  rows: TrancheResult[]
  totalLoss: number
  rvgCap: number
  rvgPaid: number
  unallocated: number // loss beyond the stack when tranches sum to < 100%
  stackPct: number
  covered: TrancheResult | null
}

export const MAX_TRANCHES = 6
export const TRANCHE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
]

const EPS = 1e-9
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function guaranteeCap(s: Scenario): number {
  const covered = s.tranches.find((t) => t.id === s.rvgOn)
  if (!covered) return 0
  const deal = Math.max(0, s.dealSize)
  const basis = s.rvgBasis === "tranche" ? (deal * covered.sizePct) / 100 : deal
  return (basis * Math.max(0, s.rvgPct)) / 100
}

export function runWaterfall(s: Scenario, lossPctOverride?: number): WaterfallResult {
  const deal = Math.max(0, s.dealSize)
  const lossPct = clamp(lossPctOverride ?? s.lossPct, 0, 100)
  const totalLoss = (deal * lossPct) / 100
  const rvgCap = guaranteeCap(s)

  let remaining = totalLoss
  let rvgLeft = rvgCap
  let cursor = 0

  const rows: TrancheResult[] = s.tranches.map((t, i) => {
    const size = (deal * t.sizePct) / 100
    const attachPct = cursor
    const detachPct = cursor + t.sizePct
    cursor = detachPct

    const grossLoss = Math.min(remaining, size)
    remaining -= grossLoss

    const isCovered = t.id === s.rvgOn
    const rvgCover = isCovered ? Math.min(grossLoss, rvgLeft) : 0
    if (isCovered) rvgLeft -= rvgCover

    const netLoss = grossLoss - rvgCover
    const netLossPct = size > 0 ? (netLoss / size) * 100 : 0

    let breakEvenPct: number | null = t.sizePct > 0 ? attachPct : null
    if (isCovered && t.sizePct > 0) {
      const shieldPct = deal > 0 ? (rvgCap / deal) * 100 : 0
      breakEvenPct = shieldPct >= t.sizePct - EPS ? null : attachPct + shieldPct
    }

    const status: TrancheStatus =
      netLoss <= EPS ? "intact" : netLossPct >= 100 - EPS ? "wiped out" : "impaired"

    return {
      ...t,
      color: TRANCHE_COLORS[i % TRANCHE_COLORS.length],
      size,
      attachPct,
      detachPct,
      breakEvenPct,
      grossLoss,
      rvgCover,
      netLoss,
      netLossPct,
      status,
    }
  })

  return {
    rows,
    totalLoss,
    rvgCap,
    rvgPaid: rvgCap - rvgLeft,
    unallocated: Math.max(0, remaining),
    stackPct: cursor,
    covered: rows.find((r) => r.id === s.rvgOn) ?? null,
  }
}

export type Layer = { key: string; label: string; color: string }

/** Layers for the "who pays" chart, bottom to top, in the order losses are paid. */
export function whoPaysLayers(s: Scenario, stackPct: number): Layer[] {
  const layers: Layer[] = []
  s.tranches.forEach((t, i) => {
    if (t.id === s.rvgOn) {
      layers.push({ key: "rvg", label: s.guarantor.trim() || "Guarantor", color: "var(--rvg)" })
    }
    layers.push({ key: t.id, label: t.name || "Untitled", color: TRANCHE_COLORS[i % TRANCHE_COLORS.length] })
  })
  if (stackPct < 100 - EPS) {
    layers.push({ key: "unabsorbed", label: "Beyond the stack", color: "var(--muted-foreground)" })
  }
  return layers
}

/** $B absorbed by each layer as collateral loss rises from 0% to 100%. */
export function whoPaysSweep(s: Scenario, step = 0.5) {
  const round = (v: number) => Math.round(v * 1e6) / 1e6
  const points: Array<Record<string, number>> = []
  for (let loss = 0; loss <= 100 + EPS; loss += step) {
    const r = runWaterfall(s, loss)
    const p: Record<string, number> = { loss: round(loss) }
    for (const row of r.rows) p[row.id] = round(row.netLoss)
    p.rvg = round(r.rvgPaid)
    p.unabsorbed = round(r.unallocated)
    points.push(p)
  }
  return points
}

export const EXAMPLE: Scenario = {
  dealSize: 10,
  lossPct: 30,
  guarantor: "Nvidia",
  rvgOn: "a2",
  rvgPct: 25,
  rvgBasis: "deal",
  tranches: [
    { id: "eq", name: "Equity", sizePct: 10 },
    { id: "b", name: "B piece", sizePct: 15 },
    { id: "a2", name: "A2", sizePct: 25 },
    { id: "a1", name: "A1", sizePct: 50 },
  ],
}

export function isScenario(v: unknown): v is Scenario {
  if (!v || typeof v !== "object") return false
  const s = v as Scenario
  return (
    typeof s.dealSize === "number" &&
    typeof s.lossPct === "number" &&
    typeof s.rvgPct === "number" &&
    (s.rvgBasis === "deal" || s.rvgBasis === "tranche") &&
    Array.isArray(s.tranches) &&
    s.tranches.length > 0 &&
    s.tranches.every((t) => typeof t.id === "string" && typeof t.sizePct === "number")
  )
}
