import { Slider } from './ui/Slider.tsx';
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
        <legend>What are you measuring?</legend>
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
          tooltip="Length of the initial voice interview used to construct each agent. The Stanford genagents paper used ~120-minute interviews."
        />
        <Slider
          label="Pilot sample size"
          value={cfg.sampling.pilot_n}
          min={50} max={500} step={10}
          onChange={(v) => {
            // Need to update nested sampling object
            update('sampling' as keyof ScenarioConfig, { ...cfg.sampling, pilot_n: v } as never);
          }}
          tooltip="Number of participants in the pilot study."
        />
        <Slider
          label="Response rate"
          value={cfg.cost.response_rate}
          min={0.05} max={0.9} step={0.01}
          onChange={(v) => updateCost('response_rate', Number(v.toFixed(2)))}
          format={pct}
          tooltip="Fraction of invited participants who complete the interview."
        />
        <Slider
          label="Retest attrition"
          value={cfg.cost.attrition_rate}
          min={0} max={0.6} step={0.01}
          onChange={(v) => updateCost('attrition_rate', Number(v.toFixed(2)))}
          format={pct}
          tooltip="Fraction of completed participants lost before the retest wave."
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
        />
        <Slider
          label="Projects per year"
          value={cfg.revenue.projects_per_year}
          min={1} max={30} step={1}
          onChange={(v) => updateRevenue('projects_per_year', v)}
        />
        <Slider
          label="Time horizon (months)"
          value={cfg.revenue.horizon_months}
          min={6} max={120} step={3}
          onChange={(v) => updateRevenue('horizon_months', v)}
        />
        <div className="control-group-row">
          <label className="select-field">
            <span>Risk profile</span>
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
          <legend>Agent memory architecture</legend>
          <Slider
            label="Retrieved memory items"
            value={cfg.quality.memory_retrieval_k}
            min={1} max={20} step={1}
            onChange={(v) => updateQuality('memory_retrieval_k', v)}
            tooltip="Number of memory items the agent retrieves per query."
          />
          <Slider
            label="Recency weight"
            value={cfg.quality.memory_recency_weight}
            min={0} max={3} step={0.1}
            onChange={(v) => updateQuality('memory_recency_weight', Number(v.toFixed(1)))}
          />
          <Slider
            label="Relevance weight"
            value={cfg.quality.memory_relevance_weight}
            min={0} max={3} step={0.1}
            onChange={(v) => updateQuality('memory_relevance_weight', Number(v.toFixed(1)))}
          />
          <Slider
            label="Importance weight"
            value={cfg.quality.memory_importance_weight}
            min={0} max={3} step={0.1}
            onChange={(v) => updateQuality('memory_importance_weight', Number(v.toFixed(1)))}
          />
          <div className="control-group-row">
            <label className="select-field">
              <span>Reflection</span>
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
              />
              <Slider
                label="Reflection summary count"
                value={cfg.quality.reflection_summary_count}
                min={1} max={8} step={1}
                onChange={(v) => updateQuality('reflection_summary_count', v)}
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
          />
          <Slider
            label="Other upfront investment"
            value={cfg.revenue.other_initial_investment}
            min={0} max={1000000} step={5000}
            onChange={(v) => updateRevenue('other_initial_investment', v)}
            format={money}
          />
          <Slider
            label="Cross-price elasticity"
            value={cfg.competition.cross_price_elasticity}
            min={0} max={1} step={0.01}
            onChange={(v) => updateCompetition('cross_price_elasticity', Number(v.toFixed(2)))}
            tooltip="How much demand shifts between competitors when prices change."
          />
        </fieldset>

        <fieldset className="control-group">
          <legend>Market benchmarks</legend>
          <Slider
            label="Probability benchmark price"
            value={cfg.competition.probability_benchmark_price}
            min={50000} max={600000} step={5000}
            onChange={(v) => updateCompetition('probability_benchmark_price', v)}
            format={money}
          />
          <Slider
            label="Probability benchmark quality"
            value={cfg.competition.probability_benchmark_quality}
            min={0.4} max={1.0} step={0.01}
            onChange={(v) => updateCompetition('probability_benchmark_quality', Number(v.toFixed(2)))}
          />
          <Slider
            label="Hybrid benchmark price"
            value={cfg.competition.hybrid_benchmark_price}
            min={50000} max={600000} step={5000}
            onChange={(v) => updateCompetition('hybrid_benchmark_price', v)}
            format={money}
          />
          <Slider
            label="Hybrid benchmark quality"
            value={cfg.competition.hybrid_benchmark_quality}
            min={0.4} max={1.0} step={0.01}
            onChange={(v) => updateCompetition('hybrid_benchmark_quality', Number(v.toFixed(2)))}
          />
          <Slider
            label="External synthetic price"
            value={cfg.competition.external_synthetic_price}
            min={50000} max={600000} step={5000}
            onChange={(v) => updateCompetition('external_synthetic_price', v)}
            format={money}
          />
          <Slider
            label="External synthetic quality"
            value={cfg.competition.external_synthetic_quality}
            min={0.4} max={1.0} step={0.01}
            onChange={(v) => updateCompetition('external_synthetic_quality', Number(v.toFixed(2)))}
          />
        </fieldset>
      </details>
    </aside>
  );
}
