from __future__ import annotations

from dataclasses import asdict
from typing import Any

from .params import ScenarioConfig


def compute_costs(cfg: ScenarioConfig) -> dict[str, Any]:
    n = cfg.sampling.pilot_n if cfg.mode == "pilot" else cfg.sampling.scaleup_n
    invites_per_complete = 1.0 / max(cfg.cost.response_rate, 1e-6)
    recruited = n * invites_per_complete

    recruitment = recruited * cfg.cost.cost_per_invite + n * (
        cfg.cost.screening_time_cost
        + cfg.cost.scheduling_admin_time_per_participant
        + cfg.cost.panel_overhead_per_active_member
    )

    incentives = n * (
        cfg.cost.base_incentive_phase1
        + cfg.retest_rate * cfg.cost.base_incentive_phase2
        + cfg.cost.bonus_expected_value
    )

    turns = cfg.cost.avg_scripted_questions + cfg.cost.avg_followups_per_block
    tokens_out = n * turns * cfg.cost.avg_tokens_per_question
    tokens_in = n * turns * (cfg.cost.avg_tokens_per_answer + cfg.cost.reflection_update_tokens_per_turn)

    voice_ops = n * cfg.interview_minutes * (cfg.cost.asr_cost_per_minute + cfg.cost.tts_cost_per_minute)
    llm_ops = (tokens_in / 1000.0) * cfg.cost.price_per_1k_input_tokens + (tokens_out / 1000.0) * cfg.cost.price_per_1k_output_tokens
    postproc = n * (
        cfg.cost.transcript_cleaning_cost_per_participant
        + cfg.cost.summarization_cost
        + cfg.cost.storage_security_compliance_cost_per_participant
    )

    labor = cfg.cost.fully_loaded_hourly_rate * (
        cfg.cost.protocol_design_hours
        + cfg.cost.engineering_hours
        + cfg.cost.qa_hours
        + cfg.cost.pm_hours
        + cfg.cost.irb_compliance_hours
    )

    weighting = cfg.cost.weighting_raking_cost if cfg.mode == "scaleup" else 0.0
    direct = recruitment + incentives + voice_ops + llm_ops + postproc + labor + weighting
    overhead = direct * cfg.cost.overhead_rate
    total = direct + overhead

    retained = n * (1.0 - cfg.cost.attrition_rate)
    return {
        "inputs": asdict(cfg.cost),
        "n_target": n,
        "recruitment_cost": recruitment,
        "incentives_cost": incentives,
        "voice_ops_cost": voice_ops,
        "llm_ops_cost": llm_ops,
        "postproc_cost": postproc,
        "labor_cost": labor,
        "weighting_cost": weighting,
        "overhead_cost": overhead,
        "total_cost": total,
        "cost_per_completed_interview": total / max(n, 1),
        "cost_per_retained_agent": total / max(retained, 1),
        "tokens_input": tokens_in,
        "tokens_output": tokens_out,
    }
