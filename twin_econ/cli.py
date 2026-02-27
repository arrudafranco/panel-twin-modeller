from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

from .benchmark_model import quality_market_adjustment, recommended_quality_threshold
from .cost_model import compute_costs
from .deliverables_model import generate_client_deliverables
from .mc_model import run_monte_carlo
from .params import ScenarioConfig, dump_config, load_config
from .pilot_calibration import calibrate_from_csv, write_calibrated_config
from .quality_model import quality_score, quality_tiers
from .reporting import heatmap_2way, save_csv, top_driver_analysis, tornado_plot, write_exec_brief
from .revenue_model import compute_finance
from .sampling_model import run_sampling


def _ensure_out(path: str) -> Path:
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def cmd_run(args: argparse.Namespace) -> int:
    cfg = load_config(args.config)
    out = _ensure_out(args.out)

    cost = compute_costs(cfg)
    qtiers = quality_tiers(cfg)
    sampling = run_sampling(cfg)
    q = quality_score(cfg, cfg.quality_profile)
    represent_penalty = float(sampling["representativeness_penalty"])
    q_sellable = max(0.0, q - represent_penalty)
    threshold = recommended_quality_threshold(cfg, cfg.quality_profile)
    quality_eval = quality_market_adjustment(q_sellable, threshold)
    finance = compute_finance(cfg, cost["cost_per_completed_interview"], float(quality_eval["effective_quality_for_market"]))
    compliance = {
        "client_risk_profile": cfg.competition.client_risk_profile,
        "quality_profile": cfg.quality_profile,
        "quality_threshold_used": round(float(quality_eval["quality_threshold_used"]), 4),
        "sellable_quality": round(q_sellable, 4),
        "quality_pass": bool(quality_eval["quality_pass"]),
    }
    deliverables = generate_client_deliverables(cfg, str(out / "deliverables"), compliance=compliance)

    summary = {
        "scenario": cfg.scenario_name,
        "mode": cfg.mode,
        "client_risk_profile": cfg.competition.client_risk_profile,
        "quality_profile": cfg.quality_profile,
        "sellable_quality": round(q_sellable, 4),
        "quality_threshold_used": round(float(quality_eval["quality_threshold_used"]), 4),
        "quality_pass": bool(quality_eval["quality_pass"]),
        "quality_pressure": round(float(quality_eval["quality_pressure"]), 4),
        "effective_quality_for_market": round(float(quality_eval["effective_quality_for_market"]), 4),
        "quality_tiers": qtiers,
        "cost_per_completed_interview": round(cost["cost_per_completed_interview"], 2),
        "cost_per_retained_agent": round(cost["cost_per_retained_agent"], 2),
        "win_probability": round(finance["win_probability"], 4),
        "market_share_panel_twin": round(float(finance["market_share_panel_twin"]), 4),
        "market_share_amerispeak_like": round(float(finance["market_share_amerispeak_like"]), 4),
        "market_share_truenorth_like": round(float(finance["market_share_truenorth_like"]), 4),
        "market_share_external_synthetic": round(float(finance["market_share_external_synthetic"]), 4),
        "npv": round(finance["npv"], 2),
        "time_horizon_months": int(float(finance["time_horizon_months"])),
        "time_to_break_even_months": finance["time_to_break_even_months"],
        "break_even_within_horizon": bool(finance["break_even_within_horizon"]),
        "effective_sample_size": round(float(sampling["effective_sample_size"]), 2),
        "deliverables": deliverables,
    }

    (out / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    pd.DataFrame([cost]).to_csv(out / "cost_breakdown.csv", index=False)
    sampling["weighting_table"].to_csv(out / "sampling_table.csv", index=False)

    write_exec_brief(
        str(out / "exec_brief.md"),
        {
            "Top Drivers": "Interview minutes, response rate, attrition, and pricing are top feasibility levers.",
            "Feasible Region": "Feasible if quality threshold is met and NPV remains positive under sensitivity draws.",
            "Pilot Emphasis": "Pilot mode prioritizes precision on unknowns (cost/tokens/attrition/retest consistency).",
            "Federal Benchmark Compliance": (
                f"Risk profile={cfg.competition.client_risk_profile}; "
                f"threshold={compliance['quality_threshold_used']}; "
                f"sellable_quality={compliance['sellable_quality']}; "
                f"pass={compliance['quality_pass']}."
            ),
        },
    )

    md = [
        "# Baseline Pilot Summary",
        "",
        f"- Scenario: {cfg.scenario_name}",
        f"- Mode: {cfg.mode}",
        f"- Cost per completed interview: ${summary['cost_per_completed_interview']}",
        f"- Cost per retained agent: ${summary['cost_per_retained_agent']}",
        f"- Sellable quality ({cfg.quality_profile}): {summary['sellable_quality']}",
        f"- Threshold used: {summary['quality_threshold_used']}",
        f"- Quality pass: {summary['quality_pass']}",
        f"- Win probability: {summary['win_probability']}",
        f"- Panel-twin market share: {summary['market_share_panel_twin']}",
        f"- NPV: ${summary['npv']}",
        f"- Time horizon (months): {summary['time_horizon_months']}",
        f"- Time to break even (months): {summary['time_to_break_even_months']}",
    ]
    (out / "baseline_summary.md").write_text("\n".join(md), encoding="utf-8")
    print("\n".join(md))
    return 0


def cmd_sweep(args: argparse.Namespace) -> int:
    cfg = load_config(args.config) if args.config else ScenarioConfig()
    out = _ensure_out(args.out)

    params: dict[str, list[float]] = {}
    for item in args.param:
        k, v = item.split("=", 1)
        params[k] = [float(x) for x in v.split(",")]

    rows = []
    for k, values in params.items():
        for val in values:
            local = load_config(args.config) if args.config else ScenarioConfig()
            if hasattr(local, k):
                setattr(local, k, val)
            elif hasattr(local.cost, k):
                setattr(local.cost, k, val)
            elif hasattr(local.revenue, k):
                setattr(local.revenue, k, val)
            else:
                continue
            cost = compute_costs(local)
            q = quality_score(local, local.quality_profile)
            threshold = recommended_quality_threshold(local, local.quality_profile)
            q_eval = quality_market_adjustment(q, threshold)
            fin = compute_finance(local, cost["cost_per_completed_interview"], float(q_eval["effective_quality_for_market"]))
            rows.append(
                {
                    "param": k,
                    "value": val,
                    "cost_per_completed_interview": cost["cost_per_completed_interview"],
                    "quality": q,
                    "quality_threshold_used": threshold,
                    "quality_pass": bool(q_eval["quality_pass"]),
                    "npv": fin["npv"],
                }
            )

    df = pd.DataFrame(rows)
    save_csv(str(out / "sweep_results.csv"), df)
    print(df.head(20).to_string(index=False))
    return 0


def cmd_mc(args: argparse.Namespace) -> int:
    cfg = load_config(args.config)
    out = _ensure_out(args.out)
    df = run_monte_carlo(cfg, args.n, args.seed)
    save_csv(str(out / "mc_results.csv"), df)
    tornado_plot(df, str(out / "tornado.png"))

    bins_m = np.linspace(df["interview_minutes"].min(), df["interview_minutes"].max(), 10)
    bins_a = np.linspace(df["attrition_rate"].min(), df["attrition_rate"].max(), 10)
    df2 = df.copy()
    df2["minutes_bin"] = pd.cut(df2["interview_minutes"], bins=bins_m, labels=[(bins_m[i] + bins_m[i + 1]) / 2 for i in range(len(bins_m) - 1)])
    df2["attrition_bin"] = pd.cut(df2["attrition_rate"], bins=bins_a, labels=[(bins_a[i] + bins_a[i + 1]) / 2 for i in range(len(bins_a) - 1)])
    df2 = df2.dropna()
    df2["minutes_bin"] = df2["minutes_bin"].astype(float)
    df2["attrition_bin"] = df2["attrition_bin"].astype(float)
    heatmap_2way(df2, "minutes_bin", "attrition_bin", "npv", str(out / "heatmap_npv.png"))

    pass_rate = float(df["quality_pass"].mean())
    p_npv_positive = float((df["npv"] > 0).mean())
    p_break_even_h = float(df["break_even_within_horizon"].mean()) if "break_even_within_horizon" in df.columns else float("nan")
    p_break_even_24 = float(
        ((df["time_to_break_even_months"] <= 24).fillna(False)).mean()
    ) if "time_to_break_even_months" in df.columns else float("nan")
    summary = df[["cost_per_completed_interview", "cost_per_usable_synthetic_case", "npv"]].describe(percentiles=[0.1, 0.5, 0.9])
    summary.loc["quality_pass_rate", "cost_per_completed_interview"] = pass_rate
    summary.loc["feasible_rate", "cost_per_completed_interview"] = float(df["feasible"].mean())
    summary.loc["p_npv_positive", "cost_per_completed_interview"] = p_npv_positive
    summary.loc["p_break_even_within_horizon", "cost_per_completed_interview"] = p_break_even_h
    summary.loc["p_break_even_le_24m", "cost_per_completed_interview"] = p_break_even_24
    summary.to_csv(out / "mc_summary.csv")

    candidate_features = [
        "interview_minutes",
        "attrition_rate",
        "response_rate",
        "quality",
        "sellable_quality",
        "representativeness_penalty",
    ]
    npv_drivers = top_driver_analysis(df, "npv", candidate_features, top_n=5)
    cost_drivers = top_driver_analysis(df, "cost_per_retained_agent", candidate_features, top_n=5)
    npv_drivers.to_csv(out / "drivers_npv.csv", index=False)
    cost_drivers.to_csv(out / "drivers_cost_per_agent.csv", index=False)

    feasible = df[df["feasible"] == 1.0]
    feasible_summary = {
        "feasible_rate": float(df["feasible"].mean()),
        "quality_pass_rate": pass_rate,
        "median_npv_feasible": float(feasible["npv"].median()) if not feasible.empty else None,
        "median_cost_per_retained_agent_feasible": (
            float(feasible["cost_per_retained_agent"].median()) if not feasible.empty else None
        ),
    }
    (out / "feasible_region_summary.json").write_text(json.dumps(feasible_summary, indent=2), encoding="utf-8")
    print(summary.to_string())
    return 0


def cmd_compare(args: argparse.Namespace) -> int:
    out = _ensure_out(args.out)
    rows: list[dict[str, object]] = []
    for cfg_path in args.config:
        cfg = load_config(cfg_path)
        cost = compute_costs(cfg)
        sampling = run_sampling(cfg)
        q = quality_score(cfg, cfg.quality_profile)
        represent_penalty = float(sampling["representativeness_penalty"])
        q_sellable = max(0.0, q - represent_penalty)
        threshold = recommended_quality_threshold(cfg, cfg.quality_profile)
        q_eval = quality_market_adjustment(q_sellable, threshold)
        finance = compute_finance(cfg, cost["cost_per_completed_interview"], float(q_eval["effective_quality_for_market"]))
        rows.append(
            {
                "scenario": cfg.scenario_name,
                "config_path": cfg_path,
                "client_risk_profile": cfg.competition.client_risk_profile,
                "cost_per_completed_interview": round(float(cost["cost_per_completed_interview"]), 2),
                "cost_per_retained_agent": round(float(cost["cost_per_retained_agent"]), 2),
                "sellable_quality": round(float(q_sellable), 4),
                "quality_pass": bool(q_eval["quality_pass"]),
                "npv": round(float(finance["npv"]), 2),
                "time_to_break_even_months": finance["time_to_break_even_months"],
                "break_even_within_horizon": bool(finance["break_even_within_horizon"]),
                "win_probability": round(float(finance["win_probability"]), 4),
            }
        )
    df = pd.DataFrame(rows)
    save_csv(str(out / "scenario_compare.csv"), df)
    if len(df) >= 2:
        base = df.iloc[0]
        delta_rows = []
        for i in range(1, len(df)):
            r = df.iloc[i]
            delta_rows.append(
                {
                    "scenario_vs_base": f"{r['scenario']} vs {base['scenario']}",
                    "delta_npv": float(r["npv"]) - float(base["npv"]),
                    "delta_cost_per_completed_interview": float(r["cost_per_completed_interview"]) - float(base["cost_per_completed_interview"]),
                    "delta_sellable_quality": float(r["sellable_quality"]) - float(base["sellable_quality"]),
                    "delta_win_probability": float(r["win_probability"]) - float(base["win_probability"]),
                }
            )
        delta_df = pd.DataFrame(delta_rows)
        save_csv(str(out / "scenario_compare_deltas.csv"), delta_df)
    print(df.to_string(index=False))
    return 0


def cmd_calibrate(args: argparse.Namespace) -> int:
    cfg = load_config(args.config)
    out = _ensure_out(args.out)
    calibrated, precision = calibrate_from_csv(cfg, args.pilot_csv)
    write_calibrated_config(calibrated, str(out / "calibrated_config.yaml"))

    response_ci = float(precision["response_rate_ci_high"]) - float(precision["response_rate_ci_low"])
    retested_ci = float(precision["retested_rate_ci_high"]) - float(precision["retested_rate_ci_low"])
    unknowns = {
        "well_estimated": [
            k
            for k, v in {
                "response_rate": response_ci,
                "retested_rate": retested_ci,
            }.items()
            if v < 0.12
        ],
        "still_uncertain": [
            k
            for k, v in {
                "response_rate": response_ci,
                "retested_rate": retested_ci,
            }.items()
            if v >= 0.12
        ],
        "precision": precision,
    }
    (out / "calibration_report.json").write_text(json.dumps(unknowns, indent=2), encoding="utf-8")
    print(json.dumps(unknowns, indent=2))
    return 0


def cmd_benchmark(args: argparse.Namespace) -> int:
    out = _ensure_out(args.out)
    source = Path(__file__).resolve().parent.parent / "benchmarks" / "benchmarks.yaml"
    data = yaml.safe_load(source.read_text(encoding="utf-8-sig")) or {}

    lines = [
        "# Reliability Benchmarks",
        "",
        "Normalized accuracy compares model prediction against participant retest consistency.",
        "",
        "## Benchmarks",
    ]
    for b in data["benchmarks"]:
        lines.append(
            f"- {b['instrument_name']} ({b['agency']}): {b['metric_type']} "
            f"{b['typical_range_or_distribution']} | retest={b['retest_interval_days']} days-equivalent"
        )
        lines.append(f"  - Construct: {b['construct_type']}")
        lines.append(
            "  - Strict-comparator eligible: "
            f"{bool(b.get('near_2week')) and bool(b.get('federal_national_representative'))}"
        )
        if "metrics" in b:
            lines.append(f"  - Metric ranges: {b['metrics']}")
        if "comparability_note" in b:
            lines.append(f"  - Comparability note: {b['comparability_note']}")
        if b.get("citations"):
            lines.append("  - Sources:")
            for c in b["citations"]:
                lines.append(f"    - {c}")

    lines.extend(
        [
            "",
            "## Comparability Guidance",
            "- Prefer fixed ~2-week designs for strict benchmarking; treat 5-15 day or monthly windows as near/partial comparators.",
            "- Do not compare kappa/ICC directly to normalized-accuracy without explicit mapping assumptions.",
            "",
            "## Threshold Policy",
            "- Thresholds are dynamically derived from strict comparators using the configured mapping model.",
            "- federal_high_risk applies higher quantile pressure and additional federal uplift.",
            "- commercial_exploratory uses a lower quantile and no federal uplift.",
        ]
    )

    text = "\n".join(lines)
    (out / "benchmark_report.md").write_text(text, encoding="utf-8")
    print(text)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="twin-econ", description="Digital panel twin economics simulator")
    sub = parser.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="Run a single scenario")
    p_run.add_argument("--config", required=True)
    p_run.add_argument("--out", default="outputs/run_001")
    p_run.set_defaults(func=cmd_run)

    p_sweep = sub.add_parser("sweep", help="Run parameter sweep")
    p_sweep.add_argument("--config")
    p_sweep.add_argument("--param", action="append", default=[])
    p_sweep.add_argument("--out", default="outputs/sweep_001")
    p_sweep.set_defaults(func=cmd_sweep)

    p_mc = sub.add_parser("mc", help="Run Monte Carlo")
    p_mc.add_argument("--n", type=int, default=20000)
    p_mc.add_argument("--seed", type=int, default=123)
    p_mc.add_argument("--config", required=True)
    p_mc.add_argument("--out", default="outputs/mc_001")
    p_mc.set_defaults(func=cmd_mc)

    p_cal = sub.add_parser("calibrate", help="Calibrate from pilot logs")
    p_cal.add_argument("--pilot_csv", required=True)
    p_cal.add_argument("--config", required=True)
    p_cal.add_argument("--out", default="outputs/calibrated_run")
    p_cal.set_defaults(func=cmd_calibrate)

    p_bench = sub.add_parser("benchmark", help="Show benchmark library")
    p_bench.add_argument("--out", default="outputs/benchmarks")
    p_bench.set_defaults(func=cmd_benchmark)

    p_compare = sub.add_parser("compare", help="Compare multiple scenarios side-by-side")
    p_compare.add_argument("--config", action="append", required=True)
    p_compare.add_argument("--out", default="outputs/compare_001")
    p_compare.set_defaults(func=cmd_compare)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
