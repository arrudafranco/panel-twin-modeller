// Faithful TypeScript port of twin_econ/competition_model.py
// Fix 1: STYLIZED_COEFFICIENTS documented
// Fix 3: Competitor names sanitized to generic labels

import type { ScenarioConfig } from './params.ts';

/**
 * STYLIZED_COEFFICIENTS
 *
 * These utility weights are illustrative scenario coefficients, not fitted
 * to historical win/loss data. They are used to model relative
 * attractiveness in a logit choice framework.
 *
 * quality=3.2, brand=1.1, tailwind=0.8, price=0.000012, turnaround=0.03
 *
 * Since these directly drive win probability, NPV, and the go/no-go signal,
 * they should be treated as transparent planning assumptions rather than
 * empirical estimates.
 */
export const STYLIZED_COEFFICIENTS = {
  quality: 3.2,
  brand: 1.1,
  tailwind: 0.8,
  price: 0.000012,
  turnaround: 0.03,
} as const;

function utility(
  cfg: ScenarioConfig,
  price: number,
  quality: number,
  turnaroundDays: number,
  includeBrand: boolean,
  ownPrice?: number
): number {
  const c = cfg.competition;
  const brand = includeBrand ? c.brand_trust : 0.0;
  const tailwind = c.market_tailwind;
  const riskAdj = c.client_risk_profile === 'federal_high_risk' ? c.federal_risk_penalty : 0.0;

  let elasticityTerm = 0.0;
  if (ownPrice != null) {
    const rel = Math.max(ownPrice, 1.0) / Math.max(price, 1.0);
    elasticityTerm = c.cross_price_elasticity * Math.log(rel);
  }

  return (
    c.utility_quality_weight * quality +
    c.utility_brand_weight * brand +
    c.utility_tailwind_weight * tailwind -
    c.utility_price_weight * price -
    c.utility_turnaround_weight * turnaroundDays +
    elasticityTerm -
    riskAdj
  );
}

function outsideOptionUtilities(cfg: ScenarioConfig, ownPrice: number): number[] {
  const c = cfg.competition;
  return [
    utility(cfg, c.probability_benchmark_price, c.probability_benchmark_quality, c.probability_benchmark_turnaround_days, false, ownPrice),
    utility(cfg, c.hybrid_benchmark_price, c.hybrid_benchmark_quality, c.hybrid_benchmark_turnaround_days, false, ownPrice),
    utility(cfg, c.external_synthetic_price, c.external_synthetic_quality, c.external_synthetic_turnaround_days, false, ownPrice),
  ];
}

export function marketShares(
  cfg: ScenarioConfig,
  price: number,
  quality: number,
  turnaroundDays: number
): Record<string, number> {
  const ownU = utility(cfg, price, quality, turnaroundDays, true);
  const competitors = outsideOptionUtilities(cfg, price);
  // Fix 3: Generic labels
  const labels = ['panel_twin', 'probability_benchmark', 'hybrid_benchmark', 'external_synthetic'];
  const values = [ownU, ...competitors];
  const maxU = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - maxU));
  const denom = Math.max(exps.reduce((a, b) => a + b, 0), 1e-9);
  const shares = exps.map((v) => v / denom);
  const result: Record<string, number> = {};
  for (let i = 0; i < labels.length; i++) {
    result[labels[i]] = shares[i];
  }
  return result;
}

export function winProbability(
  cfg: ScenarioConfig,
  price: number,
  quality: number,
  turnaroundDays: number
): number {
  return marketShares(cfg, price, quality, turnaroundDays)['panel_twin'];
}

export function netNewFraction(cfg: ScenarioConfig): number {
  return Math.max(0.0, 1.0 - cfg.competition.cannibalization_rate);
}
