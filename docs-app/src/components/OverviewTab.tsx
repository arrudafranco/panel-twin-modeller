import { Kpi } from './ui/Kpi.tsx';
import { DynamicNarrative } from './DynamicNarrative.tsx';
import { Tooltip } from './ui/Tooltip.tsx';
import type { ScenarioConfig } from '../model/params.ts';
import type { ComputedResults } from '../hooks/useScenario.ts';

interface Props {
  cfg: ScenarioConfig;
  results: ComputedResults;
}

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function OverviewTab({ cfg, results }: Props) {
  const { quality, threshold, qualityEval, costs, finance, warnings, favorable } = results;

  return (
    <section id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">
      <h2>Decision overview</h2>
      <DynamicNarrative cfg={cfg} results={results} />

      <div className="kpi-grid">
        <Kpi
          label="Fidelity score"
          value={quality.toFixed(3)}
          status={qualityEval.quality_pass ? 'positive' : 'negative'}
          detail={`Threshold: ${threshold.toFixed(3)}`}
        />
        <Kpi
          label="Cost per interview"
          value={money(costs.cost_per_completed_interview)}
          detail={`Total: ${money(costs.total_cost)}`}
        />
        <Kpi
          label="Win probability"
          value={`${(finance.win_probability * 100).toFixed(1)}%`}
          detail="Market share estimate"
        />
        <Kpi
          label="Net present value (NPV)"
          value={money(finance.npv)}
          status={finance.npv > 0 ? 'positive' : 'negative'}
        />
        <Kpi
          label="Break-even"
          value={finance.time_to_break_even_months ? `${finance.time_to_break_even_months} mo` : 'Not reached'}
          status={finance.break_even_within_horizon ? 'positive' : 'negative'}
          detail={`Within ${cfg.revenue.horizon_months}-month horizon`}
        />
      </div>

      <div className={`signal-badge ${favorable ? 'signal-favorable' : 'signal-caution'}`}>
        {favorable ? 'Favorable' : 'Needs work'}
      </div>

      {warnings.length > 0 && (
        <div className="guardrails-box" role="alert">
          <strong>Guardrails triggered</strong>
          <ul>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="info-callout">
        <Tooltip content="These estimates use illustrative market coefficients. Actual win rates depend on client relationships, proposal quality, and factors not captured here.">
          <span className="info-icon" aria-hidden="true">i</span>
        </Tooltip>
        {' '}Win probability and NPV use stylized utility coefficients, not historical market data.
        Treat as directional planning estimates.
      </div>
    </section>
  );
}
