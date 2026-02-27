from __future__ import annotations

from twin_econ.benchmark_model import load_benchmarks


REQUIRED_TOP = {
    "instrument_name",
    "agency",
    "federal_national_representative",
    "near_2week",
    "retest_interval_days",
    "metric_type",
    "construct_type",
    "metrics",
    "citations",
}


def test_benchmarks_have_required_fields_and_types():
    benches = load_benchmarks()
    assert benches, "benchmark library is empty"
    for b in benches:
        assert REQUIRED_TOP.issubset(set(b.keys()))
        assert isinstance(b["federal_national_representative"], bool)
        assert isinstance(b["near_2week"], bool)
        assert isinstance(b["metrics"], dict)
        assert isinstance(b["citations"], list)
        assert b["citations"], f"missing citation for {b['instrument_name']}"


def test_metric_ranges_are_valid_probabilities():
    benches = load_benchmarks()
    for b in benches:
        metrics = b["metrics"]
        for k, v in metrics.items():
            if not isinstance(v, list) or len(v) != 2:
                continue
            low, high = float(v[0]), float(v[1])
            assert 0.0 <= low <= 1.0, (b["instrument_name"], k, v)
            assert 0.0 <= high <= 1.0, (b["instrument_name"], k, v)
            assert low <= high, (b["instrument_name"], k, v)
