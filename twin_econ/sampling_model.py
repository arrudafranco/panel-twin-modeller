from __future__ import annotations

import numpy as np
import pandas as pd

from .params import ScenarioConfig


def _load_target_shares(cfg: ScenarioConfig, labels: list[str]) -> dict[str, float]:
    if cfg.sampling.target_margins_csv:
        src = pd.read_csv(cfg.sampling.target_margins_csv)
        if {"group", "target_share"}.issubset(src.columns):
            shares = {
                str(row["group"]): float(row["target_share"])
                for _, row in src.iterrows()
                if str(row["group"]) in labels
            }
            s = sum(shares.values())
            if s > 0:
                return {k: v / s for k, v in shares.items()}
    uniform = 1.0 / max(len(labels), 1)
    return {k: uniform for k in labels}


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
    target_shares = _load_target_shares(cfg, labels)
    achieved_shares = {g: float(counts.get(g, 0.0)) / max(float(n), 1.0) for g in labels}
    weights = {
        g: max(target_shares[g], 1e-9) / max(achieved_shares[g], 1e-9)
        for g in labels
    }
    w = pd.Series(assigned).map(weights)
    ess = (w.sum() ** 2) / (w.pow(2).sum())
    ess_penalty = max(0.0, 1.0 - ess / n)
    marginal_gap = float(
        sum(abs(achieved_shares[g] - target_shares[g]) for g in labels) / max(len(labels), 1)
    )
    penalty = max(0.0, min(float(cfg.sampling.representativeness_penalty_max), 0.5 * (ess_penalty + marginal_gap)))

    table = pd.DataFrame(
        {
            "group": labels,
            "achieved": [float(counts.get(g, 0.0)) for g in labels],
            "target": [target_shares[g] * n for g in labels],
            "achieved_share": [achieved_shares[g] for g in labels],
            "target_share": [target_shares[g] for g in labels],
            "design_weight": [weights[g] for g in labels],
        }
    )
    table["weighted_share"] = table["achieved_share"] * table["design_weight"]
    table["weighted_share"] = table["weighted_share"] / max(table["weighted_share"].sum(), 1e-9)
    table["unweighted_gap_abs"] = (table["achieved_share"] - table["target_share"]).abs()
    table["weighted_gap_abs"] = (table["weighted_share"] - table["target_share"]).abs()

    return {
        "effective_sample_size": float(ess),
        "representativeness_penalty": float(penalty),
        "weighting_table": table,
    }
