from __future__ import annotations

from twin_econ.mc_model import run_monte_carlo
from twin_econ.params import ScenarioConfig


def test_mc_deterministic_given_seed():
    cfg = ScenarioConfig()
    a = run_monte_carlo(cfg, n=200, seed=42)
    b = run_monte_carlo(cfg, n=200, seed=42)
    assert a.equals(b)


def test_mc_quality_pass_is_binary_and_threshold_present():
    cfg = ScenarioConfig()
    df = run_monte_carlo(cfg, n=200, seed=123)
    assert "quality_threshold_used" in df.columns
    assert "quality_pass" in df.columns
    assert set(df["quality_pass"].unique()).issubset({0.0, 1.0})


def test_mc_summary_quantiles_sane():
    cfg = ScenarioConfig()
    df = run_monte_carlo(cfg, n=1000, seed=123)
    p10 = float(df["npv"].quantile(0.1))
    p90 = float(df["npv"].quantile(0.9))
    assert p90 >= p10
