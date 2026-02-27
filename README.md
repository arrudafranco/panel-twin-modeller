# Panel Twin

Digital panel twin simulator focused on pilot-first estimation and scale-up feasibility.

## Inspiration And Scope

This project is directly inspired by Stanford HCI's `genagents` project and the paper
*Generative Agent Simulations of 1,000 People*.

It does not claim to reproduce that codebase or its exact empirical evaluation. Instead, it uses that work as:
- a conceptual anchor for interview-based generative agents
- a reference point for paper-backed quality anchors where explicitly noted
- a design precedent for memory and reflection-centered agent construction

This repository extends beyond that scope into:
- feasibility and cost modeling
- sampling and representativeness adjustments
- pilot calibration
- commercialization, pricing, NPV, and break-even analysis
- internal and public decision-support apps

Recent extensions now also make two `genagents`-inspired ideas explicit in the model:
- memory retrieval is configurable rather than treated as a single hidden assumption
- response mode mix (categorical, numeric, open-ended) can affect quality expectations

## Install

```bash
python -m pip install -e .
```

## Test

```bash
pytest -q
```

## CI

- GitHub Actions workflow: [.github/workflows/ci.yml](C:\Users\gusta\panel-twin\.github\workflows\ci.yml)
- Runs on every push and pull request.
- Executes full `pytest` suite and CLI smoke tests (`run`, `sweep`, `mc`, `calibrate`, `benchmark`) on Python 3.10 and 3.12.
- Runs a dedicated cross-browser (Chromium/Firefox/WebKit) Playwright + axe-core UI audit job and uploads reports/screenshots as CI artifacts.

## CLI

```bash
twin-econ --help
twin-econ run --config configs/base.yaml --out outputs/run_001/
twin-econ sweep --config configs/base.yaml --param interview_minutes=30,60,90,120 --param attrition_rate=0.1,0.2,0.3 --out outputs/sweep_001/
twin-econ mc --n 20000 --seed 123 --config configs/base.yaml --out outputs/mc_001/
twin-econ calibrate --pilot_csv pilot_logs/runA.csv --config configs/base.yaml --out outputs/calibrated_run/
twin-econ compare --config configs/base.yaml --config configs/scaleup_national.yaml --out outputs/compare_001/
twin-econ benchmark --out outputs/benchmarks/
```

## Web App

```bash
streamlit run webapp/app.py
```

- App docs: [webapp/README.md](C:\Users\gusta\panel-twin\webapp\README.md)
- Citations: [webapp/CITATIONS.md](C:\Users\gusta\panel-twin\webapp\CITATIONS.md)

### UI Accessibility Audit (Local)

```bash
python -m pip install playwright axe-playwright-python
python -m playwright install chromium firefox webkit
python scripts/playwright_ui_audit.py
```

Outputs are written to `outputs/ui_audit_001/` (screenshots + a11y/performance report).
Approved visual baselines are stored at `webapp/visual_baseline/`.

Approve baseline updates intentionally:

```bash
$env:UI_AUDIT_APPROVE_BASELINE='true'; python scripts/playwright_ui_audit.py
```

Run local tests with isolated temp directories (Windows cleanup-safe):

```bash
python scripts/run_pytests_stable.py -q tests
```

## Public Export (No Proprietary Naming)

Create a sanitized copy for public hosting/publishing while keeping this local repo unchanged:

```bash
python scripts/prepare_public_repo.py
```

This writes a publish-ready copy to `C:\Users\gusta\panel-twin-public` and fails if explicit proprietary tokens remain.

## Notes

- Config files are real YAML and loaded with `PyYAML`.
- All RNG-driven paths are seeded.
- Pilot mode emphasizes unknown-parameter estimation; scale-up mode emphasizes representativeness diagnostics.
- Plain-English architecture and rationale are documented in [docs/design_decisions.md](C:\Users\gusta\panel-twin\docs\design_decisions.md).
- Optional external anchor references are documented in [docs/external_reference_defaults.md](C:\Users\gusta\panel-twin\docs\external_reference_defaults.md).




