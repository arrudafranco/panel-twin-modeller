# Design Decisions and Architecture

Version: 0.1.4
Last updated: 2026-02-27
Status: active working design record

## Purpose

This document explains, in plain English, how and why this project is designed the way it is.

It is meant to help:
- human readers who want a fast but accurate understanding of the system
- technical stakeholders who want a deeper under-the-hood scan
- future contributors who need to understand architecture before changing it
- machine readers and coding agents that benefit from explicit design intent in natural language

This is not just a feature list. It is a record of the main design choices, the reasons behind them, and the tradeoffs we accepted.

## How To Use This Document

- Read `Goals and Context` first if you are new to the project.
- Read `Architecture Overview` for the high-level system map.
- Read `Model Design Decisions` for the core analytical logic.
- Read `App and Frontend Design Decisions` for interaction and usability choices.
- Read `Guardrails and Limitations` before treating outputs as forecasts or commitments.
- Read `Version Updates` to see what changed and why.

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

The Streamlit app in `webapp/app.py` is the main internal interactive interface.

It is designed to:
- expose core assumptions interactively
- preserve progressive disclosure
- support fast scanning and deeper technical review
- use the same backend logic as the CLI

The Streamlit app is meant to be the strongest operational interface for internal work.

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

## Version Updates

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




