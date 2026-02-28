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

export function EconomicsTab({ cfg, results, mcEnabled, setMcEnabled }: Props) {
  const { finance, mcResult } = results;

  return (
    <section id="panel-economics" role="tabpanel" aria-labelledby="tab-economics">
      <h2>Economics and market positioning</h2>

      {/* Fix 1: Prominent coefficient warning */}
      <div className="coefficient-warning">
        <Tooltip content="quality=3.2, brand=1.1, tailwind=0.8, price=0.000012, turnaround=0.03. These are scenario planning defaults, not market-fitted estimates.">
          <span className="info-icon" aria-hidden="true">i</span>
        </Tooltip>
        {' '}These estimates use illustrative market coefficients. Actual win rates depend on
        client relationships, proposal quality, and factors not captured here. Treat NPV and
        win probability as directional signals for planning, not forecasts.
      </div>

      <NpvTimelineChart finance={finance} />
      <MarketRadarChart cfg={cfg} quality={results.quality} finance={finance} />

      <h3>Financial summary</h3>
      <table className="data-table">
        <tbody>
          <tr><th>Win probability</th><td>{(finance.win_probability * 100).toFixed(1)}%</td></tr>
          <tr><th>Market share (Panel Twin)</th><td>{(finance.market_share_panel_twin * 100).toFixed(1)}%</td></tr>
          <tr><th>Market share (Probability benchmark)</th><td>{(finance.market_share_probability_benchmark * 100).toFixed(1)}%</td></tr>
          <tr><th>Market share (Hybrid benchmark)</th><td>{(finance.market_share_hybrid_benchmark * 100).toFixed(1)}%</td></tr>
          <tr><th>Market share (External synthetic)</th><td>{(finance.market_share_external_synthetic * 100).toFixed(1)}%</td></tr>
          <tr><th>Gross margin</th><td>{(finance.gross_margin * 100).toFixed(1)}%</td></tr>
          <tr><th>Total upfront investment</th><td>{money(finance.total_upfront_investment)}</td></tr>
          <tr><th>Cumulative contribution</th><td>{money(finance.contribution_margin_total)}</td></tr>
          <tr><th>Projected NPV</th><td><strong>{money(finance.npv)}</strong></td></tr>
          <tr><th>Break-even</th><td>{finance.time_to_break_even_months ? `${finance.time_to_break_even_months} months` : `Not within ${cfg.revenue.horizon_months} months`}</td></tr>
        </tbody>
      </table>

      {/* Monte Carlo section */}
      <div className="mc-section">
        <h3>Uncertainty analysis (Monte Carlo)</h3>
        <p>
          Run {cfg.mode === 'pilot' ? '500' : '500'} simulations varying interview duration,
          response rate, and attrition to see the distribution of possible outcomes.
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
