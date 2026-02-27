from __future__ import annotations

from pathlib import Path
import math

import pandas as pd

from .params import ScenarioConfig, dump_config

REQUIRED_COLUMNS = {
    "participant_id",
    "interview_minutes",
    "tokens_input",
    "tokens_output",
    "asr_minutes",
    "tts_minutes",
    "completed",
    "retested",
    "retest_consistency",
    "cost_actual",
}

OPTIONAL_RESPONSE_MODE_COLUMNS = {
    "categorical_question_share",
    "numeric_question_share",
    "open_ended_question_share",
    "categorical_mode_reliability_observed",
    "numeric_mode_reliability_observed",
    "open_ended_mode_reliability_observed",
}


def _beta_posterior(successes: float, trials: float, prior_mean: float, prior_strength: float) -> tuple[float, float, float]:
    alpha0 = max(1e-6, prior_mean * prior_strength)
    beta0 = max(1e-6, (1 - prior_mean) * prior_strength)
    alpha = alpha0 + successes
    beta = beta0 + max(trials - successes, 0.0)
    mean = alpha / (alpha + beta)
    var = (alpha * beta) / (((alpha + beta) ** 2) * (alpha + beta + 1))
    sd = math.sqrt(max(var, 0.0))
    # Normal approximation interval is acceptable for decision-support summaries.
    ci_low = max(0.0, mean - 1.96 * sd)
    ci_high = min(1.0, mean + 1.96 * sd)
    return mean, ci_low, ci_high


def _shrink_mean(sample_mean: float, sample_n: int, prior_mean: float, prior_strength: float) -> float:
    if sample_n <= 0:
        return prior_mean
    return (sample_n * sample_mean + prior_strength * prior_mean) / (sample_n + prior_strength)


def calibrate_from_csv(cfg: ScenarioConfig, csv_path: str) -> tuple[ScenarioConfig, dict[str, float]]:
    df = pd.read_csv(csv_path)
    missing = REQUIRED_COLUMNS.difference(df.columns)
    if missing:
        raise ValueError(f"Pilot CSV missing columns: {sorted(missing)}")

    n_total = len(df)
    n_completed = int(df["completed"].sum())
    completed_rate_sample = float(df["completed"].mean())
    completed_post, completed_low, completed_high = _beta_posterior(
        successes=float(n_completed),
        trials=float(n_total),
        prior_mean=cfg.cost.response_rate,
        prior_strength=2.0,
    )

    retested_series = df.loc[df["completed"] == 1, "retested"]
    n_completed_for_retest = int(len(retested_series))
    n_retested = int(retested_series.sum()) if n_completed_for_retest > 0 else 0
    retested_post, retested_low, retested_high = _beta_posterior(
        successes=float(n_retested),
        trials=float(max(n_completed_for_retest, 1)),
        prior_mean=max(0.05, 1.0 - cfg.cost.attrition_rate),
        prior_strength=3.0,
    )
    retest_attrition = 1.0 - retested_post

    completed_minutes = df.loc[df["completed"] == 1, "interview_minutes"]
    avg_minutes_sample = float(completed_minutes.mean()) if not completed_minutes.empty else cfg.interview_minutes
    avg_minutes = _shrink_mean(avg_minutes_sample, int(completed_minutes.shape[0]), cfg.interview_minutes, 5.0)
    avg_cost = float(df["cost_actual"].mean())

    token_in_rate = float(df["tokens_input"].sum() / max(df["interview_minutes"].sum(), 1.0))
    token_out_rate = float(df["tokens_output"].sum() / max(df["interview_minutes"].sum(), 1.0))
    token_in_rate = _shrink_mean(token_in_rate, n_total, 500.0, 5.0)
    token_out_rate = _shrink_mean(token_out_rate, n_total, 300.0, 5.0)

    cfg.cost.response_rate = completed_post
    cfg.cost.attrition_rate = max(0.0, min(0.9, retest_attrition))
    cfg.interview_minutes = avg_minutes
    cfg.cost.price_per_1k_input_tokens *= max(0.5, min(1.5, token_in_rate / 500.0))
    cfg.cost.price_per_1k_output_tokens *= max(0.5, min(1.5, token_out_rate / 300.0))

    response_mode_updates: dict[str, float] = {}
    if OPTIONAL_RESPONSE_MODE_COLUMNS.issubset(df.columns):
        for share_col in [
            "categorical_question_share",
            "numeric_question_share",
            "open_ended_question_share",
        ]:
            prior = float(getattr(cfg.quality, share_col))
            sample = float(df[share_col].mean())
            updated = max(0.0, min(1.0, _shrink_mean(sample, n_total, prior, 8.0)))
            setattr(cfg.quality, share_col, updated)
            response_mode_updates[f"{share_col}_sample_mean"] = sample
            response_mode_updates[f"{share_col}_posterior_mean"] = updated
        for obs_col, target_attr in [
            ("categorical_mode_reliability_observed", "categorical_mode_reliability"),
            ("numeric_mode_reliability_observed", "numeric_mode_reliability"),
            ("open_ended_mode_reliability_observed", "open_ended_mode_reliability"),
        ]:
            prior = float(getattr(cfg.quality, target_attr))
            sample = float(df[obs_col].mean())
            updated = max(0.7, min(1.2, _shrink_mean(sample, n_total, prior, 10.0)))
            setattr(cfg.quality, target_attr, updated)
            response_mode_updates[f"{obs_col}_sample_mean"] = sample
            response_mode_updates[f"{target_attr}_posterior_mean"] = updated
        cfg.quality.response_mode_assumption_source = "pilot_calibrated"

    precision = {
        "response_rate_sample_mean": completed_rate_sample,
        "response_rate_posterior_mean": completed_post,
        "response_rate_ci_low": completed_low,
        "response_rate_ci_high": completed_high,
        "retested_rate_posterior_mean": retested_post,
        "retested_rate_ci_low": retested_low,
        "retested_rate_ci_high": retested_high,
        "attrition_rate_posterior_mean": cfg.cost.attrition_rate,
        "mean_cost": avg_cost,
        "interview_minutes_sample_mean": avg_minutes_sample,
        "interview_minutes_shrunk_mean": avg_minutes,
        "retest_consistency_mean": float(df["retest_consistency"].mean()),
    }
    precision.update(response_mode_updates)
    return cfg, precision


def write_calibrated_config(cfg: ScenarioConfig, out_path: str) -> None:
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    dump_config(cfg, out_path)
