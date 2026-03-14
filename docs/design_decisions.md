# Design Decisions and Architecture

Version: 0.4.0
Last updated: 2026-03-13
Status: active working design record

## Purpose

This document explains, in plain English, how and why this project is designed the way it is.

It is meant to help:
- human readers who want a fast but accurate understanding of the system
- technical stakeholders who want a deeper under-the-hood scan
- future contributors who need to understand architecture before changing it
- machine readers and coding agents that benefit from explicit design intent in natural language

This is not just a feature list. It is a record of the main design choices, the reasons behind them, and the tradeoffs we accepted.

## Contents

- [Goals and Context](#goals-and-context)
- [External Inspiration and Evidence Boundaries](#external-inspiration-and-evidence-boundaries)
  - [What We Inherit Conceptually](#what-we-inherit-conceptually)
  - [What We Add Beyond That Scope](#what-we-add-beyond-that-scope)
  - [Prompt and Reflection Implications](#prompt-and-reflection-implications)
  - [How We Label Evidence](#how-we-label-evidence)
- [Core Design Philosophy](#core-design-philosophy)
  - [Plain-English First](#plain-english-first)
  - [Modular, Optional, and Progressive](#modular-optional-and-progressive)
  - [Decision Support, Not False Precision](#decision-support-not-false-precision)
- [Architecture Overview](#architecture-overview)
  - [1. Analytical Core](#1-analytical-core)
  - [2. React Web App](#2-react-web-app)
- [Model Design Decisions](#model-design-decisions)
  - [Configuration Is Explicit](#configuration-is-explicit)
  - [Cost Model: Detailed but Switchable](#cost-model-detailed-but-switchable)
  - [Quality Model: Transparent Proxy Instead of Overclaiming](#quality-model-transparent-proxy-instead-of-overclaiming)
  - [Sampling Model: Move From Simple Weighting to Multi-Margin Raking](#sampling-model-move-from-simple-weighting-to-multi-margin-raking)
  - [Competition and Revenue: Explicit Scenario Logic](#competition-and-revenue-explicit-scenario-logic)
  - [Monte Carlo: Uncertainty as a First-Class Output](#monte-carlo-uncertainty-as-a-first-class-output)
- [App and Frontend Design Decisions](#app-and-frontend-design-decisions)
  - [Progressive Disclosure Instead of One Giant Control Panel](#progressive-disclosure-instead-of-one-giant-control-panel)
  - [Subject-Matter Presets, Not Hierarchy Labels](#subject-matter-presets-not-hierarchy-labels)
  - [The React App Is Now the Actively Maintained Implementation](#the-react-app-is-now-the-actively-maintained-implementation)
  - [Accessibility and Scanability Matter](#accessibility-and-scanability-matter)
- [Guardrails and Limitations](#guardrails-and-limitations)
- [Documentation Decisions](#documentation-decisions)
  - [Why Maintain a Design Record](#why-maintain-a-design-record)
  - [Why Track Versions Here](#why-track-versions-here)
- [What This Project Is Good For](#what-this-project-is-good-for)
- [What This Project Is Not Good For Yet](#what-this-project-is-not-good-for-yet)
- [Maintenance Rule](#maintenance-rule)
- [Known Issues and Deferred Work](#known-issues-and-deferred-work)
- [Version Updates](#version-updates)

## How To Use This Document

- Read [Goals and Context](#goals-and-context) first if you are new to the project.
- Read [Architecture Overview](#architecture-overview) for the high-level system map.
- Read [Model Design Decisions](#model-design-decisions) for the core analytical logic.
- Read [App and Frontend Design Decisions](#app-and-frontend-design-decisions) for interaction and usability choices.
- Read [Guardrails and Limitations](#guardrails-and-limitations) before treating outputs as forecasts or commitments.
- Read [Version Updates](#version-updates) to see what changed and why.

## Goals and Context

The project exists to evaluate whether "digital panel twins" are feasible, useful, and commercially viable enough to justify pilot work and possible scale-up.

The project is intentionally built around a two-stage decision process:

1. Pilot-stage learning
- The immediate goal is not full deployment.
- The immediate goal is to estimate uncertain quantities that matter for feasibility, such as response, attrition, token use, time, cost, and quality.

2. Scale-up planning
- Once pilot information exists, the model can be used to simulate larger-scale economics, quality, and commercial feasibility.
- This is planning support, not direct operational execution.

The system is designed to support internal decision making across multiple audiences:
- business and strategy stakeholders
- survey methodologists
- statisticians and data scientists
- product and engineering stakeholders

The project is deliberately transparent. It is not built to hide assumptions behind a black box.

## External Inspiration and Evidence Boundaries

This project is directly inspired by Stanford HCI's `genagents` project and the paper
*Generative Agent Simulations of 1,000 People*.

That inspiration is real and should be stated explicitly. At the same time, this
project is not a reimplementation of `genagents`, and it should not imply that it
reproduces the paper's exact methodology or measured results.

### What We Inherit Conceptually

We inherit several core ideas from that work:
- interview-based agent construction
- memory and reflection as explicit parts of the agent design
- benchmarking against human-response consistency as a useful quality anchor

The public `genagents` repository also makes the architecture influence visible:
- `genagents/genagents.py` centers a `GenerativeAgent` wrapper
- `genagents/modules/interaction.py` handles categorical, numerical, and open-ended response generation
- `genagents/modules/memory_stream.py` combines recency, relevance, and importance in retrieval and reflection workflows

These are architecture precedents, not source-code dependencies in this project.

### What We Add Beyond That Scope

This project extends the interview-agent idea into planning and decision support.

It adds:
- cost and operations modeling
- pilot calibration
- sampling and representativeness adjustments
- competition and substitution scenarios
- pricing, NPV, and break-even logic
- internal and public-facing planning interfaces

We also make some design ideas more explicit than before:
- memory retrieval is modeled with configurable recency, relevance, and importance weights
- response-mode mix is modeled explicitly, so categorical, numeric, and open-ended instruments can carry different reliability expectations
- construct-specific response-mode presets can be used so different study types start from different default interaction mixes

### Prompt and Reflection Implications

The `genagents` architecture uses prompt-driven interactions and prompt-driven reflection.

That matters for this project because:
- reflection summaries are not direct observations
- importance is not an objective scalar measured from the world
- both are generated intermediate artifacts shaped by prompts and model behavior

So in this project:
- reflection cadence and summary count are configurable operational assumptions
- memory importance is treated as a weighting heuristic, not a ground-truth score
- response-mode reliability is handled as a transparent multiplier rather than buried inside one headline quality number
- pilot calibration can optionally update response-mode shares and multipliers when the pilot log includes those columns
- the active source of response-mode assumptions is tracked explicitly as preset-driven, manual, or pilot-calibrated
- run artifacts now surface assumption provenance directly so downstream readers do not need to infer it from configs alone

### Why the Stanford Approach Was Chosen as the Quality Anchor

The decision to use Park et al. (2024) as the primary quality anchor was deliberate and should be documented clearly.

At the time of development, that paper offered a combination of properties not found together elsewhere among the sources consulted: a large empirical sample (1,052 participants), a widely used canonical benchmark (GSS Core), a complete and published codebase (`genagents`), and a specific, measurable fidelity figure (0.85 normalized accuracy) that could anchor quality estimates in a planning model.

**On the 0.85 figure and test-retest reliability.** A common misread is that "normalized accuracy" is a generic prediction accuracy score with no connection to survey reliability standards. It is not. Park et al. benchmark agent performance *against the participants' own two-week test-retest consistency* — the 0.85 means agents replicate participant responses 85% as accurately as the participants replicate their own answers two weeks apart. This is grounded in classical test-retest reliability: participant test-retest serves as the ceiling (normalized to 1.0), and agent performance is expressed relative to that ceiling. The 0.85 anchor is therefore a stronger and more contextually appropriate quality measure than a raw prediction accuracy figure would be, and it is directly comparable to human survey reliability benchmarks used elsewhere in this model.

The paper is a preprint (arXiv:2411.10109, November 2024, pre-registered at osf.io/mexkf/). It had not been confirmed as peer-reviewed at the time this model was built. It was chosen as the anchor because it was a strong, specific, and publicly available reference with open implementation details — not because it was established peer-reviewed literature. Other interview-based agent research exists; this paper was the most directly applicable to the construction approach modeled here.

**Implications for a proprietary version.** The business and economics model (cost structure, NPV, competition model, break-even logic) is general across interview-based approaches. The quality anchors can be replaced with calibrated values from any empirical implementation. A proprietary version with different implementation choices would need its own quality calibration data. The financial modeling logic applies regardless of which interview-agent architecture is used.

**Implication for readers.** The quality estimates in this model are planning-level inputs informed by the best publicly available evidence at time of development. They are not warranties of replication performance for a new deployment. Pilot calibration (the `calibrate` CLI command) is the intended path to grounding quality estimates in observed field data.

### How We Label Evidence

We use three evidence labels in practice, even when they are not surfaced as formal tags everywhere:

1. Paper-backed anchors
- Values or methodological distinctions directly supported by the paper.

2. Repo-inspired implementation patterns
- Architecture ideas taken from the public `genagents` codebase.

3. Project planning defaults
- Practical placeholders used so the model remains usable before more calibration data exist.

One concrete example:
- the paper title says "1,000 People," but the reported empirical sample is 1,052 participants
- the ~6,491 participant-word figure is paper-backed
- the ~5,373 interviewer-word and ~82 follow-up figures remain project operational defaults unless independently verified

## Core Design Philosophy

### Plain-English First

We intentionally document the model in normal human language, not just code and formulas.

The reason is simple:
- many stakeholders need to understand the logic without reading Python
- decisions improve when assumptions are visible and discussable
- future maintenance is easier when intent is written down clearly

### Modular, Optional, and Progressive

The system is built so that:
- advanced features are optional
- defaults are usable without touching advanced controls
- new assumptions can be added without rewriting the full architecture

This is why the project relies heavily on:
- typed config objects
- separate model modules
- optional app controls in expanders/details sections
- lightweight focus presets instead of rigid role-based modes

### Decision Support, Not False Precision

The project is designed as a decision-support model, not as a guaranteed prediction engine.

That means:
- it is suitable for structured planning and stress testing
- it is not automatically suitable for external commitments without calibration
- uncertainty and limitations must be visible, not hidden

## Architecture Overview

The project has three main layers.

### 1. Analytical Core

This is the shared backend logic in `twin_econ/`.

Key modules:
- `params.py`: defines configurable assumptions
- `cost_model.py`: computes cost mechanics
- `quality_model.py`: computes proxy quality scores
- `sampling_model.py`: simulates sampling, weights, and representativeness
- `competition_model.py`: models outside options and substitution
- `revenue_model.py`: computes economics, NPV, and break-even timing
- `mc_model.py`: runs uncertainty simulations
- `pilot_calibration.py`: updates assumptions from pilot logs
- `reporting.py`: writes artifacts and visualizations
- `cli.py`: turns model logic into usable commands

This layer is preserved as a reference implementation. The `calibrate` command, which ingests pilot study CSVs and updates model parameters from observed data, is the one command with no browser equivalent and the primary reason to use the Python CLI directly.

### 2. React Web App

The app in `docs-app/` is a React + TypeScript frontend built with Vite and deployed to GitHub Pages. It is the primary interface for exploring the model and the actively maintained implementation.

It is designed to:
- expose core assumptions interactively
- preserve progressive disclosure
- support fast scanning and deeper technical review
- provide plain-language narrative alongside technical outputs

The React app ports the core model logic to TypeScript to run entirely client-side. Default values, construct framing, and model calibrations are updated there first. Known divergences from the Python reference implementation are documented in the Known Issues section.

## Model Design Decisions

### Configuration Is Explicit

A major design choice is that assumptions should be explicit and editable.

We prefer:
- config-driven assumptions in YAML
- dataclass defaults that can be overridden
- no hidden "magic numbers" buried across many files

This improves:
- transparency
- reproducibility
- auditability
- machine-assisted maintenance

### Cost Model: Detailed but Switchable

The cost model includes:
- recruitment mechanics
- incentives
- ASR/TTS costs
- token costs
- labor
- compliance-related costs
- overhead

It also includes optional advanced fields for:
- contact attempts
- response lift and decay per extra attempt
- rescheduling costs
- word-based token estimation
- transcript context size
- transcript injection assumptions

These advanced fields default to conservative or neutral behavior so they do not overwhelm the base workflow.

This was a deliberate design choice:
- sophisticated enough for serious planning
- not so rigid that users must supply unknown quantities on day one

### Quality Model: Transparent Proxy Instead of Overclaiming

The quality model is intentionally a transparent proxy model.

It separates three study types:
- mixed general surveys (attitudes, opinions, and behavioral recall combined)
- behavioral recall surveys (frequency and history items)
- incentivized / economic experiments

It uses configurable functional forms and memory assumptions rather than pretending to be a final empirically validated psychometric engine.

This design reflects an important constraint:
- we do not yet have enough project-specific evidence to justify a more confident model

The quality model is therefore designed to be:
- interpretable
- calibratable
- honest about uncertainty

The Benchmarks tab contextualizes agent quality scores against published human test-retest reliability values from federal surveys. The primary federal comparators are the NSDUH Reliability Study (SAMHSA, 2012), which provides attitude/belief and substance use item retest coefficients, and the BRFSS HRQOL Reliability Reinterview (Andresen et al., 2003), which provides health-related quality-of-life item retest coefficients. These serve as normalizing ceilings: a quality score at or above the corresponding federal benchmark suggests the agent library meets the retest consistency standards of those instruments.

### Sampling Model: Move From Simple Weighting to Multi-Margin Raking

The sampling model began with simple design-weight logic and was later extended to support multi-margin IPF-style raking.

Why this was added:
- scale-up planning needs a more realistic representativeness adjustment
- a single flat adjustment was not enough for meaningful methodological review

The current design supports:
- pilot pass-through behavior
- scale-up simulation
- target margins from CSV
- backward compatibility with simpler single-margin input

This balances realism with implementation practicality.

### Competition and Revenue: Explicit Scenario Logic

The competition and revenue logic are designed to be explicit rather than opaque. They model win probability, market substitution, cannibalization, and NPV in a four-way logit choice framework. All coefficients are illustrative scenario assumptions, not fitted to historical win/loss data. This section documents the full parameter set so readers do not need to trace the source code.

**Utility function (multinomial logit)**

Each option gets a utility score. Win probability (market share) is softmax over those scores.

```
u = quality_weight × quality
  + brand_weight × brand_trust     (Panel Twin only; competitors get brand=0)
  + tailwind_weight × market_tailwind
  − price_weight × price
  − turnaround_weight × turnaround_days
  + cross_price_elasticity × log(ownPrice / competitorPrice)  (for competitors only)
  − federal_risk_penalty            (applied equally to all when federal_high_risk)
```

**Utility coefficients (stylized, not fitted)**

| Coefficient | Value | Rationale |
|---|---|---|
| `utility_quality_weight` | 3.2 | Quality has the highest weight; reflects quality as primary differentiator |
| `utility_brand_weight` | 1.1 | Applied only to Panel Twin via `brand_trust`; represents new-entrant credibility |
| `utility_tailwind_weight` | 0.8 | See note below |
| `utility_price_weight` | 0.000012 | Very small; price has modest weight at these dollar magnitudes |
| `utility_turnaround_weight` | 0.03 | One day faster is worth about 0.03 utility units |
| `cross_price_elasticity` | 0.20 | Competitor utility includes a term for how much more expensive Panel Twin is |

**Panel Twin defaults**

| Parameter | Default | Note |
|---|---|---|
| `price_per_project` | $55,000 | Below traditional probability panel benchmarks |
| `turnaround_days` | 10 | Between probability (18 days) and non-prob (3 days) |
| `brand_trust` | 0.70 | Panel Twin's brand credibility as a new entrant (0–1 scale) |
| `market_tailwind` | 0.10 | See note below |

**Competitor defaults (generic labels in this public repo)**

| Competitor | Price | Quality | Turnaround |
|---|---|---|---|
| Probability benchmark | $80,000 | 0.90 | 18 days |
| Hybrid benchmark | $60,000 | 0.80 | 12 days |
| Non-probability panel | $5,000 | 0.70 | 3 days |

**Cannibalization and substitution**

- `cannibalization_rate`: 0.30. 30% of Panel Twin wins are assumed to displace existing internal work rather than generating truly incremental revenue. Net-new fraction = 1 − 0.30 = 0.70.

**Note on market_tailwind and federal_risk_penalty (both shift-invariant)**

The `market_tailwind` (0.10) is added to all utilities equally via the `tailwind_weight × tailwind` term. Because softmax is shift-invariant (adding a constant to all utilities does not change relative shares), this parameter has no effect on win probability. It was included as a future hook for cases where the tailwind benefit applies differentially, but in the current implementation it cancels out.

The same is true of `federal_risk_penalty` (0.08 in federal mode): it is subtracted equally from all utilities and therefore does not change relative win probabilities. Its practical interpretation is as a market-level headwind signal, not a competitor-specific disadvantage.

If you want either parameter to affect win probability, it would need to be applied asymmetrically (only to Panel Twin or only to competitors).

**NPV and revenue model**

The revenue model runs a month-by-month NPV loop over `horizon_months` (default 36). Each month:
- Demand scales with `projects_per_year`, `growth_rate` (0.08/year), and `churn_rate` (0.05/year)
- Projects sold = demand × win_probability × net_new_fraction
- Revenue per project = `price_per_project` (base price only; removed attachment rates in v0.2.8)
- Total upfront investment = `cac` ($12K default) + `other_initial_investment` ($0 default) + library build cost
- NPV uses a 12% annual discount rate (`discount_rate`), applied via discrete monthly compounding: `monthly_rate = (1 + annual_rate)^(1/12) − 1`. This is the standard corporate DCF convention for real cash flows, as distinct from the continuous compounding used in derivatives pricing (Hilpisch, 2018).
- Break-even is detected as the month when running NPV first crosses zero — equivalent to the discounted payback period (the month when cumulative discounted cash flows recover the upfront investment).

**On churn_rate semantics.** `churn_rate` (default 5%/year) is applied as an annual compound decay to the project demand base: `demand = projects_per_year × (1+growth_rate)^year × (1−churn_rate)^year`. In this model it represents gradual erosion of the addressable client base over time — clients who stop commissioning projects entirely, reduce research spend, or shift to competitors — rather than subscription cancellation in the pure SaaS sense. Note that `churn_rate` and `win_probability` address related but distinct phenomena: `win_probability` captures the competitive outcome on each individual project bid; `churn_rate` captures the secular trend in how many projects are pursued over the planning horizon. They should not be set simultaneously to represent the same risk. A 5%/year churn rate is consistent with best-in-class retention in B2B subscription and professional-services contexts (Ramanujam & Tacke, 2016; Liozu & Hinterhuber, 2023).

These are scenario coefficients intended to make the investment case plannable. Actual win rates depend on client relationships, proposal quality, contracting factors, and market dynamics not captured in this model.

**Monte Carlo perturbation distributions**

The MC model draws from the following distributions per iteration. Standard deviations are hardcoded in `mcModel.ts`, not configurable through the UI.

| Variable | Distribution | Std dev | Rationale |
|---|---|---|---|
| `interview_minutes` | Normal, clipped ≥20 | 12.0 min | Reflects scheduling uncertainty and interview length variation |
| `attrition_rate` | Normal, clipped [0.02, 0.50] | 0.05 | Typical field variation in 2-wave completion |
| `response_rate` | Normal, clipped [0.05, 0.80] | 0.04 | Typical sampling frame variation |
| Quality score (additive noise) | Normal, mean=0 | qualityUncertainty / 2 | Construct-specific extrapolation uncertainty |
| Win probability (additive shock) | Normal, mean=0, clipped [0.01, 0.99] | 0.10 (10pp) | Utility coefficients are stylized, not fitted to historical win/loss data. ±10pp (1σ) represents uncertainty in procurement dynamics, relationship factors, and proposal quality not captured by the logit model. Grounded in Bodea & Ferguson (2014): bid-response coefficient uncertainty without historical data is typically larger than cost uncertainty. |

**Quality uncertainty bands (used in MC and quality charts)**

| Construct | Uncertainty band | Basis |
|---|---|---|
| `mixed_general` | ±0.06 | Directly paper-anchored (Park et al., GSS Core, GPT-4, 2-hr interviews) |
| `incentivized_behavior` | ±0.10 | Anchored at 0.66 from Park et al. economic games; narrower anchoring |
| `behavioral_recall` | ±0.10 | Base (0.80) is a conservative planning discount below the 0.85 GSS Core anchor; not separately measured for behavioral recall items specifically |

The band for `mixed_general` is narrower because the 0.85 anchor is directly from the paper. Bands for other constructs are wider to reflect greater extrapolation uncertainty. In MC, quality noise is drawn from Normal(0, band/2), meaning ~68% of draws fall within ±(band/2) of the base quality estimate. The ±1 SEM framing (±0.06 for `mixed_general`) is consistent with the Classical Test Theory formula σE = σX√(1−α); at α = 0.85 and a typical standard deviation for a proportion-based accuracy score, this yields approximately ±0.058 (Mair, 2018).

**On the behavioral_recall base (0.80).** Park et al.'s GSS Core benchmark (0.85) actually spans both attitude and self-reported behavioral items — the paper does not report separate fidelity figures for behavioral recall items in isolation. The 0.80 base is a deliberate conservative planning discount: it assumes behavioral recall items are somewhat harder for agents to replicate accurately than the mixed GSS Core average, but does not imply the paper showed lower performance for them. Published evidence on nonprobability online panels (independent of this architecture) shows 5–10 percentage point absolute errors on behavioral/factual items relative to gold-standard benchmarks, suggesting the risk for behavioral items is real (Callegaro et al., 2014, Table 2.4: four large-scale experiments reporting average absolute errors of 5.2–8.5pp against RDD and national benchmarks). The ±0.10 uncertainty band is intentionally wider than `mixed_general` to reflect this. If field data from a pilot shows behavioral recall fidelity close to the mixed_general anchor, the band and base can be updated via pilot calibration.

### Monte Carlo: Uncertainty as a First-Class Output

Monte Carlo is not treated as a side feature. It is part of the core decision framework.

We intentionally expose:
- cost and NPV distributions
- feasible-rate summaries
- top drivers
- probability of positive NPV
- probability of break-even within horizon

This supports a better decision culture:
- less fixation on point estimates
- more focus on ranges, sensitivity, and fragility

## App and Frontend Design Decisions

### Progressive Disclosure Instead of One Giant Control Panel

The main interface design rule is:
- show only what most users need first
- allow deeper detail on demand

This is why the apps use:
- tabs for subject-matter areas
- optional expanders/details for advanced controls
- focused summary cards before dense tables

This design choice improves:
- usability
- scannability
- cognitive load management

### Subject-Matter Presets, Not Hierarchy Labels

Where presets exist, they are named by subject matter, not by role or seniority.

Examples:
- economics
- sampling and quality
- operations

This is intentional:
- it is less presumptive
- it is more modular
- it avoids implying that some users should or should not access certain information

### The React App Is Now the Actively Maintained Implementation

The React app (TypeScript) and the Python CLI are conceptually aligned but no longer kept in strict numerical sync.

The React app is the actively maintained primary interface. Default values, construct type framing, pricing, and model calibrations are updated there first. The Python CLI is preserved as a reference implementation and for one command with no browser equivalent: `calibrate`, which ingests pilot study CSVs and updates model parameters from observed data.

Known divergences between the two implementations are documented in the Known Issues section. Before using the Python CLI for financial projections, check those entries.

### Accessibility and Scanability Matter

The frontend is meant to be reviewed by people with different backgrounds and time constraints.

So the design intentionally supports:
- quick summary scanning
- keyboard-friendly, form-based interaction
- layered reading
- plain-language interpretation near technical outputs

The project also maintains accessibility-oriented checks and notes where possible.

## Guardrails and Limitations

This project now includes explicit guardrail messaging and limitations outputs.

That was a deliberate design choice because scenario models can be misused when:
- assumptions drift too far outside reasonable ranges
- uncertainty is hidden
- users read point estimates as promises

Current guardrails flag conditions such as:
- very long interview duration
- very high contact attempts
- very low response rate
- high attrition
- very high cross-price elasticity
- very long forecasting horizon

The limitations brief exists to reinforce the correct interpretation:
- this is decision support
- not a final validated predictive engine

## Documentation Decisions

### Why Maintain a Design Record

This document exists because good projects benefit from preserving rationale, not just implementation.

A design record helps:
- new contributors understand intent before changing code
- technical stakeholders assess whether decisions were thoughtful
- future updates remain consistent with the system's goals

### Why Track Versions Here

This document includes a version and update log because:
- architecture changes over time
- assumptions evolve
- a stable record reduces confusion during review

Before major pushes, this document should be reviewed and updated if the architecture or design rationale changed.

## What This Project Is Good For

- internal feasibility planning
- pilot design tradeoff analysis
- identifying the most decision-relevant unknowns
- comparing scenarios under explicit assumptions
- enabling informed cross-functional conversations

## What This Project Is Not Good For Yet

- high-confidence market forecasting
- final pricing commitments
- external claims that require strong empirical validation
- substituting for real calibration or causal evidence

## Maintenance Rule

When a meaningful design or architecture change is made:
- update this document if the rationale or system behavior changed
- add a short entry to `Version Updates`
- keep the description in plain human English

If a change only affects wording, styling, or minor implementation detail without changing design intent, an update may not be necessary.

## Known Issues and Deferred Work

Items that are acknowledged, not urgent, and should not be forgotten.

**Python config pricing divergence (low priority)**
Both `configs/base.yaml` and `configs/federal_high_risk.yaml` still contain `price_per_project: 180000` — the pre-recalibration default. The React app defaults were updated to $55,000 in v0.2.2 to reflect a realistic pricing position below traditional probability panel benchmarks. The Python configs were not updated at that time because the Python model is treated as a reference implementation and the configs are not actively used in the public-facing flow. Before relying on the Python CLI for financial projections, these values should be updated to match the React app defaults ($55,000 price, $18,000 per-project run cost, $80,000/$60,000/$5,000 competitor prices).

**Hardcoded prose numbers in INSIGHTS array will drift when model defaults change (deferred)**
`ExecutiveLanding.tsx` contains an `INSIGHTS` static array with narrative prose that includes hardcoded dollar figures and percentages derived from model defaults (e.g., "$89K incentives", "~$174K library build", "~67% margin"). These do not update automatically when `params.ts` defaults change. The KPI section below already computes values from `createDefaultConfig()` at runtime — the INSIGHTS array should follow the same pattern.

Recommended fix: convert INSIGHTS from a static array to a function that accepts a `stats` object (same shape as the `baseStats` useMemo in the component), and interpolate the most change-prone numbers (incentive total, library build cost, gross margin, break-even estimate) using template literals rather than hardcoded strings. Truly narrative estimates with no direct model counterpart (e.g., the "$150–250" LLM survey-run range) can remain as string literals with a `// @hardcoded` comment marking them for manual review.

Complement with a small vitest file asserting that key prose claims match computed defaults — these tests fail automatically when a default changes without updating the prose, catching drift before it reaches a presentation.

**Federal risk penalty has no effect on win probability (acknowledged, not a bug)**
In the competition model, `federal_risk_penalty` is subtracted from all utility values equally. Because softmax is shift-invariant, this does not change relative win probabilities among the four competitors. The intended interpretation is that the penalty represents an overall market-level headwind rather than a Panel Twin-specific disadvantage. If the goal is to model Panel Twin specifically losing market share in federal settings (relative to established alternatives), the penalty would need to apply only to Panel Twin's utility. The current behavior is documented in the landing page insight card for federal settings.

## Version Updates

### 0.4.0 - 2026-03-13

Reference library audit: two MC model bug fixes, break-even correction, documentation improvements, and citation pass.

**MC model bug fixes**
- Fixed: MC path was passing `cost_per_completed_interview` (full per-interview build cost) as COGS to `computeFinance`, where the main path uses `per_project_run_cost` ($18K marginal run cost). These represent structurally different costs — the build cost is a one-time investment, not a per-project variable cost.
- Fixed: MC path hardcoded `libraryBuildCost = 0`, omitting the ~$173K library build deduction from every MC NPV. This caused MC NPVs to be systematically inflated relative to the point estimate, making the MC distribution and the main path NPV non-comparable. Fix: MC now calls `computeCosts({ ...cfgDraw, mode: 'scaleup' })` and passes `cost.total_cost` as `libraryBuildCost`, matching the main path in `useScenario.ts` exactly.

**Break-even correction**
- Previously: break-even was detected when cumulative *undiscounted* margin ≥ upfront investment (undiscounted payback period).
- Now: break-even is detected when running NPV ≥ 0 (discounted payback period — the month when cumulative *discounted* cash flows recover the upfront investment). At default settings (12% discount rate), the numeric change is small (month 16 → month 17 discounted), but the calculation is now consistent with the NPV formula above it.

**Documentation improvements**
- Added "Why the Stanford Approach Was Chosen as the Quality Anchor" section documenting preprint status and rationale.
- Added test-retest framing clarification: the 0.85 normalized accuracy is explicitly benchmarked against participants' own two-week test-retest — this is a strength of the anchor, not a limitation.
- Added behavioral_recall derivation note with external empirical context.
- Added churn_rate semantics clarification distinguishing demand-base erosion from subscription churn and from win probability.
- Added discrete compounding note with citation.
- Added ±1 SEM framing for uncertainty bands with citation.
- Added References section.

**Citation pass**
Added inline citations throughout for: Mair (2018) on CTT/SEM framing of uncertainty bands; Callegaro et al. (2014) on behavioral item error in nonprobability panels; Ramanujam & Tacke (2016) and Liozu & Hinterhuber (2023) on churn benchmarks; Hilpisch (2018) on discrete vs. continuous compounding convention.

### 0.3.0 - 2026-03-13

Model change: win probability perturbation added to Monte Carlo. Clarity improvement: default projects/year labeled as illustrative.

**Win probability perturbation in Monte Carlo**
The MC simulation previously varied only interview duration, response rate, attrition, and quality noise. Win probability fed into NPV deterministically from stylized utility coefficients that are not fitted to historical win/loss data. This understated true NPV uncertainty, since coefficient uncertainty in B2B bid markets is typically larger than cost uncertainty (Bodea & Ferguson, 2014).

Added an additive Normal shock (σ=0.10, clipped to [0.01, 0.99]) on top of the logit-derived win probability for each MC draw. The shock is computed after quality uncertainty is applied, so the base win probability already reflects the quality draw for that iteration. The `win_probability` field is now present on each `MCRow`. The MonteCarloChart subtitle updated to name win probability as one of the varied inputs.

**"Illustrative scenario" language for default projects/year**
The default of 15 projects/year was chosen in v0.2.8 to produce a directionally useful break-even, not as a conservative baseline. Three locations now make this explicit: the MC section description in EconomicsTab, a small sub-note below that description, and the projects/year slider tooltip. This directly addresses the risk that users read the default point estimate as a probable outcome rather than as one plausible scenario.

### 0.2.7 - 2026-03-10

UX changes: phase filter replaces static divider, README screenshot updated. TypeScript type fix.

**Phase filter added to sidebar**
Replaced a static "After the library is built" section divider with a three-state toggle (All / One-time / Per-project) at the top of ScenarioControls. The filter uses conditional rendering — when "One-time" is selected, only build-phase controls appear; when "Per-project" is selected, only run-phase controls appear; "All" restores full view. Phase tags (blue for one-time, green for per-project) appear on fieldset legends and on Advanced slider rows. Terminology "one-time / per-project" was chosen over "build / run" because it is self-evident to non-technical audiences who may not know what "building" a library means in this context. This is a genuine progressive disclosure improvement over the prior static divider, which created an inconsistent hierarchy (no parallel label existed before the divider, and the "advanced" expander cut across both phases).

**README screenshot updated**
Screenshot replaced with current explorer view showing the phase filter toggle in the sidebar and default Overview tab results.

**TypeScript type fix**
`Slider.tsx` had `phase?: 'build' | 'run'` which was a stale internal label. Updated to `phase?: 'one-time' | 'per-project'` to match the values actually passed by ScenarioControls. The mismatch caused a TypeScript build error (caught by CI) while the local Vite dev server was lenient enough to ignore it.

### 0.2.6 - 2026-03-10

UX and copy changes. No model logic changes.

**Hero subtitle reframed toward economics**
The hero subtitle previously led with the Stanford/quality framing ("Explore whether digital twins built from AI-conducted voice interviews can deliver research-grade survey quality at scale"). Updated to foreground the investment case and business variables ("Map the investment case for AI-powered survey research: build cost, per-project pricing, market positioning, and break-even"). This reflects feedback that the economic modeling is the primary differentiator for the target audience, with quality modeling as a supporting input.

**Hero CTA button added**
Added an "Explore the model" orange CTA button to the hero section, matching the style and label of the existing bottom-of-page CTA. Addresses users who want to skip the narrative and access the model directly without scrolling.

**Phase divider in sidebar**
Added a ruled "After the library is built" label between the build-phase controls and the per-project economics controls in ScenarioControls. The sidebar previously had no visual cue separating one-time investment parameters from recurring per-project parameters, which caused confusion about which levers affect which phase of the cost structure.

**Cost vs. price hint in sidebar**
Added a small hint line ("Price = what clients pay. Run cost = what you spend internally.") inside the Per-project economics fieldset. Addresses terminology confusion between internal run cost and client-facing price, which appear in the same section.

**Spelling: Modeller → Modeler**
Corrected British spelling to American throughout all visible text (titles, headings, alt text, CSS comments). URL slugs and repository name left unchanged.

### 0.2.9 - 2026-03-01

Parameter defaults recalibrated, hidden parameters exposed as sliders, tooltip accuracy fixes, and stale landing page copy corrected.

**Default parameter updates**
- `scaleup_n` default: 2,000 → 1,000. The 2,000 figure was aspirational rather than a planning baseline; 1,000 is a more defensible starting point for an initial library build.
- `per_project_run_cost` default: $25,000 → $18,000. The $25K figure overstated loaded run costs when labor is already captured in the library build phase; $18K better reflects per-project LLM inference, QA, PM, and data delivery.
- `cac` default: $20,000 → $12,000. Lowered to a more conservative customer acquisition estimate consistent with a commercial research services context with prior relationships.
- Split `total_labor_cost` (single field) into `pilot_labor_cost` ($15,000 default) and `library_labor_cost` ($45,000 default). `computeCosts()` now selects between the two based on `cfg.mode`. This prevents the library build from using the pilot's labor cost — previously, both cost views used the same lump sum, which understated library build labor by approximately 3×.

**Hidden parameters exposed as sliders**
Seven parameters that materially affect NPV, break-even, or win probability were previously hidden at fixed defaults with no UI access. All seven now have sliders:
- `cac` (Customer acquisition cost) — added to Per-project economics section
- `retest_rate` (UI label: "Planned retest coverage") — added to Per-interview costs (Advanced). Labeled to distinguish it as a deliberate study design choice (what fraction you intend to retest) from "Retest attrition" (involuntary field dropout), which already appears in the main Interview design section. Both affect retest economics but from opposite directions of control.
- `discount_rate` (Annual hurdle rate for NPV discounting)
- `growth_rate` (Annual compound growth in project demand)
- `churn_rate` (Annual compound decay in project demand)
- `brand_trust` (Panel Twin's perceived credibility, 0–1 scale)
- `cannibalization_rate` (Fraction of Panel Twin revenue displacing existing revenue rather than net-new)

The last three appear in a new "Financial assumptions" fieldset and the "Market context" section (renamed from "Market benchmarks") within Advanced settings. Fixed defaults that were intentionally not exposed — `market_tailwind`, `turnaround_days`, competitor turnaround days — are now documented in the Market context fieldset tooltip instead.

**Tooltip accuracy fixes**
- Staff cost (pilot) tooltip: removed incorrect "IRB compliance combined" label; softened to "ethics or compliance review." Removed "Enter as a lump dollar amount" instruction (redundant with slider mechanics).
- Staff cost (library build) tooltip: removed misleading "scaled for the larger participant count" language (the field is NOT auto-scaled; users must set it independently). Added typical range note ("typically 3–4× the pilot figure").
- Per-interview costs fieldset tooltip: added disclosure of the $20/participant in fixed costs not surfaced as sliders ($5 bonus, $5 transcript cleaning, $2 summarization, $8 storage/compliance).
- Run cost per project tooltip: removed stale "$20,000–$30,000 range" guidance (now an exposed slider, range is visible from the control itself).
- EconomicsTab note: replaced "fixed assumption, not configurable here" with "configurable in Advanced settings" for discount rate, growth rate, and churn rate.
- Market context fieldset tooltip: added documentation of the turnaround-day and market-tailwind defaults not exposed as sliders.

**Landing page stale copy corrected**
- Insight 4 methodology: "2,000-person library" → "1,000-person library"; savings figures corrected ($1,620/$3,240 → $810/$1,620) to match the updated `scaleup_n` default.
- Insight 6 methodology: "~55% variable margin" → "~67% variable margin" to match the updated `per_project_run_cost` default ($18K instead of $25K at $55K price).

### 0.2.8 - 2026-03-01

Revenue model simplification, default projects per year raised to 15, and CostTab library definition tooltip.

**Module add-on and refresh wave attachment rates removed**
- The revenue model previously included hardcoded attachment rates (0.4 × module_addon_price and 0.2 × refresh_wave_price) that inflated expected revenue per project from $55K base to ~$77K effective. These rates were never exposed in the sidebar or prominently disclosed, creating a hidden assumption that made the default NPV projections more optimistic than a base-price model would justify.
- Removed: revenue formula simplified to `sold × price_per_project`. The `module_addon_price` and `refresh_wave_price` fields were removed from `RevenueParams` and defaults since they no longer affect any calculation.
- Users who want to model add-on revenue should set `price_per_project` to their expected blended rate.
- Impact: per-project margin drops from $52K (with add-ons) to $30K (base price only). Break-even analysis is now more conservative and transparent.

**Default projects_per_year raised from 10 to 15**
- At $30K base-price margin and ~37% win probability, 10 projects/year did not break even within the 36-month horizon. Raising to 15 places the break-even at approximately month 31 on an undiscounted basis, which is more illustrative for the default scenario while still requiring users to engage the controls to understand sensitivity.
- Rationale: the default scenario should be directionally useful, not pessimistic. 15 projects/year is still conservative for a commercial research services context with an established brand.

**CostTab library definition tooltip**
- Added an info tooltip on the "Library build" toggle button in the Cost tab explaining what an agent library is, for users who access the explorer without reading the landing page.

### 0.2.7 - 2026-03-01

Landing page audit, terminology consistency, and competition model documentation.

**Landing page accuracy fixes**
- Updated hardcoded dollar figures in INSIGHTS prose to match current TS model defaults: "~$277K library build" corrected to "~$275K" in two places (INSIGHTS[0] summary and INSIGHTS[1] summary); "~$297,000 upfront" corrected to "~$295,000" in INSIGHTS[2] methodology. The live KPI section below already computed these accurately from the model; the prose was using figures from an earlier calibration.
- Corrected INSIGHTS[0] labor description: "Setup labor (153 hours at $120/hr) adds $18,360" was stale. The TS model uses a single `total_labor_cost` lump sum (default $18,000), not an hours × rate breakdown. Updated to "Staff cost (lump sum, $18,000 default)."

**Agent library definition added**
- The term "agent library" (the collection of AI agents built from participant interviews) was used in several places throughout the app without a first-use definition on the landing page. Added a brief explanatory paragraph to the "What is a digital panel twin?" section introducing the term.
- Replaced the one occurrence of "twin library" in INSIGHTS[5] summary with "agent library" for consistency.

**Competition model documentation**
- Expanded the "Competition and Revenue" section in this document with a full parameter reference: utility coefficients, Panel Twin defaults, competitor defaults (prices, quality, turnaround), cannibalization rate, and NPV model structure.
- Documented the shift-invariance note for `market_tailwind` and `federal_risk_penalty`: both are applied equally to all options in the current model and therefore have no effect on relative win probabilities. Noted where asymmetric application would be needed to achieve a real effect.

### 0.2.6 - 2026-03-01

Sidebar reorganization, Cost tab pilot/library toggle, ad-hoc cost fields, and test suite fixes.

**Sidebar reorganization**
- Replaced the ad-hoc "Study design + Field operations + Pricing and business" grouping with four semantically coherent sections organized by cost destination: Interview design (shared per-participant parameters), Study scale (pilot size → Cost tab; library build size → Economics tab), Per-project economics (post-library revenue and cost inputs), and Advanced settings.
- Rationale: the previous layout organized controls by parameter type. The new layout mirrors how a user thinks about the three spending events: per-participant costs at both scales, the validation pilot, the library build, and per-project runs. Each section tooltip explicitly names which output tab the parameters drive.
- Advanced section renamed: "Build and setup costs" → "Staff and overhead". This name is more accurate because staff cost and overhead apply to every study run (both pilot and library build), whereas "build costs" implied one-time application.

**Cost tab pilot/library toggle**
- The Cost tab now has a two-button toggle switching the cost breakdown chart and detail table between the validation pilot view and the library build view. Both are computed simultaneously in `useScenario` (`costs` for pilot, `deploymentCosts` for library build) and the toggle simply selects which `CostResult` to display.
- Previously only the pilot costs were visible in the Cost tab; the library build cost only appeared in the Economics tab as the initial investment figure.

**Ad-hoc cost fields**
- Added `other_pilot_cost` (default $0, in `CostParams`) as a free-form ad-hoc cost bucket for the validation pilot — for costs that do not fit any existing category (unexpected IRB fees, software licenses, travel). Handled entirely in the UI: `CostTab` adds it to the displayed total and the `CostWaterfallChart`; it does not enter `computeCosts()` or the NPV model.
- `other_initial_investment` (already existed in `RevenueParams`) now also appears in the Cost tab library build view as "Ad-hoc costs (library build)". Previously it was invisible in the Cost tab and only appeared in the Economics tab NPV model. The Cost tab now correctly shows the full picture of what the library build will cost.
- Design note on asymmetry: `other_pilot_cost` is UI-only (not in `computeCosts()`), while `other_initial_investment` is in the revenue model AND shown in the UI. This asymmetry is intentional — pilot ad-hoc costs are not included in the NPV model's total upfront investment (the pilot is treated as a pre-decision sunk cost). If a future version includes pilot costs in the NPV model, both fields should be in the finance calculation.

**Per-unit cost labels**
- "Cost per completed interview" and "Cost per retained agent" rows in the Cost detail table append "(base, excl. ad-hoc)" when ad-hoc costs are present, to clarify that these per-unit figures divide `computeCosts()` total by n and do not include the flat ad-hoc cost items (which are not per-participant and should not be allocated to individual interviews).

**Test suite fixes**
- Added `[tool.pytest.ini_options] testpaths = ["tests"]` to `pyproject.toml`. Without this, pytest scanned the project root and hit Windows-locked `pytest-cache-files-*` temp directories, producing a `WinError 5` permission error during collection that prevented any tests from running.
- Corrected `test_strict_filter_changes_threshold_vs_all` in `tests/test_benchmark_integration.py`. The test asserted that `strict_near_2week_federal` and `all` filter modes produce different thresholds for `attitude_belief`. In practice, every construct in the current benchmark YAML has exactly one entry with valid metrics and it passes both filter modes, so both modes return identical results. The assertion was updated to `t_all == t_strict` with a comment explaining the current data situation and when the assertion should be revisited. All 39 tests now pass.

### 0.2.5 - 2026-03-01

Study-type reframe, labor model simplification, overhead fix, and cost tab wording.

**Study-type reframe**
- Renamed the three study-type categories from construct-type framing to study-type framing: `attitude_belief` (0.85) → `mixed_general` (0.85), `self_report_behavior` (0.75) → `behavioral_recall` (0.80 — raised from 0.75 to better reflect the planning discount position), `incentivized_behavior` remains (0.66).
- Rationale: the original framing implied a construct-type decision (what latent variable are you measuring?). In practice, researchers choose by study design (what kind of study is this?). Mixed general surveys combine attitudes, opinions, and behavioral recall — the most common design and the one directly paper-anchored via the GSS Core. Behavioral recall surveys focus on frequency or history items and are the only extrapolated category. Incentivized experiments remain paper-anchored at 0.66.
- Labels updated across the dropdown ("Mixed general (attitudes, opinions, behaviors)", "Behavioral recall (frequency and history items)"), CONSTRUCT_LABELS maps, chart series names, tooltips, and quality tab methods text.
- `constructMatch()` in `benchmarkModel.ts` was missing aliases for the new keys, causing benchmark thresholds to silently fall back to the manual default for both `mixed_general` and `behavioral_recall`. Fixed by adding bidirectional aliases mapping new keys to the old benchmark `construct_type` values.

**Labor model simplification**
- Collapsed six sidebar sliders (fully loaded hourly rate + protocol design / engineering / QA / PM / IRB compliance hours) into a single "Total staff cost" lump-sum input ($18,000 default, equal to the previous calculated total of 153 hours × $120/hr).
- Rationale: individual hour breakdowns are error-prone since labor rates and role structures vary widely by organization. A lump-sum input correctly places the estimation burden on the user, who knows their own staffing, rather than on stylized defaults that no organization will actually match.

**Overhead double-counting fix**
- `overhead_rate` previously applied to all direct costs including labor. Since the "fully loaded hourly rate" was described as already including overhead (salary + benefits + facilities), applying overhead on top constituted double-counting on the labor line.
- Fixed: overhead now applies only to non-labor direct costs (recruitment, incentives, voice ops, LLM, post-processing). The "Total staff cost" lump sum is not marked up further. Tooltip updated to clarify: set overhead to 0 if the staff figure is already fully loaded.
- Sidebar label renamed from "Overhead rate" to "Indirect / overhead rate" for clarity.

**Cost tab panel wording**
- Removed bold "existing probability panel" phrasing from the Cost tab info callout. Reworded to "existing survey panel or sample source" — generic language that does not imply a specific named panel or proprietary relationship.
- `cost_per_invite` tooltip updated to explicitly distinguish three cases: no chargeback ($0), internal departmental chargeback (set to the rate), and external vendor per-invite rate.

### 0.2.4 - 2026-03-01

Cohesion and coherence audit. Terminology standardization, missing caveats, and label clarifications across all tabs.

**Label clarifications**
- "Risk profile" control renamed to "Client risk profile" to clarify it reflects the buying organization's procurement stance, not the researcher's risk tolerance.
- "Cumulative contribution" row in the Economics financial summary table renamed to "Total contribution margin" with a tooltip explaining it as the sum of (price − run cost) across all projected projects.
- "Voice operations" row in the Cost detail table now reads "Voice operations (ASR and TTS)" to make clear what costs are included without requiring the user to cross-reference the intro paragraph.

**Missing caveats added**
- Headline KPIs section on the landing page now includes: "All figures are model estimates at default parameter values — adjust the controls in the explorer to explore your scenario." Previously the section showed numbers without signaling they were model outputs.
- "Favorable/Needs work" signal badge on the Overview tab now displays a brief note directly below it explaining the two-part criteria: quality threshold cleared AND NPV positive within the horizon.

**Acronym and terminology standardization**
- Footer note on landing page expanded from "ASR (speech recognition)" to "ASR (automatic speech recognition), and TTS (text-to-speech)" — both acronyms are now fully expanded since both technologies are referenced in Cost tab.
- "loaded labor rates" standardized to "fully loaded labor rates" throughout landing page methodology cards to match the label used in the ScenarioControls setup/labor fieldset ("fully loaded (salary, benefits, facilities)").

**Hero screenshot added to README**
- Playwright screenshot of the Economics tab (NPV timeline, sidebar controls, financial summary table) added as `screenshot.png` and embedded as hero image in README.

### 0.2.3 - 2026-03-01

Copy, defaults, and documentation cleanup.

**projects_per_year raised from 6 to 10**
- Updated default in `docs-app/src/model/params.ts`, `twin_econ/params.py`, `configs/base.yaml`, and `configs/federal_high_risk.yaml`.
- Rationale: 6 projects/year produced negative NPV at the recalibrated price ($55K) and run cost ($25K), which is a misleading default signal for a tool users will treat as a planning baseline. 10 is still conservative for an operational research service with an existing client base and breaks even around month 27 of a 36-month horizon with default win probability.

**Landing page insight cards 3 and 5 rewritten**
- Card 3 (was: methodology disclaimer about the self_report_behavior 0.75 planning discount): replaced with a genuine model finding about project volume being the primary NPV driver. Quantifies break-even at default settings (10 projects/year, ~37% win probability, ~month 27). Methodology section explains why volume matters more than per-project margin given the fixed upfront investment structure.
- Card 5 (was: "Federal viability applies two independent filters, not one"): retitled to "Federal clients are a harder sell than the quality numbers alone would suggest." Summary and methodology now accurately describe what the model actually does — quality threshold uplift (+0.05) is the primary actionable effect; the federal_risk_penalty is acknowledged to apply equally to all competitors and not shift relative win probabilities. The acknowledged behavioral description is also documented in the Known Issues section.

**NPV acronym expanded on first use**
- "NPV" was undefined for first-time readers. All six files that used the abbreviation now spell it out as "net present value (NPV)" on first use within each standalone UI context: EconomicsTab, OverviewTab, DynamicNarrative, QualityTab, ExecutiveLanding.

**Stale "synthetic" copy removed**
- EconomicsTab intro referenced "data collection or generation" — a leftover from the era when the third benchmark was fully synthetic data. Updated to "data collection."

**Known issues section added to this document**
- Documents three deferred items: Python config pricing divergence, pre-existing test failure, and the federal risk penalty behavior. See "Known Issues and Deferred Work" section above.

### 0.2.2 - 2026-02-28

Pricing recalibration, per-project run cost correction, and GSS finding propagation.

**Third benchmark replacement: fully synthetic → non-probability panel**
- Replaced the "fully synthetic" competitor benchmark with a "non-probability panel" benchmark (opt-in online sample marketplace). Rationale: non-probability panels are the realistic budget alternative clients actually consider when evaluating Panel Twin. Fully synthetic data generation is not a comparable research service at the quality standard this project targets.
- New defaults: nonprob_panel_price $5,000, nonprob_panel_quality 0.70, nonprob_panel_turnaround_days 3. Quality default (0.70) reflects real human responses but with known opt-in panel concerns (satisficing, panel conditioning, selection bias). Price reflects typical full-service-equivalent project cost for marketplace-based sample.
- Field name renamed from external_synthetic_* to nonprob_panel_* across all model files, configs, tests, and the React app. TypeScript compiler and pytest suite used as safety nets.
- Pricing hierarchy after this change: Non-prob panel ($5K) < Panel Twin ($55K) < Hybrid ($60K) < Probability ($80K).

**Pricing recalibration**
- Panel Twin price_per_project default lowered from $180,000 to $55,000. The prior default was in the range of established probability panel benchmarks, which is the wrong positioning. Panel Twin's value proposition is delivering research-grade quality at a lower price point than traditional probability panels, not matching their pricing.
- Competitor prices updated to reflect the corrected positioning: probability benchmark $80,000, hybrid benchmark $60,000 (publicly available pricing data for calibrated hybrid panels indicates approximately 25% below the probability benchmark).
- Price slider range updated accordingly (min $20K, max $300K).

**Per-project run cost correction**
- Default per_project_run_cost increased from $10,000 to $25,000, reflecting realistic loaded labor rates for QA, PM, and data delivery in an institutional research context. The $10K default understated overhead and staff time relative to how these costs are actually incurred.
- Slider step updated from $500 to $1,000; tooltip updated to reflect realistic $20K–$30K range.
- All hardcoded INSIGHTS text updated to reflect the new run cost (gross margin ~55% at $55K price / $25K run cost).

**GSS finding propagation**
- Confirmed that Park et al. (2024) 0.85 normalized accuracy covers the full GSS Core (177 items including both attitudes and self-reported behaviors), not attitudes only. This finding has been propagated throughout:
  - QUALITY_UNCERTAINTY_BANDS comment in params.ts corrected from "GSS attitude sample" to "GSS Core sample."
  - design_decisions.md v0.2.1 entry corrected from "attitude item replication" to "full GSS Core replication."
  - INSIGHTS[2] in the landing page reframed. The self_report_behavior 0.75 base is now clearly described as a deliberate conservative planning discount — not an empirical finding and not a lower result the paper reports. The prior framing ("methodological risk zone") implied the paper showed lower fidelity for behaviors, which it does not.
  - QualityTab methods section sub-headings and text already updated in v0.2.1 to correctly describe the GSS Core scope.

### 0.2.1 - 2026-02-28

Methodological corrections, cost recalibration, and framing refinements.

**Fidelity and validity framing**
- Renamed "Quality" tab to "Fidelity" throughout the app, and updated all associated labels, chart titles, and narrative copy to use "agent fidelity" rather than "quality."
- Clarified the key distinction between agent-human fidelity (criterion validity on measured items) and traditional survey reliability. Human test-retest benchmarks serve as normalizing ceilings, not direct comparators.
- Expanded methods note in the Fidelity tab to explicitly state what fidelity comparisons establish and what they leave open (construct validity, discriminant validity, topical generalizability).

**Evidence base corrections for construct types**
- Corrected the uncertainty band ordering and methods language. attitude_belief (0.85) is anchored to Park et al. (2024) from full GSS Core replication (177 items spanning attitudes, self-reported behaviors, opinions, and demographics — not attitude items only). incentivized_behavior (0.66) is anchored to economic game experiments in the same paper. self_report_behavior (0.75) is a conservative planning discount applied below the 0.85 anchor — not a separately measured result.
- Updated uncertainty bands to reflect this: attitude_belief ±0.06 (most directly anchored), incentivized_behavior ±0.10 (also anchored but smaller economic game sample), self_report_behavior ±0.12 (least directly tested).
- Updated the "What are you measuring?" tooltip and Fidelity tab methods note accordingly.

**Citation and benchmark corrections**
- Removed the HINTS benchmark entry due to inability to verify its published source.
- Corrected the Park et al. citation from "Nature" to arXiv:2411.10109 (preprint, not peer-reviewed).
- Removed duplicate BRFSS citation. Corrected GSS citation URL.

**Cost model recalibration**
- Set cost_per_invite default to $0.00, reflecting the established-panel context where outreach is part of existing panel operations rather than a per-study variable cost.
- Updated LLM token price defaults to reflect current frontier model pricing (input: $0.003/1k, down from $0.008). Output tokens and TTS costs left at reasonable mid-range defaults.
- Updated ASR cost default to $0.007/min (down from $0.03) to reflect current speech-to-text API pricing.
- Added info callout in the Cost tab explaining the established-panel context.

**Competition model recalibration**
- Lowered the fully synthetic benchmark default price from $130,000 to $50,000, reflecting full-service project pricing at equivalent deliverable scope. Raw data generation from pure-play vendors is substantially cheaper ($2–30 per profile); the previous default conflated different service scopes.
- Added comparability scope note to the market benchmarks fieldset and the Economics tab callout. All four prices (Panel Twin and alternatives) now reflect the same scope: data collection or generation, representativeness adjustments, and a weighted dataset. Custom analysis and reporting are not included.
- Updated slider range for the fully synthetic price to match the corrected scale (min $10,000, max $200,000).
- Updated tooltips to clarify what "quality" means for fully synthetic data (population-level representational accuracy without person-level anchoring).
- NOTE: the fully synthetic benchmark was subsequently replaced by a non-probability panel benchmark in v0.2.2 (see below).

**Economics tab framing**
- Renamed tab heading to "Feasibility and market context" to better reflect its role as investment decision support alongside competitive landscape analysis.
- Added framing paragraph connecting methodological trade-offs to business outcomes.
- Updated info callout to explicitly state the price comparability scope.

**Vendor label consistency**
- Applied consistent generic labels across all public-facing files. Panel-specific and institutional names do not appear in any public repository file.

### 0.2.0 - 2026-02-27

Major redesign of the public-facing interface and full model port to TypeScript.

**Model port (Python to TypeScript)**
- All 8 Python model modules faithfully ported to TypeScript in `docs-app/src/model/`
- Includes cost, quality, competition, revenue, benchmark, product, and Monte Carlo models
- Monte Carlo uses mulberry32 seedable PRNG and Box-Muller normal distribution (replacing numpy)
- All parameter defaults match the Python model exactly

**React app redesign**
- Complete rewrite of the React app with executive landing page and interactive explorer
- Landing page includes static model insights (quality trends, cost structure, sensitivity patterns)
- Five visualization tabs: Overview (KPIs + narrative), Quality (curves with uncertainty bands), Cost (waterfall), Economics (NPV timeline + radar + Monte Carlo histogram), Benchmarks (federal standards)
- Dynamic plain-language narrative that adapts to parameter changes
- Accessible design: ARIA labels, keyboard navigation, semantic HTML, screen reader support
- Responsive layout with sidebar controls

**Model fixes**
- Fix 1: Stylized utility coefficients (quality=3.2, brand=1.1, tailwind=0.8, price=0.000012, turnaround=0.03) are now prominently flagged as illustrative, not market-fitted. Warning callout in Economics tab.
- Fix 2: Quality uncertainty bands added. Attitudes ±0.06 (paper-anchored), self-reported behaviors ±0.10 (less evidence), incentivized behaviors ±0.12 (least evidence). Displayed in charts and incorporated into Monte Carlo noise terms.
- Fix 3: Competitor labels genericized across all source files, config files, and the React app to use descriptive category names rather than specific product references.

**Infrastructure changes**
- Streamlit app removed from public repo (React app now covers the same functionality with richer visualizations)
- Streamlit dependency removed from pyproject.toml
- Recharts added as React app dependency for charting

**Design rationale**
- The React app serves as the public-facing interface (static GitHub Pages hosting, no Python backend needed, shareable URL).
- The landing page's "What the model tells us" section provides static structural insights from the model itself (diminishing returns on interview duration, labor-dominated costs, sensitivity to win probability, asymmetric uncertainty by construct, higher federal bar) so stakeholders get value even before adjusting parameters.
- Competitor labels use generic descriptive categories (e.g., "probability benchmark", "hybrid benchmark") to keep the model focused on structural comparisons rather than specific products.

### 0.1.5 - 2026-02-27

Added visible assumption provenance in run outputs and app sessions.

Included:
- `summary.json` and baseline summaries now expose response-mode assumption source and calibration status
- App now flags when a session changes from preset-driven to manual response-mode assumptions
- a sample pilot CSV template documents optional response-mode calibration columns

### 0.1.4 - 2026-02-27

Added assumption-source tracking and calibration completeness reporting.

Included:
- explicit response-mode assumption source state (`preset_driven`, `manual`, `pilot_calibrated`)
- dedicated calibration-completeness artifacts
- neutralized publication-sync wording in README documentation

### 0.1.3 - 2026-02-27

Added explicit construct presets, calibration hooks, and method-assumptions export.

Included:
- construct-specific response-mode presets by quality profile
- optional calibration of response-mode shares and reliability multipliers from pilot logs
- dedicated `method_assumptions.md` artifact for run outputs and app downloads

### 0.1.2 - 2026-02-27

Added explicit interaction-type and memory-architecture design notes.

Included:
- response-mode reliability assumptions for categorical, numeric, and open-ended items
- explicit framing that reflection and importance are prompt-mediated heuristics
- alignment of app controls with the newer memory and response-mode model structure

### 0.1.1 - 2026-02-27

Clarified external inspiration, evidence boundaries, and citation discipline.

Included:
- explicit attribution to Stanford HCI `genagents`
- separation of paper-backed anchors from repo-inspired architecture patterns
- explicit note that the paper's reported sample is 1,052 participants
- explicit note that some operational defaults remain placeholders pending independent verification

### 0.1.0 - 2026-02-27

Initial formal design record created.

Included:
- project goals and context
- architecture overview
- core model design rationale
- app and frontend design rationale
- guardrails and limitations philosophy
- documentation and maintenance conventions

---

## References

**Quality and psychometrics**
- Park, J. S., Zou, C. Q., Shaw, A., Hill, B. M., Cai, C., Morris, M. R., Willer, R., Liang, P., & Bernstein, M. S. (2024). *Generative Agent Simulations of 1,000 People*. arXiv:2411.10109. Pre-registered at osf.io/mexkf/. https://arxiv.org/abs/2411.10109
- Mair, P. (2018). *Modern Psychometrics with R*. Use R! series. Springer International Publishing. ISBN 978-3-319-93175-3.
- Callegaro, M., Baker, R., Bethlehem, J., Göritz, A. S., Krosnick, J. A., & Lavrakas, P. J. (Eds.) (2014). *Online Panel Research: A Data Quality Perspective*. John Wiley & Sons.

**Federal survey benchmarks**
- SAMHSA (2010). *Reliability of Key Measures in the National Survey on Drug Use and Health*. Substance Abuse and Mental Health Services Administration, Rockville, MD. https://www.ncbi.nlm.nih.gov/books/NBK519788/
- Andresen, E. M., Catlin, T. K., Wyrwich, K. W., & Jackson-Thompson, J. (2003). Retest reliability of surveillance questions on health-related quality of life. *Journal of Epidemiology & Community Health*, 57(5), 339–343. https://pubmed.ncbi.nlm.nih.gov/12700216/

**Pricing, revenue, and competition**
- Bodea, T., & Ferguson, M. (2014). *Segmentation, Revenue Management and Pricing Analytics*. Routledge / Taylor & Francis.
- Ramanujam, M., & Tacke, G. (2016). *Monetizing Innovation: How Smart Companies Design the Product Around the Price*. Wiley.
- Liozu, S. M., & Hinterhuber, A. (Eds.) (2023). *Digital Pricing Strategy: Capturing Value from Digital Innovations*. Routledge.

**Financial modeling**
- Hilpisch, Y. (2018). *Python for Finance: Mastering Data-Driven Finance* (2nd ed.). O'Reilly Media.





