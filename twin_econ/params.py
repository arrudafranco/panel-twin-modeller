from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import yaml

@dataclass
class CostParams:
    cost_per_invite: float = 1.0
    response_rate: float = 0.25
    contact_attempts: float = 1.0
    response_lift_per_extra_attempt: float = 0.0
    response_decay_per_extra_attempt: float = 0.0
    screening_time_cost: float = 2.0
    scheduling_admin_time_per_participant: float = 4.0
    panel_overhead_per_active_member: float = 1.0
    attrition_rate: float = 0.20
    weighting_raking_cost: float = 500.0
    base_incentive_phase1: float = 60.0
    base_incentive_phase2: float = 30.0
    bonus_expected_value: float = 5.0
    asr_cost_per_minute: float = 0.03
    tts_cost_per_minute: float = 0.02
    price_per_1k_input_tokens: float = 0.008
    price_per_1k_output_tokens: float = 0.012
    avg_scripted_questions: int = 35
    avg_followups_per_block: int = 82
    avg_tokens_per_question: float = 55.0
    avg_tokens_per_answer: float = 80.0
    use_word_based_token_estimate: bool = False
    avg_words_per_participant: float = 6491.0
    avg_words_interviewer: float = 5373.0
    words_to_tokens_ratio: float = 1.3
    reflection_update_tokens_per_turn: float = 45.0
    interview_context_chars: int = 5000
    chars_to_tokens_ratio: float = 0.25
    full_transcript_injection: bool = True
    transcript_cleaning_cost_per_participant: float = 5.0
    summarization_cost: float = 2.0
    storage_security_compliance_cost_per_participant: float = 8.0
    protocol_design_hours: float = 20.0
    engineering_hours: float = 60.0
    qa_hours: float = 30.0
    pm_hours: float = 25.0
    irb_compliance_hours: float = 18.0
    fully_loaded_hourly_rate: float = 120.0
    overhead_rate: float = 0.12
    retest_reschedule_fraction: float = 0.0
    rescheduling_cost_per_event: float = 0.0
    panel_fatigue_function: str = "exponential"


@dataclass
class QualityParams:
    functional_form: str = "log"
    memory_strategy: str = "full_transcript"
    memory_retrieval_k: int = 8
    memory_recency_weight: float = 1.0
    memory_relevance_weight: float = 1.0
    memory_importance_weight: float = 1.0
    reflection_enabled: bool = True
    reflection_interval_turns: int = 8
    reflection_summary_count: int = 3
    use_construct_response_mode_defaults: bool = True
    response_mode_assumption_source: str = "preset_driven"
    categorical_question_share: float = 0.45
    numeric_question_share: float = 0.20
    open_ended_question_share: float = 0.35
    categorical_mode_reliability: float = 1.02
    numeric_mode_reliability: float = 0.95
    open_ended_mode_reliability: float = 0.98
    quality_threshold: float = 0.75
    fatigue_decay_per_contact: float = 0.03
    self_report_behavior_base: float = 0.75
    use_benchmark_thresholds: bool = True
    benchmark_min_threshold: float = 0.65
    benchmark_max_threshold: float = 0.9
    benchmark_filter_mode: str = "strict_near_2week_federal"
    benchmark_mapping_intercept: float = 0.18
    benchmark_mapping_slope: float = 0.82
    benchmark_mapping_uncertainty: float = 0.04
    benchmark_mapping_sensitivity: str = "base"
    benchmark_federal_uplift: float = 0.05


@dataclass
class SamplingParams:
    recruitment_mode: str = "pilot"
    pilot_n: int = 100
    scaleup_n: int = 2000
    target_strata: list[str] = field(default_factory=lambda: ["age", "gender", "race", "region", "education"])
    response_rate_by_stratum: dict[str, float] = field(default_factory=lambda: {"default": 0.22})
    representativeness_penalty_max: float = 0.10
    target_margins_csv: str = ""


@dataclass
class ProductParams:
    base_minutes: float = 120.0
    max_modules_per_participant: int = 4
    module_minutes: float = 15.0
    module_domain_complexity_scalar: float = 1.0


@dataclass
class RevenueParams:
    price_per_project: float = 180000.0
    module_addon_price: float = 25000.0
    refresh_wave_price: float = 60000.0
    projects_per_year: int = 6
    growth_rate: float = 0.08
    churn_rate: float = 0.05
    cac: float = 20000.0
    other_initial_investment: float = 0.0
    discount_rate: float = 0.12
    horizon_months: int = 36


@dataclass
class CompetitionParams:
    brand_trust: float = 0.70
    client_risk_profile: str = "commercial_exploratory"
    cannibalization_rate: float = 0.30
    market_tailwind: float = 0.10
    turnaround_days: float = 10.0
    utility_quality_weight: float = 3.2
    utility_brand_weight: float = 1.1
    utility_tailwind_weight: float = 0.8
    utility_price_weight: float = 0.000012
    utility_turnaround_weight: float = 0.03
    federal_risk_penalty: float = 0.08
    cross_price_elasticity: float = 0.20
    amerispeak_price: float = 260000.0
    amerispeak_quality: float = 0.90
    amerispeak_turnaround_days: float = 18.0
    truenorth_price: float = 160000.0
    truenorth_quality: float = 0.80
    truenorth_turnaround_days: float = 12.0
    external_synthetic_price: float = 130000.0
    external_synthetic_quality: float = 0.72
    external_synthetic_turnaround_days: float = 7.0


@dataclass
class ScenarioConfig:
    scenario_name: str = "base_pilot"
    seed: int = 123
    mode: str = "pilot"
    interview_minutes: float = 120.0
    retest_rate: float = 0.8
    quality_profile: str = "attitude_belief"
    memory_strategy_prediction: str = "full_transcript"
    cost: CostParams = field(default_factory=CostParams)
    quality: QualityParams = field(default_factory=QualityParams)
    sampling: SamplingParams = field(default_factory=SamplingParams)
    product: ProductParams = field(default_factory=ProductParams)
    revenue: RevenueParams = field(default_factory=RevenueParams)
    competition: CompetitionParams = field(default_factory=CompetitionParams)


def _dc_load(cls: type[Any], payload: dict[str, Any]) -> Any:
    valid = {k: v for k, v in payload.items() if k in cls.__annotations__}
    return cls(**valid)


def load_config(path: str | Path) -> ScenarioConfig:
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8-sig")) or {}
    cfg = _dc_load(ScenarioConfig, data)
    cfg.cost = _dc_load(CostParams, data.get("cost", {}))
    cfg.quality = _dc_load(QualityParams, data.get("quality", {}))
    cfg.sampling = _dc_load(SamplingParams, data.get("sampling", {}))
    cfg.product = _dc_load(ProductParams, data.get("product", {}))
    cfg.revenue = _dc_load(RevenueParams, data.get("revenue", {}))
    cfg.competition = _dc_load(CompetitionParams, data.get("competition", {}))
    return cfg


def dump_config(cfg: ScenarioConfig, path: str | Path) -> None:
    Path(path).write_text(yaml.safe_dump(asdict(cfg), sort_keys=False), encoding="utf-8")

