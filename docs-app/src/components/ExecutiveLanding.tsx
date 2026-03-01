import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createDefaultConfig, qualityScore, qualityTiers, computeCosts, computeFinance, recommendedQualityThreshold, qualityMarketAdjustment } from '../model/index.ts';

interface InsightDef {
  title: string;
  summary: string;
  methodology: string[];
  citations?: string[];
}

const INSIGHTS: InsightDef[] = [
  {
    title: "Quality varies sharply by construct",
    summary: "Attitudes and beliefs are the strongest candidates for digital twins. Self-reported behaviors are borderline. Incentivized and economic behaviors fall below threshold with current evidence.",
    methodology: [
      "The 0.85 base accuracy estimate is anchored to Park et al. (2024) genagents, where GPT-4 agents built from ~2-hour interviews on GSS attitude items matched human test-retest reliability at 85%. This is the only direct published anchor for this approach.",
      "Two bases are paper-anchored: attitudes and beliefs at 0.85 (GSS attitude items, 1,052 participants) and incentivized/economic behaviors at 0.66 (economic game experiments in the same paper, showing lower agent-human agreement). Self-reported behaviors (0.75) are the most extrapolated of the three — interpolated between the two anchors, not directly measured.",
      "Uncertainty bands reflect this evidence structure: ±0.06 for attitudes (most directly anchored), ±0.10 for incentivized behaviors (also anchored but smaller economic game sample), ±0.12 for self-reported behaviors (least directly tested). These are modeling conventions, not empirically validated confidence intervals.",
      "Extrapolation to constructs or LLMs not studied in the original paper should be treated with caution. The uncertainty bands are a modeling convention, not empirically validated confidence intervals.",
    ],
    citations: [
      "Park et al. (2024). Generative Agent Simulations of 1,000 People. arXiv:2411.10109. https://arxiv.org/abs/2411.10109",
    ],
  },
  {
    title: "Interview duration has diminishing returns",
    summary: "Quality improves logarithmically with interview length. Moving from 30 to 90 minutes produces the largest gains. Beyond ~120 minutes, additional time yields marginal improvement.",
    methodology: [
      "Quality is modeled as base × log-linear penalty/bonus relative to a 120-minute reference point (the genagents interview length). The log functional form reflects the intuition that each additional hour adds less marginal information than the previous one.",
      "This functional form is a modeling assumption. The actual sensitivity of agent quality to interview length has not been directly measured and published for this construction approach. Extrapolating outside the 60–150 minute range carries higher uncertainty.",
      "The threshold crossover point (minimum interview length to clear the quality benchmark) depends on construct type, memory architecture, and the benchmark filter mode. Under default settings, attitude/belief constructs typically clear the threshold well before 60 minutes.",
    ],
    citations: [
      "Park et al. (2024). Generative Agent Simulations of 1,000 People. arXiv:2411.10109. https://arxiv.org/abs/2411.10109",
    ],
  },
  {
    title: "Recruitment and onboarding are the primary cost drivers",
    summary: "At current token prices, LLM inference is a small fraction of total pilot cost. The largest cost drivers are recruitment, participant incentives, and labor for protocol design, engineering, and compliance setup.",
    methodology: [
      "Recruitment cost: cost per invite ÷ response rate. At 25% response rate with $1 per invite and 100 participants, this implies 400 contacts. Incentives ($60 phase 1 + $30 phase 2) are the second largest per-participant cost.",
      "Labor costs cover one-time pilot setup: protocol design (20 hrs), engineering (60 hrs), QA (30 hrs), PM (25 hrs), IRB compliance (18 hrs) at $120/hr fully loaded. These are not ongoing operational staff costs.",
      "LLM token costs are modest at current pricing ($0.003/1K input, $0.012/1K output) but will scale with panel size and interview length at national deployment.",
      "Voice infrastructure: $0.007/min ASR (transcription) + $0.02/min TTS (AI interviewer voice). These are representative AI voice API rates as of early 2026; pricing changes frequently.",
      "These estimates do not include the cost of training on a nationally representative panel (which would require a probability sample like an RDD or address-based sample), or periodic refresh costs.",
    ],
  },
  {
    title: "Economics are sensitive to win probability",
    summary: "The business case depends heavily on competitive positioning. Small changes in quality, pricing, or brand trust can shift win probability enough to change the NPV sign.",
    methodology: [
      "Win probability is derived from a multinomial logit competition model. Each competitor's utility is computed as: U = quality×3.2 + brand×1.1 + tailwind×0.8 − price×0.000012 − turnaround×0.03. These coefficients are illustrative scenario planning defaults, not estimated from historical win/loss data.",
      "Market share is the softmax probability across all competitors' utilities. Panel Twin's win probability is its softmax share × net new demand fraction.",
      "Brand trust defaults: Panel Twin=0.70 (emerging product), Probability benchmark=0.92 (established), Hybrid benchmark=0.75, Fully synthetic=0.55. These can be adjusted in Advanced settings.",
      "A 10% change in the quality utility coefficient (3.2 → 2.9 or 3.5) can shift NPV by 15–30% under typical default settings. Treat NPV as a directional planning signal.",
    ],
  },
  {
    title: "Uncertainty is asymmetric",
    summary: "Quality uncertainty is wider for less-studied constructs. The Monte Carlo simulation captures this asymmetry and typically shows a wider NPV distribution when studying incentivized behaviors.",
    methodology: [
      "Uncertainty bands (±0.06, ±0.10, ±0.12 by construct) represent the range of plausible quality scores given the available evidence, not formal statistical confidence intervals.",
      "The Monte Carlo simulation draws 500 iterations from normal distributions centered at point estimates for interview duration, response rate, and attrition. A quality noise term proportional to the construct's uncertainty band is also added.",
      "P(NPV > 0) and break-even probability are reported from the empirical distribution of MC outcomes. Results are seeded for reproducibility.",
      "The asymmetric distribution of NPV outcomes reflects the fact that unfavorable scenarios (low quality, high attrition, low win rate) compound each other, while favorable scenarios are bounded above by market capacity.",
    ],
  },
  {
    title: "Federal applications face a higher bar",
    summary: "Federal and high-risk settings apply a quality threshold uplift and a market utility penalty, meaningfully narrowing the window of viable configurations.",
    methodology: [
      "Federal/high-risk quality threshold: benchmark quality + 0.05 uplift. This reflects stricter evidence requirements for federal research procurement, consistent with standards applied to longitudinal federal surveys like the NSDUH and BRFSS.",
      "Federal utility penalty: −0.08 applied to the market win probability. This reflects conservative federal buying behavior and risk-aversion in adopting novel research methods.",
      "Together, these adjustments mean that only configurations with near-attitude-level quality, strong brand trust, and competitive pricing are viable for federal contracts under current parameter assumptions.",
      "These are modeling conventions intended to distinguish commercial exploratory from federal high-stakes use cases. Actual federal procurement behavior varies substantially by agency, program, and contracting officer.",
    ],
    citations: [
      "NSDUH Reliability Study (SAMHSA). https://www.ncbi.nlm.nih.gov/books/NBK519788/",
      "BRFSS HRQOL Reliability (CDC). https://pubmed.ncbi.nlm.nih.gov/12700216/",
    ],
  },
];

interface ModalProps {
  insight: InsightDef;
  onClose: () => void;
}

function InsightModal({ insight, onClose }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    // Focus the modal on open
    modalRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return createPortal(
    <div
      className="insight-modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="insight-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insight-modal-title"
        ref={modalRef}
        tabIndex={-1}
      >
        <div className="insight-modal-header">
          <h2 className="insight-modal-title" id="insight-modal-title">{insight.title}</h2>
          <button
            className="insight-modal-close-x"
            onClick={onClose}
            aria-label="Close model notes"
          >
            ×
          </button>
        </div>

        <div className="insight-modal-body">
          {insight.methodology.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {insight.citations && insight.citations.length > 0 && (
          <div className="insight-modal-citations">
            <strong>Key references</strong>
            {insight.citations.map((c, i) => <div key={i}>{c}</div>)}
          </div>
        )}

        <div className="insight-modal-footer">
          <button className="insight-modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface Props {
  onEnterExplorer: () => void;
}

export function ExecutiveLanding({ onEnterExplorer }: Props) {
  const [openInsightIdx, setOpenInsightIdx] = useState<number | null>(null);
  const triggerRefs = useRef<Array<{ current: HTMLDivElement | null }>>(
    INSIGHTS.map(() => ({ current: null }))
  );

  const closeModal = useCallback(() => {
    const idx = openInsightIdx;
    setOpenInsightIdx(null);
    if (idx !== null && triggerRefs.current[idx]?.current) {
      triggerRefs.current[idx].current!.focus();
    }
  }, [openInsightIdx]);

  // Pre-compute headline stats at default settings for the static summary
  const baseStats = useMemo(() => {
    const cfg = createDefaultConfig();
    const tiers = qualityTiers(cfg);
    const threshold = recommendedQualityThreshold(cfg, 'attitude_belief');
    const costs = computeCosts(cfg);
    const qualEval = qualityMarketAdjustment(tiers.attitude_belief, threshold);
    const finance = computeFinance(cfg, costs.total_cost, qualEval.effective_quality_for_market);

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
          Explore whether digital twins built from AI-conducted voice interviews
          can deliver research-grade survey quality at scale.
        </p>
      </section>

      {/* What is a digital panel twin? */}
      <section className="landing-section">
        <h2>What is a digital panel twin?</h2>
        <p>
          A digital panel twin is a generative AI agent that can simulate a real person's
          survey responses. These agents are constructed from qualitative interview data
          and use large language models to generate answers as the original person would.
          The richer the source data, the higher the expected fidelity.
        </p>
        <p>
          This tool models a specific, interview-based approach inspired by Stanford HCI research
          (Park et al., 2024). In that study, agents built from ~2-hour qualitative interviews
          replicated participants' GSS survey responses with 85% of human test-retest reliability.
          A key innovation here is conducting those interviews using an AI voice agent rather than a
          human interviewer — enabling scale while maintaining semi-structured depth.
          Our model explores the feasibility of operationalizing this approach commercially.
        </p>
        {/* CSS-based diagram */}
        <div className="twin-diagram" aria-label="Diagram showing the AI interview-based approach: from an AI voice interview to a digital agent to survey responses">
          <div className="twin-step">
            <div className="twin-step-icon">1</div>
            <div className="twin-step-label">AI voice interview</div>
            <div className="twin-step-detail">AI-moderated semi-structured conversation with each participant</div>
          </div>
          <div className="twin-arrow" aria-hidden="true"></div>
          <div className="twin-step">
            <div className="twin-step-icon">2</div>
            <div className="twin-step-label">Agent construction</div>
            <div className="twin-step-detail">Transcript becomes agent memory and reflection</div>
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
            <h3>Projects pilot costs</h3>
            <p>
              What does it cost to build and test these agents? Covers recruitment,
              incentives, AI voice infrastructure, LLM tokens, labor, and overhead.
            </p>
          </div>
          <div className="landing-card">
            <div className="landing-card-icon" aria-hidden="true">N</div>
            <h3>Models commercial economics</h3>
            <p>
              If the pilot succeeds, is it commercially viable? When does deployment
              break even? Includes market positioning against traditional and synthetic competitors.
            </p>
          </div>
          <div className="landing-card">
            <div className="landing-card-icon" aria-hidden="true">B</div>
            <h3>Benchmarks against federal standards</h3>
            <p>
              How does agent quality compare to human survey retest reliability?
              Validated against NSDUH, BRFSS, and GSS benchmarks.
            </p>
          </div>
        </div>
      </section>

      {/* Static Model Insights — clickable */}
      <section className="landing-section">
        <h2>What the model tells us</h2>
        <p className="landing-section-intro">
          Even before adjusting parameters, the model's structure reveals several
          important patterns about the feasibility landscape. Click any card to read
          the model logic and assumptions behind each finding.
        </p>
        <div className="insight-grid">
          {INSIGHTS.map((ins, i) => (
            <div
              key={i}
              className="insight-card"
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`${ins.title}. Click for model notes.`}
              ref={(el) => { triggerRefs.current[i].current = el; }}
              onClick={() => setOpenInsightIdx(i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenInsightIdx(i); } }}
            >
              <h3>{ins.title}</h3>
              <p>{ins.summary}</p>
              <div className="insight-card-hint">Click for model notes</div>
            </div>
          ))}
        </div>

        {openInsightIdx !== null && (
          <InsightModal
            insight={INSIGHTS[openInsightIdx]}
            onClose={closeModal}
          />
        )}
      </section>

      {/* Key findings at defaults */}
      <section className="landing-section">
        <h2>Headline numbers at default settings</h2>
        <p className="landing-section-intro">
          Using the base pilot scenario (100 participants, 120-minute AI voice interviews, attitude/belief construct).
        </p>
        <div className="landing-kpis">
          <div className="landing-kpi">
            <div className="landing-kpi-value">{baseStats.attitudeQuality.toFixed(2)}</div>
            <div className="landing-kpi-label">Attitude fidelity score</div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-value">${Math.round(baseStats.costPerInterview).toLocaleString()}</div>
            <div className="landing-kpi-label">Cost per interview</div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-value">${(baseStats.npv / 1000).toFixed(0)}k</div>
            <div className="landing-kpi-label">Projected NPV (commercial)</div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-value">
              {baseStats.breakEvenMonth ? `${baseStats.breakEvenMonth} mo` : 'N/A'}
            </div>
            <div className="landing-kpi-label">Break-even (commercial)</div>
          </div>
        </div>
        <p className="cta-note" style={{ marginTop: 10, fontSize: 12 }}>
          NPV and break-even reflect a hypothetical commercial deployment after pilot validation,
          not the pilot study cost itself.
        </p>
      </section>

      {/* Who is this for? */}
      <section className="landing-section">
        <h2>Who is this for?</h2>
        <div className="audience-row">
          <div className="audience-card">
            <strong>Survey methodologists</strong>
            <p>Evaluate quality benchmarks and construct-specific feasibility against federal standards.</p>
          </div>
          <div className="audience-card">
            <strong>AI and data science teams</strong>
            <p>Understand the agent architecture, AI voice interview approach, memory systems, and calibration assumptions.</p>
          </div>
          <div className="audience-card">
            <strong>Business strategists</strong>
            <p>Model pilot costs, commercial economics, competitive positioning, and go/no-go decisions.</p>
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
        <p className="cta-note" style={{ marginTop: 12, opacity: 0.6, fontSize: 11 }}>
          Model defaults last updated February 2026. LLM pricing, ASR rates, and market conditions
          change rapidly. Review Advanced settings against current figures before drawing conclusions.
        </p>
      </section>
    </div>
  );
}
