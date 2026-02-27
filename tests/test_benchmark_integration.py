from twin_econ.benchmark_model import quality_market_adjustment, recommended_quality_threshold
from twin_econ.params import ScenarioConfig


def test_recommended_threshold_uses_benchmarks_for_attitudes():
    cfg = ScenarioConfig()
    cfg.quality_profile = "attitude_belief"
    cfg.competition.client_risk_profile = "commercial_exploratory"
    t = recommended_quality_threshold(cfg, cfg.quality_profile)
    assert 0.65 <= t <= 0.9
    assert t != cfg.quality.quality_threshold


def test_risk_profile_changes_threshold():
    cfg = ScenarioConfig()
    low = recommended_quality_threshold(cfg, "attitude_belief")
    cfg.competition.client_risk_profile = "federal_high_risk"
    high = recommended_quality_threshold(cfg, "attitude_belief")
    assert high > low


def test_quality_market_adjustment_penalizes_below_threshold():
    out = quality_market_adjustment(0.7, 0.8)
    assert out["quality_pass"] is False
    assert out["effective_quality_for_market"] < 0.7


def test_strict_filter_changes_threshold_vs_all():
    cfg = ScenarioConfig()
    cfg.quality_profile = "attitude_belief"
    cfg.quality.benchmark_filter_mode = "all"
    t_all = recommended_quality_threshold(cfg, cfg.quality_profile)
    cfg.quality.benchmark_filter_mode = "strict_near_2week_federal"
    t_strict = recommended_quality_threshold(cfg, cfg.quality_profile)
    assert t_all != t_strict


def test_conservative_sensitivity_is_stricter():
    cfg = ScenarioConfig()
    cfg.quality_profile = "attitude_belief"
    cfg.quality.benchmark_mapping_sensitivity = "base"
    t_base = recommended_quality_threshold(cfg, cfg.quality_profile)
    cfg.quality.benchmark_mapping_sensitivity = "conservative"
    t_cons = recommended_quality_threshold(cfg, cfg.quality_profile)
    assert t_cons >= t_base
