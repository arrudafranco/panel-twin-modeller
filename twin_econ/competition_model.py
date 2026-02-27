from __future__ import annotations

import math

from .params import ScenarioConfig


def win_probability(cfg: ScenarioConfig, price: float, quality: float, turnaround_days: float) -> float:
    brand = cfg.competition.brand_trust
    tailwind = cfg.competition.market_tailwind
    risk_adj = 0.08 if cfg.competition.client_risk_profile == "federal_high_risk" else 0.0
    util = (
        3.2 * quality
        + 1.1 * brand
        + 0.8 * tailwind
        - 0.000012 * price
        - 0.03 * turnaround_days
        - risk_adj
    )
    return 1.0 / (1.0 + math.exp(-util))


def net_new_fraction(cfg: ScenarioConfig) -> float:
    return max(0.0, 1.0 - cfg.competition.cannibalization_rate)
