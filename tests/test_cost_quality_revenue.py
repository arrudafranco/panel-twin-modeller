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
