from __future__ import annotations

from .params import ScenarioConfig
from .quality_model import quality_score


def module_economics(cfg: ScenarioConfig, modules: int) -> dict[str, float]:
    capped = min(modules, cfg.product.max_modules_per_participant)
    marginal_minutes = capped * cfg.product.module_minutes
    fatigue_contacts = 1 + capped
    turns_total = cfg.cost.avg_scripted_questions + cfg.cost.avg_followups_per_block
    turns_per_minute = turns_total / max(cfg.interview_minutes, 1.0)
    extra_turns_per_module = cfg.product.module_minutes * turns_per_minute
    extra_tokens_out = extra_turns_per_module * cfg.cost.avg_tokens_per_question
    extra_tokens_in = extra_turns_per_module * (cfg.cost.avg_tokens_per_answer + cfg.cost.reflection_update_tokens_per_turn)
    variable_cost_per_module = (
        cfg.product.module_minutes * (cfg.cost.asr_cost_per_minute + cfg.cost.tts_cost_per_minute)
        + (extra_tokens_in / 1000.0) * cfg.cost.price_per_1k_input_tokens
        + (extra_tokens_out / 1000.0) * cfg.cost.price_per_1k_output_tokens
    )
    q_base = quality_score(cfg, cfg.quality_profile, contacts=1)
    q_with_modules = quality_score(
        cfg,
        cfg.quality_profile,
        interview_minutes=cfg.interview_minutes + marginal_minutes,
        contacts=fatigue_contacts,
        domain_complexity_scalar=cfg.product.module_domain_complexity_scalar,
    )
    return {
        "max_modules_per_participant": float(cfg.product.max_modules_per_participant),
        "marginal_minutes_total": marginal_minutes,
        "marginal_cost_per_module": variable_cost_per_module,
        "marginal_quality_gain_per_module": (q_with_modules - q_base) / max(capped, 1),
    }
