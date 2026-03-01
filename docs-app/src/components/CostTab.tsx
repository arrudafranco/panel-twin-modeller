import { useState } from 'react';
import { CostWaterfallChart } from './charts/CostWaterfallChart.tsx';
import { Tooltip } from './ui/Tooltip.tsx';
import type { ScenarioConfig } from '../model/params.ts';
import type { ComputedResults } from '../hooks/useScenario.ts';

interface Props {
  cfg: ScenarioConfig;
  results: ComputedResults;
}

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

type CostView = 'pilot' | 'library';

export function CostTab({ cfg, results }: Props) {
  const [view, setView] = useState<CostView>('pilot');
  const costs = view === 'pilot' ? results.costs : results.deploymentCosts;
  const isLibrary = view === 'library';
  const otherUpfront = isLibrary
    ? cfg.revenue.other_initial_investment
    : cfg.cost.other_pilot_cost;
  const grandTotal = costs.total_cost + otherUpfront;

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    border: '1.5px solid',
    borderColor: active ? 'var(--brand-orange)' : 'var(--border)',
    background: active ? 'var(--brand-orange)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    cursor: active ? 'default' : 'pointer',
    borderRadius: 3,
    fontFamily: 'var(--font-body)',
    transition: 'all 0.15s',
  });

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
        {isLibrary
          ? `Cost estimates cover the full library build: AI-conducted interviews with all ${results.deploymentCosts.n_target} participants, plus any other ad-hoc costs (infrastructure, legal, partnership setup) set in Advanced. This is the total you need to recover before breaking even.`
          : `Cost estimates cover the per-study variable costs of the validation pilot: participant incentives, AI voice infrastructure (ASR/TTS), LLM token costs, post-processing, professional labor, and organizational overhead. Any ad-hoc pilot costs set in Advanced are included in the total.`
        }
      </p>

      <div
        role="group"
        aria-label="Cost view"
        style={{ display: 'flex', gap: 6, marginBottom: 16 }}
      >
        <button
          style={toggleStyle(view === 'pilot')}
          aria-pressed={view === 'pilot'}
          onClick={() => setView('pilot')}
        >
          Validation pilot ({results.costs.n_target} participants)
        </button>
        <button
          style={toggleStyle(view === 'library')}
          aria-pressed={view === 'library'}
          onClick={() => setView('library')}
        >
          Library build ({results.deploymentCosts.n_target} participants)
          {' '}
          <Tooltip content="The library build is the full one-time investment: AI-conducted interviews with the target number of participants, creating a reusable collection of AI agents. Once built, subsequent survey projects run against this agent library at much lower marginal cost — no new interviews needed.">
            <span className="info-icon" aria-hidden="true">i</span>
          </Tooltip>
        </button>
      </div>

      <CostWaterfallChart
        costs={costs}
        otherUpfront={otherUpfront > 0 ? otherUpfront : undefined}
        subtitle={
          isLibrary
            ? 'Library build cost components (total upfront investment). Adjust participant costs and other ad-hoc costs in Advanced settings.'
            : 'Pilot cost components. Adjust incentives, labor rate, and overhead in the Advanced settings sidebar.'
        }
      />

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
          {otherUpfront > 0 && (
            <tr>
              <th>Ad-hoc costs ({isLibrary ? 'library build' : 'pilot'})</th>
              <td>{money(otherUpfront)}</td>
            </tr>
          )}
          <tr className="total-row">
            <th>{isLibrary ? 'Total library build cost' : 'Total pilot cost'}</th>
            <td><strong>{money(grandTotal)}</strong></td>
          </tr>
          <tr>
            <th>Cost per completed interview{otherUpfront > 0 ? ' (base, excl. ad-hoc)' : ''}</th>
            <td>{money(costs.cost_per_completed_interview)}</td>
          </tr>
          <tr>
            <th>Cost per retained agent{otherUpfront > 0 ? ' (base, excl. ad-hoc)' : ''}</th>
            <td>{money(costs.cost_per_retained_agent)}</td>
          </tr>
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
