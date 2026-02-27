from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


def _run(cmd: list[str], cwd: Path, mpl_dir: Path) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["MPLCONFIGDIR"] = str(mpl_dir)
    return subprocess.run(cmd, cwd=cwd, env=env, check=True, text=True, capture_output=True)


def test_benchmark_report_has_policy_and_sources(tmp_path: Path):
    repo = Path(__file__).resolve().parents[1]
    out = tmp_path / "bench"
    mpl = tmp_path / "mpl"
    mpl.mkdir(parents=True, exist_ok=True)

    _run([sys.executable, "-m", "twin_econ.cli", "benchmark", "--out", str(out)], cwd=repo, mpl_dir=mpl)
    report = (out / "benchmark_report.md").read_text(encoding="utf-8")
    assert "Threshold Policy" in report
    assert "Strict-comparator eligible" in report
    assert "https://" in report


def test_calibrate_outputs_contract_and_yaml_config(tmp_path: Path):
    repo = Path(__file__).resolve().parents[1]
    out = tmp_path / "cal"
    mpl = tmp_path / "mpl"
    mpl.mkdir(parents=True, exist_ok=True)

    _run(
        [
            sys.executable,
            "-m",
            "twin_econ.cli",
            "calibrate",
            "--pilot_csv",
            "pilot_logs/runA.csv",
            "--config",
            "configs/base.yaml",
            "--out",
            str(out),
        ],
        cwd=repo,
        mpl_dir=mpl,
    )

    rep = json.loads((out / "calibration_report.json").read_text(encoding="utf-8"))
    assert "precision" in rep
    assert "response_rate_ci_low" in rep["precision"]

    calibrated = (out / "calibrated_config.yaml").read_text(encoding="utf-8")
    assert "scenario_name:" in calibrated
    assert "quality:" in calibrated
