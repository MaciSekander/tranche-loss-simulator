import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { guarantorName, money, pct } from "@/lib/format"
import { EXAMPLE, type Scenario, type WaterfallResult } from "@/lib/waterfall"

type Item = { term: string; value?: string; desc: string; edited?: boolean }

function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className="flex min-w-0 flex-col">
      <h3 className="font-display text-muted-foreground border-b pb-1.5 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h3>
      <dl className="flex flex-col">
        {items.map((it) => (
          <div key={it.term} className="flex flex-col gap-1 border-b border-dashed py-2.5 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-medium">{it.term}</dt>
              {it.value && <span className="text-right font-mono text-[13px] tabular-nums">{it.value}</span>}
            </div>
            <dd className="text-muted-foreground text-[12.5px] leading-snug">{it.desc}</dd>
            {it.edited && (
              <span className="bg-warn text-card self-start rounded-sm px-1.5 py-px text-[10.5px] tracking-wide uppercase">
                Edited from example
              </span>
            )}
          </div>
        ))}
      </dl>
    </div>
  )
}

export function ModelNotes({ scenario: s, result: r }: { scenario: Scenario; result: WaterfallResult }) {
  const g = guarantorName(s)
  const sizes = s.tranches.map((t) => pct(t.sizePct)).join(" / ")
  const exampleSizes = EXAMPLE.tranches.map((t) => pct(t.sizePct)).join(" / ")
  const names = s.tranches.map((t) => t.name || "Untitled").join(" → ")
  const basis = s.rvgBasis === "tranche" ? "of the covered tranche" : "of the whole deal"

  const scenario: Item[] = [
    { term: "Deal size", value: money(s.dealSize), edited: s.dealSize !== EXAMPLE.dealSize,
      desc: "Total financing for the GPUs and data center capacity." },
    { term: "Stack, junior to senior", value: sizes, edited: sizes !== exampleSizes,
      desc: `${names}. Example sizes show a thick senior tranche over a thin junior cushion.` },
    { term: "Guarantee", value: r.covered ? money(r.rvgCap) : "None",
      edited: s.rvgOn !== EXAMPLE.rvgOn || s.rvgPct !== EXAMPLE.rvgPct || s.rvgBasis !== EXAMPLE.rvgBasis,
      desc: r.covered
        ? `${g} covers ${r.covered.name}, sized at ${pct(s.rvgPct)} ${basis}. Deal documents define this differently; check which basis applies.`
        : "No residual value guarantee in this scenario." },
    { term: "Collateral loss", value: pct(s.lossPct),
      desc: "Fall in the value of the GPUs and data center assets backing the deal, as a share of the deal." },
  ]
  const rules: Item[] = [
    { term: "Strict sequential waterfall",
      desc: "Losses fill the most junior tranche first, then each tranche above it. No pro rata sharing, coverage tests or triggers." },
    { term: "Guarantee covers one tranche",
      desc: `${g} pays losses that land on the covered tranche, up to the cap. It pays nothing for losses below that tranche or above it.` },
    { term: "Break-even",
      desc: "The collateral loss at which a tranche's investors first lose money. For the covered tranche it moves up by the size of the guarantee." },
    { term: "Single point in time",
      desc: "Losses are measured at one moment and are final. No recoveries from selling assets after default." },
  ]
  const gaps: Item[] = [
    { term: "Pricing", desc: "No coupons or tranche spreads, so no loss-adjusted yield or relative value between tranches." },
    { term: "GPU residual value", desc: "Collateral loss is a direct input. A fuller model maps a GPU rental price path (H100, B200, GB300) to asset value." },
    { term: "Timing and amortization", desc: "No cash flows over the life of the deal, so a loss in year 2 and year 5 look the same." },
    { term: "Probability of loss", desc: "Scenarios are deterministic. No Monte Carlo, expected loss or default probability by tranche." },
  ]

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="font-display text-base">Model notes</CardTitle>
        <CardDescription className="text-xs">
          What this scenario assumes, how the waterfall works, and what is left for a fuller model.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 px-5 lg:grid-cols-3">
        <Group title="This scenario" items={scenario} />
        <Group title="How losses are paid" items={rules} />
        <Group title="Not modeled yet" items={gaps} />
      </CardContent>
    </Card>
  )
}
