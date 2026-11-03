import type { Scenario, WaterfallResult } from "./waterfall.ts"

/** $B in, "$2.5B" or "$625M" out. */
export function money(vB: number): string {
  const a = Math.abs(vB)
  if (a >= 1 || a === 0) {
    return "$" + vB.toLocaleString("en-US", { maximumFractionDigits: a >= 100 ? 0 : 2 }) + "B"
  }
  return "$" + (vB * 1000).toLocaleString("en-US", { maximumFractionDigits: 0 }) + "M"
}

export function pct(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 }) + "%"
}

export function guarantorName(s: Scenario): string {
  return s.guarantor.trim() || "Guarantor"
}

/** Plain-text summary for pasting into an email or memo. */
export function summaryText(s: Scenario, r: WaterfallResult): string {
  const g = guarantorName(s)
  const lines = [
    "Tranche loss scenario",
    `Deal: ${money(s.dealSize)} | Collateral loss: ${pct(s.lossPct)} (${money(r.totalLoss)})`,
    r.covered
      ? `Guarantee: ${g} covers ${r.covered.name}, ${pct(s.rvgPct)} of ${
          s.rvgBasis === "tranche" ? "the covered tranche" : "the deal"
        } (cap ${money(r.rvgCap)}); pays ${money(r.rvgPaid)}`
      : "Guarantee: none",
    "",
    "Tranche | Size | Attach-detach | Break-even | Net loss | % lost | Status",
    ...[...r.rows]
      .reverse()
      .map(
        (x) =>
          `${x.name} | ${money(x.size)} | ${pct(x.attachPct)}-${pct(x.detachPct)} | ${
            x.breakEvenPct === null ? "never" : pct(x.breakEvenPct)
          } | ${money(x.netLoss)} | ${pct(x.netLossPct)} | ${x.status}`,
      ),
  ]
  if (r.unallocated > 1e-9) {
    lines.push("", `Loss beyond the stack: ${money(r.unallocated)} (tranches sum to ${pct(r.stackPct)})`)
  }
  return lines.join("\n")
}
