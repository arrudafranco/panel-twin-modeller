import { CostWaterfallChart } from './charts/CostWaterfallChart.tsx';
import type { ScenarioConfig } from '../model/params.ts';
import type { ComputedResults } from '../hooks/useScenario.ts';

interface Props {
  cfg: ScenarioConfig;
  results: ComputedResults;
}

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function CostTab({ cfg, results }: Props) {
  const { costs } = results;

  return (
    <section id="panel-cost" role="tabpanel" aria-labelledby="tab-cost">
      <h2>Operations and cost</h2>
      <div className="info-callout" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 15, lineHeight: 1, marginTop: 1 }}>ℹ</span>
        <span>
          This model assumes participants are accessed through an existing survey
          panel or sample source. Standing panel infrastructure (recruitment,
          maintenance, panel management) is a fixed cost not included here. The
          costs shown are the variable costs of running the study: incentives,
          voice and LLM infrastructure, post-processing, staff, and indirect
          costs. Set "Cost per invite" to $0 (the default) when outreach is
          handled through ongoing panel operations.
        </span>
      </div>
      <p>
        Cost estimates cover the per-study variable costs of the pilot: participant
        incentives, AI voice infrastructure (ASR/TTS), LLM token costs,
        post-processing, professional labor, and organizational overhead.
      </p>

      <CostWaterfallChart costs={costs} />

      <h3>Cost detail</h3>
      <table className="data-table">
        <tbody>
          <tr><th>Target sample size</th><td>{costs.n_target}</td></tr>
          <tr><th>Effective response rate</th><td>{(costs.effective_response_rate * 100).toFixed(1)}%</td></tr>
          <tr><th>Invites per complete</th><td>{costs.invites_per_complete.toFixed(1)}</td></tr>
          <tr><th>Recruitment</th><td>{money(costs.recruitment_cost)}</td></tr>
          <tr><th>Incentives</th><td>{money(costs.incentives_cost)}</td></tr>
          <tr><th>Voice operations (ASR and TTS)</th><td>{money(costs.voice_ops_cost)}</td></tr>
          <tr><th>LLM token costs</th><td>{money(costs.llm_ops_cost)}</td></tr>
          <tr><th>Post-processing</th><td>{money(costs.postproc_cost)}</td></tr>
          <tr><th>Staff cost</th><td>{money(costs.labor_cost)}</td></tr>
          <tr><th>Indirect / overhead ({(cfg.cost.overhead_rate * 100).toFixed(0)}%, on non-labor)</th><td>{money(costs.overhead_cost)}</td></tr>
          <tr className="total-row"><th>Total pilot cost</th><td><strong>{money(costs.total_cost)}</strong></td></tr>
          <tr><th>Cost per completed interview</th><td>{money(costs.cost_per_completed_interview)}</td></tr>
          <tr><th>Cost per retained agent</th><td>{money(costs.cost_per_retained_agent)}</td></tr>
        </tbody>
      </table>

      <details className="methods-note">
        <summary>Token breakdown</summary>
        <table className="data-table">
          <tbody>
            <tr><th>Input tokens</th><td>{Math.round(costs.tokens_input).toLocaleString()}</td></tr>
            <tr><th>Output tokens</th><td>{Math.round(costs.tokens_output).toLocaleString()}</td></tr>
            <tr><th>Context tokens</th><td>{Math.round(costs.context_tokens).toLocaleString()}</td></tr>
            <tr><th>Reflection turns per participant</th><td>{costs.reflection_turns_per_participant.toFixed(1)}</td></tr>
          </tbody>
        </table>
      </details>
    </section>
  );
}
