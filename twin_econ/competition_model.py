from __future__ import annotations

import math

from .params import ScenarioConfig


def _utility(
    cfg: ScenarioConfig,
    price: float,
    quality: float,
    turnaround_days: float,
    include_brand: bool,
    own_price: float | None = None,
) -> float:
    c = cfg.competition
    brand = c.brand_trust if include_brand else 0.0
    tailwind = c.market_tailwind
    risk_adj = c.federal_risk_penalty if c.client_risk_profile == "federal_high_risk" else 0.0
    elasticity_term = 0.0
    if own_price is not None:
        rel = max(own_price, 1.0) / max(price, 1.0)
        elasticity_term = c.cross_price_elasticity * math.log(rel)
    util = (
        c.utility_quality_weight * quality
        + c.utility_brand_weight * brand
        + c.utility_tailwind_weight * tailwind
        - c.utility_price_weight * price
        - c.utility_turnaround_weight * turnaround_days
        + elasticity_term
        - risk_adj
    )
    return util


def _outside_option_utilities(cfg: ScenarioConfig, own_price: float) -> list[float]:
    c = cfg.competition
    return [
        _utility(cfg, c.probability_benchmark_price, c.probability_benchmark_quality, c.probability_benchmark_turnaround_days, include_brand=False, own_price=own_price),
        _utility(cfg, c.hybrid_benchmark_price, c.hybrid_benchmark_quality, c.hybrid_benchmark_turnaround_days, include_brand=False, own_price=own_price),
        _utility(
            cfg,
            c.external_synthetic_price,
            c.external_synthetic_quality,
            c.external_synthetic_turnaround_days,
            include_brand=False,
            own_price=own_price,
        ),
    ]


def market_shares(cfg: ScenarioConfig, price: float, quality: float, turnaround_days: float) -> dict[str, float]:
    own_u = _utility(cfg, price, quality, turnaround_days, include_brand=True)
    competitors = _outside_option_utilities(cfg, price)
    labels = ["panel_twin", "probability_benchmark", "hybrid_benchmark", "external_synthetic"]
    values = [own_u, *competitors]
    max_u = max(values)
    exps = [math.exp(v - max_u) for v in values]
    denom = max(sum(exps), 1e-9)
    shares = [v / denom for v in exps]
    return {labels[i]: shares[i] for i in range(len(labels))}


def win_probability(cfg: ScenarioConfig, price: float, quality: float, turnaround_days: float) -> float:
    return market_shares(cfg, price, quality, turnaround_days)["panel_twin"]


def net_new_fraction(cfg: ScenarioConfig) -> float:
    return max(0.0, 1.0 - cfg.competition.cannibalization_rate)
