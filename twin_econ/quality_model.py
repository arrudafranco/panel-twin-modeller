from __future__ import annotations

import math

from .params import ScenarioConfig


def _memory_adjustment(memory_strategy: str) -> float:
    return {
        "full_transcript": 1.0,
        "summary_memory": 0.83 / 0.85,
        "partial_20pct": 0.79 / 0.85,
        "hybrid": 0.96,
    }.get(memory_strategy, 1.0)


def _construct_base(cfg: ScenarioConfig, construct_type: str) -> float:
    if construct_type == "attitude_belief":
        return 0.85
    if construct_type == "self_report_behavior":
        return cfg.quality.self_report_behavior_base
    if construct_type == "incentivized_behavior":
        return 0.66
    return 0.75


def quality_score(
    cfg: ScenarioConfig,
    construct_type: str,
    interview_minutes: float | None = None,
    contacts: int = 1,
    domain_complexity_scalar: float = 1.0,
) -> float:
    minutes = interview_minutes if interview_minutes is not None else cfg.interview_minutes
    base = _construct_base(cfg, construct_type)

    if cfg.quality.functional_form == "logistic":
        minute_effect = 1 / (1 + math.exp(-(minutes - 60.0) / 20.0))
    elif cfg.quality.functional_form == "piecewise":
        minute_effect = min(1.0, 0.5 + 0.5 * min(minutes, 120.0) / 120.0)
    else:
        minute_effect = min(1.0, 0.7 + 0.3 * math.log(max(minutes, 10.0)) / math.log(120.0))

    memory_effect = _memory_adjustment(cfg.memory_strategy_prediction)
    if cfg.cost.full_transcript_injection:
        context_tokens = cfg.cost.interview_context_chars * cfg.cost.chars_to_tokens_ratio
    else:
        context_tokens = cfg.cost.interview_context_chars * cfg.cost.chars_to_tokens_ratio * 0.6
    context_effect = min(1.0, 0.85 + 0.15 * math.log(max(context_tokens, 100.0)) / math.log(5000.0))
    fatigue = max(0.6, 1.0 - (contacts - 1) * cfg.quality.fatigue_decay_per_contact)
    complexity = max(0.75, 1.0 - 0.08 * (domain_complexity_scalar - 1.0))

    score = base * minute_effect * memory_effect * context_effect * fatigue * complexity
    return max(0.0, min(1.0, score))


def quality_tiers(cfg: ScenarioConfig) -> dict[str, float]:
    return {
        "attitude_belief": quality_score(cfg, "attitude_belief"),
        "self_report_behavior": quality_score(cfg, "self_report_behavior"),
        "incentivized_behavior": quality_score(cfg, "incentivized_behavior"),
    }
