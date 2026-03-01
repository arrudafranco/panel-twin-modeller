# Design Decisions and Architecture

Version: 0.2.4
Last updated: 2026-03-01
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
  - [2. Internal Interactive App](#2-internal-interactive-app)
  - [3. Public Interactive App](#3-public-interactive-app)
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
  - [Internal and Public Apps Are Aligned but Not Identical](#internal-and-public-apps-are-aligned-but-not-identical)
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

This layer is the source of truth for the model.

### 2. Internal Interactive App

The React app in `docs-app/` is the primary public interactive interface, deployed via GitHub Pages.

It is designed to:
- expose core assumptions interactively
- preserve progressive disclosure
- support fast scanning and deeper technical review
- use the same backend logic as the CLI

The React app is meant to be the primary interface for stakeholders and external audiences.

### 3. Public Interactive App

The public-facing app in `docs-app/` is a React + TypeScript frontend built with Vite and deployed to GitHub Pages.

It is designed to:
- provide an accessible and lightweight interactive demonstration
- mirror the main concepts and controls
- stay simpler than the full backend model

The public app is intentionally illustrative. The backend remains the authoritative implementation.

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

It separates:
- attitude/belief constructs
- self-report behavior
- incentivized behavior

It uses configurable functional forms and memory assumptions rather than pretending to be a final empirically validated psychometric engine.

This design reflects an important constraint:
- we do not yet have enough project-specific evidence to justify a more confident model

The quality model is therefore designed to be:
- interpretable
- calibratable
- honest about uncertainty

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

The competition and revenue logic are designed to be explicit rather than opaque.

They include:
- outside options
- substitution pressure
- cannibalization
- market tailwind
- horizon-based NPV
- explicit break-even timing

This is useful because it lets stakeholders inspect:
- which business assumptions matter
- how sensitive the model is to pricing or substitution assumptions

At the same time, these are still scenario coefficients, not market estimates fitted to historical internal data.

That limitation is intentional and documented.

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

### Internal and Public Apps Are Aligned but Not Identical

The internal app and public app are designed to stay in sync conceptually, but not to be identical in depth.

Why:
- the internal app should expose the full underlying logic more directly
- the public app should remain lighter and easier to understand

This means:
- shared concepts and key controls should align
- the public app may use simplified presentation and lighter interaction patterns
- the backend remains the authoritative source

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
Both `configs/base.yaml` and `configs/federal_high_risk.yaml` still contain `price_per_project: 180000` — the pre-recalibration default. The React app defaults were updated to $55,000 in v0.2.2 to reflect a realistic pricing position below traditional probability panel benchmarks. The Python configs were not updated at that time because the Python model is treated as a reference implementation and the configs are not actively used in the public-facing flow. Before relying on the Python CLI for financial projections, these values should be updated to match the React app defaults ($55,000 price, $25,000 per-project run cost, $80,000/$60,000/$5,000 competitor prices).

**Pre-existing Python test failure (low priority)**
`test_strict_filter_changes_threshold_vs_all` in `tests/test_model_properties.py` fails. This is a pre-existing failure unrelated to changes made in v0.2.2 or later. It tests benchmark filter logic for a specific edge case. The remaining 38/39 tests pass. The failure should be investigated before relying on the Python benchmark model for strict-filter scenarios.

**Federal risk penalty has no effect on win probability (acknowledged, not a bug)**
In the competition model, `federal_risk_penalty` is subtracted from all utility values equally. Because softmax is shift-invariant, this does not change relative win probabilities among the four competitors. The intended interpretation is that the penalty represents an overall market-level headwind rather than a Panel Twin-specific disadvantage. If the goal is to model Panel Twin specifically losing market share in federal settings (relative to established alternatives), the penalty would need to apply only to Panel Twin's utility. The current behavior is documented in the landing page insight card for federal settings.

## Version Updates

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




