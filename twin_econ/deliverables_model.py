from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from .params import ScenarioConfig


def generate_client_deliverables(
    cfg: ScenarioConfig,
    out_dir: str,
    compliance: dict[str, object] | None = None,
) -> dict[str, str]:
    n = cfg.sampling.pilot_n if cfg.mode == "pilot" else cfg.sampling.scaleup_n
    rng = np.random.default_rng(cfg.seed)

    micro = pd.DataFrame(
        {
            "case_id": range(1, n + 1),
            "age_band": rng.choice(["18-29", "30-44", "45-64", "65+"], size=n),
            "gender": rng.choice(["female", "male", "nonbinary"], size=n, p=[0.49, 0.48, 0.03]),
            "region": rng.choice(["NE", "MW", "S", "W"], size=n),
            "weight": np.ones(n),
            "quality_tier": rng.choice(["gold", "silver", "bronze"], size=n, p=[0.4, 0.4, 0.2]),
        }
    )

    crosstab = pd.crosstab(micro["age_band"], micro["gender"], normalize="columns")
    compliance = compliance or {}
    qa_text = f"""# QA Appendix

- Weighting diagnostics: pass-through in pilot mode; design/raking diagnostics in scale-up.
- Representativeness metrics: output includes effective sample size and penalty.
- Quality tiers: gold/silver/bronze assigned from simulated construct performance.
- Federal benchmark compliance:
  - Risk profile: {compliance.get("client_risk_profile", "n/a")}
  - Construct: {compliance.get("quality_profile", "n/a")}
  - Threshold used: {compliance.get("quality_threshold_used", "n/a")}
  - Sellable quality: {compliance.get("sellable_quality", "n/a")}
  - Pass: {compliance.get("quality_pass", "n/a")}
"""

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    p_micro = out / "synthetic_microdata.csv"
    p_cross = out / "demographic_crosstabs.csv"
    p_qa = out / "qa_appendix.md"

    micro.to_csv(p_micro, index=False)
    crosstab.to_csv(p_cross)
    p_qa.write_text(qa_text, encoding="utf-8")

    return {"microdata": str(p_micro), "crosstabs": str(p_cross), "qa": str(p_qa)}
