from __future__ import annotations

from .competition_model import net_new_fraction, win_probability
from .params import ScenarioConfig


def _monthly_discount(discount_rate: float) -> float:
    return (1.0 + discount_rate) ** (1.0 / 12.0) - 1.0


def compute_finance(cfg: ScenarioConfig, cogs_per_project: float, quality: float) -> dict[str, float]:
    base = cfg.revenue
    pwin = win_probability(cfg, base.price_per_project, quality, cfg.competition.turnaround_days)
    monthly_d = _monthly_discount(base.discount_rate)

    monthly_margin = 0.0
    npv = -base.cac
    projects = base.projects_per_year
    net_new = net_new_fraction(cfg)

    for m in range(1, base.horizon_months + 1):
        year = (m - 1) // 12
        demand = projects * ((1 + base.growth_rate) ** year) * ((1 - base.churn_rate) ** year)
        sold = demand / 12.0 * pwin * net_new
        revenue = sold * (base.price_per_project + 0.4 * base.module_addon_price + 0.2 * base.refresh_wave_price)
        cogs = sold * cogs_per_project
        margin = revenue - cogs
        monthly_margin += margin
        npv += margin / ((1 + monthly_d) ** m)

    gross_margin = max(0.0, 1.0 - (cogs_per_project / max(base.price_per_project, 1.0)))
    break_even_month = 1 if monthly_margin > base.cac else float(base.horizon_months)
    return {
        "win_probability": pwin,
        "gross_margin": gross_margin,
        "contribution_margin_total": monthly_margin,
        "npv": npv,
        "break_even_month": break_even_month,
    }
