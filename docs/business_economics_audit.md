# Business & Economics Audit (Panel Twin Local)

Date: 2026-02-27

## Purpose
Evaluate whether the current model/app stack supports decision-quality business analysis for pilot planning, scale-up feasibility, and portfolio positioning.

## High-Level Assessment
- Economic logic coverage: strong for scenario planning.
- Commercial strategy coverage: moderate-to-strong after outside-option and substitution upgrades.
- Remaining risk: some economics are still stylized (useful for prioritization, not final pricing policy).

## What Is Working Well

### 1) Revenue + Horizon + Break-Even
- NPV is now horizon-dependent and uses monthly discounting.
- Break-even timing is explicit (`time_to_break_even_months`, horizon pass/fail).
- Optional additional upfront investment supports non-modeled startup costs.

### 2) Competitive Positioning
- Discrete-choice market share decomposition includes:
  - Panel twin offer
  - probability benchmark reference
  - calibrated hybrid reference
  - External synthetic option
- Cross-price elasticity is configurable, enabling pricing pressure sweeps.

### 3) Portfolio Realism
- Cannibalization parameter is integrated into net-new contribution logic.
- Market tailwind is explicit and sweepable, useful for stress tests.

### 4) Decision Support Outputs
- Monte Carlo now emits feasible-region summary and top drivers:
  - `feasible_region_summary.json`
  - `drivers_npv.csv`
  - `drivers_cost_per_agent.csv`

## Remaining Business/Econ Gaps

### Gap A: Price-Volume Calibration
- Current demand/choice coefficients are transparent but not empirically estimated from account-level history.
- Recommendation:
  - Fit utility weights and elasticity from won/lost opportunity data by segment.

### Gap B: Scenario Comparison Layer
- Runs are strong individually, but cross-scenario executive comparison still requires manual stitching.
- Recommendation:
  - Add a comparative dashboard/table with deltas across named scenarios.

### Gap C: Uncertainty Framing for Decision Meetings
- Outputs include MC distributions, but policy-friendly statements (e.g., probability NPV > 0 by segment/risk profile) could be surfaced more directly.
- Recommendation:
  - Add decision thresholds and confidence statements to briefs.

## Decision Readiness by Use Case
- Pilot sizing and cost planning: Ready.
- Early commercialization screening: Ready with caveats.
- Final product pricing/go-to-market commitments: Needs further empirical calibration.

## Recommended Next Steps
1. Add scenario-comparison report (`compare` command) with business KPI deltas.
2. Calibrate choice/demand coefficients on historical opportunity outcomes.
3. Add probability-of-success KPIs (e.g., `P(NPV>0)`, `P(break-even <= 24 months)`) directly in app and briefs.
