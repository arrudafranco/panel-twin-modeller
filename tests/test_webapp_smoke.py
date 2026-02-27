from __future__ import annotations

from pathlib import Path

import pytest


pytest.importorskip("streamlit.testing.v1")
from streamlit.testing.v1 import AppTest


def test_webapp_renders_with_single_view_progressive_disclosure():
    app_path = Path(__file__).resolve().parents[1] / "webapp" / "app.py"
    at = AppTest.from_file(str(app_path))
    at.run(timeout=120)

    assert not at.exception
    assert any("Panel Twin Feasibility Studio" in t.value for t in at.title)
    assert any("Single-view progressive disclosure active" in i.value for i in at.info)
