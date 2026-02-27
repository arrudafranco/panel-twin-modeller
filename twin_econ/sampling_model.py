from __future__ import annotations

import numpy as np
import pandas as pd

from .params import ScenarioConfig


def run_sampling(cfg: ScenarioConfig) -> dict[str, float | pd.DataFrame]:
    if cfg.mode == "pilot":
        df = pd.DataFrame({"group": ["pilot"], "target": [cfg.sampling.pilot_n], "achieved": [cfg.sampling.pilot_n], "weight": [1.0]})
        return {
            "effective_sample_size": float(cfg.sampling.pilot_n),
            "representativeness_penalty": 0.0,
            "weighting_table": df,
        }

    rng = np.random.default_rng(cfg.seed)
    n = cfg.sampling.scaleup_n
    labels = list(cfg.sampling.response_rate_by_stratum.keys())
    probs = np.array(list(cfg.sampling.response_rate_by_stratum.values()), dtype=float)
    probs = probs / probs.sum()
    assigned = rng.choice(labels, size=n, p=probs)
    counts = pd.Series(assigned).value_counts().sort_index()
    target = n / max(len(labels), 1)
    weights = target / counts
    w = pd.Series(assigned).map(weights)
    ess = (w.sum() ** 2) / (w.pow(2).sum())
    penalty = max(0.0, min(0.2, 1.0 - ess / n))

    table = pd.DataFrame(
        {
            "group": counts.index,
            "achieved": counts.values,
            "target": [target] * len(counts),
            "design_weight": [weights[g] for g in counts.index],
        }
    )

    return {
        "effective_sample_size": float(ess),
        "representativeness_penalty": float(penalty),
        "weighting_table": table,
    }
