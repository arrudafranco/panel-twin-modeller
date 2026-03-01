// State management: scenario config + computed results
import { useMemo, useState, useCallback } from 'react';
import {
  createDefaultConfig,
  computeCosts,
  qualityScore,
  qualityTiers,
  recommendedQualityThreshold,
  qualityMarketAdjustment,
  computeFinance,
  runMonteCarlo,
  QUALITY_UNCERTAINTY_BANDS,
} from '../model/index.ts';
import type { ScenarioConfig, CostResult, FinanceResult, MCResult } from '../model/index.ts';

export interface ComputedResults {
  quality: number;
  qualityTiers: Record<string, number>;
  threshold: number;
  qualityEval: {
    quality_threshold_used: number;
    quality_pass: boolean;
    quality_pressure: number;
    effective_quality_for_market: number;
  };
  costs: CostResult;          // pilot-scale costs (shown in Cost tab)
  deploymentCosts: CostResult; // scaleup-mode costs (used in Economics tab)
  finance: FinanceResult;
  mcResult: MCResult | null;
  warnings: string[];
  favorable: boolean;
  qualityUncertainty: number;
}

export function useScenario() {
  const [cfg, setCfg] = useState<ScenarioConfig>(createDefaultConfig);
  const [mcEnabled, setMcEnabled] = useState(false);
  const [mcSeed, setMcSeed] = useState(123);
  const [mcIterations, setMcIterations] = useState(500);

  const update = useCallback(<K extends keyof ScenarioConfig>(key: K, value: ScenarioConfig[K]) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateCost = useCallback(<K extends keyof ScenarioConfig['cost']>(key: K, value: ScenarioConfig['cost'][K]) => {
    setCfg((prev) => ({ ...prev, cost: { ...prev.cost, [key]: value } }));
  }, []);

  const updateQuality = useCallback(<K extends keyof ScenarioConfig['quality']>(key: K, value: ScenarioConfig['quality'][K]) => {
    setCfg((prev) => ({ ...prev, quality: { ...prev.quality, [key]: value } }));
  }, []);

  const updateSampling = useCallback(<K extends keyof ScenarioConfig['sampling']>(key: K, value: ScenarioConfig['sampling'][K]) => {
    setCfg((prev) => ({ ...prev, sampling: { ...prev.sampling, [key]: value } }));
  }, []);

  const updateRevenue = useCallback(<K extends keyof ScenarioConfig['revenue']>(key: K, value: ScenarioConfig['revenue'][K]) => {
    setCfg((prev) => ({ ...prev, revenue: { ...prev.revenue, [key]: value } }));
  }, []);

  const updateCompetition = useCallback(<K extends keyof ScenarioConfig['competition']>(key: K, value: ScenarioConfig['competition'][K]) => {
    setCfg((prev) => ({ ...prev, competition: { ...prev.competition, [key]: value } }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setCfg(createDefaultConfig());
  }, []);

  const computed = useMemo<ComputedResults>(() => {
    const qual = qualityScore(cfg, cfg.quality_profile);
    const tiers = qualityTiers(cfg);
    const threshold = recommendedQualityThreshold(cfg, cfg.quality_profile);
    const qualEval = qualityMarketAdjustment(qual, threshold);
    // Pilot costs: used in the Cost tab (small validation study)
    const costs = computeCosts(cfg);
    // Deployment costs: used in the Economics tab (commercial-scale study via scaleup mode)
    const deploymentCosts = computeCosts({ ...cfg, mode: 'scaleup' });
    const finance = computeFinance(cfg, deploymentCosts.total_cost, qualEval.effective_quality_for_market);
    const qualityUncertainty = QUALITY_UNCERTAINTY_BANDS[cfg.quality_profile] ?? 0.08;

    let mcResult: MCResult | null = null;
    if (mcEnabled) {
      mcResult = runMonteCarlo(cfg, mcIterations, mcSeed);
    }

    const warnings: string[] = [];
    if (cfg.interview_minutes > 150)
      warnings.push('Interview duration is high relative to common calibration windows.');
    if (cfg.cost.contact_attempts > 4)
      warnings.push('Contact attempts are high and may overstate response uplift.');
    if (cfg.cost.response_rate < 0.1)
      warnings.push('Very low response rate increases uncertainty in cost and quality estimates.');
    if (cfg.cost.attrition_rate > 0.4)
      warnings.push('High retest attrition can weaken normalized-accuracy grounding.');
    if (cfg.competition.cross_price_elasticity > 0.6)
      warnings.push('High cross-price elasticity may overstate substitution sensitivity.');
    if (cfg.revenue.horizon_months > 72)
      warnings.push('Long forecasting horizon increases uncertainty in projections.');

    const favorable = qualEval.quality_pass && finance.npv > 0;

    return {
      quality: qual,
      qualityTiers: tiers,
      threshold,
      qualityEval: qualEval,
      costs,
      deploymentCosts,
      finance,
      mcResult,
      warnings,
      favorable,
      qualityUncertainty,
    };
  }, [cfg, mcEnabled, mcIterations, mcSeed]);

  return {
    cfg,
    setCfg,
    update,
    updateCost,
    updateQuality,
    updateSampling,
    updateRevenue,
    updateCompetition,
    resetToDefaults,
    computed,
    mcEnabled,
    setMcEnabled,
    mcSeed,
    setMcSeed,
    mcIterations,
    setMcIterations,
  };
}
