from __future__ import annotations

from pathlib import Path

from twin_econ.params import ScenarioConfig
from twin_econ.sampling_model import run_sampling


def test_sampling_uses_target_margins_csv(tmp_path: Path):
    cfg = ScenarioConfig()
    cfg.mode = "scaleup"
    cfg.sampling.scaleup_n = 3000
    cfg.sampling.response_rate_by_stratum = {"A": 0.6, "B": 0.4}
    margins = tmp_path / "margins.csv"
    margins.write_text("group,target_share\nA,0.5\nB,0.5\n", encoding="utf-8")
    cfg.sampling.target_margins_csv = str(margins)

    out = run_sampling(cfg)
    table = out["weighting_table"]

    # Weighted shares should move closer to configured target shares than raw achieved shares.
    assert float(table["weighted_gap_abs"].mean()) <= float(table["unweighted_gap_abs"].mean())
    assert 0.0 <= float(out["representativeness_penalty"]) <= float(cfg.sampling.representativeness_penalty_max)


def test_sampling_supports_multi_margin_ipf_csv(tmp_path: Path):
    cfg = ScenarioConfig()
    cfg.mode = "scaleup"
    cfg.sampling.scaleup_n = 2500
    cfg.sampling.response_rate_by_stratum = {
        "age:18_29": 0.7,
        "age:30_44": 0.4,
        "gender:female": 0.8,
        "gender:male": 0.5,
        "default": 1.0,
    }
    margins = tmp_path / "margins_multi.csv"
    margins.write_text(
        (
            "margin,category,target_share\n"
            "age,18_29,0.45\n"
            "age,30_44,0.55\n"
            "gender,female,0.52\n"
            "gender,male,0.48\n"
        ),
        encoding="utf-8",
    )
    cfg.sampling.target_margins_csv = str(margins)

    out = run_sampling(cfg)
    table = out["weighting_table"]

    # IPF should drive weighted margins very close to targets.
    assert float(table["weighted_gap_abs"].max()) < 0.01
    assert 0.0 <= float(out["representativeness_penalty"]) <= float(cfg.sampling.representativeness_penalty_max)
