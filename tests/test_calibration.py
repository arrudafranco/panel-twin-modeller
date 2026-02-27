from pathlib import Path

from twin_econ.params import ScenarioConfig
from twin_econ.pilot_calibration import calibrate_from_csv


def test_calibration_updates_fields():
    cfg = ScenarioConfig()
    csv = Path("pilot_logs/runA.csv")
    updated, precision = calibrate_from_csv(cfg, str(csv))
    assert 0 < updated.cost.response_rate < 1
    assert 0 <= updated.cost.attrition_rate < 1
    assert "response_rate_posterior_mean" in precision
    assert "response_rate_ci_low" in precision
    assert precision["response_rate_ci_low"] <= precision["response_rate_posterior_mean"] <= precision["response_rate_ci_high"]
