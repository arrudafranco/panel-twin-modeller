from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .params import ScenarioConfig


def _bench_path() -> Path:
    return Path(__file__).resolve().parent.parent / "benchmarks" / "benchmarks.yaml"


def load_benchmarks() -> list[dict[str, Any]]:
    data = yaml.safe_load(_bench_path().read_text(encoding="utf-8-sig")) or {}
    return data.get("benchmarks", [])


def _risk_quantile(client_risk_profile: str) -> float:
    if client_risk_profile == "federal_high_risk":
        return 0.75
    return 0.45


def _construct_match(benchmark_construct: str, target_construct: str) -> bool:
    if benchmark_construct == target_construct:
        return True
    aliases = {
        "self_report_behavior": {"self_report_health_status"},
        "self_report_health_status": {"self_report_behavior"},
    }
    return benchmark_construct in aliases.get(target_construct, set())


def _metric_mid(metrics: dict[str, Any], key: str) -> float | None:
    value = metrics.get(key)
    if not isinstance(value, list) or len(value) != 2:
        return None
    low = float(value[0])
    high = float(value[1])
    return (low + high) / 2.0


def _bounded01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _metric_to_latent_reliability(metrics: dict[str, Any]) -> float | None:
    vals: list[float] = []
    kappa = _metric_mid(metrics, "kappa_range")
    if kappa is not None:
        vals.append(_bounded01(kappa))
    icc = _metric_mid(metrics, "icc_range")
    if icc is not None:
        vals.append(_bounded01(icc))
    spearman = _metric_mid(metrics, "spearman_range")
    if spearman is not None:
        vals.append(_bounded01(spearman))
    agreement = _metric_mid(metrics, "agreement_range")
    if agreement is not None:
        # Agreement usually has an inflated floor versus chance; map to a reliability-like scale.
        vals.append(_bounded01((agreement - 0.5) / 0.5))
    if not vals:
        return None
    return sum(vals) / len(vals)


def _apply_mapping(cfg: ScenarioConfig, latent_reliability: float) -> float:
    mapped = cfg.quality.benchmark_mapping_intercept + cfg.quality.benchmark_mapping_slope * latent_reliability
    if cfg.quality.benchmark_mapping_sensitivity == "conservative":
        mapped += cfg.quality.benchmark_mapping_uncertainty
    elif cfg.quality.benchmark_mapping_sensitivity == "optimistic":
        mapped -= cfg.quality.benchmark_mapping_uncertainty
    return _bounded01(mapped)


def _is_strict_comparator(cfg: ScenarioConfig, benchmark: dict[str, Any]) -> bool:
    mode = cfg.quality.benchmark_filter_mode
    if mode == "all":
        return True
    if mode == "strict_near_2week_federal":
        return bool(benchmark.get("near_2week")) and bool(benchmark.get("federal_national_representative"))
    return bool(benchmark.get("near_2week"))


def recommended_quality_threshold(cfg: ScenarioConfig, construct_type: str) -> float:
    if not cfg.quality.use_benchmark_thresholds:
        return cfg.quality.quality_threshold

    q = _risk_quantile(cfg.competition.client_risk_profile)
    model_values: list[float] = []
    for b in load_benchmarks():
        if not _is_strict_comparator(cfg, b):
            continue
        if not _construct_match(str(b.get("construct_type", "")), construct_type):
            continue
        metrics = b.get("metrics", {})
        if not isinstance(metrics, dict):
            continue
        latent = _metric_to_latent_reliability(metrics)
        if latent is None:
            continue
        normalized = _apply_mapping(cfg, latent)
        model_values.append(normalized)

    if not model_values:
        return cfg.quality.quality_threshold

    model_values.sort()
    idx = int(round((len(model_values) - 1) * q))
    threshold = model_values[idx]
    if cfg.competition.client_risk_profile == "federal_high_risk":
        threshold += cfg.quality.benchmark_federal_uplift
    threshold = max(cfg.quality.benchmark_min_threshold, min(cfg.quality.benchmark_max_threshold, threshold))
    return threshold


def quality_market_adjustment(quality_value: float, threshold: float) -> dict[str, float | bool]:
    pressure = min(1.0, quality_value / max(threshold, 1e-6))
    effective_quality = quality_value * (0.6 + 0.4 * pressure)
    return {
        "quality_threshold_used": threshold,
        "quality_pass": quality_value >= threshold,
        "quality_pressure": pressure,
        "effective_quality_for_market": max(0.0, min(1.0, effective_quality)),
    }
