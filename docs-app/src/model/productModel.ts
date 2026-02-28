// Faithful TypeScript port of twin_econ/product_model.py

import type { ScenarioConfig } from './params.ts';
import { qualityScore } from './qualityModel.ts';

export interface ModuleEconomicsResult {
  max_modules_per_participant: number;
  marginal_minutes_total: number;
  marginal_cost_per_module: number;
  marginal_quality_gain_per_module: number;
}

export function moduleEconomics(cfg: ScenarioConfig, modules: number): ModuleEconomicsResult {
  const capped = Math.min(modules, cfg.product.max_modules_per_participant);
  const marginalMinutes = capped * cfg.product.module_minutes;
  const fatigueContacts = 1 + capped;
  const turnsTotal = cfg.cost.avg_scripted_questions + cfg.cost.avg_followups_per_block;
  const turnsPerMinute = turnsTotal / Math.max(cfg.interview_minutes, 1.0);
  const extraTurnsPerModule = cfg.product.module_minutes * turnsPerMinute;
  const extraTokensOut = extraTurnsPerModule * cfg.cost.avg_tokens_per_question;
  const extraTokensIn =
    extraTurnsPerModule * (cfg.cost.avg_tokens_per_answer + cfg.cost.reflection_update_tokens_per_turn);
  const variableCostPerModule =
    cfg.product.module_minutes * (cfg.cost.asr_cost_per_minute + cfg.cost.tts_cost_per_minute) +
    (extraTokensIn / 1000.0) * cfg.cost.price_per_1k_input_tokens +
    (extraTokensOut / 1000.0) * cfg.cost.price_per_1k_output_tokens;

  const qBase = qualityScore(cfg, cfg.quality_profile, undefined, 1);
  const qWithModules = qualityScore(
    cfg,
    cfg.quality_profile,
    cfg.interview_minutes + marginalMinutes,
    fatigueContacts,
    cfg.product.module_domain_complexity_scalar
  );

  return {
    max_modules_per_participant: cfg.product.max_modules_per_participant,
    marginal_minutes_total: marginalMinutes,
    marginal_cost_per_module: variableCostPerModule,
    marginal_quality_gain_per_module: (qWithModules - qBase) / Math.max(capped, 1),
  };
}
