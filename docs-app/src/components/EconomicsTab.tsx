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
        Cost-per-project reflects a {cfg.sampling.scaleup_n.toLocaleString()}-participant
        deployment study (set via "Deployment study size" in the sidebar); the Cost tab
        shows the smaller pilot. All four alternative prices cover equivalent scope: data
        collection or generation, representativeness adjustments, and a weighted dataset —
        not custom analysis or reporting. Win probability and NPV use{' '}
        <Tooltip content="Utility weights (quality=3.2, brand=1.1, tailwind=0.8, price=0.000012, turnaround=0.03) are scenario planning defaults, not fitted to historical win/loss data. Market share is estimated from a multinomial logit model.">
          <span className="info-icon" aria-hidden="true">i</span>
        </Tooltip>
        {' '}illustrative scenario coefficients, not fitted market data — treat them as
        directional planning signals. Competitor prices are adjustable in Advanced settings.{' '}
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
          <tr><th>Market share (Fully synthetic)</th><td>{pct(finance.market_share_external_synthetic)}</td></tr>
          <tr>
            <th>
              Deployment study cost
              <Tooltip content={`Total cost of running one study at deployment scale (${cfg.sampling.scaleup_n.toLocaleString()} participants, scaleup mode). This is the cost-per-project used in NPV and gross margin calculations.`}>
                {' '}<span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </th>
            <td>{money(deploymentCosts.total_cost)}</td>
          </tr>
          <tr>
            <th>
              Gross margin
              <Tooltip content="(Price per project − deployment study cost) / price per project. Does not include customer acquisition cost or other fixed costs.">
                {' '}<span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </th>
            <td>{pct(finance.gross_margin)}</td>
          </tr>
          <tr><th>Total upfront investment</th><td>{money(finance.total_upfront_investment)}</td></tr>
          <tr><th>Cumulative contribution</th><td>{money(finance.contribution_margin_total)}</td></tr>
          <tr><th>Projected NPV</th><td><strong>{money(finance.npv)}</strong></td></tr>
          <tr><th>Break-even</th><td>{finance.time_to_break_even_months ? `${finance.time_to_break_even_months} months` : `Not within ${cfg.revenue.horizon_months} months`}</td></tr>
        </tbody>
      </table>

      <p style={{ opacity: 0.65, fontSize: '0.88em', marginTop: 16 }}>
        Refresh wave pricing is included in the revenue model but per-refresh operational
        costs are not modeled on the cost side. For discussion of topical extrapolation
        limits and agent profile drift, see the Fidelity tab methods note.
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
