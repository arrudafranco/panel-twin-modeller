# Demonstration (Markdown Equivalent)

This document is the required "notebook or equivalent" walkthrough for the model.

## 0) Run Commands

```bash
twin-econ run --config configs/base.yaml --out outputs/demo_run_base
twin-econ run --config configs/scaleup_national.yaml --out outputs/demo_run_scaleup
twin-econ mc --n 2000 --seed 123 --config configs/base.yaml --out outputs/demo_mc_base
twin-econ benchmark --out outputs/demo_bench
```

## 1) Baseline Scenario Summary (Pilot Mode)

- File: `outputs/demo_run_base/baseline_summary.md`
- Core outputs:
  - cost per completed interview
  - cost per retained agent
  - sellable quality
  - NPV
  - break-even time

## 2) One-Way Sensitivity (Tornado)

- File: `outputs/demo_mc_base/tornado.png`
- Interpretation:
  - top NPV drivers by absolute correlation in Monte Carlo draws.

## 3) Two-Way Sensitivity (Heatmap)

- File: `outputs/demo_mc_base/heatmap_npv.png`
- Axis pair:
  - interview minutes x attrition bins
- Value:
  - mean NPV

## 4) Monte Carlo Distributions

- File: `outputs/demo_mc_base/mc_summary.csv`
- Required distributions included:
  - `cost_per_completed_interview`
  - `cost_per_usable_synthetic_case`
  - `npv`

## 5) Pilot vs Scale-Up Unit Economics

- Compare:
  - `outputs/demo_run_base/summary.json`
  - `outputs/demo_run_scaleup/summary.json`
- Key fields for comparison:
  - `cost_per_completed_interview`
  - `cost_per_retained_agent`
  - `effective_sample_size`
  - `npv`

## 6) Feasible Region + Driver Analysis

- Feasible-region summary:
  - `outputs/demo_mc_base/feasible_region_summary.json`
- Top 5 NPV drivers:
  - `outputs/demo_mc_base/drivers_npv.csv`
- Top 5 cost-per-agent drivers:
  - `outputs/demo_mc_base/drivers_cost_per_agent.csv`

## 7) Benchmark Context

- File: `outputs/demo_bench/benchmark_report.md`
- Includes:
  - normalized-accuracy framing
  - federal benchmark ranges
  - threshold policy guidance by risk profile
