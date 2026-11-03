import assert from "node:assert/strict"
import { test } from "node:test"
import { EXAMPLE, runWaterfall, whoPaysLayers, whoPaysSweep, type Scenario } from "./waterfall.ts"

const near = (a: number, b: number, msg = "") => assert.ok(Math.abs(a - b) < 1e-6, `${msg} ${a} vs ${b}`)
const row = (s: Scenario, id: string, loss?: number) => runWaterfall(s, loss).rows.find((r) => r.id === id)!

test("no loss leaves every tranche intact", () => {
  const r = runWaterfall(EXAMPLE, 0)
  assert.ok(r.rows.every((x) => x.status === "intact"))
  near(r.rvgPaid, 0)
})

test("example deal at 30% loss: juniors wiped out, guarantee covers A2", () => {
  const r = runWaterfall(EXAMPLE)
  near(r.totalLoss, 3, "total")
  assert.equal(row(EXAMPLE, "eq").status, "wiped out")
  assert.equal(row(EXAMPLE, "b").status, "wiped out")
  near(row(EXAMPLE, "a2").grossLoss, 0.5, "a2 gross")
  near(row(EXAMPLE, "a2").rvgCover, 0.5, "a2 covered")
  near(row(EXAMPLE, "a2").netLoss, 0, "a2 net")
  near(row(EXAMPLE, "a1").netLoss, 0, "a1 net")
})

test("guarantee sized on the deal: 25% of $10B fully shields a 25% tranche", () => {
  near(runWaterfall(EXAMPLE).rvgCap, 2.5)
  assert.equal(row(EXAMPLE, "a2").breakEvenPct, null)
  near(row(EXAMPLE, "a1").breakEvenPct!, 50)
})

test("guarantee sized on the covered tranche: 25% of $2.5B", () => {
  const s: Scenario = { ...EXAMPLE, rvgBasis: "tranche" }
  near(runWaterfall(s).rvgCap, 0.625)
  near(row(s, "a2").breakEvenPct!, 31.25)
  // 40% loss: A2 gross $1.5B, guarantor pays $0.625B, investors lose $0.875B
  near(row(s, "a2", 40).rvgCover, 0.625)
  near(row(s, "a2", 40).netLoss, 0.875)
})

test("no guarantee", () => {
  const s: Scenario = { ...EXAMPLE, rvgOn: null }
  near(runWaterfall(s).rvgCap, 0)
  near(row(s, "a2").netLoss, 0.5)
  near(row(s, "a2").breakEvenPct!, 25)
})

test("loss beyond an undersized stack is reported, not lost", () => {
  const s: Scenario = { ...EXAMPLE, tranches: EXAMPLE.tranches.map((t) => (t.id === "a1" ? { ...t, sizePct: 30 } : t)) }
  const r = runWaterfall(s, 100)
  near(r.stackPct, 80)
  near(r.unallocated, 2)
})

test("who-pays layers always sum to the collateral loss", () => {
  for (const s of [EXAMPLE, { ...EXAMPLE, rvgBasis: "tranche" as const }, { ...EXAMPLE, rvgOn: "b" }, { ...EXAMPLE, rvgOn: null }]) {
    const keys = whoPaysLayers(s, 100).map((l) => l.key)
    for (const p of whoPaysSweep(s)) {
      const sum = keys.reduce((a, k) => a + (p[k] ?? 0), 0)
      near(sum, (s.dealSize * p.loss) / 100, `loss ${p.loss}`)
    }
  }
})

test("guarantor sits directly below the covered tranche in the stack", () => {
  assert.deepEqual(whoPaysLayers(EXAMPLE, 100).map((l) => l.key), ["eq", "b", "rvg", "a2", "a1"])
})
