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
          What are you measuring?{' '}
          <Tooltip content="The type of survey construct being studied. Attitudes and beliefs have the strongest paper-anchored evidence (0.85 fidelity, Park et al., 2024). Incentivized and economic behaviors are also anchored in the same paper's economic game experiments (0.66 fidelity) but show lower agent-human agreement. Self-reported behaviors are the most extrapolated of the three.">
            <span className="info-icon" aria-hidden="true">i</span>
          </Tooltip>
        </legend>
        <select
          value={cfg.quality_profile}
          onChange={(e) => update('quality_profile', e.target.value)}
          aria-label="Measurement type"
        >
          <option value="attitude_belief">Attitudes and beliefs</option>
          <option value="self_report_behavior">Self-reported behaviors</option>
          <option value="incentivized_behavior">Incentivized / economic behaviors</option>
        </select>
      </fieldset>

      <fieldset className="control-group">
        <legend>Interview and panel</legend>
        <Slider
          label="Interview duration (minutes)"
          value={cfg.interview_minutes}
          min={30} max={180} step={5}
          onChange={(v) => update('interview_minutes', v)}
          tooltip="Length of the AI-conducted voice interview per participant. The Stanford genagents study used ~120-minute interviews. Quality improves logarithmically with duration."
        />
        <Slider
          label="Pilot sample size"
          value={cfg.sampling.pilot_n}
          min={50} max={500} step={10}
          onChange={(v) => {
            update('sampling' as keyof ScenarioConfig, { ...cfg.sampling, pilot_n: v } as never);
          }}
          tooltip="Number of participants per study. Drives the total study cost shown in the Cost tab, which in turn is used as cost-per-project in the Economics tab. Increase this to model the economics of larger commercial deployments."
        />
        <Slider
          label="Response rate"
          value={cfg.cost.response_rate}
          min={0.05} max={0.9} step={0.01}
          onChange={(v) => updateCost('response_rate', Number(v.toFixed(2)))}
          format={pct}
          tooltip="Fraction of invited panel members who complete the interview. For a 2-hour AI voice study via an established probability panel, 15–30% is a reasonable range. Determines how many panel slots to reserve, but does not drive per-invite outreach cost when sampling from an established panel."
        />
        <Slider
          label="Retest attrition"
          value={cfg.cost.attrition_rate}
          min={0} max={0.6} step={0.01}
          onChange={(v) => updateCost('attrition_rate', Number(v.toFixed(2)))}
          format={pct}
          tooltip="Fraction of completed participants lost before the retest wave. High attrition weakens the quality estimate grounding."
        />
      </fieldset>

      <fieldset className="control-group">
        <legend>Pricing and business</legend>
        <Slider
          label="Price per project"
          value={cfg.revenue.price_per_project}
          min={50000} max={500000} step={5000}
          onChange={(v) => updateRevenue('price_per_project', v)}
          format={money}
          tooltip="Revenue per project. Represents the full-service price for data collection, agent construction, and basic deliverables (weighted dataset and crosstabs). Does not include custom analysis or reporting. Combined with cost per project this determines the gross margin."
        />
        <Slider
          label="Projects per year"
          value={cfg.revenue.projects_per_year}
          min={1} max={30} step={1}
          onChange={(v) => updateRevenue('projects_per_year', v)}
          tooltip="Expected number of client projects per year. Drives the total revenue projection in the NPV model."
        />
        <Slider
          label="Time horizon (months)"
          value={cfg.revenue.horizon_months}
          min={6} max={120} step={3}
          onChange={(v) => updateRevenue('horizon_months', v)}
          tooltip="How far forward the commercial deployment NPV model projects. Longer horizons increase uncertainty. 36 months is the default."
        />
        <div className="control-group-row">
          <label className="select-field">
            <span>
              Risk profile{' '}
              <Tooltip content="Federal/high-risk settings apply a stricter quality threshold (+0.05 uplift) and a market utility penalty (−0.08), reflecting risk-averse federal procurement behavior.">
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
            Participant costs{' '}
            <Tooltip content="Direct per-participant cost parameters. These have a large impact on the total pilot cost.">
              <span className="info-icon" aria-hidden="true">i</span>
            </Tooltip>
          </legend>
          <Slider
            label="Phase 1 incentive"
            value={cfg.cost.base_incentive_phase1}
            min={10} max={200} step={5}
            onChange={(v) => updateCost('base_incentive_phase1', v)}
            format={money}
            tooltip="Incentive paid per participant for the initial interview. Typically $40–$100 for a ~2-hour AI voice interview."
          />
          <Slider
            label="Phase 2 incentive (retest)"
            value={cfg.cost.base_incentive_phase2}
            min={5} max={100} step={5}
            onChange={(v) => updateCost('base_incentive_phase2', v)}
            format={money}
            tooltip="Incentive for the retest wave. Usually lower than phase 1 since the session is shorter."
          />
          <Slider
            label="Cost per invite"
            value={cfg.cost.cost_per_invite}
            min={0} max={10} step={0.25}
            onChange={(v) => updateCost('cost_per_invite', Number(v.toFixed(2)))}
            format={money}
            tooltip="Per-invite outreach cost. For an established probability panel, this is $0 — panel members are already recruited and survey invitations are part of ongoing panel operations. Only non-zero if using external recruitment lists or cold outreach."
          />
        </fieldset>

        <fieldset className="control-group">
          <legend>
            Labor and overhead{' '}
            <Tooltip content="Protocol design, engineering, QA, PM, and IRB compliance hours are one-time setup costs for the pilot. The hourly rate is fully loaded (benefits, facilities).">
              <span className="info-icon" aria-hidden="true">i</span>
            </Tooltip>
          </legend>
          <Slider
            label="Fully loaded hourly rate"
            value={cfg.cost.fully_loaded_hourly_rate}
            min={60} max={300} step={10}
            onChange={(v) => updateCost('fully_loaded_hourly_rate', v)}
            format={money}
            tooltip="Fully loaded cost per staff hour (salary + benefits + facilities). Applied to all labor hour estimates."
          />
          <Slider
            label="Engineering hours"
            value={cfg.cost.engineering_hours}
            min={10} max={200} step={5}
            onChange={(v) => updateCost('engineering_hours', v)}
            tooltip="Hours for building the interview platform, agent pipeline, and data infrastructure."
          />
          <Slider
            label="QA hours"
            value={cfg.cost.qa_hours}
            min={5} max={100} step={5}
            onChange={(v) => updateCost('qa_hours', v)}
            tooltip="Hours for quality assurance, agent output review, and reliability testing."
          />
          <Slider
            label="Protocol design hours"
            value={cfg.cost.protocol_design_hours}
            min={5} max={80} step={5}
            onChange={(v) => updateCost('protocol_design_hours', v)}
            tooltip="Hours for designing the interview guide, construct specification, and codebook."
          />
          <Slider
            label="Overhead rate"
            value={cfg.cost.overhead_rate}
            min={0} max={0.4} step={0.01}
            onChange={(v) => updateCost('overhead_rate', Number(v.toFixed(2)))}
            format={pct}
            tooltip="Percentage of direct costs added as organizational overhead (facilities, admin, indirect costs)."
          />
        </fieldset>

        <fieldset className="control-group">
          <legend>Agent memory architecture</legend>
          <Slider
            label="Retrieved memory items"
            value={cfg.quality.memory_retrieval_k}
            min={1} max={20} step={1}
            onChange={(v) => updateQuality('memory_retrieval_k', v)}
            tooltip="Number of memory items the agent retrieves per query. More items provide richer context but may increase token costs."
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
          <legend>Operations</legend>
          <Slider
            label="Contact attempts"
            value={cfg.cost.contact_attempts}
            min={1} max={6} step={1}
            onChange={(v) => updateCost('contact_attempts', v)}
            tooltip="Number of contact attempts per invitee (initial invitation plus reminders). For an established probability panel, 1–2 is typical (one invitation plus one reminder). Affects response rate modeling but not cost when per-invite cost is $0."
          />
          <Slider
            label="Other upfront investment"
            value={cfg.revenue.other_initial_investment}
            min={0} max={1000000} step={5000}
            onChange={(v) => updateRevenue('other_initial_investment', v)}
            format={money}
            tooltip="Additional upfront costs beyond CAC (e.g., infrastructure, legal, partnerships). Added to the break-even denominator."
          />
          <Slider
            label="Cross-price elasticity"
            value={cfg.competition.cross_price_elasticity}
            min={0} max={1} step={0.01}
            onChange={(v) => updateCompetition('cross_price_elasticity', Number(v.toFixed(2)))}
            tooltip="How much demand shifts between competitors when prices change. Higher = more price-sensitive market."
          />
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
            label="Fully synthetic price"
            value={cfg.competition.external_synthetic_price}
            min={10000} max={200000} step={5000}
            onChange={(v) => updateCompetition('external_synthetic_price', v)}
            format={money}
            tooltip="Full-service project price for a purely synthetic data provider (no real human respondents). Raw data generation costs from pure-play vendors are substantially lower ($2–30 per synthetic profile); this default reflects a comparable full-service project engagement at equivalent deliverable scope."
          />
          <Slider
            label="Fully synthetic quality"
            value={cfg.competition.external_synthetic_quality}
            min={0.4} max={1.0} step={0.01}
            onChange={(v) => updateCompetition('external_synthetic_quality', Number(v.toFixed(2)))}
            tooltip="Estimated representational quality for fully synthetic data (profiles generated from aggregate sources without individual human interviews). Default 0.72 reflects reasonable population-level accuracy but no person-level anchoring — unlike Panel Twin, fully synthetic agents cannot be validated against their source participants."
          />
        </fieldset>
      </details>
    </aside>
  );
}
