# Modularity Audit (Panel Twin Local)

Date: 2026-02-27

## Scope
- Backend model modules (`twin_econ/*`)
- Streamlit app controls and progressive disclosure (`webapp/app.py`)
- CLI and output artifacts (`twin_econ/cli.py`)

## Executive Readout
- Overall modularity: strong and improving.
- Most assumptions are configurable in YAML/dataclasses and exposed in app/CLI.
- Remaining complexity risk: too many optional knobs can reduce first-scan clarity if shown at once.

## Perspective-Based Findings

### 1) Full-Stack Engineering
- Strengths:
  - Clear module boundaries (`cost_model`, `quality_model`, `sampling_model`, `competition_model`, `revenue_model`).
  - CLI and app consume shared core logic instead of duplicating formulas.
  - Optional features default to conservative no-op states (e.g., rescheduling costs default to 0).
- Risks:
  - Config schema breadth now large; contract tests should keep expanding.
  - Sampling/raking currently single-margin style (group-level), not full multi-margin IPF.

### 2) UI/UX + Accessibility
- Strengths:
  - Progressive disclosure via expanders/tabs remains intact.
  - New advanced knobs placed in optional expanders to avoid first-view overload.
- Risks:
  - Advanced panels can still be dense; consider role-based presets ("Executive", "Method", "Ops").
  - Add brief inline help text for high-impact knobs (cross-price elasticity, representativeness cap).

### 3) Statistician
- Strengths:
  - Horizon-aware NPV and break-even logic now explicit.
  - Driver analysis includes both correlation and standardized OLS betas.
- Risks:
  - OLS in driver summary is descriptive, not causal; should stay labeled as such.
  - Feasible-region summary is threshold-based and does not yet include confidence intervals.

### 4) Survey Methodologist
- Strengths:
  - Construct-specific quality and benchmark-aware thresholding retained.
  - Representativeness penalty cap now configurable, with target-margin import support.
- Risks:
  - Raking implementation still simplified to one table of groups.
  - Additional design-effect diagnostics (beyond ESS) would improve methodological transparency.

### 5) Data Scientist (AI)
- Strengths:
  - Memory strategy and token/cost assumptions remain explicit and configurable.
  - Monte Carlo outputs now include feasibility flag and richer downstream analysis artifacts.
- Risks:
  - Parameter priors in MC are still fairly generic; calibration-informed priors could be expanded.

### 6) Business Executive / Analyst
- Strengths:
  - Explicit outside-option shares (AmeriSpeak-like, TrueNorth-like, external synthetic) improve market narrative.
  - Optional "other initial investment" + horizon improve strategic planning usability.
- Risks:
  - Financial outputs still single-scenario deterministic per run; could add scenario comparison dashboard cards.

## Modularity Checklist
- Configurable assumptions in YAML: Pass (broad coverage).
- Optional features default to minimal behavior: Pass.
- Reusable model logic across CLI + app: Pass.
- Progressive disclosure in app: Pass (with density caveat).
- Public/private naming separation readiness: Pass (labels can be swapped without logic changes).

## Recommended Next Steps
1. Add role-based preset bundles in app ("Executive", "Methodology", "Product/Ops").
2. Implement multi-margin IPF raking with optional target CSVs per margin.
3. Add warning badges when users move high-sensitivity knobs outside calibrated ranges.
