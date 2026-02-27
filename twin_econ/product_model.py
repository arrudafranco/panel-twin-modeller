from __future__ import annotations

from .params import ScenarioConfig
from .quality_model import quality_score


def module_economics(cfg: ScenarioConfig, modules: int) -> dict[str, float]:
    capped = min(modules, cfg.product.max_modules_per_participant)
    marginal_minutes = capped * cfg.product.module_minutes
    fatigue_contacts = 1 + capped
    q_base = quality_score(cfg, cfg.quality_profile, contacts=1)
    q_with_modules = quality_score(
        cfg,
        cfg.quality_profile,
        interview_minutes=cfg.interview_minutes + marginal_minutes,
        contacts=fatigue_contacts,
        domain_complexity_scalar=cfg.product.module_domain_complexity_scalar,
    )
    return {
        "max_modules_per_participant": float(cfg.product.max_modules_per_participant),
        "marginal_minutes_total": marginal_minutes,
        "marginal_quality_gain_per_module": (q_with_modules - q_base) / max(capped, 1),
    }
