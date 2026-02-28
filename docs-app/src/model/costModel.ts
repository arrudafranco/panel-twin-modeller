// Faithful TypeScript port of twin_econ/cost_model.py compute_costs()

import type { ScenarioConfig } from './params.ts';

export interface CostResult {
  n_target: number;
  recruitment_cost: number;
  incentives_cost: number;
  rescheduling_cost: number;
  voice_ops_cost: number;
  llm_ops_cost: number;
  postproc_cost: number;
  labor_cost: number;
  weighting_cost: number;
  overhead_cost: number;
  total_cost: number;
  cost_per_completed_interview: number;
  cost_per_retained_agent: number;
  effective_response_rate: number;
  invites_per_complete: number;
  tokens_input: number;
  tokens_output: number;
  context_tokens: number;
  reflection_turns_per_participant: number;
  reflection_tokens_per_participant: number;
}

export function computeCosts(cfg: ScenarioConfig): CostResult {
  const n = cfg.mode === 'pilot' ? cfg.sampling.pilot_n : cfg.sampling.scaleup_n;
  const attempts = Math.max(cfg.cost.contact_attempts, 1.0);
  const extraAttempts = Math.max(0.0, attempts - 1.0);

  let fatigueMultiplier: number;
  if (cfg.cost.panel_fatigue_function === 'linear') {
    fatigueMultiplier = Math.max(0.5, 1.0 - cfg.cost.response_decay_per_extra_attempt * extraAttempts);
  } else {
    fatigueMultiplier = Math.exp(-cfg.cost.response_decay_per_extra_attempt * extraAttempts);
  }

  const responseMultiplier =
    (1.0 + cfg.cost.response_lift_per_extra_attempt * extraAttempts) * fatigueMultiplier;
  const effectiveResponseRate = Math.max(0.01, Math.min(0.99, cfg.cost.response_rate * responseMultiplier));
  const invitesPerComplete = 1.0 / effectiveResponseRate;
  const recruited = n * invitesPerComplete;

  const recruitment =
    recruited * cfg.cost.cost_per_invite +
    n * (
      cfg.cost.screening_time_cost +
      cfg.cost.scheduling_admin_time_per_participant +
      cfg.cost.panel_overhead_per_active_member
    );

  const incentives =
    n * (
      cfg.cost.base_incentive_phase1 +
      cfg.retest_rate * cfg.cost.base_incentive_phase2 +
      cfg.cost.bonus_expected_value
    );

  const reschedulingCost =
    n *
    cfg.retest_rate *
    cfg.cost.retest_reschedule_fraction *
    cfg.cost.rescheduling_cost_per_event;

  const turns = cfg.cost.avg_scripted_questions + cfg.cost.avg_followups_per_block;
  let reflectionTurns = 0.0;
  if (cfg.quality.reflection_enabled) {
    reflectionTurns = turns / Math.max(cfg.quality.reflection_interval_turns, 1.0);
  }
  const reflectionTokensPerParticipant =
    reflectionTurns * cfg.cost.reflection_update_tokens_per_turn;

  let tokensIn: number;
  let tokensOut: number;
  if (cfg.cost.use_word_based_token_estimate) {
    tokensIn = n * cfg.cost.avg_words_per_participant * cfg.cost.words_to_tokens_ratio;
    tokensOut = n * cfg.cost.avg_words_interviewer * cfg.cost.words_to_tokens_ratio;
  } else {
    tokensOut = n * turns * cfg.cost.avg_tokens_per_question;
    tokensIn = n * (turns * cfg.cost.avg_tokens_per_answer + reflectionTokensPerParticipant);
  }

  const contextTokens = n * cfg.cost.interview_context_chars * cfg.cost.chars_to_tokens_ratio;

  let predictionMultiplier: number;
  if (cfg.cost.full_transcript_injection) {
    predictionMultiplier = 1.0;
  } else if (cfg.memory_strategy_prediction === 'summary_memory') {
    predictionMultiplier = 0.6;
  } else if (cfg.memory_strategy_prediction === 'partial_20pct') {
    predictionMultiplier = 0.2;
  } else if (cfg.memory_strategy_prediction === 'hybrid') {
    predictionMultiplier = 0.8;
  } else {
    predictionMultiplier = 1.0;
  }
  tokensIn = tokensIn + contextTokens * predictionMultiplier;

  const voiceOps =
    n * cfg.interview_minutes * (cfg.cost.asr_cost_per_minute + cfg.cost.tts_cost_per_minute);
  const llmOps =
    (tokensIn / 1000.0) * cfg.cost.price_per_1k_input_tokens +
    (tokensOut / 1000.0) * cfg.cost.price_per_1k_output_tokens;
  const postproc =
    n * (
      cfg.cost.transcript_cleaning_cost_per_participant +
      cfg.cost.summarization_cost +
      cfg.cost.storage_security_compliance_cost_per_participant
    );

  const labor =
    cfg.cost.fully_loaded_hourly_rate * (
      cfg.cost.protocol_design_hours +
      cfg.cost.engineering_hours +
      cfg.cost.qa_hours +
      cfg.cost.pm_hours +
      cfg.cost.irb_compliance_hours
    );

  const weighting = cfg.mode === 'scaleup' ? cfg.cost.weighting_raking_cost : 0.0;
  const direct = recruitment + incentives + reschedulingCost + voiceOps + llmOps + postproc + labor + weighting;
  const overhead = direct * cfg.cost.overhead_rate;
  const total = direct + overhead;

  const retained = n * (1.0 - cfg.cost.attrition_rate);

  return {
    n_target: n,
    recruitment_cost: recruitment,
    incentives_cost: incentives,
    rescheduling_cost: reschedulingCost,
    voice_ops_cost: voiceOps,
    llm_ops_cost: llmOps,
    postproc_cost: postproc,
    labor_cost: labor,
    weighting_cost: weighting,
    overhead_cost: overhead,
    total_cost: total,
    cost_per_completed_interview: total / Math.max(n, 1),
    cost_per_retained_agent: total / Math.max(retained, 1),
    effective_response_rate: effectiveResponseRate,
    invites_per_complete: invitesPerComplete,
    tokens_input: tokensIn,
    tokens_output: tokensOut,
    context_tokens: contextTokens,
    reflection_turns_per_participant: reflectionTurns,
    reflection_tokens_per_participant: reflectionTokensPerParticipant,
  };
}
