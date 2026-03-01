import { Slider } from './ui/Slider.tsx';
import { Tooltip } from './ui/Tooltip.tsx';
import type { ScenarioConfig } from '../model/params.ts';

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

interface Props {
  cfg: ScenarioConfig;
  update: <K extends keyof ScenarioConfig>(key: K, value: ScenarioConfig[K]) => void;
  updateCost: <K extends keyof ScenarioConfig['cost']>(key: K, value: ScenarioConfig['cost'][K]) => void;
  updateQuality: <K extends keyof ScenarioConfig['quality']>(key: K, value: ScenarioConfig['quality'][K]) => void;
  updateRevenue: <K extends keyof ScenarioConfig['revenue']>(key: K, value: ScenarioConfig['revenue'][K]) => void;
  updateCompetition: <K extends keyof ScenarioConfig['competition']>(key: K, value: ScenarioConfig['competition'][K]) => void;
  resetToDefaults: () => void;
}

export function ScenarioControls({
  cfg, update, updateCost, updateQuality, updateRevenue, updateCompetition, resetToDefaults,
}: Props) {
  return (
    <aside className="controls-panel" aria-label="Scenario controls">
      <div className="controls-header">
        <h2 className="controls-title">Scenario</h2>
        <button className="reset-btn" onClick={resetToDefaults} aria-label="Reset to default values">
          Reset
        </button>
      </div>

      <fieldset className="control-group">
        <legend>
          Study type{' '}
          <Tooltip content="The predominant type of items in your study. Mixed general surveys combine attitudes, opinions, and behavioral recall questions — the most common survey design and the one directly anchored to Park et al. (2024) at 0.85 fidelity. Behavioral recall surveys focus primarily on concrete behavioral frequency or recall items (e.g., health behaviors, voting, activity tracking), estimated at 0.80 as a conservative planning discount. Incentivized / economic experiments include trust games, ultimatum games, or revealed-preference tasks — also paper-anchored at 0.66.">
            <span className="info-icon" aria-hidden="true">i</span>
          </Tooltip>
        </legend>
        <select
          value={cfg.quality_profile}
          onChange={(e) => update('quality_profile', e.target.value)}
          aria-label="Study type"
        >
          <option value="mixed_general">Mixed general survey</option>
          <option value="behavioral_recall">Behavioral recall survey</option>
          <option value="incentivized_behavior">Incentivized / economic experiments</option>
        </select>
      </fieldset>

      <fieldset className="control-group">
        <legend>
          Interview design{' '}
          <Tooltip content="These parameters describe each AI voice interview. They set quality expectations and determine the cost per participant — and since per-participant costs are the same unit whether you are running a small pilot or the full library build, these inputs drive both. Incentives, voice costs, and LLM costs are all per-participant; adjust them in Advanced settings.">
            <span className="info-icon" aria-hidden="true">i</span>
          </Tooltip>
        </legend>
        <Slider
          label="Interview duration (minutes)"
          value={cfg.interview_minutes}
          min={30} max={180} step={5}
          onChange={(v) => update('interview_minutes', v)}
          tooltip="Length of the AI-conducted voice interview per participant. The Stanford genagents study used ~120-minute interviews. Quality improves logarithmically with duration and directly drives voice and LLM costs per participant."
        />
        <Slider
          label="Response rate"
          value={cfg.cost.response_rate}
          min={0.05} max={0.9} step={0.01}
          onChange={(v) => updateCost('response_rate', Number(v.toFixed(2)))}
          format={pct}
          tooltip="Fraction of invited panel members who complete the interview. For a 2-hour AI voice study via an established probability panel, 15–30% is a reasonable range. Determines how many panel slots to reserve and affects cost per complete at both pilot and library build scale."
        />
        <Slider
          label="Retest attrition"
          value={cfg.cost.attrition_rate}
          min={0} max={0.6} step={0.01}
          onChange={(v) => updateCost('attrition_rate', Number(v.toFixed(2)))}
          format={pct}
          tooltip="Fraction of completed participants lost before the retest wave. High attrition weakens the quality estimate grounding and reduces the number of retained agents in the library."
        />
      </fieldset>

      <fieldset className="control-group">
        <legend>
          Study scale{' '}
          <Tooltip content="Two distinct spending events. The validation pilot is a small study run first to check quality, operations, and assumptions before committing to the full build — its cost appears in the Cost tab. The library build is the full one-time investment: AI interviews with the target number of participants that creates the synthetic twin library — its cost is the initial investment in the Economics tab. Both events use the same per-participant interview design above. Per-interview costs (incentives, panel access) are in Advanced settings.">
            <span className="info-icon" aria-hidden="true">i</span>
          </Tooltip>
        </legend>
        <Slider
          label="Validation pilot size"
          value={cfg.sampling.pilot_n}
          min={50} max={500} step={10}
          onChange={(v) => {
            update('sampling' as keyof ScenarioConfig, { ...cfg.sampling, pilot_n: v } as never);
          }}
          tooltip="Number of participants in the validation pilot. Shown in the Cost tab. Run this before committing to the full library build to verify response rates, quality, and cost assumptions. Typically 50–200 participants."
        />
        <Slider
          label="Library build size"
          value={cfg.sampling.scaleup_n}
          min={200} max={5000} step={100}
          onChange={(v) => {
            update('sampling' as keyof ScenarioConfig, { ...cfg.sampling, scaleup_n: v } as never);
          }}
          tooltip="Number of participants to interview for the full synthetic twin library. Shown as the initial investment in the Economics tab. Once built, subsequent survey projects run against this library at marginal cost — no new interviews needed. A nationally representative U.S. sample typically requires at least 2,000 participants."
        />
      </fieldset>

      <fieldset className="control-group">
        <legend>
          Per-project economics{' '}
          <Tooltip content="These inputs describe what happens after the library is built. Each subsequent survey project incurs a marginal run cost (LLM inference, QA, PM, data delivery) with no new interviews. Revenue and run cost together determine the gross margin on each project, which the NPV model uses to project break-even and net present value.">
            <span className="info-icon" aria-hidden="true">i</span>
          </Tooltip>
        </legend>
        <Slider
          label="Price per project"
          value={cfg.revenue.price_per_project}
          min={20000} max={300000} step={5000}
          onChange={(v) => updateRevenue('price_per_project', v)}
          format={money}
          tooltip="Revenue per project delivered against the existing library. Covers full-service delivery: agent querying, representativeness weighting, and a weighted dataset with crosstabs. Does not include custom analysis or reporting."
        />
        <Slider
          label="Run cost per project"
          value={cfg.revenue.per_project_run_cost}
          min={5000} max={100000} step={1000}
          onChange={(v) => updateRevenue('per_project_run_cost', v)}
          format={money}
          tooltip="Marginal cost of running one survey project against the existing library. Covers LLM inference, per-project QA, PM, and data delivery. No new interviews or participant incentives — those are part of the library build. Typically $20,000–$30,000 per project."
        />
        <Slider
          label="Projects per year"
          value={cfg.revenue.projects_per_year}
          min={1} max={30} step={1}
          onChange={(v) => updateRevenue('projects_per_year', v)}
          tooltip="Expected number of projects per year once the library is operational. Drives total revenue in the NPV model."
        />
        <Slider
          label="Time horizon (months)"
          value={cfg.revenue.horizon_months}
          min={6} max={120} step={3}
          onChange={(v) => updateRevenue('horizon_months', v)}
          tooltip="How far forward the NPV model projects. 36 months is the default. Longer horizons increase uncertainty."
        />
        <div className="control-group-row">
          <label className="select-field">
            <span>
              Client risk profile{' '}
              <Tooltip content="The buying organization's risk tolerance. Federal/high-risk settings apply a stricter quality threshold (+0.05 uplift) and a market utility penalty (−0.08), reflecting risk-averse federal procurement behavior.">
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </span>
            <select
              value={cfg.competition.client_risk_profile}
              onChange={(e) => updateCompetition('client_risk_profile', e.target.value)}
            >
              <option value="commercial_exploratory">Commercial / exploratory</option>
              <option value="federal_high_risk">Federal / high-risk</option>
            </select>
          </label>
        </div>
      </fieldset>

      <details className="advanced-controls">
        <summary>Advanced settings</summary>

        <fieldset className="control-group">
          <legend>
            Per-interview costs{' '}
            <Tooltip content="Costs incurred per participant interviewed. These apply at both the validation pilot and the library build — the total scales with the number of participants in each. For non-standard 2-hour AI voice protocols, probability panels typically do not bundle incentives into a flat per-complete rate, so incentives are paid separately by the project operator.">
              <span className="info-icon" aria-hidden="true">i</span>
            </Tooltip>
          </legend>
          <Slider
            label="Interview incentive"
            value={cfg.cost.base_incentive_phase1}
            min={10} max={200} step={5}
            onChange={(v) => updateCost('base_incentive_phase1', v)}
            format={money}
            tooltip="Incentive paid per participant for the initial AI voice interview. Typically $40–$100 for a ~2-hour session."
          />
          <Slider
            label="Retest incentive"
            value={cfg.cost.base_incentive_phase2}
            min={5} max={100} step={5}
            onChange={(v) => updateCost('base_incentive_phase2', v)}
            format={money}
            tooltip="Incentive for the retest wave used to validate agent fidelity. Usually lower than the initial interview incentive since the session is shorter."
          />
          <Slider
            label="Cost per invite"
            value={cfg.cost.cost_per_invite}
            min={0} max={10} step={0.25}
            onChange={(v) => updateCost('cost_per_invite', Number(v.toFixed(2)))}
            format={money}
            tooltip="Per-invite access cost for sampling from a panel. Set to $0 if your organization operates the panel as shared infrastructure with no per-study chargeback. Set to the chargeback or per-invite rate if the panel department bills studies internally, or if you are purchasing access from an external panel provider."
          />
        </fieldset>

        <fieldset className="control-group">
          <legend>
            Staff and overhead{' '}
            <Tooltip content="Staff cost and overhead apply to each study run — both the validation pilot (visible in the Cost tab) and the library build (visible in the Economics tab). They are flat per-study costs, not per-participant. Other upfront investment is a separate, truly one-time cost that only enters the NPV model in the Economics tab.">
              <span className="info-icon" aria-hidden="true">i</span>
            </Tooltip>
          </legend>
          <Slider
            label="Total staff cost"
            value={cfg.cost.total_labor_cost}
            min={0} max={150000} step={1000}
            onChange={(v) => updateCost('total_labor_cost', v)}
            format={money}
            tooltip="Your total estimated staff cost for the study — PM, protocol design, engineering, QA, and IRB compliance combined. Applied per study run (both pilot and library build). Enter as a lump dollar amount at your organization's rates."
          />
          <Slider
            label="Indirect / overhead rate"
            value={cfg.cost.overhead_rate}
            min={0} max={0.4} step={0.01}
            onChange={(v) => updateCost('overhead_rate', Number(v.toFixed(2)))}
            format={pct}
            tooltip="Applied to non-labor direct costs (incentives, voice ops, LLM, post-processing) for each study run — both pilot and library build. Set to 0 if your staff cost figure is already fully loaded with overhead."
          />
          <Slider
            label="Other upfront investment"
            value={cfg.revenue.other_initial_investment}
            min={0} max={1000000} step={5000}
            onChange={(v) => updateRevenue('other_initial_investment', v)}
            format={money}
            tooltip="Truly one-time costs not tied to running either study (e.g., infrastructure build, legal review, partnership setup). Not included in the Cost tab. Added to total upfront investment in the Economics tab NPV model."
          />
        </fieldset>

        <fieldset className="control-group">
          <legend>Agent memory architecture</legend>
          <Slider
            label="Retrieved memory items"
            value={cfg.quality.memory_retrieval_k}
            min={1} max={20} step={1}
            onChange={(v) => updateQuality('memory_retrieval_k', v)}
            tooltip="Number of memory items the agent retrieves per query. More items provide richer context but increase token costs."
          />
          <Slider
            label="Recency weight"
            value={cfg.quality.memory_recency_weight}
            min={0} max={3} step={0.1}
            onChange={(v) => updateQuality('memory_recency_weight', Number(v.toFixed(1)))}
            tooltip="How much the agent prioritizes recent memories over older ones when retrieving context."
          />
          <Slider
            label="Relevance weight"
            value={cfg.quality.memory_relevance_weight}
            min={0} max={3} step={0.1}
            onChange={(v) => updateQuality('memory_relevance_weight', Number(v.toFixed(1)))}
            tooltip="How much the agent prioritizes memories semantically relevant to the current question."
          />
          <Slider
            label="Importance weight"
            value={cfg.quality.memory_importance_weight}
            min={0} max={3} step={0.1}
            onChange={(v) => updateQuality('memory_importance_weight', Number(v.toFixed(1)))}
            tooltip="How much the agent prioritizes memories marked as high-importance during reflection."
          />
          <div className="control-group-row">
            <label className="select-field">
              <span>
                Reflection{' '}
                <Tooltip content="Enables periodic synthesis of stored memories into higher-level beliefs. In the quality model, this adds a small uplift to the memory architecture score. Enabling this reveals the reflection interval and summary count controls.">
                  <span className="info-icon" aria-hidden="true">i</span>
                </Tooltip>
              </span>
              <select
                value={cfg.quality.reflection_enabled ? 'on' : 'off'}
                onChange={(e) => updateQuality('reflection_enabled', e.target.value === 'on')}
              >
                <option value="on">Enabled</option>
                <option value="off">Disabled</option>
              </select>
            </label>
          </div>
          {cfg.quality.reflection_enabled && (
            <>
              <Slider
                label="Reflection interval (turns)"
                value={cfg.quality.reflection_interval_turns}
                min={1} max={30} step={1}
                onChange={(v) => updateQuality('reflection_interval_turns', v)}
                tooltip="How often (in conversation turns) the agent synthesizes new reflections from recent memories."
              />
              <Slider
                label="Reflection summary count"
                value={cfg.quality.reflection_summary_count}
                min={1} max={8} step={1}
                onChange={(v) => updateQuality('reflection_summary_count', v)}
                tooltip="Number of high-level reflection statements generated per synthesis pass."
              />
            </>
          )}
        </fieldset>

        <fieldset className="control-group">
          <legend>
            Market benchmarks{' '}
            <Tooltip content="Stylized defaults for alternative-approach pricing, quality, and turnaround. All prices represent full-service project scope at equivalent deliverables: data collection or generation, representativeness adjustments, and a weighted dataset. Custom analysis and reporting are not included in any of the four prices. Adjust to reflect your actual landscape.">
              <span className="info-icon" aria-hidden="true">i</span>
            </Tooltip>
          </legend>
          <Slider
            label="Probability benchmark price"
            value={cfg.competition.probability_benchmark_price}
            min={50000} max={600000} step={5000}
            onChange={(v) => updateCompetition('probability_benchmark_price', v)}
            format={money}
            tooltip="Typical project price for a high-quality probability panel provider. Probability panels are generally the most expensive option."
          />
          <Slider
            label="Probability benchmark quality"
            value={cfg.competition.probability_benchmark_quality}
            min={0.4} max={1.0} step={0.01}
            onChange={(v) => updateCompetition('probability_benchmark_quality', Number(v.toFixed(2)))}
            tooltip="Estimated quality/reliability score for the probability panel benchmark (0–1 scale). Default 0.90 reflects high gold-standard quality."
          />
          <Slider
            label="Hybrid benchmark price"
            value={cfg.competition.hybrid_benchmark_price}
            min={50000} max={600000} step={5000}
            onChange={(v) => updateCompetition('hybrid_benchmark_price', v)}
            format={money}
            tooltip="Typical project price for a calibrated hybrid panel (opt-in with weighting adjustment)."
          />
          <Slider
            label="Hybrid benchmark quality"
            value={cfg.competition.hybrid_benchmark_quality}
            min={0.4} max={1.0} step={0.01}
            onChange={(v) => updateCompetition('hybrid_benchmark_quality', Number(v.toFixed(2)))}
            tooltip="Estimated quality score for the hybrid benchmark. Default 0.80 reflects good-but-not-gold-standard quality."
          />
          <Slider
            label="Non-prob panel price"
            value={cfg.competition.nonprob_panel_price}
            min={1000} max={30000} step={500}
            onChange={(v) => updateCompetition('nonprob_panel_price', v)}
            format={money}
            tooltip="Full-service project price for a non-probability online panel (e.g. marketplace-based opt-in sample with representativeness weighting). Typically a few thousand dollars per project at equivalent deliverable scope."
          />
          <Slider
            label="Non-prob panel quality"
            value={cfg.competition.nonprob_panel_quality}
            min={0.4} max={1.0} step={0.01}
            onChange={(v) => updateCompetition('nonprob_panel_quality', Number(v.toFixed(2)))}
            tooltip="Estimated data quality for a non-probability online panel. Default 0.70 reflects real human responses but with known opt-in panel quality concerns (satisficing, panel conditioning, selection bias) relative to probability-based approaches."
          />
          <Slider
            label="Cross-price elasticity"
            value={cfg.competition.cross_price_elasticity}
            min={0} max={1} step={0.01}
            onChange={(v) => updateCompetition('cross_price_elasticity', Number(v.toFixed(2)))}
            tooltip="How much demand shifts between alternatives when prices change. Higher values indicate a more price-sensitive market. Used in the market share model alongside quality and brand utility."
          />
        </fieldset>
      </details>
    </aside>
  );
}
