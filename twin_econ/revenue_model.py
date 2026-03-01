from __future__ import annotations

from .competition_model import market_shares, net_new_fraction, win_probability
from .params import ScenarioConfig


def _monthly_discount(discount_rate: float) -> float:
    return (1.0 + discount_rate) ** (1.0 / 12.0) - 1.0


def compute_finance(cfg: ScenarioConfig, cogs_per_project: float, quality: float) -> dict[str, float | bool | None]:
    base = cfg.revenue
    pwin = win_probability(cfg, base.price_per_project, quality, cfg.competition.turnaround_days)
    shares = market_shares(cfg, base.price_per_project, quality, cfg.competition.turnaround_days)
    monthly_d = _monthly_discount(base.discount_rate)
    total_upfront_investment = max(0.0, base.cac + base.other_initial_investment)

    monthly_margin = 0.0
    npv = -total_upfront_investment
    projects = base.projects_per_year
    net_new = net_new_fraction(cfg)
    break_even_month: int | None = None

    for m in range(1, base.horizon_months + 1):
        year = (m - 1) // 12
        demand = projects * ((1 + base.growth_rate) ** year) * ((1 - base.churn_rate) ** year)
        sold = demand / 12.0 * pwin * net_new
        revenue = sold * (base.price_per_project + 0.4 * base.module_addon_price + 0.2 * base.refresh_wave_price)
        cogs = sold * cogs_per_project
        margin = revenue - cogs
        monthly_margin += margin
        npv += margin / ((1 + monthly_d) ** m)
        if break_even_month is None and monthly_margin >= total_upfront_investment:
            break_even_month = m

    gross_margin = max(0.0, 1.0 - (cogs_per_project / max(base.price_per_project, 1.0)))
    break_even_within_horizon = break_even_month is not None
    return {
        "win_probability": pwin,
        "market_share_panel_twin": shares["panel_twin"],
        "market_share_probability_benchmark": shares["probability_benchmark"],
        "market_share_hybrid_benchmark": shares["hybrid_benchmark"],
        "market_share_nonprob_panel": shares["nonprob_panel"],
        "gross_margin": gross_margin,
        "contribution_margin_total": monthly_margin,
        "npv": npv,
        "break_even_month": float(break_even_month) if break_even_month is not None else float(base.horizon_months),
        "time_to_break_even_months": float(break_even_month) if break_even_month is not None else None,
        "break_even_within_horizon": break_even_within_horizon,
        "total_upfront_investment": total_upfront_investment,
        "time_horizon_months": float(base.horizon_months),
    }
