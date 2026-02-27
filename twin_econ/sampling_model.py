from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from .params import ScenarioConfig


def _normalize_shares(shares: dict[str, float]) -> dict[str, float]:
    vals = {k: max(float(v), 0.0) for k, v in shares.items()}
    s = sum(vals.values())
    if s <= 0:
        u = 1.0 / max(len(vals), 1)
        return {k: u for k in vals}
    return {k: v / s for k, v in vals.items()}


def _load_target_margins(cfg: ScenarioConfig) -> dict[str, dict[str, float]]:
    csv_path = cfg.sampling.target_margins_csv.strip()
    if csv_path and Path(csv_path).exists():
        src = pd.read_csv(csv_path)
        if {"group", "target_share"}.issubset(src.columns):
            shares = {str(row["group"]): float(row["target_share"]) for _, row in src.iterrows()}
            return {"group": _normalize_shares(shares)}
        if {"margin", "category", "target_share"}.issubset(src.columns):
            out: dict[str, dict[str, float]] = {}
            for margin, grp in src.groupby("margin"):
                shares = {str(row["category"]): float(row["target_share"]) for _, row in grp.iterrows()}
                out[str(margin)] = _normalize_shares(shares)
            return out
    return {"group": _normalize_shares(cfg.sampling.response_rate_by_stratum)}


def _bias_factor(cfg: ScenarioConfig, margin: str, category: str) -> float:
    key = f"{margin}:{category}"
    if key in cfg.sampling.response_rate_by_stratum:
        return max(0.01, float(cfg.sampling.response_rate_by_stratum[key]))
    if category in cfg.sampling.response_rate_by_stratum:
        return max(0.01, float(cfg.sampling.response_rate_by_stratum[category]))
    if "default" in cfg.sampling.response_rate_by_stratum:
        return max(0.01, float(cfg.sampling.response_rate_by_stratum["default"]))
    return 1.0


def _simulate_unweighted_sample(
    cfg: ScenarioConfig,
    n: int,
    rng: np.random.Generator,
    targets: dict[str, dict[str, float]],
) -> pd.DataFrame:
    rows: dict[str, np.ndarray] = {}
    for margin, shares in targets.items():
        cats = list(shares.keys())
        base = np.array([shares[c] for c in cats], dtype=float)
        bias = np.array([_bias_factor(cfg, margin, c) for c in cats], dtype=float)
        probs = base * bias
        probs = probs / max(probs.sum(), 1e-9)
        rows[margin] = rng.choice(cats, size=n, p=probs)
    return pd.DataFrame(rows)


def _ipf_weights(
    sample: pd.DataFrame,
    targets: dict[str, dict[str, float]],
    max_iter: int = 60,
    tol: float = 1e-6,
) -> pd.Series:
    n = float(len(sample))
    w = pd.Series(np.ones(len(sample), dtype=float), index=sample.index)
    for _ in range(max_iter):
        for margin, shares in targets.items():
            target_counts = {k: v * n for k, v in shares.items()}
            for category, tcount in target_counts.items():
                mask = sample[margin] == category
                current = float(w.loc[mask].sum())
                if current <= 0:
                    continue
                factor = tcount / current
                w.loc[mask] = w.loc[mask] * factor
        max_gap = 0.0
        for margin, shares in targets.items():
            total = max(float(w.sum()), 1e-9)
            weighted = w.groupby(sample[margin]).sum() / total
            for category, target_share in shares.items():
                gap = abs(float(weighted.get(category, 0.0)) - float(target_share))
                max_gap = max(max_gap, gap)
        if max_gap < tol:
            break
    return w


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
    targets = _load_target_margins(cfg)
    sample = _simulate_unweighted_sample(cfg, n, rng, targets)
    w = _ipf_weights(sample, targets)

    ess = (float(w.sum()) ** 2) / max(float((w.pow(2)).sum()), 1e-9)
    rows: list[dict[str, float | str]] = []
    weighted_gap_accum = 0.0
    k = 0
    for margin, shares in targets.items():
        unweighted = sample[margin].value_counts(normalize=True)
        weighted_counts = w.groupby(sample[margin]).sum()
        weighted = weighted_counts / max(float(weighted_counts.sum()), 1e-9)
        for category, target_share in shares.items():
            achieved_share = float(unweighted.get(category, 0.0))
            weighted_share = float(weighted.get(category, 0.0))
            weighted_gap = abs(weighted_share - float(target_share))
            weighted_gap_accum += weighted_gap
            k += 1
            mask = sample[margin] == category
            rows.append(
                {
                    "margin": margin,
                    "group": category,
                    "achieved": float(mask.sum()),
                    "target": float(target_share) * n,
                    "achieved_share": achieved_share,
                    "target_share": float(target_share),
                    "design_weight": float(w.loc[mask].mean()) if bool(mask.any()) else 0.0,
                    "weighted_share": weighted_share,
                    "unweighted_gap_abs": abs(achieved_share - float(target_share)),
                    "weighted_gap_abs": weighted_gap,
                }
            )
    weighted_gap_mean = weighted_gap_accum / max(float(k), 1.0)
    ess_penalty = max(0.0, 1.0 - ess / n)
    penalty = max(0.0, min(float(cfg.sampling.representativeness_penalty_max), 0.7 * ess_penalty + 0.3 * weighted_gap_mean))
    table = pd.DataFrame(rows)

    return {
        "effective_sample_size": float(ess),
        "representativeness_penalty": float(penalty),
        "weighting_table": table,
    }
