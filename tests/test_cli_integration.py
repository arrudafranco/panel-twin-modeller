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


def test_run_output_contract(tmp_path: Path):
    repo = Path(__file__).resolve().parents[1]
    out = tmp_path / "run_out"
    mpl = tmp_path / "mpl"
    mpl.mkdir(parents=True, exist_ok=True)

    cp = _run(
        [sys.executable, "-m", "twin_econ.cli", "run", "--config", "configs/base.yaml", "--out", str(out)],
        cwd=repo,
        mpl_dir=mpl,
    )
    assert "Baseline Pilot Summary" in cp.stdout

    summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
    required = {
        "scenario",
        "mode",
        "client_risk_profile",
        "quality_profile",
        "quality_threshold_used",
        "quality_pass",
        "npv",
        "deliverables",
    }
    assert required.issubset(summary.keys())
    qa_path = Path(summary["deliverables"]["qa"])
    assert qa_path.exists()
    qa_text = qa_path.read_text(encoding="utf-8")
    assert "Federal benchmark compliance" in qa_text


def test_yaml_non_json_config_is_supported(tmp_path: Path):
    repo = Path(__file__).resolve().parents[1]
    cfg = tmp_path / "custom.yaml"
    cfg.write_text(
        """
scenario_name: yaml_custom
mode: pilot
interview_minutes: 100
quality_profile: attitude_belief
competition:
  client_risk_profile: federal_high_risk
""".strip()
        + "\n",
        encoding="utf-8",
    )

    out = tmp_path / "run_out"
    mpl = tmp_path / "mpl"
    mpl.mkdir(parents=True, exist_ok=True)
    _run(
        [sys.executable, "-m", "twin_econ.cli", "run", "--config", str(cfg), "--out", str(out)],
        cwd=repo,
        mpl_dir=mpl,
    )
    summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
    assert summary["scenario"] == "yaml_custom"
    assert summary["client_risk_profile"] == "federal_high_risk"


def test_sweep_uses_benchmark_adjusted_quality(tmp_path: Path):
    repo = Path(__file__).resolve().parents[1]
    out = tmp_path / "sweep"
    mpl = tmp_path / "mpl"
    mpl.mkdir(parents=True, exist_ok=True)

    _run(
        [
            sys.executable,
            "-m",
            "twin_econ.cli",
            "sweep",
            "--config",
            "configs/base.yaml",
            "--param",
            "interview_minutes=60,120",
            "--out",
            str(out),
        ],
        cwd=repo,
        mpl_dir=mpl,
    )
    csv = (out / "sweep_results.csv").read_text(encoding="utf-8")
    assert "quality_threshold_used" in csv
    assert "quality_pass" in csv
