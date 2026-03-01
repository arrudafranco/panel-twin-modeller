import { QualityCurveChart } from './charts/QualityCurveChart.tsx';
import type { ScenarioConfig } from '../model/params.ts';
import type { ComputedResults } from '../hooks/useScenario.ts';
import { QUALITY_UNCERTAINTY_BANDS } from '../model/params.ts';

interface Props {
  cfg: ScenarioConfig;
  results: ComputedResults;
}

const CONSTRUCT_LABELS: Record<string, string> = {
  mixed_general: 'Mixed general (attitudes, opinions, behaviors)',
  behavioral_recall: 'Behavioral recall (frequency and history items)',
  incentivized_behavior: 'Incentivized / economic experiments',
};

export function QualityTab({ cfg, results }: Props) {
  const { qualityTiers: tiers, threshold } = results;

  return (
    <section id="panel-quality" role="tabpanel" aria-labelledby="tab-quality">
      <h2>Agent fidelity estimates</h2>
      <p>
        These scores estimate <strong>agent-human response fidelity</strong>, meaning how
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
        the Park et al. agents cleared that bar across the full GSS Core (177 items
        spanning attitudes, self-reported behaviors, and demographics) with 2-hour GPT-4 interviews.
      </p>

      <QualityCurveChart cfg={cfg} threshold={threshold} />

      <h3>Estimated fidelity by study type</h3>
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

        <h4>What the paper actually measured</h4>
        <p>
          Park et al. (2024, arXiv:2411.10109) evaluated agent fidelity against the
          full <strong>GSS Core</strong>, covering 177 categorical items spanning attitudes,
          self-reported behaviors (church attendance, voting, gun ownership, work status,
          and others), opinions, and demographics. The 0.85 normalized accuracy is an
          average across all of these, not specifically for attitude items. The paper's
          empirical distinction is between the GSS Core overall (0.85) and economic game
          experiments — trust game, ultimatum game — where agents tracked participants
          less closely (0.66). Attitudes and self-reported behaviors are not separated
          within the 0.85 figure.
        </p>

        <h4>How the three study-type categories are derived</h4>
        <p>
          Two of the three categories are directly anchored in Park et al. (2024).
          Mixed general surveys — studies combining attitudes, opinions, and behavioral
          recall items, like the GSS Core — sit at 0.85 (1,052 participants, 177 items
          spanning all of those item types). Incentivized experiments — trust games,
          ultimatum games, and similar revealed-preference tasks — also come directly
          from the same paper, where agents tracked participants less closely at 0.66
          (economic game subsample, smaller, structurally different task).
          Behavioral recall surveys — studies focused primarily on concrete behavioral
          frequency or recall items (health behaviors, voting history, activity tracking)
          — sit at 0.80, the only extrapolated category. It is a conservative planning
          discount below the GSS Core anchor, not a separately measured result. The
          theoretical rationale is that behavioral recall items lean more heavily on
          episodic memory retrieval than attitude introspection, a difference that is
          plausible but untested in the genagents context.
        </p>

        <h4>Uncertainty bands</h4>
        <p>
          Bands reflect evidence proximity, not statistical confidence intervals.
          Mixed general surveys carry ±{QUALITY_UNCERTAINTY_BANDS.mixed_general.toFixed(2)} (large
          directly anchored sample). Incentivized experiments carry
          ±{QUALITY_UNCERTAINTY_BANDS.incentivized_behavior.toFixed(2)} (also anchored,
          but smaller economic game sample). Behavioral recall surveys carry
          ±{QUALITY_UNCERTAINTY_BANDS.behavioral_recall.toFixed(2)} (same as incentivized,
          because the 0.80 estimate is a modest extrapolation with a plausible theoretical
          basis, not a pure interpolation). These are conventions for scenario planning,
          not formally derived intervals.
        </p>

        <h4>What fidelity does and does not capture</h4>
        <p>
          Fidelity measures one dimension of validity: whether agents reproduce their
          source participants' responses on measured items. It does not establish
          construct validity (does the instrument measure the intended latent
          construct?), discriminant validity (do agents correctly differentiate
          respondents?), or topical generalizability (does fidelity hold for questions
          outside the interview's domain?). Those remain open empirical questions for
          a pilot to address.
        </p>

        <h4>Agent profile drift and library shelf life</h4>
        <p>
          Fidelity estimates describe accuracy at the time of the interview. As real
          participants' beliefs and circumstances evolve, agent responses diverge from
          what those participants would currently say. The rate of this drift has no
          published estimates for interview-based AI agents. A library may remain
          accurate for months or degrade within weeks for fast-moving topics. The
          economics model does not currently include refresh wave revenue or operational
          costs, because the trigger conditions are not yet estimable. Net present value (NPV) projections
          beyond 12–18 months should be treated as conditional on library validity.
        </p>

        <h4>Memory architecture parameters</h4>
        <p>
          Retrieval k, reflection cadence, and importance weighting affect scores
          through transparent multipliers. These are theoretically motivated heuristics,
          not measured effect sizes.
        </p>

        <p style={{ opacity: 0.55, fontSize: '0.82em', marginTop: 12 }}>
          Model defaults last updated March 2026. The evidence base for digital panel
          twin approaches is evolving quickly. Anchors, penalties, and uncertainty bands
          should be revisited as new published results become available.
        </p>
      </div>
    </section>
  );
}
