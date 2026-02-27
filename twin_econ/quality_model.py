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


def _memory_system_adjustment(cfg: ScenarioConfig) -> float:
    weights = [
        max(0.0, float(cfg.quality.memory_recency_weight)),
        max(0.0, float(cfg.quality.memory_relevance_weight)),
        max(0.0, float(cfg.quality.memory_importance_weight)),
    ]
    avg_weight = max(sum(weights) / 3.0, 1e-6)
    imbalance = sum(abs(w - avg_weight) for w in weights) / (3.0 * avg_weight)
    balance_effect = max(0.85, 1.0 - 0.12 * imbalance)

    retrieval_k = max(1.0, float(cfg.quality.memory_retrieval_k))
    retrieval_effect = 0.9 + 0.1 * math.log(retrieval_k) / math.log(8.0)
    retrieval_effect = max(0.9, min(1.06, retrieval_effect))

    if cfg.quality.reflection_enabled:
        cadence = max(1.0, float(cfg.quality.reflection_interval_turns))
        cadence_ratio = 8.0 / cadence
        cadence_effect = max(0.95, min(1.03, 0.97 + 0.03 * math.sqrt(cadence_ratio)))
        summary_effect = max(0.97, min(1.03, 0.97 + 0.01 * min(float(cfg.quality.reflection_summary_count), 6.0)))
        reflection_effect = cadence_effect * summary_effect
    else:
        reflection_effect = 0.96

    return max(0.82, min(1.08, balance_effect * retrieval_effect * reflection_effect))


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

    memory_effect = _memory_adjustment(cfg.memory_strategy_prediction) * _memory_system_adjustment(cfg)
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
