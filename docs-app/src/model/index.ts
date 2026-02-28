// Re-exports all model functions and types

export type {
  CostParams,
  QualityParams,
  SamplingParams,
  ProductParams,
  RevenueParams,
  CompetitionParams,
  ScenarioConfig,
} from './params.ts';

export {
  DEFAULT_COST,
  DEFAULT_QUALITY,
  DEFAULT_SAMPLING,
  DEFAULT_PRODUCT,
  DEFAULT_REVENUE,
  DEFAULT_COMPETITION,
  createDefaultConfig,
  QUALITY_UNCERTAINTY_BANDS,
} from './params.ts';

export { computeCosts } from './costModel.ts';
export type { CostResult } from './costModel.ts';

export { qualityScore, qualityTiers, memoryArchitectureSummary } from './qualityModel.ts';

export { marketShares, winProbability, netNewFraction, STYLIZED_COEFFICIENTS } from './competitionModel.ts';

export { computeFinance } from './revenueModel.ts';
export type { FinanceResult } from './revenueModel.ts';

export { BENCHMARKS, recommendedQualityThreshold, qualityMarketAdjustment } from './benchmarkModel.ts';
export type { BenchmarkEntry } from './benchmarkModel.ts';

export { moduleEconomics } from './productModel.ts';
export type { ModuleEconomicsResult } from './productModel.ts';

export { runMonteCarlo } from './mcModel.ts';
export type { MCRow, MCResult } from './mcModel.ts';
