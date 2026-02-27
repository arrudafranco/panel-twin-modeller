from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

import pandas as pd
import streamlit as st
import streamlit.components.v1 as components
import yaml

from twin_econ.benchmark_model import (
    load_benchmarks,
    quality_market_adjustment,
    recommended_quality_threshold,
)
from twin_econ.cost_model import compute_costs
from twin_econ.deliverables_model import generate_client_deliverables
from twin_econ.mc_model import run_monte_carlo
from twin_econ.params import ScenarioConfig, load_config
from twin_econ.product_model import module_economics
from twin_econ.quality_model import quality_score, quality_tiers
from twin_econ.revenue_model import compute_finance
from twin_econ.sampling_model import run_sampling

ROOT = Path(__file__).resolve().parents[1]
CONFIG_DIR = ROOT / "configs"
OUTPUT_DIR = ROOT / "outputs" / "webapp"


def _inject_css() -> None:
    st.markdown(
        """
        <style>
        .stApp {background: linear-gradient(180deg, #f5f8fb 0%, #ffffff 100%);} 
        h1, h2, h3 {color: #003b70; letter-spacing: 0.2px;}
        .kpi {border: 1px solid #d8e3ef; border-radius: 12px; padding: 14px; background: #ffffff;}
        .small-note {color: #1f2f3f; font-size: 0.92rem;}
        .section-card {border-left: 4px solid #0a79b7; padding-left: 12px;}
        #MainMenu {visibility: hidden;}
        footer {visibility: hidden;}
        header {visibility: hidden;}
        [data-testid="stBaseButton-elementToolbar"] {display: none !important;}
        .stElementToolbar {display: none !important;}
        </style>
        """,
        unsafe_allow_html=True,
    )


def _inject_runtime_a11y_patch() -> None:
    components.html(
        """
        <script>
        (() => {
          const main = document.querySelector("section.main");
          if (main) {
            main.setAttribute("role", "main");
            if (!main.getAttribute("aria-label")) main.setAttribute("aria-label", "Feasibility content");
          }
          const tablist = document.querySelector('[data-baseweb="tab-list"]');
          if (tablist) tablist.setAttribute("aria-label", "Primary sections");
        })();
        </script>
        """,
        height=0,
    )


@st.cache_data

def _list_presets() -> list[str]:
    return sorted([p.name for p in CONFIG_DIR.glob("*.yaml")])


@st.cache_data

def _load_benchmark_df() -> pd.DataFrame:
    return pd.DataFrame(load_benchmarks())


def _interpretation(pass_flag: bool, npv: float, threshold: float, quality: float) -> str:
    if pass_flag and npv > 0:
        return (
            "Signal is favorable under current assumptions. Quality clears the threshold and expected value is positive. "
            "Primary decision question shifts to implementation risk and pilot measurement precision."
        )
    if (not pass_flag) and npv > 0:
        return (
            "Economics are promising but quality falls short of current benchmark policy. "
            "You should prioritize methodological upgrades before market launch."
        )
    if pass_flag and npv <= 0:
        return (
            "Methodology appears acceptable but economics are weak. "
            "Focus on pricing, project volume, and cannibalization assumptions."
        )
    return (
        "Both quality and economics are below target in this configuration. "
        "Pilot design changes are required before scale-up feasibility is credible."
    )


def _project_brief_records() -> list[dict[str, str]]:
    return [
        {
            "title": "Context",
            "content": (
                "This project evaluates whether digital panel twins are feasible and credible enough "
                "to support real research use-cases, starting with a pilot-first strategy."
            ),
            "source": "project_brief",
        },
        {
            "title": "Objective",
            "content": (
                "Use a small pilot to estimate unknowns (cost, attrition, token usage, reliability), then "
                "project scale-up economics and quality under transparent assumptions."
            ),
            "source": "project_brief",
        },
        {
            "title": "Decision Questions",
            "content": (
                "Does quality clear benchmark policy? Is expected value positive? Which assumptions drive "
                "results, and what pilot evidence is needed to reduce uncertainty?"
            ),
            "source": "project_brief",
        },
        {
            "title": "Intended Use",
            "content": (
                "Decision-support for pilot design and feasibility planning. Not a substitute for finalized "
                "causal validation or regulatory-grade evidence."
            ),
            "source": "project_brief",
        },
    ]


def _search_records(query: str, bench_df: pd.DataFrame) -> list[dict[str, str]]:
    records = _project_brief_records()
    for _, row in bench_df.iterrows():
        citations = " ".join(row.get("citations", []))
        records.append(
            {
                "title": f"Benchmark: {row['instrument_name']}",
                "content": (
                    f"Agency={row['agency']}; construct={row['construct_type']}; "
                    f"retest={row['retest_interval_days']}; metric={row['metric_type']}; "
                    f"comparability={row.get('comparability_note', '')}; citations={citations}"
                ),
                "source": "benchmark_library",
            }
        )
    q = query.strip().lower()
    if not q:
        return records
    return [r for r in records if q in (r["title"] + " " + r["content"]).lower()]


def _kv_table(payload: dict[str, object]) -> pd.DataFrame:
    return pd.DataFrame({"metric": list(payload.keys()), "value": list(payload.values())})


def _sensitivity_table(cfg: ScenarioConfig, q_sellable: float, cost_per_complete: float) -> pd.DataFrame:
    rows: list[dict[str, float | str | bool]] = []
    original_mode = cfg.quality.benchmark_mapping_sensitivity
    original_intercept = cfg.quality.benchmark_mapping_intercept
    original_slope = cfg.quality.benchmark_mapping_slope
    u = float(cfg.quality.benchmark_mapping_uncertainty)

    def _eval_row(label: str) -> tuple[float, bool, float, float, float]:
        threshold = recommended_quality_threshold(cfg, cfg.quality_profile)
        q_eval = quality_market_adjustment(q_sellable, threshold)
        fin = compute_finance(cfg, cost_per_complete, float(q_eval["effective_quality_for_market"]))
        return (
            float(q_eval["quality_threshold_used"]),
            bool(q_eval["quality_pass"]),
            float(q_eval["effective_quality_for_market"]),
            float(fin["npv"]),
            float(fin["win_probability"]),
        )

    for mode in ["conservative", "base", "optimistic"]:
        cfg.quality.benchmark_mapping_sensitivity = mode
        cfg.quality.benchmark_mapping_intercept = original_intercept
        cfg.quality.benchmark_mapping_slope = original_slope
        th, qp, eq, npv, wp = _eval_row(mode)

        cfg.quality.benchmark_mapping_intercept = max(0.0, original_intercept - u)
        cfg.quality.benchmark_mapping_slope = max(0.0, original_slope - u)
        th_low, _, _, npv_low, _ = _eval_row(f"{mode}_low")

        cfg.quality.benchmark_mapping_intercept = min(1.0, original_intercept + u)
        cfg.quality.benchmark_mapping_slope = min(2.0, original_slope + u)
        th_high, _, _, npv_high, _ = _eval_row(f"{mode}_high")

        rows.append(
            {
                "assumption_mode": mode,
                "quality_threshold": round(th, 4),
                "threshold_low_band": round(th_low, 4),
                "threshold_high_band": round(th_high, 4),
                "quality_pass": qp,
                "effective_quality_for_market": round(eq, 4),
                "npv": round(npv, 2),
                "npv_low_band": round(npv_low, 2),
                "npv_high_band": round(npv_high, 2),
                "win_probability": round(wp, 4),
            }
        )
    cfg.quality.benchmark_mapping_sensitivity = original_mode
    cfg.quality.benchmark_mapping_intercept = original_intercept
    cfg.quality.benchmark_mapping_slope = original_slope
    return pd.DataFrame(rows)


def _run_scenario(cfg: ScenarioConfig, modules_count: int, mc_n: int, mc_seed: int) -> dict[str, object]:
    cost = compute_costs(cfg)
    qtiers = quality_tiers(cfg)
    sampling = run_sampling(cfg)
    q = quality_score(cfg, cfg.quality_profile)
    rep_penalty = float(sampling["representativeness_penalty"])
    q_sellable = max(0.0, q - rep_penalty)

    threshold = recommended_quality_threshold(cfg, cfg.quality_profile)
    q_eval = quality_market_adjustment(q_sellable, threshold)
    fin = compute_finance(cfg, cost["cost_per_completed_interview"], float(q_eval["effective_quality_for_market"]))

    mod = module_economics(cfg, modules_count)
    mc = run_monte_carlo(cfg, n=mc_n, seed=mc_seed)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    deliverables = generate_client_deliverables(
        cfg,
        str(OUTPUT_DIR / f"deliverables_{cfg.scenario_name}"),
        compliance={
            "client_risk_profile": cfg.competition.client_risk_profile,
            "quality_profile": cfg.quality_profile,
            "quality_threshold_used": round(float(q_eval["quality_threshold_used"]), 4),
            "sellable_quality": round(q_sellable, 4),
            "quality_pass": bool(q_eval["quality_pass"]),
        },
    )

    return {
        "cost": cost,
        "quality_tiers": qtiers,
        "sampling": sampling,
        "sellable_quality": q_sellable,
        "quality_eval": q_eval,
        "finance": fin,
        "module": mod,
        "mc": mc,
        "deliverables": deliverables,
        "interpretation": _interpretation(bool(q_eval["quality_pass"]), float(fin["npv"]), threshold, q_sellable),
    }


def _decision_brief(cfg: ScenarioConfig, out: dict[str, object]) -> str:
    return "\n".join(
        [
            "# Panel Twin Feasibility Brief",
            "",
            f"- Scenario: {cfg.scenario_name}",
            f"- Audience risk profile: {cfg.competition.client_risk_profile}",
            f"- Sellable quality ({cfg.quality_profile}): {out['sellable_quality']:.3f}",
            f"- Benchmark threshold used: {float(out['quality_eval']['quality_threshold_used']):.3f}",
            f"- Quality pass: {bool(out['quality_eval']['quality_pass'])}",
            f"- Cost per completed interview: ${out['cost']['cost_per_completed_interview']:.2f}",
            f"- NPV: ${out['finance']['npv']:.2f}",
            "",
            "## Interpretation",
            str(out["interpretation"]),
            "",
            "## Method Notes",
            "- Strict comparator policy uses near-2-week federal benchmarks only.",
            "- Threshold mapping is configurable and sensitivity-tested.",
            "- All uncertainty results depend on pilot log quality and sample size.",
        ]
    )


def _render_controls() -> tuple[ScenarioConfig, int, int]:
    with st.expander("Scenario Controls", expanded=True):
        preset = st.selectbox("Config preset", _list_presets(), index=0)
        cfg = load_config(CONFIG_DIR / preset)

        c1, c2 = st.columns(2)
        with c1:
            st.markdown("## Core Specs")
            cfg.scenario_name = st.text_input("Scenario name", value=cfg.scenario_name)
            cfg.interview_minutes = float(st.slider("Interview minutes", 30, 180, int(cfg.interview_minutes), 5))
            cfg.sampling.pilot_n = int(st.slider("Pilot N", 50, 400, int(cfg.sampling.pilot_n), 10))
            cfg.cost.response_rate = float(st.slider("Response rate", 0.05, 0.9, float(cfg.cost.response_rate), 0.01))
            cfg.cost.attrition_rate = float(st.slider("Retest attrition", 0.0, 0.6, float(cfg.cost.attrition_rate), 0.01))
            cfg.memory_strategy_prediction = st.selectbox(
                "Prediction memory strategy",
                ["full_transcript", "summary_memory", "partial_20pct", "hybrid"],
                index=["full_transcript", "summary_memory", "partial_20pct", "hybrid"].index(cfg.memory_strategy_prediction)
                if cfg.memory_strategy_prediction in ["full_transcript", "summary_memory", "partial_20pct", "hybrid"]
                else 0,
            )
        with c2:
            st.markdown("## Risk and Business")
            cfg.competition.client_risk_profile = st.selectbox(
                "Client risk profile",
                ["commercial_exploratory", "federal_high_risk"],
                index=0 if cfg.competition.client_risk_profile != "federal_high_risk" else 1,
            )
            cfg.revenue.price_per_project = float(
                st.slider("Price per project", 10000, 500000, int(cfg.revenue.price_per_project), 5000)
            )
            cfg.revenue.projects_per_year = int(st.slider("Projects/year", 1, 30, int(cfg.revenue.projects_per_year), 1))
            modules_count = int(st.slider("Topic modules", 0, cfg.product.max_modules_per_participant, 1))
            mc_n = int(st.selectbox("Monte Carlo draws", [500, 1000, 5000, 10000], index=1))

        with st.expander("Advanced Method Controls"):
            cfg.quality.benchmark_filter_mode = st.selectbox(
                "Benchmark filter mode",
                ["strict_near_2week_federal", "near_2week", "all"],
                index=["strict_near_2week_federal", "near_2week", "all"].index(cfg.quality.benchmark_filter_mode)
                if cfg.quality.benchmark_filter_mode in ["strict_near_2week_federal", "near_2week", "all"]
                else 0,
            )
            cfg.quality.benchmark_mapping_sensitivity = st.selectbox(
                "Mapping sensitivity",
                ["base", "conservative", "optimistic"],
                index=["base", "conservative", "optimistic"].index(cfg.quality.benchmark_mapping_sensitivity)
                if cfg.quality.benchmark_mapping_sensitivity in ["base", "conservative", "optimistic"]
                else 0,
            )
            cfg.quality.benchmark_mapping_intercept = float(
                st.slider("Mapping intercept", 0.0, 0.5, float(cfg.quality.benchmark_mapping_intercept), 0.01)
            )
            cfg.quality.benchmark_mapping_slope = float(
                st.slider("Mapping slope", 0.3, 1.2, float(cfg.quality.benchmark_mapping_slope), 0.01)
            )
            cfg.quality.benchmark_mapping_uncertainty = float(
                st.slider("Mapping uncertainty (band width)", 0.0, 0.2, float(cfg.quality.benchmark_mapping_uncertainty), 0.005)
            )

    return cfg, modules_count, mc_n


def main() -> None:
    st.set_page_config(page_title="Panel Twin Feasibility Studio", layout="wide")
    _inject_css()
    _inject_runtime_a11y_patch()

    st.title("Panel Twin Feasibility Studio")
    st.caption("Interactive feasibility model for pilot design, implementation planning, and commercial assessment.")
    st.markdown(
        "<p class='small-note'>Information is layered from headline decisions to methodological detail via expanders and section tabs.</p>",
        unsafe_allow_html=True,
    )
    st.markdown(
        "<div role='navigation' aria-label='Primary sections' class='small-note'>Primary sections are available in the tab bar below.</div>",
        unsafe_allow_html=True,
    )
    st.markdown("<main aria-label='Feasibility content'>", unsafe_allow_html=True)
    with st.expander("Project Brief: Context, Goals, and Decision Criteria", expanded=True):
        for rec in _project_brief_records():
            st.markdown(f"**{rec['title']}**")
            st.write(rec["content"])

    cfg, modules_count, mc_n = _render_controls()
    out = _run_scenario(cfg, modules_count, mc_n=mc_n, mc_seed=cfg.seed)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Sellable quality", f"{out['sellable_quality']:.3f}")
    col2.metric("Quality threshold", f"{float(out['quality_eval']['quality_threshold_used']):.3f}")
    col3.metric("Cost per complete", f"${out['cost']['cost_per_completed_interview']:.2f}")
    col4.metric("NPV", f"${out['finance']['npv']:.0f}")

    st.markdown(f"<div class='section-card'><b>Plain-language readout:</b> {out['interpretation']}</div>", unsafe_allow_html=True)
    with st.expander("How to read this page", expanded=False):
        st.markdown(
            "- Start with `Overview` for current feasibility signal.\n"
            "- Use `Model & Methods` to verify reliability and representativeness assumptions.\n"
            "- Use `Operations & Cost` to inspect token/cost mechanics and implementation implications.\n"
            "- Use `Economics & Risk` for margin, NPV, and uncertainty/sensitivity interpretation."
        )

    tabs = st.tabs(
        ["Overview", "Model & Methods", "Operations & Cost", "Economics & Risk", "Benchmarks & Citations", "Downloads"]
    )

    with tabs[0]:
        st.header("Decision Overview")
        overview_payload = {
            "scenario": cfg.scenario_name,
            "risk_profile": cfg.competition.client_risk_profile,
            "quality_pass": bool(out["quality_eval"]["quality_pass"]),
            "win_probability": round(float(out["finance"]["win_probability"]), 4),
            "npv": round(float(out["finance"]["npv"]), 2),
        }
        st.dataframe(_kv_table(overview_payload), use_container_width=True, hide_index=True)
        with st.expander("What drives this result?", expanded=False):
            st.dataframe(
                _kv_table(
                    {
                        "interview_minutes": cfg.interview_minutes,
                        "response_rate": cfg.cost.response_rate,
                        "attrition_rate": cfg.cost.attrition_rate,
                        "price_per_project": cfg.revenue.price_per_project,
                        "projects_per_year": cfg.revenue.projects_per_year,
                    }
                ),
                use_container_width=True,
                hide_index=True,
            )
        with st.expander("Plain-language interpretation", expanded=True):
            st.write(out["interpretation"])

    with tabs[1]:
        st.header("Model and Methods")
        qt = pd.DataFrame([out["quality_tiers"]]).T.rename(columns={0: "quality_score"}).reset_index().rename(columns={"index": "construct"})
        st.dataframe(qt, use_container_width=True, hide_index=True)
        with st.expander("Representativeness and weighting diagnostics", expanded=False):
            st.dataframe(out["sampling"]["weighting_table"], use_container_width=True)
            st.dataframe(
                _kv_table(
                    {
                        "effective_sample_size": out["sampling"]["effective_sample_size"],
                        "representativeness_penalty": out["sampling"]["representativeness_penalty"],
                    }
                ),
                use_container_width=True,
                hide_index=True,
            )
        with st.expander("Assumptions and mapping controls", expanded=False):
            st.dataframe(
                _kv_table(
                    {
                        "benchmark_filter_mode": cfg.quality.benchmark_filter_mode,
                        "mapping_sensitivity": cfg.quality.benchmark_mapping_sensitivity,
                        "mapping_intercept": cfg.quality.benchmark_mapping_intercept,
                        "mapping_slope": cfg.quality.benchmark_mapping_slope,
                        "mapping_uncertainty": cfg.quality.benchmark_mapping_uncertainty,
                        "federal_uplift": cfg.quality.benchmark_federal_uplift,
                    }
                ),
                use_container_width=True,
                hide_index=True,
            )

    with tabs[2]:
        st.header("Operations and Cost")
        st.dataframe(
            _kv_table(
                {
                    "tokens_input_total": round(float(out["cost"]["tokens_input"]), 0),
                    "tokens_output_total": round(float(out["cost"]["tokens_output"]), 0),
                    "memory_strategy": cfg.memory_strategy_prediction,
                    "module_marginal_quality_gain": round(float(out["module"]["marginal_quality_gain_per_module"]), 4),
                }
            ),
            use_container_width=True,
            hide_index=True,
        )
        with st.expander("Cost line items", expanded=False):
            lines = {k: v for k, v in out["cost"].items() if isinstance(v, (int, float))}
            cost_df = pd.DataFrame([lines]).T.rename(columns={0: "value"}).reset_index().rename(columns={"index": "metric"})
            st.dataframe(cost_df, use_container_width=True, hide_index=True)

    with tabs[3]:
        st.header("Economics and Risk")
        st.dataframe(
            _kv_table(
                {
                    "win_probability": round(float(out["finance"]["win_probability"]), 4),
                    "gross_margin": round(float(out["finance"]["gross_margin"]), 4),
                    "contribution_margin_total": round(float(out["finance"]["contribution_margin_total"]), 2),
                    "break_even_month": out["finance"]["break_even_month"],
                }
            ),
            use_container_width=True,
            hide_index=True,
        )
        mc = out["mc"]
        st.caption("NPV distribution summary is provided below for accessible review.")
        with st.expander("Monte Carlo summary", expanded=False):
            mc_desc = mc.describe().reset_index().rename(columns={"index": "statistic"})
            st.dataframe(mc_desc, use_container_width=True, hide_index=True)
        with st.expander("Assumption sensitivity (threshold and NPV bands)", expanded=False):
            sens = _sensitivity_table(cfg, out["sellable_quality"], out["cost"]["cost_per_completed_interview"])
            st.dataframe(sens, use_container_width=True, hide_index=True)

    with tabs[4]:
        st.header("Benchmarks and Citations")
        bdf = _load_benchmark_df()
        st.dataframe(
            bdf[[
                "instrument_name",
                "agency",
                "construct_type",
                "near_2week",
                "federal_national_representative",
                "retest_interval_days",
                "metric_type",
            ]],
            use_container_width=True,
            hide_index=True,
        )
        with st.expander("Citations", expanded=False):
            for _, row in bdf.iterrows():
                st.markdown(f"**{row['instrument_name']}**")
                for c in row.get("citations", []):
                    st.markdown(f"- {c}")
        st.markdown("---")
        st.header("Search Docs and Citations")
        q = st.text_input("Search", placeholder="Try: attrition, kappa, federal, 2-week, NPV")
        results = _search_records(q, bdf)
        st.caption(f"Results: {len(results)}")
        for r in results[:50]:
            with st.expander(f"{r['title']} ({r['source']})", expanded=False):
                st.write(r["content"])

    with tabs[5]:
        st.header("Download and Reuse")
        brief = _decision_brief(cfg, out)
        st.download_button("Download decision brief (md)", brief, file_name=f"{cfg.scenario_name}_brief.md", mime="text/markdown")
        st.download_button(
            "Download scenario config (yaml)",
            yaml.safe_dump(asdict(cfg), sort_keys=False),
            file_name=f"{cfg.scenario_name}.yaml",
            mime="application/x-yaml",
        )
        st.write("Generated deliverables paths:", out["deliverables"])

    st.info("Single-view progressive disclosure active: start with Overview, then open expanders for deeper technical detail.")
    st.markdown("</main>", unsafe_allow_html=True)


if __name__ == "__main__":
    main()
