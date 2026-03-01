import { NpvTimelineChart } from './charts/NpvTimelineChart.tsx';
import { MarketRadarChart } from './charts/MarketRadarChart.tsx';
import { MonteCarloChart } from './charts/MonteCarloChart.tsx';
import { Tooltip } from './ui/Tooltip.tsx';
import type { ScenarioConfig } from '../model/params.ts';
import type { ComputedResults } from '../hooks/useScenario.ts';

interface Props {
  cfg: ScenarioConfig;
  results: ComputedResults;
  mcEnabled: boolean;
  setMcEnabled: (v: boolean) => void;
}

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function EconomicsTab({ cfg, results, mcEnabled, setMcEnabled }: Props) {
  const { finance, mcResult, deploymentCosts } = results;

  return (
    <section id="panel-economics" role="tabpanel" aria-labelledby="tab-economics">
      <h2>Feasibility and market context</h2>
      <p>
        Fidelity and cost do not exist in isolation. They shape whether this approach
        is viable at scale and how it compares to alternative research methods. This
        section connects those trade-offs to business outcomes, illustrating what the
        investment case might look like under different assumptions and how the approach
        positions relative to alternatives.
      </p>
      <p className="economics-context-note">
        This model uses a two-phase cost structure. The library build (AI-conducted interviews
        with {cfg.sampling.scaleup_n.toLocaleString()} participants, incentives, voice ops, and
        setup) is a one-time investment that enables many subsequent projects. Each project sold
        then incurs only per-project run costs: LLM inference, QA, PM, and data delivery against
        the existing agent library. This transforms the cost structure from linear (pay per study)
        toward fixed-plus-marginal. The Cost tab shows the smaller validation pilot.
        All four alternative prices cover equivalent deliverable scope: data collection or
        generation, representativeness adjustments, and a weighted dataset. Win probability and
        NPV use{' '}
        <Tooltip content="Utility weights (quality=3.2, brand=1.1, tailwind=0.8, price=0.000012, turnaround=0.03) are scenario planning defaults, not fitted to historical win/loss data. Market share is estimated from a multinomial logit model.">
          <span className="info-icon" aria-hidden="true">i</span>
        </Tooltip>
        {' '}illustrative scenario coefficients — treat them as directional planning signals.{' '}
        <span style={{ opacity: 0.55, fontSize: '0.88em' }}>Defaults: February 2026.</span>
      </p>

      <NpvTimelineChart finance={finance} />
      <MarketRadarChart cfg={cfg} quality={results.quality} finance={finance} />

      <h3>Financial summary</h3>
      <table className="data-table">
        <tbody>
          <tr>
            <th>
              Win probability
              <Tooltip content="Estimated probability of winning a project over the modeled alternatives, derived from the utility-based competition model.">
                {' '}<span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </th>
            <td>{pct(finance.win_probability)}</td>
          </tr>
          <tr><th>Market share (Panel Twin)</th><td>{pct(finance.market_share_panel_twin)}</td></tr>
          <tr><th>Market share (Probability benchmark)</th><td>{pct(finance.market_share_probability_benchmark)}</td></tr>
          <tr><th>Market share (Hybrid benchmark)</th><td>{pct(finance.market_share_hybrid_benchmark)}</td></tr>
          <tr><th>Market share (Non-prob panel)</th><td>{pct(finance.market_share_nonprob_panel)}</td></tr>
          <tr>
            <th>
              Library build cost
              <Tooltip content={`One-time cost to conduct AI voice interviews with ${cfg.sampling.scaleup_n.toLocaleString()} participants, construct their agents, and set up the infrastructure. Included in total upfront investment; not charged per project.`}>
                {' '}<span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </th>
            <td>{money(deploymentCosts.total_cost)}</td>
          </tr>
          <tr>
            <th>
              Per-project run cost
              <Tooltip content="Recurring cost per project sold against the existing library. Covers LLM inference, per-project QA, PM, and data delivery. Does not include new interviews or incentives.">
                {' '}<span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </th>
            <td>{money(cfg.revenue.per_project_run_cost)}</td>
          </tr>
          <tr>
            <th>
              Gross margin
              <Tooltip content="(Price per project − per-project run cost) / price per project. Reflects variable margin on each project sold after the library is built. Does not include amortization of library build cost or customer acquisition cost.">
                {' '}<span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </th>
            <td>{pct(finance.gross_margin)}</td>
          </tr>
          <tr>
            <th>
              Total upfront investment
              <Tooltip content="Library build cost plus CAC and any other initial investment. This is what needs to be recovered before break-even.">
                {' '}<span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </th>
            <td>{money(finance.total_upfront_investment)}</td>
          </tr>
          <tr><th>Cumulative contribution</th><td>{money(finance.contribution_margin_total)}</td></tr>
          <tr><th>Projected NPV</th><td><strong>{money(finance.npv)}</strong></td></tr>
          <tr><th>Break-even</th><td>{finance.time_to_break_even_months ? `${finance.time_to_break_even_months} months` : `Not within ${cfg.revenue.horizon_months} months`}</td></tr>
        </tbody>
      </table>

      <p style={{ opacity: 0.65, fontSize: '0.88em', marginTop: 16 }}>
        Refresh wave revenue is included in the model but refresh operational costs are not
        modeled on the cost side. The useful life of a twin library before agents need
        re-interviewing is unknown. For discussion of topical generalizability limits and
        agent profile drift over time, see the Fidelity tab.
      </p>

      <div className="mc-section">
        <h3>Uncertainty analysis (Monte Carlo)</h3>
        <p>
          Run 500 simulations varying interview duration, response rate, and attrition
          to see the distribution of possible NPV outcomes.
        </p>
        <label className="mc-toggle">
          <input
            type="checkbox"
            checked={mcEnabled}
            onChange={(e) => setMcEnabled(e.target.checked)}
          />
          {' '}Enable Monte Carlo simulation
        </label>
        {mcEnabled && mcResult && <MonteCarloChart mcResult={mcResult} />}
        {mcEnabled && !mcResult && <p>Computing...</p>}
      </div>
    </section>
  );
}
