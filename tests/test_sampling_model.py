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
