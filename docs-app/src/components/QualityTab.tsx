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
      <h2>Agent fidelity estimates</h2>
      <p>
        These scores estimate <strong>agent-human response fidelity</strong> — how
        consistently an AI agent's answers match what the source participant would
        actually say. This is meaningfully different from survey reliability in the
        traditional sense. Reliability describes how consistently a human answers
        the same question twice. Fidelity describes how accurately an agent
        represents a specific person on measured items. The former is a property
        of the instrument; the latter is a property of the agent's approximation
        of the person.
      </p>
      <p>
        The 0.85 anchor from Park et al. (2024, arXiv:2411.10109) represents
        agent-human agreement <em>normalized against</em> human test-retest
        consistency as a ceiling. The logic: since humans are not perfectly
        consistent with themselves, expecting perfect agent-human agreement is an
        unfair standard. The right question is whether agents track their source
        participants about as well as those participants track themselves. At 0.85,
        the Park et al. agents cleared that bar for GSS attitude items with
        2-hour GPT-4 interviews.
      </p>

      <QualityCurveChart cfg={cfg} threshold={threshold} />

      <h3>Estimated fidelity by construct type</h3>
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
          Two of the three construct bases are anchored to Park et al. (2024, arXiv:2411.10109).
          The 0.85 base for attitudes and beliefs reflects agent-human agreement on GSS attitude
          items, normalized against human test-retest consistency, from 2-hour GPT-4 interviews
          with 1,052 participants. The 0.66 base for incentivized behaviors reflects the lower
          fidelity observed in the same paper's economic game experiments (trust game, ultimatum
          game), where agents tracked participants less closely than on attitude items. The 0.75
          base for self-reported behaviors is the most extrapolated of the three — it sits between
          the two paper-anchored values but is not directly measured in the paper.
        </p>
        <p>
          Uncertainty bands reflect this evidence structure. Attitudes carry
          ±{QUALITY_UNCERTAINTY_BANDS.attitude_belief.toFixed(2)} (large paper-anchored sample).
          Incentivized behaviors carry
          ±{QUALITY_UNCERTAINTY_BANDS.incentivized_behavior.toFixed(2)} (also paper-anchored, but
          smaller economic game sample and different task structure). Self-reported behaviors carry
          ±{QUALITY_UNCERTAINTY_BANDS.self_report_behavior.toFixed(2)} (least directly tested;
          extrapolated from the two anchored constructs). These are modeling conventions, not
          empirically validated confidence intervals.
        </p>
        <p>
          What fidelity comparisons can and cannot establish. This approach captures
          one dimension of validity: whether agents reproduce their source participants'
          responses on measured items. It does not establish construct validity (does the
          instrument measure the intended latent construct?), discriminant validity
          (do agents correctly differentiate respondents?), or topical generalizability
          (does fidelity hold for questions outside the interview's domain?). Those
          remain open empirical questions for a pilot to begin addressing.
        </p>
        <p>
          Memory architecture parameters (retrieval k, reflection cadence, importance
          weighting) affect scores through transparent multipliers. These are
          theoretically motivated heuristics, not measured effect sizes.
        </p>
        <p style={{ opacity: 0.55, fontSize: '0.82em', marginTop: 12 }}>
          Model defaults last updated February 2026. The evidence base for digital panel twin
          approaches is evolving quickly. Anchors, penalties, and uncertainty bands should be
          revisited as new published results become available.
        </p>
      </div>
    </section>
  );
}
