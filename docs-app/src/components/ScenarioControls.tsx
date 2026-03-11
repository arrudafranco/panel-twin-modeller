import { useState } from 'react';
import { Slider } from './ui/Slider.tsx';
import { Tooltip } from './ui/Tooltip.tsx';
import type { ScenarioConfig } from '../model/params.ts';

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

type PhaseFilter = 'all' | 'one-time' | 'per-project';

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
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const show = (p: 'one-time' | 'per-project') => phaseFilter === 'all' || phaseFilter === p;

  return (
    <aside className="controls-panel" aria-label="Scenario controls">
      <div className="controls-header">
        <h2 className="controls-title">Scenario</h2>
        <button className="reset-btn" onClick={resetToDefaults} aria-label="Reset to default values">
          Reset
        </button>
      </div>

      <div className="phase-filter" role="group" aria-label="Show controls for phase">
        <button
          className={`phase-filter-btn${phaseFilter === 'all' ? ' active' : ''}`}
          onClick={() => setPhaseFilter('all')}
        >All</button>
        <button
          className={`phase-filter-btn phase-one-time${phaseFilter === 'one-time' ? ' active' : ''}`}
          onClick={() => setPhaseFilter('one-time')}
        >One-time</button>
        <button
          className={`phase-filter-btn phase-per-project${phaseFilter === 'per-project' ? ' active' : ''}`}
          onClick={() => setPhaseFilter('per-project')}
        >Per-project</button>
        <Tooltip content="One-time controls affect the library build — the upfront investment you make once. Per-project controls affect economics once the library exists: pricing, margins, and NPV.">
          <span className="info-icon" aria-hidden="true">i</span>
        </Tooltip>
      </div>

      {show('one-time') && (
        <fieldset className="control-group">
          <legend>
            <span className="legend-main">
              Study type{' '}
              <Tooltip content="The predominant type of items in your study. Mixed general surveys combine attitudes, opinions, and behavioral recall questions — the most common survey design and the one directly anchored to Park et al. (2024) at 0.85 fidelity. Behavioral recall surveys focus primarily on concrete behavioral frequency or recall items (e.g., health behaviors, voting, activity tracking), estimated at 0.80 as a conservative planning discount. Incentivized / economic experiments include trust games, ultimatum games, or revealed-preference tasks — also paper-anchored at 0.66.">
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </span>
            <span className="phase-tag phase-one-time">one-time</span>
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
      )}

      {show('one-time') && (
        <fieldset className="control-group">
          <legend>
            <span className="legend-main">
              Interview design{' '}
              <Tooltip content="These parameters describe each AI voice interview. They set quality expectations and determine the cost per participant — and since per-participant costs are the same unit whether you are running a small pilot or the full library build, these inputs drive both. Incentives, voice costs, and LLM costs are all per-participant; adjust them in Advanced settings.">
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </span>
            <span className="phase-tag phase-one-time">one-time</span>
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
      )}

      {show('one-time') && (
        <fieldset className="control-group">
          <legend>
            <span className="legend-main">
              Study scale{' '}
              <Tooltip content="Two distinct spending events. The validation pilot is a small study run first to check quality, operations, and assumptions before committing to the full build — its cost appears in the Cost tab. The library build is the full one-time investment: AI interviews with the target number of participants that creates the agent library — its cost is the initial investment in the Economics tab. Both events use the same per-participant interview design above. Per-interview costs (incentives, panel access) are in Advanced settings.">
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </span>
            <span className="phase-tag phase-one-time">one-time</span>
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
            tooltip="Number of participants to interview for the full agent library. Shown as the initial investment in the Economics tab. Once built, subsequent survey projects run against this library at marginal cost — no new interviews needed. A nationally representative U.S. sample typically requires at least 2,000 participants."
          />
        </fieldset>
      )}

      {show('per-project') && (
        <fieldset className="control-group">
          <legend>
            <span className="legend-main">
              Per-project economics{' '}
              <Tooltip content="These inputs describe what happens after the library is built. Each subsequent survey project incurs a marginal run cost (LLM inference, QA, PM, data delivery) with no new interviews. Revenue and run cost together determine the gross margin on each project, which the NPV model uses to project break-even and net present value.">
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </span>
            <span className="phase-tag phase-per-project">per-project</span>
          </legend>
          <p className="control-hint">Price = what clients pay. Run cost = what you spend internally.</p>
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
            tooltip="Marginal cost of running one survey project against the existing library. Covers LLM inference, per-project QA, PM, and data delivery. No new interviews or participant incentives — those are part of the library build."
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
          <Slider
            label="Customer acquisition cost"
            value={cfg.revenue.cac}
            min={0} max={100000} step={1000}
            onChange={(v) => updateRevenue('cac', v)}
            format={money}
            tooltip="One-time cost to acquire the initial client base before the library is operational — marketing, sales, partnership setup, and business development. Added to the library build cost in the total upfront investment used for NPV and break-even calculations."
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
      )}

      <details className="advanced-controls">
        <summary>Advanced settings</summary>

        {show('one-time') && (
          <fieldset className="control-group">
            <legend>
              <span className="legend-main">
                Per-interview costs{' '}
                <Tooltip content="Costs incurred per participant interviewed. These apply at both the validation pilot and the library build — the total scales with the number of participants in each. For non-standard 2-hour AI voice protocols, probability panels typically do not bundle incentives into a flat per-complete rate, so incentives are paid separately by the project operator. Other fixed per-participant assumptions not shown here: $5 bonus expected value, $5 transcript cleaning, $2 summarization, $8 storage and compliance — totaling $20 per participant in addition to incentives.">
                  <span className="info-icon" aria-hidden="true">i</span>
                </Tooltip>
              </span>
              <span className="phase-tag phase-one-time">one-time</span>
            </legend>
            <Slider
              label="Planned retest coverage"
              value={cfg.retest_rate}
              min={0} max={1} step={0.05}
              onChange={(v) => update('retest_rate', Number(v.toFixed(2)))}
              format={pct}              tooltip="Study design choice: what fraction of initial participants you intentionally include in the retest validation wave. This is not an involuntary field outcome (that is Retest attrition above) — it is a deliberate scope decision that trades off validation coverage against retest incentive cost. At 80% (default), 800 of 1,000 library participants are scheduled for retest, each receiving the retest incentive. Reducing coverage saves cost but narrows the fidelity validation base."
            />
            <Slider
              label="Interview incentive"
              value={cfg.cost.base_incentive_phase1}
              min={10} max={200} step={5}
              onChange={(v) => updateCost('base_incentive_phase1', v)}
              format={money}              tooltip="Incentive paid per participant for the initial AI voice interview. Typically $40–$100 for a ~2-hour session."
            />
            <Slider
              label="Retest incentive"
              value={cfg.cost.base_incentive_phase2}
              min={5} max={100} step={5}
              onChange={(v) => updateCost('base_incentive_phase2', v)}
              format={money}              tooltip="Incentive for the retest wave used to validate agent fidelity. Usually lower than the initial interview incentive since the session is shorter."
            />
            <Slider
              label="Cost per invite"
              value={cfg.cost.cost_per_invite}
              min={0} max={10} step={0.25}
              onChange={(v) => updateCost('cost_per_invite', Number(v.toFixed(2)))}
              format={money}              tooltip="Per-invite access cost for sampling from a panel. Set to $0 if your organization operates the panel as shared infrastructure with no per-study chargeback. Set to the chargeback or per-invite rate if the panel department bills studies internally, or if you are purchasing access from an external panel provider."
            />
          </fieldset>
        )}

        {show('one-time') && (
          <fieldset className="control-group">
            <legend>
              <span className="legend-main">
                Staff and overhead{' '}
                <Tooltip content="Staff costs are set separately for the validation pilot and the library build, since each represents a different scope of work. Both are flat lump-sum amounts, not per-participant. The overhead rate applies to non-labor direct costs in both phases. The two ad-hoc cost fields below are separate catch-all buckets: pilot ad-hoc costs appear only in the Cost tab pilot view; library build ad-hoc costs appear in the Cost tab library view and are added to total upfront investment in the Economics tab NPV model.">
                  <span className="info-icon" aria-hidden="true">i</span>
                </Tooltip>
              </span>
              <span className="phase-tag phase-one-time">one-time</span>
            </legend>
            <Slider
              label="Staff cost (pilot)"
              value={cfg.cost.pilot_labor_cost}
              min={0} max={80000} step={500}
              onChange={(v) => updateCost('pilot_labor_cost', v)}
              format={money}              tooltip="Your total estimated staff cost for the validation pilot — PM, protocol design, engineering, QA, and any ethics or compliance review. Covers the small validation run only, not the full library build. A flat lump sum at your organization's blended rates."
            />
            <Slider
              label="Staff cost (library build)"
              value={cfg.cost.library_labor_cost}
              min={0} max={200000} step={1000}
              onChange={(v) => updateCost('library_labor_cost', v)}
              format={money}              tooltip="Your total estimated staff cost for the full library build — typically 3–4× the pilot figure, reflecting a larger participant count plus additional engineering, data pipeline, and compliance work for production deployment. A flat lump sum at your organization's blended rates."
            />
            <Slider
              label="Indirect / overhead rate"
              value={cfg.cost.overhead_rate}
              min={0} max={0.4} step={0.01}
              onChange={(v) => updateCost('overhead_rate', Number(v.toFixed(2)))}
              format={pct}              tooltip="Applied to non-labor direct costs (incentives, voice ops, LLM, post-processing) for each study run — both pilot and library build. Set to 0 if your staff cost figure is already fully loaded with overhead."
            />
            <Slider
              label="Other ad-hoc costs (pilot)"
              value={cfg.cost.other_pilot_cost}
              min={0} max={100000} step={1000}
              onChange={(v) => updateCost('other_pilot_cost', v)}
              format={money}              tooltip="Any ad-hoc costs specific to the validation pilot that do not fit the other categories — e.g., unexpected IRB fees, software licenses, travel for in-person testing. Added as a flat total, not per participant. Shown in the Cost tab pilot view (per-unit rows there exclude this item). Not included in the NPV model — the pilot is treated as a pre-decision sunk cost."
            />
            <Slider
              label="Other ad-hoc costs (library build)"
              value={cfg.revenue.other_initial_investment}
              min={0} max={1000000} step={5000}
              onChange={(v) => updateRevenue('other_initial_investment', v)}
              format={money}              tooltip="Any ad-hoc costs specific to the library build phase that do not fit the other categories — e.g., infrastructure setup, legal review, partnership agreements. Shown in the library build view of the Cost tab and added to total upfront investment in the Economics tab NPV model."
            />
          </fieldset>
        )}

        {show('per-project') && (
          <fieldset className="control-group">
            <legend>
              <span className="legend-main">
                Financial assumptions{' '}
                <Tooltip content="These parameters control the NPV model's financial structure. Discount rate sets the hurdle — future cash flows are worth less than today's dollars at this rate, so a higher rate reduces NPV for the same projected cash flows. Growth and churn set compound annual demand trends: at defaults (8% growth, 5% churn) they roughly offset each other, keeping projected demand approximately flat. Adjust them to model optimistic or pessimistic demand trajectories.">
                  <span className="info-icon" aria-hidden="true">i</span>
                </Tooltip>
              </span>
              <span className="phase-tag phase-per-project">per-project</span>
            </legend>
            <Slider
              label="Discount rate (hurdle rate)"
              value={cfg.revenue.discount_rate}
              min={0.04} max={0.30} step={0.01}
              onChange={(v) => updateRevenue('discount_rate', Number(v.toFixed(2)))}
              format={pct}              tooltip="Annual discount rate applied to future cash flows in the NPV calculation. Represents your cost of capital or required return threshold. At 12% (default), a dollar earned 36 months from now is worth roughly $0.70 today. Higher rates penalize longer payback periods more heavily."
            />
            <Slider
              label="Annual revenue growth"
              value={cfg.revenue.growth_rate}
              min={0} max={0.5} step={0.01}
              onChange={(v) => updateRevenue('growth_rate', Number(v.toFixed(2)))}
              format={pct}              tooltip="Compound annual growth applied to project demand in the NPV model. At 8% (default), year-3 demand is roughly 26% higher than year-1 before churn is applied. Represents market expansion or increasing project volume over time."
            />
            <Slider
              label="Annual client churn"
              value={cfg.revenue.churn_rate}
              min={0} max={0.4} step={0.01}
              onChange={(v) => updateRevenue('churn_rate', Number(v.toFixed(2)))}
              format={pct}              tooltip="Compound annual decay applied to project demand in the NPV model. At 5% (default), year-3 demand is roughly 14% lower than year-1 before growth is applied. At default settings, growth and churn roughly cancel, keeping demand approximately flat across the 36-month horizon."
            />
          </fieldset>
        )}

        {show('one-time') && (
          <fieldset className="control-group">
            <legend>
              <span className="legend-main">Agent memory architecture</span>
              <span className="phase-tag phase-one-time">one-time</span>
            </legend>
            <Slider
              label="Retrieved memory items"
              value={cfg.quality.memory_retrieval_k}
              min={1} max={20} step={1}
              onChange={(v) => updateQuality('memory_retrieval_k', v)}              tooltip="Number of memory items the agent retrieves per query. More items provide richer context but increase token costs."
            />
            <Slider
              label="Recency weight"
              value={cfg.quality.memory_recency_weight}
              min={0} max={3} step={0.1}
              onChange={(v) => updateQuality('memory_recency_weight', Number(v.toFixed(1)))}              tooltip="How much the agent prioritizes recent memories over older ones when retrieving context."
            />
            <Slider
              label="Relevance weight"
              value={cfg.quality.memory_relevance_weight}
              min={0} max={3} step={0.1}
              onChange={(v) => updateQuality('memory_relevance_weight', Number(v.toFixed(1)))}              tooltip="How much the agent prioritizes memories semantically relevant to the current question."
            />
            <Slider
              label="Importance weight"
              value={cfg.quality.memory_importance_weight}
              min={0} max={3} step={0.1}
              onChange={(v) => updateQuality('memory_importance_weight', Number(v.toFixed(1)))}              tooltip="How much the agent prioritizes memories marked as high-importance during reflection."
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
                  phase="one-time"
                  tooltip="How often (in conversation turns) the agent synthesizes new reflections from recent memories."
                />
                <Slider
                  label="Reflection summary count"
                  value={cfg.quality.reflection_summary_count}
                  min={1} max={8} step={1}
                  onChange={(v) => updateQuality('reflection_summary_count', v)}
                  phase="one-time"
                  tooltip="Number of high-level reflection statements generated per synthesis pass."
                />
              </>
            )}
          </fieldset>
        )}

        {show('per-project') && (
          <fieldset className="control-group">
            <legend>
              <span className="legend-main">
                Market context{' '}
                <Tooltip content="Competitive positioning assumptions for Panel Twin and stylized defaults for alternative approaches. All benchmark prices represent full-service project scope: data collection or generation, representativeness adjustments, and a weighted dataset — custom analysis and reporting excluded. Adjust all figures to reflect your actual landscape. Fixed defaults not shown: Panel Twin turnaround 10 days, probability benchmark 18 days, hybrid 12 days, non-prob panel 3 days; market tailwind 10%.">
                  <span className="info-icon" aria-hidden="true">i</span>
                </Tooltip>
              </span>
              <span className="phase-tag phase-per-project">per-project</span>
            </legend>
            <Slider
              label="Brand trust"
              value={cfg.competition.brand_trust}
              min={0} max={1} step={0.01}
              onChange={(v) => updateCompetition('brand_trust', Number(v.toFixed(2)))}              tooltip="Your organization's perceived credibility on a 0–1 scale, used as a positive term in Panel Twin's utility calculation. Higher trust increases win probability. Competitors have no brand term — their prices and quality carry their full positioning. Reflect your honest assessment of how established your brand is in the research market."
            />
            <Slider
              label="Cannibalization rate"
              value={cfg.competition.cannibalization_rate}
              min={0} max={1} step={0.01}
              onChange={(v) => updateCompetition('cannibalization_rate', Number(v.toFixed(2)))}
              format={pct}              tooltip="Fraction of Panel Twin revenue that displaces existing revenue rather than creating net-new revenue. At 30% (default), 30 cents of every dollar earned replaces existing business. The NPV model scales monthly margin by (1 − cannibalization rate). Set higher if your organization currently runs traditional panels that Panel Twin would partially replace."
            />
            <Slider
              label="Probability benchmark price"
              value={cfg.competition.probability_benchmark_price}
              min={50000} max={600000} step={5000}
              onChange={(v) => updateCompetition('probability_benchmark_price', v)}
              format={money}              tooltip="Typical project price for a high-quality probability panel provider. Probability panels are generally the most expensive option."
            />
            <Slider
              label="Probability benchmark quality"
              value={cfg.competition.probability_benchmark_quality}
              min={0.4} max={1.0} step={0.01}
              onChange={(v) => updateCompetition('probability_benchmark_quality', Number(v.toFixed(2)))}              tooltip="Estimated quality/reliability score for the probability panel benchmark (0–1 scale). Default 0.90 reflects high gold-standard quality."
            />
            <Slider
              label="Hybrid benchmark price"
              value={cfg.competition.hybrid_benchmark_price}
              min={50000} max={600000} step={5000}
              onChange={(v) => updateCompetition('hybrid_benchmark_price', v)}
              format={money}              tooltip="Typical project price for a calibrated hybrid panel (opt-in with weighting adjustment)."
            />
            <Slider
              label="Hybrid benchmark quality"
              value={cfg.competition.hybrid_benchmark_quality}
              min={0.4} max={1.0} step={0.01}
              onChange={(v) => updateCompetition('hybrid_benchmark_quality', Number(v.toFixed(2)))}              tooltip="Estimated quality score for the hybrid benchmark. Default 0.80 reflects good-but-not-gold-standard quality."
            />
            <Slider
              label="Non-prob panel price"
              value={cfg.competition.nonprob_panel_price}
              min={1000} max={30000} step={500}
              onChange={(v) => updateCompetition('nonprob_panel_price', v)}
              format={money}              tooltip="Full-service project price for a non-probability online panel (e.g. marketplace-based opt-in sample with representativeness weighting). Typically a few thousand dollars per project at equivalent deliverable scope."
            />
            <Slider
              label="Non-prob panel quality"
              value={cfg.competition.nonprob_panel_quality}
              min={0.4} max={1.0} step={0.01}
              onChange={(v) => updateCompetition('nonprob_panel_quality', Number(v.toFixed(2)))}              tooltip="Estimated data quality for a non-probability online panel. Default 0.70 reflects real human responses but with known opt-in panel quality concerns (satisficing, panel conditioning, selection bias) relative to probability-based approaches."
            />
            <Slider
              label="Cross-price elasticity"
              value={cfg.competition.cross_price_elasticity}
              min={0} max={1} step={0.01}
              onChange={(v) => updateCompetition('cross_price_elasticity', Number(v.toFixed(2)))}              tooltip="How much demand shifts between alternatives when prices change. Higher values indicate a more price-sensitive market. Used in the market share model alongside quality and brand utility."
            />
          </fieldset>
        )}
      </details>
    </aside>
  );
}
