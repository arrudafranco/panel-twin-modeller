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
      <p>
        Cost estimates cover the full pilot lifecycle, from recruitment through
        agent construction. The model includes recruitment outreach, participant
        incentives, voice infrastructure (ASR/TTS), LLM token costs, post-processing,
        professional labor, and organizational overhead.
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
          <tr><th>Voice operations</th><td>{money(costs.voice_ops_cost)}</td></tr>
          <tr><th>LLM token costs</th><td>{money(costs.llm_ops_cost)}</td></tr>
          <tr><th>Post-processing</th><td>{money(costs.postproc_cost)}</td></tr>
          <tr><th>Professional labor</th><td>{money(costs.labor_cost)}</td></tr>
          <tr><th>Overhead ({(cfg.cost.overhead_rate * 100).toFixed(0)}%)</th><td>{money(costs.overhead_cost)}</td></tr>
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
