# Panel Twin Modeller

Digital panel twin simulator focused on pilot-first estimation and scale-up feasibility.

## Inspiration and Scope

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
- an interactive public-facing web app with visualizations and executive narrative

Key modeling features:
- Memory retrieval is configurable rather than treated as a single hidden assumption
- Response mode mix (categorical, numeric, open-ended) can affect quality expectations
- Construct-specific response-mode presets and pilot calibration can update those assumptions explicitly

## Interactive Web App

The primary interface is a React app deployed via GitHub Pages. It includes:
- An executive landing page with static model insights
- Interactive scenario controls (interview duration, panel size, pricing, memory architecture)
- Quality curves by interview duration with uncertainty bands
- Cost breakdown waterfall chart
- NPV timeline and Monte Carlo simulation (500 iterations, client-side)
- Market positioning radar chart
- Federal benchmark comparison
- Dynamic plain-language narrative that adapts to parameters

To run locally:

```bash
cd docs-app
npm install
npm run dev
```

## Install (Python model)

```bash
python -m pip install -e .
```

## Test

```bash
pytest -q tests/
```

## CI

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Runs on every push and pull request.
- Executes full `pytest` suite and CLI smoke tests (`run`, `sweep`, `mc`, `calibrate`, `benchmark`) on Python 3.10 and 3.12.

## CLI

```bash
twin-econ --help
twin-econ run --config configs/base.yaml --out outputs/run_001/
twin-econ sweep --config configs/base.yaml --param interview_minutes=30,60,90,120 --param attrition_rate=0.1,0.2,0.3 --out outputs/sweep_001/
twin-econ mc --n 20000 --seed 123 --config configs/base.yaml --out outputs/mc_001/
twin-econ calibrate --pilot_csv pilot_logs/runA.csv --config configs/base.yaml --out outputs/calibrated_run/
twin-econ calibrate --pilot_csv pilot_logs/template_response_modes.csv --config configs/attitude_profile.yaml --out outputs/calibrated_modes/
twin-econ compare --config configs/base.yaml --config configs/scaleup_national.yaml --out outputs/compare_001/
twin-econ benchmark --out outputs/benchmarks/
```

## Notes

- Config files are real YAML and loaded with `PyYAML`.
- Construct-focused presets are available in `configs/attitude_profile.yaml`, `configs/self_report_profile.yaml`, and `configs/incentivized_profile.yaml`.
- A sample pilot CSV with optional response-mode calibration columns is available at `pilot_logs/template_response_modes.csv`.
- All RNG-driven paths are seeded.
- Pilot mode emphasizes unknown-parameter estimation; scale-up mode emphasizes representativeness diagnostics.
- Plain-English architecture and rationale are documented in [docs/design_decisions.md](docs/design_decisions.md).
- Optional external anchor references are documented in [docs/external_reference_defaults.md](docs/external_reference_defaults.md).
