from __future__ import annotations

import os
import shutil
from pathlib import Path
from uuid import uuid4

import pytest


@pytest.fixture
def tmp_path() -> Path:
    root = Path(os.environ.get("PANEL_TWIN_TEST_TMP", Path.cwd() / ".tmp_runtime" / "pytest_fixtures"))
    root.mkdir(parents=True, exist_ok=True)
    path = root / f"case_{uuid4().hex}"
    path.mkdir(parents=True, exist_ok=True)
    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)
