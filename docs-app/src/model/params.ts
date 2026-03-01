// Faithful TypeScript port of twin_econ/params.py
// All defaults match Python exactly.

export interface CostParams {
  cost_per_invite: number;
  response_rate: number;
  contact_attempts: number;
  response_lift_per_extra_attempt: number;
  response_decay_per_extra_attempt: number;
  screening_time_cost: number;
  scheduling_admin_time_per_participant: number;
  panel_overhead_per_active_member: number;
  attrition_rate: number;
  weighting_raking_cost: number;
  base_incentive_phase1: number;
  base_incentive_phase2: number;
  bonus_expected_value: number;
  asr_cost_per_minute: number;
  tts_cost_per_minute: number;
  price_per_1k_input_tokens: number;
  price_per_1k_output_tokens: number;
  avg_scripted_questions: number;
  avg_followups_per_block: number;
  avg_tokens_per_question: number;
  avg_tokens_per_answer: number;
  use_word_based_token_estimate: boolean;
  avg_words_per_participant: number;
  avg_words_interviewer: number;
  words_to_tokens_ratio: number;
  reflection_update_tokens_per_turn: number;
  interview_context_chars: number;
  chars_to_tokens_ratio: number;
  full_transcript_injection: boolean;
  transcript_cleaning_cost_per_participant: number;
  summarization_cost: number;
  storage_security_compliance_cost_per_participant: number;
  pilot_labor_cost: number;
  library_labor_cost: number;
  overhead_rate: number;
  other_pilot_cost: number;
  retest_reschedule_fraction: number;
  rescheduling_cost_per_event: number;
  panel_fatigue_function: string;
}

export interface QualityParams {
  functional_form: string;
  memory_strategy: string;
  memory_retrieval_k: number;
  memory_recency_weight: number;
  memory_relevance_weight: number;
  memory_importance_weight: number;
  reflection_enabled: boolean;
  reflection_interval_turns: number;
  reflection_summary_count: number;
  use_construct_response_mode_defaults: boolean;
  response_mode_assumption_source: string;
  categorical_question_share: number;
  numeric_question_share: number;
  open_ended_question_share: number;
  categorical_mode_reliability: number;
  numeric_mode_reliability: number;
  open_ended_mode_reliability: number;
  quality_threshold: number;
  fatigue_decay_per_contact: number;
  behavioral_recall_base: number;
  use_benchmark_thresholds: boolean;
  benchmark_min_threshold: number;
  benchmark_max_threshold: number;
  benchmark_filter_mode: string;
  benchmark_mapping_intercept: number;
  benchmark_mapping_slope: number;
  benchmark_mapping_uncertainty: number;
  benchmark_mapping_sensitivity: string;
  benchmark_federal_uplift: number;
}

export interface SamplingParams {
  recruitment_mode: string;
  pilot_n: number;
  scaleup_n: number;
  target_strata: string[];
  response_rate_by_stratum: Record<string, number>;
  representativeness_penalty_max: number;
  target_margins_csv: string;
}

export interface ProductParams {
  base_minutes: number;
  max_modules_per_participant: number;
  module_minutes: number;
  module_domain_complexity_scalar: number;
}

export interface RevenueParams {
  price_per_project: number;
  per_project_run_cost: number;
  projects_per_year: number;
  growth_rate: number;
  churn_rate: number;
  cac: number;
  other_initial_investment: number;
  discount_rate: number;
  horizon_months: number;
}

export interface CompetitionParams {
  brand_trust: number;
  client_risk_profile: string;
  cannibalization_rate: number;
  market_tailwind: number;
  turnaround_days: number;
  utility_quality_weight: number;
  utility_brand_weight: number;
  utility_tailwind_weight: number;
  utility_price_weight: number;
  utility_turnaround_weight: number;
  federal_risk_penalty: number;
  cross_price_elasticity: number;
  // Fix 3: Sanitized competitor names for public repo
  probability_benchmark_price: number;
  probability_benchmark_quality: number;
  probability_benchmark_turnaround_days: number;
  hybrid_benchmark_price: number;
  hybrid_benchmark_quality: number;
  hybrid_benchmark_turnaround_days: number;
  nonprob_panel_price: number;
  nonprob_panel_quality: number;
  nonprob_panel_turnaround_days: number;
}

export interface ScenarioConfig {
  scenario_name: string;
  seed: number;
  mode: string;
  interview_minutes: number;
  retest_rate: number;
  quality_profile: string;
  memory_strategy_prediction: string;
  cost: CostParams;
  quality: QualityParams;
  sampling: SamplingParams;
  product: ProductParams;
  revenue: RevenueParams;
  competition: CompetitionParams;
}

export const DEFAULT_COST: CostParams = {
  cost_per_invite: 0.0,
  response_rate: 0.25,
  contact_attempts: 1.0,
  response_lift_per_extra_attempt: 0.0,
  response_decay_per_extra_attempt: 0.0,
  screening_time_cost: 2.0,
  scheduling_admin_time_per_participant: 4.0,
  panel_overhead_per_active_member: 1.0,
  attrition_rate: 0.20,
  weighting_raking_cost: 500.0,
  base_incentive_phase1: 60.0,
  base_incentive_phase2: 30.0,
  bonus_expected_value: 5.0,
  asr_cost_per_minute: 0.007,
  tts_cost_per_minute: 0.02,
  price_per_1k_input_tokens: 0.003,
  price_per_1k_output_tokens: 0.012,
  avg_scripted_questions: 35,
  avg_followups_per_block: 82,
  avg_tokens_per_question: 55.0,
  avg_tokens_per_answer: 80.0,
  use_word_based_token_estimate: false,
  avg_words_per_participant: 6491.0,
  avg_words_interviewer: 5373.0,
  words_to_tokens_ratio: 1.3,
  reflection_update_tokens_per_turn: 45.0,
  interview_context_chars: 5000,
  chars_to_tokens_ratio: 0.25,
  full_transcript_injection: true,
  transcript_cleaning_cost_per_participant: 5.0,
  summarization_cost: 2.0,
  storage_security_compliance_cost_per_participant: 8.0,
  pilot_labor_cost: 15000,
  library_labor_cost: 45000,
  overhead_rate: 0.12,
  other_pilot_cost: 0,
  retest_reschedule_fraction: 0.0,
  rescheduling_cost_per_event: 0.0,
  panel_fatigue_function: "exponential",
};

export const DEFAULT_QUALITY: QualityParams = {
  functional_form: "log",
  memory_strategy: "full_transcript",
  memory_retrieval_k: 8,
  memory_recency_weight: 1.0,
  memory_relevance_weight: 1.0,
  memory_importance_weight: 1.0,
  reflection_enabled: true,
  reflection_interval_turns: 8,
  reflection_summary_count: 3,
  use_construct_response_mode_defaults: true,
  response_mode_assumption_source: "preset_driven",
  categorical_question_share: 0.45,
  numeric_question_share: 0.20,
  open_ended_question_share: 0.35,
  categorical_mode_reliability: 1.02,
  numeric_mode_reliability: 0.95,
  open_ended_mode_reliability: 0.98,
  quality_threshold: 0.75,
  fatigue_decay_per_contact: 0.03,
  behavioral_recall_base: 0.80,
  use_benchmark_thresholds: true,
  benchmark_min_threshold: 0.65,
  benchmark_max_threshold: 0.9,
  benchmark_filter_mode: "strict_near_2week_federal",
  benchmark_mapping_intercept: 0.18,
  benchmark_mapping_slope: 0.82,
  benchmark_mapping_uncertainty: 0.04,
  benchmark_mapping_sensitivity: "base",
  benchmark_federal_uplift: 0.05,
};

export const DEFAULT_SAMPLING: SamplingParams = {
  recruitment_mode: "pilot",
  pilot_n: 100,
  scaleup_n: 1000,
  target_strata: ["age", "gender", "race", "region", "education"],
  response_rate_by_stratum: { default: 0.22 },
  representativeness_penalty_max: 0.10,
  target_margins_csv: "",
};

export const DEFAULT_PRODUCT: ProductParams = {
  base_minutes: 120.0,
  max_modules_per_participant: 4,
  module_minutes: 15.0,
  module_domain_complexity_scalar: 1.0,
};

export const DEFAULT_REVENUE: RevenueParams = {
  price_per_project: 55000.0,
  per_project_run_cost: 18000.0,
  projects_per_year: 15,
  growth_rate: 0.08,
  churn_rate: 0.05,
  cac: 12000.0,
  other_initial_investment: 0.0,
  discount_rate: 0.12,
  horizon_months: 36,
};

export const DEFAULT_COMPETITION: CompetitionParams = {
  brand_trust: 0.70,
  client_risk_profile: "commercial_exploratory",
  cannibalization_rate: 0.30,
  market_tailwind: 0.10,
  turnaround_days: 10.0,
  utility_quality_weight: 3.2,
  utility_brand_weight: 1.1,
  utility_tailwind_weight: 0.8,
  utility_price_weight: 0.000012,
  utility_turnaround_weight: 0.03,
  federal_risk_penalty: 0.08,
  cross_price_elasticity: 0.20,
  // Fix 3: Generic labels instead of real competitor names
  probability_benchmark_price: 80000.0,
  probability_benchmark_quality: 0.90,
  probability_benchmark_turnaround_days: 18.0,
  hybrid_benchmark_price: 60000.0,
  hybrid_benchmark_quality: 0.80,
  hybrid_benchmark_turnaround_days: 12.0,
  nonprob_panel_price: 5000.0,
  nonprob_panel_quality: 0.70,
  nonprob_panel_turnaround_days: 3.0,
};

export function createDefaultConfig(): ScenarioConfig {
  return {
    scenario_name: "base_pilot",
    seed: 123,
    mode: "pilot",
    interview_minutes: 120.0,
    retest_rate: 0.8,
    quality_profile: "mixed_general",
    memory_strategy_prediction: "full_transcript",
    cost: { ...DEFAULT_COST },
    quality: { ...DEFAULT_QUALITY },
    sampling: { ...DEFAULT_SAMPLING },
    product: { ...DEFAULT_PRODUCT },
    revenue: { ...DEFAULT_REVENUE },
    competition: { ...DEFAULT_COMPETITION },
  };
}

/**
 * Fix 2: Construct-specific uncertainty bands for quality extrapolation.
 * The 0.85 base for attitude_belief is paper-anchored (Park et al., 2024).
 * Other constructs have progressively wider bands due to less direct evidence.
 */
/**
 * Uncertainty bands by study type.
 * mixed_general: ±0.06 — most directly anchored (GSS Core, 1,052 participants, 177 items
 *   spanning attitudes, self-reported behaviors, and demographics; Park et al. 2024)
 * incentivized_behavior: ±0.10 — also paper-anchored (economic game experiments, Park et al. 2024)
 *   but smaller sample and structurally different task (trust game, ultimatum game)
 * behavioral_recall: ±0.10 — base score (0.80) is a conservative planning discount below the
 *   0.85 GSS Core anchor; not separately measured. Reflects that episodic behavioral recall
 *   may be less tested in the genagents context than attitude/opinion items.
 */
export const QUALITY_UNCERTAINTY_BANDS: Record<string, number> = {
  mixed_general: 0.06,
  incentivized_behavior: 0.10,
  behavioral_recall: 0.10,
};
