import { QualityCurveChart } from './charts/QualityCurveChart.tsx';
import type { ScenarioConfig } from '../model/params.ts';
import type { ComputedResults } from '../hooks/useScenario.ts';
import { QUALITY_UNCERTAINTY_BANDS } from '../model/params.ts';

interface Props {
  cfg: ScenarioConfig;
  results: ComputedResults;
}

const CONSTRUCT_LABELS: Record<string, string> = {
  attitude_belief: 'Attitudes and beliefs',
  self_report_behavior: 'Self-reported behaviors',
  incentivized_behavior: 'Incentivized behaviors',
};

export function QualityTab({ cfg, results }: Props) {
  const { qualityTiers: tiers, threshold } = results;

  return (
    <section id="panel-quality" role="tabpanel" aria-labelledby="tab-quality">
      <h2>Quality estimates</h2>
      <p>
        Quality scores estimate how closely an AI agent can replicate a real person's
        survey responses. Scores are anchored to the 0.85 normalized accuracy reported
        by Park et al. (2024) for attitudes measured with 2-hour GPT-4 interviews.
      </p>

      <QualityCurveChart cfg={cfg} threshold={threshold} />

      <h3>Quality by construct type</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Construct</th>
            <th>Score</th>
            <th>Uncertainty (±)</th>
            <th>Threshold</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(tiers).map(([key, val]) => {
            const band = QUALITY_UNCERTAINTY_BANDS[key] ?? 0.08;
            const passes = val >= threshold;
            return (
              <tr key={key}>
                <td>{CONSTRUCT_LABELS[key] ?? key}</td>
                <td><strong>{val.toFixed(3)}</strong></td>
                <td>±{band.toFixed(2)}</td>
                <td>{threshold.toFixed(3)}</td>
                <td className={passes ? 'status-pass' : 'status-fail'}>
                  {passes ? 'Pass' : 'Below threshold'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="methods-note">
        <h3>Methods and limitations</h3>
        <p>
          The 0.85 base accuracy is anchored to 2-hour GSS attitude interviews using
          GPT-4 (Park et al., 2024). Quality estimates for shorter interviews, different
          constructs, or different LLMs carry wider uncertainty.
        </p>
        <p>
          Uncertainty bands are ±{QUALITY_UNCERTAINTY_BANDS.attitude_belief.toFixed(2)} for
          attitudes (paper-anchored),
          ±{QUALITY_UNCERTAINTY_BANDS.self_report_behavior.toFixed(2)} for self-reported behaviors
          (less evidence), and
          ±{QUALITY_UNCERTAINTY_BANDS.incentivized_behavior.toFixed(2)} for incentivized behaviors
          (least evidence).
        </p>
        <p>
          Memory architecture parameters (retrieval k, reflection cadence, importance weighting)
          affect quality through transparent multipliers. These are prompt-mediated heuristics,
          not direct measurements.
        </p>
      </div>
    </section>
  );
}
