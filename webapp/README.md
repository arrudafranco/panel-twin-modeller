# Web App: Panel Twin Feasibility Studio

## Purpose

Single-view interactive workspace for cross-functional feasibility decisions.
It balances plain language and technical rigor with progressive disclosure.

## Run Locally

```bash
streamlit run webapp/app.py
```

## Information Hierarchy

1. Overview: decision headline metrics and plain-language interpretation.
2. Model & Methods: quality tiers, benchmark policy settings, weighting diagnostics.
3. Operations & Cost: AI token usage and line-item cost structure.
4. Economics & Risk: win probability, margins, NPV, Monte Carlo summary.
5. Benchmarks & Citations: comparator eligibility and evidence sources.
6. Downloads: scenario YAML and decision brief markdown.

## Progressive Disclosure Design

- Top-level KPIs are always visible.
- Methodological depth is inside expanders.
- All controls are in a top-page `Scenario Controls` expander with advanced controls separated.
- No role-switching view forks; one coherent shared narrative for all users.

## Auditability

- Benchmark references are listed in-app and in [CITATIONS.md](C:\Users\gusta\panel-twin\webapp\CITATIONS.md).
- Generated deliverables are written to `outputs/webapp/`.
- Model assumptions are explicit in YAML configs and surfaced in the app.

## Accessibility and QA

```bash
python -m pip install playwright axe-playwright-python
python -m playwright install chromium firefox webkit
python scripts/playwright_ui_audit.py
```

- Audit outputs: `outputs/ui_audit_001/`.
- Visual baseline approvals are stored in `webapp/visual_baseline/`.
- To approve/update baseline snapshots intentionally:

```bash
$env:UI_AUDIT_APPROVE_BASELINE='true'; python scripts/playwright_ui_audit.py
```

- CI enforces approved visual baselines and performance budgets:
  - `UI_AUDIT_FAIL_ON_VISUAL_DIFF=true`
  - `UI_AUDIT_FAIL_ON_PERF_BUDGET=true`
- Manual checks: [ACCESSIBILITY_CHECKLIST.md](C:\Users\gusta\panel-twin\webapp\ACCESSIBILITY_CHECKLIST.md).

## Known Limitation

- Current moderate `axe-core` `region` findings come from Streamlit wrapper structure, not unlabeled controls in app code.
- Policy: `critical`/`serious` must be zero; `region` moderate is tracked and reviewed on each release.
