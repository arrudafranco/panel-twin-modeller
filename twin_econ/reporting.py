from __future__ import annotations

from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from .params import ScenarioConfig
from .quality_model import memory_architecture_summary


def write_exec_brief(path: str, sections: dict[str, str]) -> None:
    lines = ["# Executive Brief", ""]
    for k, v in sections.items():
        lines.append(f"## {k}")
        lines.append(v)
        lines.append("")
    Path(path).write_text("\n".join(lines), encoding="utf-8")


def write_limitations_brief(
    path: str,
    cfg: ScenarioConfig,
    guardrails: list[str],
    uncertainty: dict[str, float] | None = None,
) -> None:
    lines = [
        "# Methodological Limitations and Guardrails",
        "",
        "## Scope",
        "- This model is decision support for pilot/scaling planning, not a final causal or regulatory proof.",
        "- Several economic and response-process parameters are scenario assumptions unless empirically calibrated.",
        "",
        "## Active Guardrails",
    ]
    if guardrails:
        lines.extend([f"- {g}" for g in guardrails])
    else:
        lines.append("- No guardrail thresholds were triggered in this run.")

    lines.extend(
        [
            "",
            "## Calibration Status",
            f"- Scenario: {cfg.scenario_name}",
            "- Use `twin-econ calibrate` with pilot logs to tighten uncertainty on response/attrition/tokens/costs.",
        ]
    )
    if uncertainty:
        lines.extend(
            [
                "",
                "## Uncertainty Snapshot",
                f"- P(NPV > 0): {uncertainty.get('p_npv_positive', float('nan')):.3f}",
                f"- P(Break-even within horizon): {uncertainty.get('p_break_even_within_horizon', float('nan')):.3f}",
                f"- P(Break-even <= 24 months): {uncertainty.get('p_break_even_le_24m', float('nan')):.3f}",
            ]
        )

    lines.extend(
        [
            "",
            "## External Reference Notes",
            "- Discount-rate policy context often uses 3% and 7% sensitivity anchors in federal analysis guidance.",
            "- Telephone survey response-rate trends can be low in modern practice; weighting and design remain critical.",
            "- English tokenization rule-of-thumb often approximates ~1 token per ~4 characters.",
            "",
            "## Operational Recommendation",
            "- Treat favorable outputs as a prioritization signal; confirm with calibration and sensitivity checks before external commitments.",
        ]
    )
    Path(path).write_text("\n".join(lines), encoding="utf-8")


def write_method_assumptions_brief(
    path: str,
    cfg: ScenarioConfig,
    guardrails: list[str],
) -> None:
    summary = memory_architecture_summary(cfg, cfg.quality_profile)
    lines = [
        "# Method Assumptions Summary",
        "",
        "## Scope",
        "- Plain-English snapshot of the active method assumptions for this scenario.",
        "- Intended for stakeholder review, reproducibility, and machine-readable context in human language.",
        "",
        "## Active Quality Profile",
        f"- Construct focus: {cfg.quality_profile}",
        f"- Functional form: {cfg.quality.functional_form}",
        f"- Prediction memory strategy: {cfg.memory_strategy_prediction}",
        "",
        "## Memory Architecture",
    ]
    lines.extend([f"- {k}: {v}" for k, v in summary.items()])
    lines.extend(
        [
            "",
            "## Response Mode Reliability",
            f"- Construct defaults enabled: {cfg.quality.use_construct_response_mode_defaults}",
            f"- Categorical reliability multiplier: {cfg.quality.categorical_mode_reliability:.3f}",
            f"- Numeric reliability multiplier: {cfg.quality.numeric_mode_reliability:.3f}",
            f"- Open-ended reliability multiplier: {cfg.quality.open_ended_mode_reliability:.3f}",
            "",
            "## Interpretation Notes",
            "- Reflection and importance are prompt-mediated heuristics, not directly observed quantities.",
            "- Response-mode multipliers are transparent modeling assumptions unless learned from pilot calibration data.",
            "- Favorable results should still be checked against uncertainty, guardrails, and benchmark policy.",
            "",
            "## Guardrails",
        ]
    )
    if guardrails:
        lines.extend([f"- {g}" for g in guardrails])
    else:
        lines.append("- No guardrail thresholds were triggered in this run.")
    Path(path).write_text("\n".join(lines), encoding="utf-8")


def save_csv(path: str, df: pd.DataFrame) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


def tornado_plot(df: pd.DataFrame, out_path: str) -> None:
    cor = df.corr(numeric_only=True)["npv"].drop(labels=["npv"]).abs().sort_values(ascending=False).head(10)
    plt.figure(figsize=(8, 5))
    cor.sort_values().plot(kind="barh")
    plt.title("Top NPV Drivers (Abs Correlation)")
    plt.tight_layout()
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out_path)
    plt.close()


def heatmap_2way(df: pd.DataFrame, x: str, y: str, z: str, out_path: str) -> None:
    pivot = df.pivot_table(index=y, columns=x, values=z, aggfunc="mean")
    plt.figure(figsize=(7, 5))
    plt.imshow(pivot.values, aspect="auto", origin="lower")
    plt.colorbar(label=z)
    plt.xticks(range(len(pivot.columns)), [f"{v:.0f}" for v in pivot.columns], rotation=45)
    plt.yticks(range(len(pivot.index)), [f"{v:.2f}" for v in pivot.index])
    plt.xlabel(x)
    plt.ylabel(y)
    plt.title(f"{z} Heatmap")
    plt.tight_layout()
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out_path)
    plt.close()


def top_driver_analysis(
    df: pd.DataFrame,
    target: str,
    candidates: list[str],
    top_n: int = 5,
) -> pd.DataFrame:
    cols = [c for c in candidates if c in df.columns]
    work = df[cols + [target]].dropna()
    if work.empty:
        return pd.DataFrame(columns=["feature", "abs_corr", "std_beta"])

    corr = work.corr(numeric_only=True)[target].drop(labels=[target]).abs().sort_values(ascending=False)

    # Standardized OLS coefficients: beta = (X'X)^-1 X'y on z-scored columns.
    x = work[cols].astype(float)
    y = work[target].astype(float)
    xz = (x - x.mean()) / x.std(ddof=0).replace(0, np.nan)
    yz = (y - y.mean()) / (y.std(ddof=0) if y.std(ddof=0) > 0 else 1.0)
    xz = xz.fillna(0.0)
    yz = yz.fillna(0.0)
    x_mat = np.column_stack([np.ones(len(xz)), xz.values])
    beta, *_ = np.linalg.lstsq(x_mat, yz.values, rcond=None)
    beta_map = {cols[i]: float(beta[i + 1]) for i in range(len(cols))}

    rows = []
    for feature, abs_corr in corr.items():
        rows.append(
            {
                "feature": feature,
                "abs_corr": float(abs_corr),
                "std_beta": float(beta_map.get(feature, 0.0)),
            }
        )
    out = pd.DataFrame(rows).sort_values("abs_corr", ascending=False).head(top_n).reset_index(drop=True)
    return out
