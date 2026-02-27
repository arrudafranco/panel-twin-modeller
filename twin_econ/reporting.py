from __future__ import annotations

from pathlib import Path

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
