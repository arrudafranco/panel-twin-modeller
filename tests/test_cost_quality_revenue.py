from twin_econ.cost_model import compute_costs
from twin_econ.params import ScenarioConfig
from twin_econ.quality_model import quality_score
from twin_econ.revenue_model import compute_finance


def test_cost_outputs_positive():
    cfg = ScenarioConfig()
    out = compute_costs(cfg)
    assert out["total_cost"] > 0
    assert out["cost_per_completed_interview"] > 0
    assert out["cost_per_retained_agent"] >= out["cost_per_completed_interview"]


def test_quality_bounds_and_ordering():
    cfg = ScenarioConfig()
    q_full = quality_score(cfg, "attitude_belief")
    cfg.memory_strategy_prediction = "partial_20pct"
    q_partial = quality_score(cfg, "attitude_belief")
    assert 0 <= q_partial <= 1
    assert q_full > q_partial


def test_finance_npv_numeric():
    cfg = ScenarioConfig()
    cost = compute_costs(cfg)
    q = quality_score(cfg, cfg.quality_profile)
    fin = compute_finance(cfg, cost["cost_per_completed_interview"], q)
    assert isinstance(fin["npv"], float)
    assert 0 <= fin["win_probability"] <= 1


def test_finance_break_even_detected_within_horizon():
    cfg = ScenarioConfig()
    cfg.revenue.cac = 1000
    cfg.revenue.other_initial_investment = 500
    cfg.revenue.projects_per_year = 30
    cfg.revenue.horizon_months = 24

    fin = compute_finance(cfg, cogs_per_project=1000.0, quality=0.95)

    assert fin["break_even_within_horizon"] is True
    assert fin["time_to_break_even_months"] is not None
    assert float(fin["time_to_break_even_months"]) <= cfg.revenue.horizon_months
    assert float(fin["total_upfront_investment"]) == 1500.0


def test_finance_break_even_not_reached_within_horizon():
    cfg = ScenarioConfig()
    cfg.revenue.projects_per_year = 0
    cfg.revenue.cac = 20000
    cfg.revenue.other_initial_investment = 40000
    cfg.revenue.horizon_months = 12

    fin = compute_finance(cfg, cogs_per_project=5000.0, quality=0.8)

    assert fin["break_even_within_horizon"] is False
    assert fin["time_to_break_even_months"] is None
    assert float(fin["break_even_month"]) == float(cfg.revenue.horizon_months)
    assert float(fin["total_upfront_investment"]) == 60000.0
