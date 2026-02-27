from __future__ import annotations

from pathlib import Path

from twin_econ.params import ScenarioConfig
from twin_econ.pilot_calibration import calibrate_from_csv


def test_optional_response_mode_columns_can_update_quality_params(tmp_path: Path):
    csv_path = tmp_path / "pilot_modes.csv"
    csv_path.write_text(
        "\n".join(
            [
                "participant_id,interview_minutes,tokens_input,tokens_output,asr_minutes,tts_minutes,completed,retested,retest_consistency,cost_actual,categorical_question_share,numeric_question_share,open_ended_question_share,categorical_mode_reliability_observed,numeric_mode_reliability_observed,open_ended_mode_reliability_observed",
                "1,100,50000,28000,100,95,1,1,0.84,180,0.60,0.20,0.20,1.05,0.93,0.97",
                "2,95,47000,26000,95,90,1,1,0.80,172,0.58,0.22,0.20,1.04,0.92,0.96",
                "3,110,52000,29000,110,100,1,0,0.00,188,0.62,0.18,0.20,1.06,0.94,0.98",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    cfg = ScenarioConfig()
    calibrated, precision = calibrate_from_csv(cfg, str(csv_path))

    assert "categorical_question_share_posterior_mean" in precision
    assert "categorical_mode_reliability_posterior_mean" in precision
    assert calibrated.quality.categorical_question_share > 0.45
    assert calibrated.quality.categorical_mode_reliability > 1.02
