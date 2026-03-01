# Panel Twin Modeller

Digital panel twin simulator focused on pilot-first estimation and scale-up feasibility.

![Panel Twin Modeller — interactive feasibility explorer showing the Economics tab with the NPV timeline chart, sidebar scenario controls, and financial summary table](screenshot.png)

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
- investment case analysis, pricing, NPV, and break-even modeling
- an interactive public-facing web app with visualizations and executive narrative

Key modeling features:
- Memory retrieval is configurable rather than treated as a single hidden assumption
- Response mode mix (categorical, numeric, open-ended) can affect quality expectations
- Construct-specific response-mode presets and pilot calibration can update those assumptions explicitly

## Interactive Web App

The primary interface is a React app deployed via GitHub Pages. It includes:
- An executive landing page with static model insights
- Interactive scenario controls (interview duration, panel size, pricing, memory architecture)
- Fidelity curves by interview duration with uncertainty bands
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

## Python CLI (reference implementation)

The `twin_econ/` package is a Python reference implementation of the model. The React app is the actively maintained interface; the Python CLI is preserved as a reference and for one command that has no browser equivalent.

**The one command worth keeping:** `calibrate` ingests a pilot study CSV and updates model parameters based on observed data (response rates, attrition, token counts, quality metrics). This will be useful when real pilot data exists.

```bash
twin-econ calibrate --pilot_csv pilot_logs/runA.csv --config configs/base.yaml --out outputs/calibrated_run/
twin-econ calibrate --pilot_csv pilot_logs/template_response_modes.csv --config configs/attitude_profile.yaml --out outputs/calibrated_modes/
```

Other CLI commands (`run`, `sweep`, `mc`, `compare`, `benchmark`) are covered by the interactive React app. The Python model defaults in `twin_econ/params.py` and `configs/` reflect an earlier version of the model and may differ from the React app's current defaults.

To install:

```bash
python -m pip install -e .
```

To run tests:

```bash
pytest -q
```

39 of 39 tests pass.

## Notes

- Config files are real YAML and loaded with `PyYAML`.
- Construct-focused presets are available in `configs/attitude_profile.yaml`, `configs/self_report_profile.yaml`, and `configs/incentivized_profile.yaml`.
- A sample pilot CSV with optional response-mode calibration columns is available at `pilot_logs/template_response_modes.csv`.
- All RNG-driven paths are seeded.
- The Python model defaults (`twin_econ/params.py`, `configs/`) reflect an earlier calibration and may diverge from the React app's current defaults. See the Known Issues section in [docs/design_decisions.md](docs/design_decisions.md) before using the Python CLI for financial projections.
- Plain-English architecture and rationale are documented in [docs/design_decisions.md](docs/design_decisions.md).
- Optional external anchor references are documented in [docs/external_reference_defaults.md](docs/external_reference_defaults.md).
