from __future__ import annotations

from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd


def write_exec_brief(path: str, sections: dict[str, str]) -> None:
    lines = ["# Executive Brief", ""]
    for k, v in sections.items():
        lines.append(f"## {k}")
        lines.append(v)
        lines.append("")
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
