from __future__ import annotations

from twin_econ.benchmark_model import recommended_quality_threshold
from twin_econ.cost_model import compute_costs
from twin_econ.params import ScenarioConfig
from twin_econ.quality_model import quality_score
from twin_econ.revenue_model import compute_finance


def test_quality_monotonic_with_minutes_for_attitudes():
    cfg = ScenarioConfig()
    q60 = quality_score(cfg, "attitude_belief", interview_minutes=60)
    q90 = quality_score(cfg, "attitude_belief", interview_minutes=90)
    q120 = quality_score(cfg, "attitude_belief", interview_minutes=120)
    assert q120 >= q90 >= q60


def test_cost_increases_with_interview_minutes():
    cfg = ScenarioConfig()
    cfg.interview_minutes = 60
    c60 = compute_costs(cfg)["cost_per_completed_interview"]
    cfg.interview_minutes = 120
    c120 = compute_costs(cfg)["cost_per_completed_interview"]
    assert c120 > c60


def test_federal_threshold_stricter_than_commercial():
    cfg = ScenarioConfig()
    cfg.quality_profile = "attitude_belief"
    cfg.competition.client_risk_profile = "commercial_exploratory"
    t_com = recommended_quality_threshold(cfg, cfg.quality_profile)
    cfg.competition.client_risk_profile = "federal_high_risk"
    t_fed = recommended_quality_threshold(cfg, cfg.quality_profile)
    assert t_fed > t_com


def test_finance_sensitive_to_effective_quality():
    cfg = ScenarioConfig()
    cogs = compute_costs(cfg)["cost_per_completed_interview"]
    fin_low = compute_finance(cfg, cogs, quality=0.6)
    fin_high = compute_finance(cfg, cogs, quality=0.85)
    assert fin_high["win_probability"] > fin_low["win_probability"]
    assert fin_high["npv"] > fin_low["npv"]
