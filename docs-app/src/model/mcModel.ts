// Lightweight Monte Carlo using seedable JS RNG
// Replaces numpy with mulberry32 PRNG + Box-Muller for normal distribution
// Fix 2: Incorporates quality uncertainty bands

import { qualityMarketAdjustment, recommendedQualityThreshold } from './benchmarkModel.ts';
import { winProbability } from './competitionModel.ts';
import { computeCosts } from './costModel.ts';
import type { ScenarioConfig } from './params.ts';
import { QUALITY_UNCERTAINTY_BANDS } from './params.ts';
import { qualityScore } from './qualityModel.ts';
import { computeFinance } from './revenueModel.ts';

// Mulberry32: fast seedable 32-bit PRNG
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for normal distribution
function normalRandom(rand: () => number, mean: number, std: number): number {
  let u1 = rand();
  let u2 = rand();
  // Avoid log(0)
  while (u1 === 0) u1 = rand();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function deepCloneConfig(cfg: ScenarioConfig): ScenarioConfig {
  return JSON.parse(JSON.stringify(cfg)) as ScenarioConfig;
}

export interface MCRow {
  interview_minutes: number;
  attrition_rate: number;
  response_rate: number;
  win_probability: number;
  quality: number;
  quality_with_uncertainty: number;
  sellable_quality: number;
  quality_threshold_used: number;
  quality_pass: boolean;
  representativeness_penalty: number;
  representativeness_ok: boolean;
  feasible: boolean;
  cost_per_completed_interview: number;
  cost_per_retained_agent: number;
  npv: number;
  break_even_within_horizon: boolean;
  time_to_break_even_months: number | null;
}

export interface MCResult {
  rows: MCRow[];
  summary: {
    mean_npv: number;
    median_npv: number;
    p_positive_npv: number;
    p_break_even: number;
    p_feasible: number;
    mean_quality: number;
    p5_npv: number;
    p95_npv: number;
  };
}

export function runMonteCarlo(
  cfg: ScenarioConfig,
  n: number = 500,
  seed: number = 123
): MCResult {
  const rand = mulberry32(seed);
  const rows: MCRow[] = [];

  // Fix 2: Get quality uncertainty band for active construct
  const qualityUncertainty = QUALITY_UNCERTAINTY_BANDS[cfg.quality_profile] ?? 0.08;

  for (let i = 0; i < n; i++) {
    const cfgDraw = deepCloneConfig(cfg);

    const minutes = Math.max(20.0, normalRandom(rand, cfg.interview_minutes, 12.0));
    const attrition = clamp(normalRandom(rand, cfg.cost.attrition_rate, 0.05), 0.02, 0.5);
    const response = clamp(normalRandom(rand, cfg.cost.response_rate, 0.04), 0.05, 0.8);

    cfgDraw.interview_minutes = minutes;
    cfgDraw.cost.attrition_rate = attrition;
    cfgDraw.cost.response_rate = response;

    // Use scaleup mode to compute library build cost, matching the main path in useScenario.ts.
    // cost.total_cost is the upfront library investment; per_project_run_cost is the marginal
    // COGS per project sold against the existing library (not the per-interview build cost).
    const cost = computeCosts({ ...cfgDraw, mode: 'scaleup' });
    const qual = qualityScore(cfgDraw, cfg.quality_profile);

    // Fix 2: Add quality noise term drawn from construct-specific band
    const qualityNoise = normalRandom(rand, 0, qualityUncertainty / 2);
    const qualWithUncertainty = clamp(qual + qualityNoise, 0, 1);

    // In pilot mode, representativeness penalty is 0
    const representPenalty = 0.0;
    const effectiveQuality = Math.max(0.0, qualWithUncertainty - representPenalty);

    const threshold = recommendedQualityThreshold(cfgDraw, cfg.quality_profile);
    const qualityEval = qualityMarketAdjustment(effectiveQuality, threshold);
    const representOk = representPenalty <= cfgDraw.sampling.representativeness_penalty_max;

    // Win probability perturbation: utility coefficients are stylized, not fitted to
    // historical win/loss data. Additive noise (σ=0.10) represents uncertainty in
    // procurement dynamics, relationship factors, and proposal quality not captured
    // by the logit model. Clipped to [0.01, 0.99] to avoid degenerate draws.
    const baseWinProb = winProbability(
      cfgDraw,
      cfgDraw.revenue.price_per_project,
      qualityEval.effective_quality_for_market,
      cfgDraw.competition.turnaround_days
    );
    const perturbedWinProb = clamp(baseWinProb + normalRandom(rand, 0, 0.10), 0.01, 0.99);

    const fin = computeFinance(
      cfgDraw,
      cfgDraw.revenue.per_project_run_cost,
      qualityEval.effective_quality_for_market,
      cost.total_cost,
      perturbedWinProb
    );

    const feasible = qualityEval.quality_pass && fin.npv > 0 && representOk;

    rows.push({
      interview_minutes: minutes,
      attrition_rate: attrition,
      response_rate: response,
      win_probability: perturbedWinProb,
      quality: qual,
      quality_with_uncertainty: qualWithUncertainty,
      sellable_quality: effectiveQuality,
      quality_threshold_used: threshold,
      quality_pass: qualityEval.quality_pass,
      representativeness_penalty: representPenalty,
      representativeness_ok: representOk,
      feasible,
      cost_per_completed_interview: cost.cost_per_completed_interview,
      cost_per_retained_agent: cost.cost_per_retained_agent,
      npv: fin.npv,
      break_even_within_horizon: fin.break_even_within_horizon,
      time_to_break_even_months: fin.time_to_break_even_months,
    });
  }

  // Compute summary statistics
  const npvs = rows.map((r) => r.npv).sort((a, b) => a - b);
  const meanNpv = npvs.reduce((a, b) => a + b, 0) / npvs.length;
  const medianNpv = npvs[Math.floor(npvs.length / 2)];
  const pPositiveNpv = rows.filter((r) => r.npv > 0).length / rows.length;
  const pBreakEven = rows.filter((r) => r.break_even_within_horizon).length / rows.length;
  const pFeasible = rows.filter((r) => r.feasible).length / rows.length;
  const meanQuality = rows.reduce((a, r) => a + r.quality, 0) / rows.length;
  const p5Npv = npvs[Math.floor(npvs.length * 0.05)];
  const p95Npv = npvs[Math.floor(npvs.length * 0.95)];

  return {
    rows,
    summary: {
      mean_npv: meanNpv,
      median_npv: medianNpv,
      p_positive_npv: pPositiveNpv,
      p_break_even: pBreakEven,
      p_feasible: pFeasible,
      mean_quality: meanQuality,
      p5_npv: p5Npv,
      p95_npv: p95Npv,
    },
  };
}
