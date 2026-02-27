from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    run_id = uuid4().hex
    tmp_root = root / ".tmp_runtime_runs" / run_id
    pytest_tmp = tmp_root / "pytest" / run_id
    mpl_cfg = root / ".mplconfig"
    tmp_root.mkdir(parents=True, exist_ok=True)
    pytest_tmp.mkdir(parents=True, exist_ok=True)
    mpl_cfg.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env["TMP"] = str(tmp_root)
    env["TEMP"] = str(tmp_root)
    env["TMPDIR"] = str(tmp_root)
    env["MPLCONFIGDIR"] = str(mpl_cfg)
    env["PANEL_TWIN_TEST_TMP"] = str(tmp_root / "pytest_fixtures" / run_id)

    cmd = [
        sys.executable,
        "-m",
        "pytest",
        *sys.argv[1:],
        "--basetemp",
        str(pytest_tmp),
        "-p",
        "no:cacheprovider",
        "-p",
        "no:tmpdir",
    ]
    proc = subprocess.run(cmd, cwd=root, env=env, capture_output=True, text=True)
    if proc.stdout:
        print(proc.stdout, end="")
    if proc.returncode != 0 and proc.stderr:
        print(proc.stderr, end="", file=sys.stderr)
    return int(proc.returncode)


if __name__ == "__main__":
    code = main()
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(code)
