# Panel Twin Modeller

Feasibility modelling toolkit for evaluating panel-twin quality, operations, and economics with transparent assumptions.

## What This Includes

- Python modelling package (`twin_econ/`) for cost, quality, sampling, revenue, and Monte Carlo risk.
- Streamlit app (`webapp/app.py`) for interactive scenario exploration.
- Automated UI audit tooling (`scripts/playwright_ui_audit.py`) with cross-browser checks and accessibility scans.
- Public interactive project page at `docs/index.html` (served via GitHub Pages).

## Quick Start

```bash
python -m pip install -e .
python -m pytest -q tests
```

Run the app:

```bash
streamlit run webapp/app.py
```

## CLI Examples

```bash
python -m twin_econ.cli run --config configs/base.yaml --out outputs/run_001
python -m twin_econ.cli sweep --config configs/base.yaml --param interview_minutes=60,90,120 --out outputs/sweep_001
python -m twin_econ.cli mc --n 5000 --seed 123 --config configs/base.yaml --out outputs/mc_001
python -m twin_econ.cli benchmark --out outputs/benchmarks
```

## UI Quality Gates

```bash
python -m pip install playwright axe-playwright-python pillow
python -m playwright install chromium firefox webkit
python scripts/playwright_ui_audit.py
```

- Strict CI mode uses:
  - `UI_AUDIT_FAIL_ON_VISUAL_DIFF=true`
  - `UI_AUDIT_FAIL_ON_PERF_BUDGET=true`
- Visual baselines are versioned in `webapp/visual_baseline/`.

## Public Interactive Page

The repository includes a lightweight interactive page in `docs/index.html` for broad stakeholder exploration.  
GitHub Pages deployment is automated by `.github/workflows/pages.yml`.

## Notes

- Configuration files use YAML (`PyYAML`).
- Model stochastic paths are seeded.
- Reliability comparators and threshold logic are explicit and auditable.
