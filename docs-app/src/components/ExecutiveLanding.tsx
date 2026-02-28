import { useMemo } from 'react';
import { createDefaultConfig, qualityScore, qualityTiers, computeCosts, computeFinance, recommendedQualityThreshold, qualityMarketAdjustment } from '../model/index.ts';

interface Props {
  onEnterExplorer: () => void;
}

export function ExecutiveLanding({ onEnterExplorer }: Props) {
  // Pre-compute headline stats at default settings for the static summary
  const baseStats = useMemo(() => {
    const cfg = createDefaultConfig();
    const tiers = qualityTiers(cfg);
    const threshold = recommendedQualityThreshold(cfg, 'attitude_belief');
    const costs = computeCosts(cfg);
    const qualEval = qualityMarketAdjustment(tiers.attitude_belief, threshold);
    const finance = computeFinance(cfg, costs.cost_per_completed_interview, qualEval.effective_quality_for_market);

    // Compute the minimum viable interview duration (where quality crosses threshold)
    let minViableMinutes = 0;
    for (let m = 30; m <= 180; m += 5) {
      if (qualityScore(cfg, 'attitude_belief', m) >= threshold) {
        minViableMinutes = m;
        break;
      }
    }

    return {
      attitudeQuality: tiers.attitude_belief,
      behaviorQuality: tiers.self_report_behavior,
      incentivizedQuality: tiers.incentivized_behavior,
      threshold,
      costPerInterview: costs.cost_per_completed_interview,
      totalCost: costs.total_cost,
      npv: finance.npv,
      breakEvenMonth: finance.time_to_break_even_months,
      winProb: finance.win_probability,
      minViableMinutes,
    };
  }, []);

  return (
    <div className="landing">
      {/* Hero */}
      <section className="landing-hero">
        <h1 className="landing-hero-title">Panel Twin Modeller</h1>
        <p className="landing-hero-subtitle">
          Explore whether AI-powered digital twins of survey panelists can
          deliver research-grade quality at scale.
        </p>
      </section>

      {/* What is a digital panel twin? */}
      <section className="landing-section">
        <h2>What is a digital panel twin?</h2>
        <p>
          A digital panel twin is a generative AI agent that can simulate a real person's
          survey responses. These agents can be constructed from various data sources
          (demographic profiles, behavioral records, interview transcripts, prior survey
          responses) and use large language models to generate answers as the original
          person would. The richer the source data, the higher the expected fidelity.
        </p>
        <p>
          This tool models a specific, interview-based approach to constructing twins,
          inspired by Stanford HCI research (Park et al., 2024). In that study, agents
          built from 2-hour qualitative interviews replicated participants' survey
          responses with 85% of human test-retest reliability. Our model explores
          the feasibility of operationalizing this approach at scale.
        </p>
        {/* CSS-based diagram */}
        <div className="twin-diagram" aria-label="Diagram showing the interview-based approach: from a qualitative interview to a digital agent to survey responses">
          <div className="twin-step">
            <div className="twin-step-icon">1</div>
            <div className="twin-step-label">Qualitative interview</div>
            <div className="twin-step-detail">In-depth conversation with each participant</div>
          </div>
          <div className="twin-arrow" aria-hidden="true"></div>
          <div className="twin-step">
            <div className="twin-step-icon">2</div>
            <div className="twin-step-label">Agent construction</div>
            <div className="twin-step-detail">Transcript becomes agent memory</div>
          </div>
          <div className="twin-arrow" aria-hidden="true"></div>
          <div className="twin-step">
            <div className="twin-step-icon">3</div>
            <div className="twin-step-label">Survey simulation</div>
            <div className="twin-step-detail">Agent answers new questions on demand</div>
          </div>
        </div>
      </section>

      {/* What does this tool do? */}
      <section className="landing-section">
        <h2>What does this tool do?</h2>
        <div className="landing-cards">
          <div className="landing-card">
            <div className="landing-card-icon" aria-hidden="true">Q</div>
            <h3>Estimates quality</h3>
            <p>
              How closely can an AI agent replicate a real person's survey responses?
              The model factors in interview duration, memory architecture, and construct type.
            </p>
          </div>
          <div className="landing-card">
            <div className="landing-card-icon" aria-hidden="true">$</div>
            <h3>Projects costs</h3>
            <p>
              What does it take to build and run these agents? Covers recruitment,
              incentives, voice infrastructure, LLM tokens, labor, and overhead.
            </p>
          </div>
          <div className="landing-card">
            <div className="landing-card-icon" aria-hidden="true">N</div>
            <h3>Models economics</h3>
            <p>
              Is this commercially viable? When does it break even?
              Includes market positioning against traditional and synthetic competitors.
            </p>
          </div>
          <div className="landing-card">
            <div className="landing-card-icon" aria-hidden="true">B</div>
            <h3>Benchmarks against federal standards</h3>
            <p>
              How does agent quality compare to real survey retest reliability?
              Validated against NSDUH, BRFSS, HINTS, and GSS benchmarks.
            </p>
          </div>
        </div>
      </section>

      {/* Static Model Insights */}
      <section className="landing-section">
        <h2>What the model tells us</h2>
        <p className="landing-section-intro">
          Even before adjusting parameters, the model's structure reveals several
          important patterns about the feasibility landscape.
        </p>
        <div className="insight-grid">
          <div className="insight-card">
            <h3>Quality varies sharply by construct</h3>
            <p>
              Attitudes and beliefs (estimated at {baseStats.attitudeQuality.toFixed(2)} at
              default settings) are the strongest candidates for digital twins, well above the
              benchmark threshold of {baseStats.threshold.toFixed(2)}.
              Self-reported behaviors ({baseStats.behaviorQuality.toFixed(2)}) are borderline.
              Incentivized behaviors ({baseStats.incentivizedQuality.toFixed(2)}) fall clearly
              below threshold with current evidence.
            </p>
          </div>
          <div className="insight-card">
            <h3>Interview duration has diminishing returns</h3>
            <p>
              Quality improves logarithmically with interview length. Moving from 30 to 90
              minutes produces the largest gains. Beyond ~120 minutes, additional time yields
              marginal improvement. The minimum viable duration for clearing the
              attitude/belief threshold is approximately {baseStats.minViableMinutes > 0 ? `${baseStats.minViableMinutes} minutes` : 'below 30 minutes (already passing at minimum)'}
              under default assumptions.
            </p>
          </div>
          <div className="insight-card">
            <h3>Cost structure is labor-dominated</h3>
            <p>
              At current token prices, LLM inference is a small fraction of total cost.
              The largest cost drivers are labor (protocol design, engineering, QA) and
              recruitment. This means cost reductions will come primarily from operational
              efficiency rather than model price drops, though token costs matter at scale.
            </p>
          </div>
          <div className="insight-card">
            <h3>Economics are sensitive to win probability</h3>
            <p>
              The business case depends heavily on competitive positioning. Small changes
              in quality, pricing, or brand trust can shift win probability (currently
              {' '}{(baseStats.winProb * 100).toFixed(0)}% at defaults) enough to change the
              NPV sign. The utility coefficients driving these estimates are illustrative,
              not fitted to market data.
            </p>
          </div>
          <div className="insight-card">
            <h3>Uncertainty is asymmetric</h3>
            <p>
              Quality estimates for attitudes carry ±0.06 uncertainty (paper-anchored).
              For incentivized behaviors, uncertainty doubles to ±0.12. The Monte Carlo
              simulation captures this asymmetry and typically shows a wider NPV
              distribution for less-studied constructs.
            </p>
          </div>
          <div className="insight-card">
            <h3>Federal applications face a higher bar</h3>
            <p>
              Federal/high-risk settings apply a 0.05 quality uplift to the benchmark
              threshold plus an 0.08 utility penalty. This meaningfully narrows the
              window of viable configurations, especially for non-attitude constructs.
            </p>
          </div>
        </div>
      </section>

      {/* Key findings at defaults */}
      <section className="landing-section">
        <h2>Headline numbers at default settings</h2>
        <p className="landing-section-intro">
          Using the base pilot scenario (100 participants, 120-minute interviews, attitude/belief construct).
        </p>
        <div className="landing-kpis">
          <div className="landing-kpi">
            <div className="landing-kpi-value">{baseStats.attitudeQuality.toFixed(2)}</div>
            <div className="landing-kpi-label">Attitude quality score</div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-value">${Math.round(baseStats.costPerInterview).toLocaleString()}</div>
            <div className="landing-kpi-label">Cost per interview</div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-value">${(baseStats.npv / 1000).toFixed(0)}k</div>
            <div className="landing-kpi-label">Projected NPV</div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-value">
              {baseStats.breakEvenMonth ? `${baseStats.breakEvenMonth} mo` : 'N/A'}
            </div>
            <div className="landing-kpi-label">Break-even</div>
          </div>
        </div>
      </section>

      {/* Who is this for? */}
      <section className="landing-section">
        <h2>Who is this for?</h2>
        <div className="audience-row">
          <div className="audience-card">
            <strong>Survey methodologists</strong>
            <p>Evaluate quality benchmarks and construct-specific feasibility.</p>
          </div>
          <div className="audience-card">
            <strong>AI and data science teams</strong>
            <p>Understand the agent architecture, memory systems, and calibration approach.</p>
          </div>
          <div className="audience-card">
            <strong>Business strategists</strong>
            <p>Model economics, competitive positioning, and go/no-go decisions.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <button className="cta-button" onClick={onEnterExplorer}>
          Explore the model
        </button>
        <p className="cta-note">
          Adjust parameters and see how quality, cost, and economics respond in real time.
        </p>
      </section>
    </div>
  );
}
