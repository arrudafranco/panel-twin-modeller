// Faithful TypeScript port of twin_econ/benchmark_model.py
// Benchmarks data embedded from benchmarks/benchmarks.yaml

import type { ScenarioConfig } from './params.ts';

export interface BenchmarkEntry {
  instrument_name: string;
  agency: string;
  federal_national_representative: boolean;
  near_2week: boolean;
  retest_interval_days: string;
  metric_type: string;
  typical_range_or_distribution: string;
  construct_type: string;
  metrics: Record<string, number[] | undefined>;
  comparability_note: string;
  citations: string[];
}

// Embedded from benchmarks/benchmarks.yaml
export const BENCHMARKS: BenchmarkEntry[] = [
  {
    instrument_name: "NSDUH Reliability Study (Perceived Risk / Attitude-Belief Items)",
    agency: "SAMHSA",
    federal_national_representative: true,
    near_2week: true,
    retest_interval_days: "5-15",
    metric_type: "kappa + exact agreement",
    typical_range_or_distribution: "Kappa ~0.39-0.56; exact agreement ~79.8%-90.5% for perceived-risk items",
    construct_type: "attitude_belief",
    metrics: { kappa_range: [0.39, 0.56], agreement_range: [0.798, 0.905] },
    comparability_note: "Closest federal national benchmark for attitude/belief with near-2-week retest, but still not fixed exactly at 14 days.",
    citations: [
      "https://www.ncbi.nlm.nih.gov/books/NBK519788/",
      "https://www.ncbi.nlm.nih.gov/books/NBK519791/",
      "https://pubmed.ncbi.nlm.nih.gov/30199182/",
    ],
  },
  {
    instrument_name: "NSDUH Reliability Study (Substance Use / Behavior Items)",
    agency: "SAMHSA",
    federal_national_representative: true,
    near_2week: true,
    retest_interval_days: "5-15",
    metric_type: "kappa + exact agreement",
    typical_range_or_distribution: "Kappa ~0.69-0.94; exact agreement ~85%-99% across core behavior-use items",
    construct_type: "self_report_behavior",
    metrics: { kappa_range: [0.69, 0.94], agreement_range: [0.85, 0.99] },
    comparability_note: "Behavioral self-report reliability is generally higher than attitude/belief items in the same reinterview window.",
    citations: [
      "https://www.ncbi.nlm.nih.gov/books/NBK519788/",
      "https://pubmed.ncbi.nlm.nih.gov/30199182/",
    ],
  },
  {
    instrument_name: "BRFSS HRQOL Reliability Reinterview (MO/WA, BRFSS core items)",
    agency: "CDC (BRFSS program)",
    federal_national_representative: true,
    near_2week: true,
    retest_interval_days: "mean 13.5",
    metric_type: "kappa + ICC",
    typical_range_or_distribution: "Kappa ~0.57-0.75; ICC ~0.67-0.74",
    construct_type: "self_report_health_status",
    metrics: { kappa_range: [0.57, 0.75], icc_range: [0.67, 0.74] },
    comparability_note: "Near-2-week design and large BRFSS samples; construct differs from broad civic/political attitudes.",
    citations: [
      "https://pubmed.ncbi.nlm.nih.gov/12700216/",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC1732444/",
    ],
  },
  {
    instrument_name: "HINTS Test-Retest (Federally Sponsored National Health Communication Survey)",
    agency: "NCI",
    federal_national_representative: true,
    near_2week: false,
    retest_interval_days: "mean 34 (range 15-168)",
    metric_type: "kappa + Spearman",
    typical_range_or_distribution: "Several communication confidence/attitude items in fair-to-moderate reliability range",
    construct_type: "attitude_belief",
    metrics: { kappa_range: [0.35, 0.6], spearman_range: [0.4, 0.7] },
    comparability_note: "Useful attitude/belief comparator, but not a 2-week retest benchmark.",
    citations: ["https://hints.cancer.gov/", "https://pubmed.ncbi.nlm.nih.gov/18360718/"],
  },
  {
    instrument_name: "GSS Panel Reliability Literature (Contextual Comparator)",
    agency: "NSF-sponsored national survey program",
    federal_national_representative: true,
    near_2week: false,
    retest_interval_days: "multi-year panel waves",
    metric_type: "response consistency / panel reliability",
    typical_range_or_distribution: "Not directly comparable to 2-week retest metrics",
    construct_type: "attitude_belief",
    metrics: { contextual_range: [0.55, 0.75] },
    comparability_note: "Important attitude/belief context, but interval mismatch prevents direct benchmark equivalence.",
    citations: [
      "https://gss.norc.org/",
      "https://sociologicalscience.com/articles-v3-43-971/",
    ],
  },
];

function riskQuantile(clientRiskProfile: string): number {
  if (clientRiskProfile === 'federal_high_risk') return 0.75;
  return 0.45;
}

function constructMatch(benchmarkConstruct: string, targetConstruct: string): boolean {
  if (benchmarkConstruct === targetConstruct) return true;
  const aliases: Record<string, Set<string>> = {
    self_report_behavior: new Set(['self_report_health_status']),
    self_report_health_status: new Set(['self_report_behavior']),
  };
  return aliases[targetConstruct]?.has(benchmarkConstruct) ?? false;
}

function metricMid(metrics: Record<string, number[] | undefined>, key: string): number | null {
  const value = metrics[key];
  if (!Array.isArray(value) || value.length !== 2) return null;
  return (value[0] + value[1]) / 2.0;
}

function bounded01(x: number): number {
  return Math.max(0.0, Math.min(1.0, x));
}

function metricToLatentReliability(metrics: Record<string, number[] | undefined>): number | null {
  const vals: number[] = [];
  const kappa = metricMid(metrics, 'kappa_range');
  if (kappa !== null) vals.push(bounded01(kappa));
  const icc = metricMid(metrics, 'icc_range');
  if (icc !== null) vals.push(bounded01(icc));
  const spearman = metricMid(metrics, 'spearman_range');
  if (spearman !== null) vals.push(bounded01(spearman));
  const agreement = metricMid(metrics, 'agreement_range');
  if (agreement !== null) vals.push(bounded01((agreement - 0.5) / 0.5));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function applyMapping(cfg: ScenarioConfig, latentReliability: number): number {
  let mapped =
    cfg.quality.benchmark_mapping_intercept + cfg.quality.benchmark_mapping_slope * latentReliability;
  if (cfg.quality.benchmark_mapping_sensitivity === 'conservative') {
    mapped += cfg.quality.benchmark_mapping_uncertainty;
  } else if (cfg.quality.benchmark_mapping_sensitivity === 'optimistic') {
    mapped -= cfg.quality.benchmark_mapping_uncertainty;
  }
  return bounded01(mapped);
}

function isStrictComparator(cfg: ScenarioConfig, benchmark: BenchmarkEntry): boolean {
  const mode = cfg.quality.benchmark_filter_mode;
  if (mode === 'all') return true;
  if (mode === 'strict_near_2week_federal') {
    return benchmark.near_2week && benchmark.federal_national_representative;
  }
  return benchmark.near_2week;
}

export function recommendedQualityThreshold(
  cfg: ScenarioConfig,
  constructType: string
): number {
  if (!cfg.quality.use_benchmark_thresholds) {
    return cfg.quality.quality_threshold;
  }

  const q = riskQuantile(cfg.competition.client_risk_profile);
  const modelValues: number[] = [];

  for (const b of BENCHMARKS) {
    if (!isStrictComparator(cfg, b)) continue;
    if (!constructMatch(b.construct_type, constructType)) continue;
    const latent = metricToLatentReliability(b.metrics);
    if (latent === null) continue;
    const normalized = applyMapping(cfg, latent);
    modelValues.push(normalized);
  }

  if (modelValues.length === 0) {
    return cfg.quality.quality_threshold;
  }

  modelValues.sort((a, b) => a - b);
  const idx = Math.round((modelValues.length - 1) * q);
  let threshold = modelValues[idx];
  if (cfg.competition.client_risk_profile === 'federal_high_risk') {
    threshold += cfg.quality.benchmark_federal_uplift;
  }
  threshold = Math.max(cfg.quality.benchmark_min_threshold, Math.min(cfg.quality.benchmark_max_threshold, threshold));
  return threshold;
}

export function qualityMarketAdjustment(
  qualityValue: number,
  threshold: number
): { quality_threshold_used: number; quality_pass: boolean; quality_pressure: number; effective_quality_for_market: number } {
  const pressure = Math.min(1.0, qualityValue / Math.max(threshold, 1e-6));
  const effectiveQuality = qualityValue * (0.6 + 0.4 * pressure);
  return {
    quality_threshold_used: threshold,
    quality_pass: qualityValue >= threshold,
    quality_pressure: pressure,
    effective_quality_for_market: Math.max(0.0, Math.min(1.0, effectiveQuality)),
  };
}
