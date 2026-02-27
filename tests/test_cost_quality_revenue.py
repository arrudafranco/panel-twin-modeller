from twin_econ.cost_model import compute_costs
from twin_econ.params import ScenarioConfig
from twin_econ.quality_model import quality_score
from twin_econ.revenue_model import compute_finance


def test_cost_outputs_positive():
    cfg = ScenarioConfig()
    out = compute_costs(cfg)
    assert out["total_cost"] > 0
    assert out["cost_per_completed_interview"] > 0
    assert out["cost_per_retained_agent"] >= out["cost_per_completed_interview"]


def test_contact_attempts_can_improve_effective_response():
    cfg = ScenarioConfig()
    base = compute_costs(cfg)

    cfg.cost.contact_attempts = 3.0
    cfg.cost.response_lift_per_extra_attempt = 0.10
    cfg.cost.response_decay_per_extra_attempt = 0.0
    tuned = compute_costs(cfg)

    assert tuned["effective_response_rate"] > base["effective_response_rate"]
    assert tuned["invites_per_complete"] < base["invites_per_complete"]


def test_rescheduling_cost_is_optional_and_explicit():
    cfg = ScenarioConfig()
    cfg.cost.retest_reschedule_fraction = 0.0
    cfg.cost.rescheduling_cost_per_event = 20.0
    no_reschedule = compute_costs(cfg)
    assert no_reschedule["rescheduling_cost"] == 0.0

    cfg.cost.retest_reschedule_fraction = 0.5
    with_reschedule = compute_costs(cfg)
    assert with_reschedule["rescheduling_cost"] > 0.0
    assert with_reschedule["total_cost"] > no_reschedule["total_cost"]


def test_word_based_token_estimate_is_optional():
    cfg = ScenarioConfig()
    baseline = compute_costs(cfg)
    cfg.cost.use_word_based_token_estimate = True
    cfg.cost.avg_words_per_participant = 6500
    cfg.cost.avg_words_interviewer = 5400
    cfg.cost.words_to_tokens_ratio = 1.3
    alt = compute_costs(cfg)
    assert alt["tokens_input"] != baseline["tokens_input"]
    assert alt["tokens_output"] != baseline["tokens_output"]


def test_quality_bounds_and_ordering():
    cfg = ScenarioConfig()
    q_full = quality_score(cfg, "attitude_belief")
    cfg.memory_strategy_prediction = "partial_20pct"
    q_partial = quality_score(cfg, "attitude_belief")
    assert 0 <= q_partial <= 1
    assert q_full > q_partial


def test_memory_retrieval_knobs_affect_quality():
    cfg = ScenarioConfig()
    baseline = quality_score(cfg, "attitude_belief")

    cfg.quality.memory_retrieval_k = 2
    cfg.quality.memory_recency_weight = 0.2
    cfg.quality.memory_relevance_weight = 2.0
    cfg.quality.memory_importance_weight = 0.2
    cfg.quality.reflection_enabled = False
    reduced = quality_score(cfg, "attitude_belief")

    assert reduced < baseline


def test_reflection_cadence_changes_token_costs():
    cfg = ScenarioConfig()
    base = compute_costs(cfg)

    cfg.quality.reflection_interval_turns = 4
    denser = compute_costs(cfg)

    assert denser["reflection_tokens_per_participant"] > base["reflection_tokens_per_participant"]
    assert denser["tokens_input"] > base["tokens_input"]
def test_finance_npv_numeric():
    cfg = ScenarioConfig()
    cost = compute_costs(cfg)
    q = quality_score(cfg, cfg.quality_profile)
    fin = compute_finance(cfg, cost["cost_per_completed_interview"], q)
    assert isinstance(fin["npv"], float)
    assert 0 <= fin["win_probability"] <= 1


def test_finance_break_even_detected_within_horizon():
    cfg = ScenarioConfig()
    cfg.revenue.cac = 1000
    cfg.revenue.other_initial_investment = 500
    cfg.revenue.projects_per_year = 30
    cfg.revenue.horizon_months = 24

    fin = compute_finance(cfg, cogs_per_project=1000.0, quality=0.95)

    assert fin["break_even_within_horizon"] is True
    assert fin["time_to_break_even_months"] is not None
    assert float(fin["time_to_break_even_months"]) <= cfg.revenue.horizon_months
    assert float(fin["total_upfront_investment"]) == 1500.0


def test_finance_break_even_not_reached_within_horizon():
    cfg = ScenarioConfig()
    cfg.revenue.projects_per_year = 0
    cfg.revenue.cac = 20000
    cfg.revenue.other_initial_investment = 40000
    cfg.revenue.horizon_months = 12

    fin = compute_finance(cfg, cogs_per_project=5000.0, quality=0.8)

    assert fin["break_even_within_horizon"] is False
    assert fin["time_to_break_even_months"] is None
    assert float(fin["break_even_month"]) == float(cfg.revenue.horizon_months)
    assert float(fin["total_upfront_investment"]) == 60000.0

