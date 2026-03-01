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
  const { finance, mcResult } = results;

  return (
    <section id="panel-economics" role="tabpanel" aria-labelledby="tab-economics">
      <h2>Feasibility and market context</h2>
      <p>
        Fidelity and cost do not exist in isolation. They shape whether this approach
        is viable at scale and how it compares to alternative research methods. This
        section connects those methodological trade-offs to business outcomes, illustrating
        what the investment case might look like under different assumptions and how the
        approach positions relative to alternatives.
      </p>

      {/* Scope clarification */}
      <div className="info-callout" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 15, lineHeight: 1, marginTop: 1 }}>ℹ</span>
        <span>
          The <strong>Cost tab</strong> shows what the initial pilot study costs (recruitment,
          interviews, agent construction). The projections on this page model a
          hypothetical deployment after the pilot has validated quality, to help frame
          the investment decision and illustrate cost-quality trade-offs relative to
          alternative research approaches. All project prices — Panel Twin and alternatives alike —
          reflect full-service scope at equivalent deliverables: data collection or generation,
          representativeness adjustments, and a weighted dataset. Custom analysis and reporting
          are not included in any price. Refresh costs and nationally representative panel
          build-out are also not included and are important additional considerations before committing to scale.
        </span>
      </div>

      {/* Fix 1: Prominent coefficient warning */}
      <div className="coefficient-warning">
        <Tooltip content="Utility weights (quality=3.2, brand=1.1, tailwind=0.8, price=0.000012, turnaround=0.03) are scenario planning defaults, not fitted to historical market data. Market share is estimated from a multinomial logit model. Gross margin = (price − cost per project) / price.">
          <span className="info-icon" aria-hidden="true">i</span>
        </Tooltip>
        {' '}Win probability and market share use illustrative competition model coefficients. Actual
        win rates depend on client relationships, proposal quality, and factors not captured here.
        Treat NPV and break-even as directional planning signals, not forecasts. Competitor prices
        and quality scores are editable in Advanced settings.
      </div>

      <NpvTimelineChart finance={finance} />
      <MarketRadarChart cfg={cfg} quality={results.quality} finance={finance} />

      <h3>Financial summary</h3>
      <table className="data-table">
        <tbody>
          <tr>
            <th>
              Win probability
              <Tooltip content="Probability Panel Twin wins a head-to-head proposal, derived from the utility-based competition model.">
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
              Gross margin
              <Tooltip content="(Price per project − cost per completed interview) / price per project. Does not include CAC or other fixed costs.">
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

      {/* Topical extrapolation note */}
      <div className="methods-note" style={{ marginTop: 20 }}>
        <h3>A key open question: topical extrapolation</h3>
        <p>
          We do not yet know how broadly an agent trained on one interview can be trusted to answer
          questions outside the domains that interview covered. If topical extrapolation proves limited,
          additional targeted "module" interviews for specific research topic areas may be needed.
          This would add cost and participant burden but could enable coverage of multiple profitable
          research verticals from a single base panel.
        </p>
        <p>
          Similarly, agent profiles will drift as respondents' lives, opinions, and circumstances change.
          The appropriate refresh interval is unknown and likely construct-dependent. Refresh wave pricing
          is included in the revenue model but refresh costs are not yet modeled on the cost side.
        </p>
      </div>

      {/* Monte Carlo section */}
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
