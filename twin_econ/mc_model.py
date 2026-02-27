from __future__ import annotations

import copy

import numpy as np
import pandas as pd

from .benchmark_model import quality_market_adjustment, recommended_quality_threshold
from .cost_model import compute_costs
from .params import ScenarioConfig
from .quality_model import quality_score
from .revenue_model import compute_finance


def run_monte_carlo(cfg: ScenarioConfig, n: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows: list[dict[str, float]] = []

    for _ in range(n):
        cfg_draw = copy.deepcopy(cfg)

        minutes = float(max(20.0, rng.normal(cfg.interview_minutes, 12.0)))
        attrition = float(np.clip(rng.normal(cfg.cost.attrition_rate, 0.05), 0.02, 0.5))
        response = float(np.clip(rng.normal(cfg.cost.response_rate, 0.04), 0.05, 0.8))

        cfg_draw.interview_minutes = minutes
        cfg_draw.cost.attrition_rate = attrition
        cfg_draw.cost.response_rate = response

        cost = compute_costs(cfg_draw)
        qual = quality_score(cfg_draw, cfg.quality_profile)
        threshold = recommended_quality_threshold(cfg_draw, cfg.quality_profile)
        quality_eval = quality_market_adjustment(qual, threshold)
        usable = 1.0 if bool(quality_eval["quality_pass"]) else 0.0
        cpu = cost["cost_per_retained_agent"] if usable > 0 else np.nan
        fin = compute_finance(cfg_draw, cost["cost_per_completed_interview"], float(quality_eval["effective_quality_for_market"]))

        rows.append(
            {
                "interview_minutes": minutes,
                "attrition_rate": attrition,
                "response_rate": response,
                "quality": qual,
                "quality_threshold_used": threshold,
                "quality_pass": usable,
                "cost_per_completed_interview": cost["cost_per_completed_interview"],
                "cost_per_usable_synthetic_case": cpu,
                "npv": fin["npv"],
            }
        )

    return pd.DataFrame(rows)
