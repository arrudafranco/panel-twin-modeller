// Faithful TypeScript port of twin_econ/quality_model.py

import type { ScenarioConfig } from './params.ts';

function memoryAdjustment(memoryStrategy: string): number {
  const map: Record<string, number> = {
    full_transcript: 1.0,
    summary_memory: 0.83 / 0.85,
    partial_20pct: 0.79 / 0.85,
    hybrid: 0.96,
  };
  return map[memoryStrategy] ?? 1.0;
}

function constructBase(cfg: ScenarioConfig, constructType: string): number {
  if (constructType === 'mixed_general') return 0.85;
  if (constructType === 'behavioral_recall') return cfg.quality.behavioral_recall_base;
  if (constructType === 'incentivized_behavior') return 0.66;
  return 0.80;
}

function memorySystemAdjustment(cfg: ScenarioConfig): number {
  const weights = [
    Math.max(0.0, cfg.quality.memory_recency_weight),
    Math.max(0.0, cfg.quality.memory_relevance_weight),
    Math.max(0.0, cfg.quality.memory_importance_weight),
  ];
  const avgWeight = Math.max((weights[0] + weights[1] + weights[2]) / 3.0, 1e-6);
  const imbalance =
    (Math.abs(weights[0] - avgWeight) +
      Math.abs(weights[1] - avgWeight) +
      Math.abs(weights[2] - avgWeight)) /
    (3.0 * avgWeight);
  const balanceEffect = Math.max(0.85, 1.0 - 0.12 * imbalance);

  const retrievalK = Math.max(1.0, cfg.quality.memory_retrieval_k);
  let retrievalEffect = 0.9 + (0.1 * Math.log(retrievalK)) / Math.log(8.0);
  retrievalEffect = Math.max(0.9, Math.min(1.06, retrievalEffect));

  let reflectionEffect: number;
  if (cfg.quality.reflection_enabled) {
    const cadence = Math.max(1.0, cfg.quality.reflection_interval_turns);
    const cadenceRatio = 8.0 / cadence;
    const cadenceEffect = Math.max(0.95, Math.min(1.03, 0.97 + 0.03 * Math.sqrt(cadenceRatio)));
    const summaryEffect = Math.max(
      0.97,
      Math.min(1.03, 0.97 + 0.01 * Math.min(cfg.quality.reflection_summary_count, 6.0))
    );
    reflectionEffect = cadenceEffect * summaryEffect;
  } else {
    reflectionEffect = 0.96;
  }

  return Math.max(0.82, Math.min(1.08, balanceEffect * retrievalEffect * reflectionEffect));
}

function constructResponseModeDefaults(constructType: string): Record<string, number> {
  const presets: Record<string, Record<string, number>> = {
    // Mixed general: mostly closed-ended (opinions + behavioral recall), some open-ended
    mixed_general: { categorical: 0.55, numeric: 0.20, open_ended: 0.25 },
    // Behavioral recall: more numeric (frequency/count items), less open-ended
    behavioral_recall: { categorical: 0.45, numeric: 0.30, open_ended: 0.25 },
    // Incentivized: dominated by numeric outcomes (amounts, choices)
    incentivized_behavior: { categorical: 0.20, numeric: 0.50, open_ended: 0.30 },
  };
  return presets[constructType] ?? { categorical: 0.45, numeric: 0.20, open_ended: 0.35 };
}

function normalizedResponseShares(
  cfg: ScenarioConfig,
  constructType?: string
): Record<string, number> {
  let raw: Record<string, number>;
  if (cfg.quality.use_construct_response_mode_defaults && constructType != null) {
    raw = constructResponseModeDefaults(constructType);
  } else {
    raw = {
      categorical: Math.max(0.0, cfg.quality.categorical_question_share),
      numeric: Math.max(0.0, cfg.quality.numeric_question_share),
      open_ended: Math.max(0.0, cfg.quality.open_ended_question_share),
    };
  }
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return { categorical: 1 / 3, numeric: 1 / 3, open_ended: 1 / 3 };
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = v / total;
  }
  return out;
}

function responseModeAdjustment(cfg: ScenarioConfig, constructType: string): number {
  const shares = normalizedResponseShares(cfg, constructType);
  const weighted =
    shares['categorical'] * cfg.quality.categorical_mode_reliability +
    shares['numeric'] * cfg.quality.numeric_mode_reliability +
    shares['open_ended'] * cfg.quality.open_ended_mode_reliability;
  return Math.max(0.85, Math.min(1.10, weighted));
}

export function qualityScore(
  cfg: ScenarioConfig,
  constructType: string,
  interviewMinutes?: number,
  contacts: number = 1,
  domainComplexityScalar: number = 1.0
): number {
  const minutes = interviewMinutes ?? cfg.interview_minutes;
  const base = constructBase(cfg, constructType);

  let minuteEffect: number;
  if (cfg.quality.functional_form === 'logistic') {
    minuteEffect = 1 / (1 + Math.exp(-(minutes - 60.0) / 20.0));
  } else if (cfg.quality.functional_form === 'piecewise') {
    minuteEffect = Math.min(1.0, 0.5 + (0.5 * Math.min(minutes, 120.0)) / 120.0);
  } else {
    // "log" default
    minuteEffect = Math.min(1.0, 0.7 + (0.3 * Math.log(Math.max(minutes, 10.0))) / Math.log(120.0));
  }

  const memoryEffect = memoryAdjustment(cfg.memory_strategy_prediction) * memorySystemAdjustment(cfg);
  const responseModeEffect = responseModeAdjustment(cfg, constructType);

  let contextTokens: number;
  if (cfg.cost.full_transcript_injection) {
    contextTokens = cfg.cost.interview_context_chars * cfg.cost.chars_to_tokens_ratio;
  } else {
    contextTokens = cfg.cost.interview_context_chars * cfg.cost.chars_to_tokens_ratio * 0.6;
  }
  const contextEffect = Math.min(
    1.0,
    0.85 + (0.15 * Math.log(Math.max(contextTokens, 100.0))) / Math.log(5000.0)
  );

  const fatigue = Math.max(0.6, 1.0 - (contacts - 1) * cfg.quality.fatigue_decay_per_contact);
  const complexity = Math.max(0.75, 1.0 - 0.08 * (domainComplexityScalar - 1.0));

  const score = base * minuteEffect * memoryEffect * responseModeEffect * contextEffect * fatigue * complexity;
  return Math.max(0.0, Math.min(1.0, score));
}

export function qualityTiers(cfg: ScenarioConfig): Record<string, number> {
  return {
    mixed_general: qualityScore(cfg, 'mixed_general'),
    behavioral_recall: qualityScore(cfg, 'behavioral_recall'),
    incentivized_behavior: qualityScore(cfg, 'incentivized_behavior'),
  };
}

export function memoryArchitectureSummary(
  cfg: ScenarioConfig,
  constructType?: string
): Record<string, unknown> {
  const activeConstruct = constructType ?? cfg.quality_profile;
  const shares = normalizedResponseShares(cfg, activeConstruct);
  return {
    quality_profile: activeConstruct,
    memory_strategy_prediction: cfg.memory_strategy_prediction,
    memory_retrieval_k: cfg.quality.memory_retrieval_k,
    memory_recency_weight: cfg.quality.memory_recency_weight,
    memory_relevance_weight: cfg.quality.memory_relevance_weight,
    memory_importance_weight: cfg.quality.memory_importance_weight,
    reflection_enabled: cfg.quality.reflection_enabled,
    reflection_interval_turns: cfg.quality.reflection_interval_turns,
    reflection_summary_count: cfg.quality.reflection_summary_count,
    use_construct_response_mode_defaults: cfg.quality.use_construct_response_mode_defaults,
    response_mode_assumption_source: cfg.quality.response_mode_assumption_source,
    full_transcript_injection: cfg.cost.full_transcript_injection,
    interview_context_chars: cfg.cost.interview_context_chars,
    response_mode_mix: shares,
    response_mode_reliability_adjustment: responseModeAdjustment(cfg, activeConstruct),
  };
}
