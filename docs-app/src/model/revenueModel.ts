// Faithful TypeScript port of twin_econ/revenue_model.py

import { marketShares, netNewFraction, winProbability } from './competitionModel.ts';
import type { ScenarioConfig } from './params.ts';

function monthlyDiscount(discountRate: number): number {
  return Math.pow(1.0 + discountRate, 1.0 / 12.0) - 1.0;
}

export interface FinanceResult {
  win_probability: number;
  market_share_panel_twin: number;
  market_share_probability_benchmark: number;
  market_share_hybrid_benchmark: number;
  market_share_external_synthetic: number;
  gross_margin: number;
  contribution_margin_total: number;
  npv: number;
  break_even_month: number;
  time_to_break_even_months: number | null;
  break_even_within_horizon: boolean;
  total_upfront_investment: number;
  time_horizon_months: number;
  // Extra data for chart rendering
  monthly_cumulative_margin: number[];
}

export function computeFinance(
  cfg: ScenarioConfig,
  cogsPerProject: number,
  quality: number
): FinanceResult {
  const base = cfg.revenue;
  const pwin = winProbability(cfg, base.price_per_project, quality, cfg.competition.turnaround_days);
  const shares = marketShares(cfg, base.price_per_project, quality, cfg.competition.turnaround_days);
  const monthlyD = monthlyDiscount(base.discount_rate);
  const totalUpfrontInvestment = Math.max(0.0, base.cac + base.other_initial_investment);

  let monthlyMargin = 0.0;
  let npv = -totalUpfrontInvestment;
  const projects = base.projects_per_year;
  const netNew = netNewFraction(cfg);
  let breakEvenMonth: number | null = null;
  const cumulativeMargins: number[] = [];

  for (let m = 1; m <= base.horizon_months; m++) {
    const year = Math.floor((m - 1) / 12);
    const demand = projects * Math.pow(1 + base.growth_rate, year) * Math.pow(1 - base.churn_rate, year);
    const sold = (demand / 12.0) * pwin * netNew;
    const revenue = sold * (base.price_per_project + 0.4 * base.module_addon_price + 0.2 * base.refresh_wave_price);
    const cogs = sold * cogsPerProject;
    const margin = revenue - cogs;
    monthlyMargin += margin;
    npv += margin / Math.pow(1 + monthlyD, m);
    cumulativeMargins.push(monthlyMargin);
    if (breakEvenMonth === null && monthlyMargin >= totalUpfrontInvestment) {
      breakEvenMonth = m;
    }
  }

  const grossMargin = Math.max(0.0, 1.0 - cogsPerProject / Math.max(base.price_per_project, 1.0));
  const breakEvenWithinHorizon = breakEvenMonth !== null;

  return {
    win_probability: pwin,
    market_share_panel_twin: shares['panel_twin'],
    market_share_probability_benchmark: shares['probability_benchmark'],
    market_share_hybrid_benchmark: shares['hybrid_benchmark'],
    market_share_external_synthetic: shares['external_synthetic'],
    gross_margin: grossMargin,
    contribution_margin_total: monthlyMargin,
    npv,
    break_even_month: breakEvenMonth ?? base.horizon_months,
    time_to_break_even_months: breakEvenMonth,
    break_even_within_horizon: breakEvenWithinHorizon,
    total_upfront_investment: totalUpfrontInvestment,
    time_horizon_months: base.horizon_months,
    monthly_cumulative_margin: cumulativeMargins,
  };
}
