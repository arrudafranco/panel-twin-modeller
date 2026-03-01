import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createDefaultConfig, qualityScore, qualityTiers, computeCosts, recommendedQualityThreshold } from '../model/index.ts';
import { Tooltip } from './ui/Tooltip.tsx';

interface InsightDef {
  title: string;
  summary: string;
  methodology: string[];
  citations?: string[];
}

const INSIGHTS: InsightDef[] = [
  {
    title: "Participant incentives dominate build cost — compute is nearly free",
    summary: "At 2,000 participants, incentives alone total $178K out of a ~$277K library build. LLM inference for those same 2,000 interviews costs roughly $220. The binding constraint is human compensation, not technology.",
    methodology: [
      "Incentive structure: $60 Phase 1 interview + ($30 × 0.8 retest rate) Phase 2 + $5 bonus = $89 per participant. At 2,000 participants: $178,000 — roughly 64% of the total library build cost.",
      "LLM inference for 2,000 interviews at 117 turns each: roughly $222 total at $0.003/1K input, $0.012/1K output tokens. Voice ops (ASR + TTS at $0.027/min × 120 min) add $6,480. Setup labor (153 hours at $120/hr) adds $18,360.",
      "Per-project run cost once the library exists: LLM inference to run a 50-item survey through 2,000 agents costs roughly $300–500. Total run cost including QA and PM is estimated at $5,000–15,000 — about 3–8% of the library build cost.",
      "Implication: the technology cost curve is not the binding constraint. LLM price changes have minimal impact on the investment case. Response rate and incentive levels have major impact. Scale decisions (how many participants) are primarily a human cost question.",
    ],
  },
  {
    title: "The cost structure transforms from linear to fixed-plus-marginal",
    summary: "Traditional survey research charges linear costs for every study. Panel Twin separates a one-time library build ($277K for 2,000 participants) from low marginal per-project run costs (~$10K). This is the same cost-structure shift that distinguishes SaaS from consulting.",
    methodology: [
      "Library build cost covers AI-conducted interviews, participant incentives, voice infrastructure, agent construction, setup labor, and overhead. This is a capital investment charged once (or per refresh cycle), not per project.",
      "Per-project run cost covers LLM inference, per-project QA, PM, and data delivery against the existing agent library. No new interviews or incentives. Default estimate: $10,000 per project.",
      "With 94% variable margin per project (at $180K price, $10K run cost), the break-even on the library investment depends on project volume over the library's useful life. At 6 projects/year, rough break-even is within 3–5 projects.",
      "The critical open question is library useful life: how many projects can run before agent profiles go stale and re-interviewing is needed. The model cannot answer this — it is an open empirical question. The NPV projections are conditional on the library remaining valid.",
    ],
  },
  {
    title: "Self-reported behaviors are the methodological risk zone",
    summary: "Self-reported behaviors are the most common survey use case and the least directly tested construct type. The model places their fidelity at 0.75, but with the widest uncertainty band (±0.12). A result anywhere between 0.63 and 0.87 is defensible.",
    methodology: [
      "Two construct types have direct empirical anchors from Park et al. (2024): attitudes and beliefs at 0.85 (1,052 participants, GSS attitude items) and incentivized behaviors at 0.66 (economic game experiments). Self-reported behaviors (0.75) are interpolated between these two anchors — not directly measured in the paper.",
      "Uncertainty bands: attitudes ±0.06, incentivized behaviors ±0.10, self-reported behaviors ±0.12. The wide band for self-reported behaviors reflects the absence of direct evidence, not higher intrinsic difficulty.",
      "At default settings, self-reported behaviors often clear the quality threshold (0.75 vs. ~0.75 threshold), but the margin is thin and within the uncertainty band. A reasonable pessimistic scenario has self-reported behaviors below threshold.",
      "This creates an asymmetric risk: if the primary use case is self-reported behavior studies, you are operating in the least-validated configuration, and feasibility outcomes are most sensitive to which end of the uncertainty band applies. A pilot study specifically targeting self-reported behaviors is more warranted here than for attitudes.",
    ],
    citations: [
      "Park et al. (2024). Generative Agent Simulations of 1,000 People. arXiv:2411.10109. https://arxiv.org/abs/2411.10109",
    ],
  },
  {
    title: "60–90 minutes captures most of the quality gain",
    summary: "Quality improves logarithmically with interview length — the first hour contributes more than the second. For attitude constructs, most gain over a 30-minute baseline is captured by 60–90 minutes. Beyond 120 minutes, incremental quality is small while build cost keeps rising linearly.",
    methodology: [
      "Quality is modeled as base × log-linear adjustment relative to a 120-minute reference point (the genagents interview length). The log functional form reflects diminishing marginal returns on additional interview time. This is a modeling assumption; the actual sensitivity has not been directly measured for this construction approach.",
      "Interview duration drives build cost linearly (voice ops at $0.027/min per participant). At 120 min vs. 90 min: $0.027 × 30 min = $0.81/participant, or $1,620 saved on a 2,000-person library. At 120 vs. 60 min: $3,240 saved. These are modest but real trade-offs.",
      "Under default attitude/belief settings, the quality threshold is typically cleared well before 90 minutes. The threshold crossover depends on construct type, memory architecture, and benchmark mode. Under federal settings, longer interviews provide more buffer above the stricter threshold.",
      "Extrapolating outside the 60–150 minute range carries higher uncertainty. Very short interviews (30 min) represent a significant departure from the paper anchor and should be treated as speculative.",
    ],
    citations: [
      "Park et al. (2024). Generative Agent Simulations of 1,000 People. arXiv:2411.10109. https://arxiv.org/abs/2411.10109",
    ],
  },
  {
    title: "Federal viability applies two independent filters, not one",
    summary: "The model applies a quality threshold uplift (0.05) and a separate market utility penalty (−0.08) for federal settings. These are independent. A configuration can clear the quality bar and still face market headwinds — and the interaction narrows the viable space substantially.",
    methodology: [
      "Federal quality threshold: benchmark quality + 0.05 uplift applied to the recommended threshold derived from NSDUH, BRFSS, and GSS reliability benchmarks. This reflects stricter evidence requirements for federal research procurement.",
      "Federal market utility penalty: −0.08 applied in the competition model, capturing the well-documented risk-aversion of federal procurement toward novel research methods, regardless of demonstrated quality.",
      "The two adjustments are multiplicative in effect: a configuration that just barely passes quality thresholds in commercial settings typically fails in federal settings, and even configurations with sufficient quality face a harder market win probability path.",
      "These are modeling conventions intended to make the federal/commercial distinction plannable, not predictions about any specific procurement. Actual federal buying behavior varies substantially by agency, program, and contracting officer.",
    ],
    citations: [
      "NSDUH Reliability Study (SAMHSA). https://www.ncbi.nlm.nih.gov/books/NBK519788/",
      "BRFSS HRQOL Reliability (CDC). https://pubmed.ncbi.nlm.nih.gov/12700216/",
    ],
  },
  {
    title: "The main uncertainty is now library longevity, not project margin",
    summary: "With ~94% variable margin per project, the investment case is strong once the library is built. The dominant open question has shifted: how long does a twin library remain valid before agents need re-interviewing? The model tracks NPV but cannot estimate agent shelf life.",
    methodology: [
      "At 94% variable margin, win probability sensitivity has a smaller NPV impact than it would if COGS per project were high. Small changes in win rate shift the timeline to break-even but do not change the direction of the investment case under reasonable assumptions.",
      "Library useful life is the dominant uncertainty. As real participants' views evolve over time, agent responses gradually diverge from what those participants would currently say. The rate of this divergence — and when it crosses a meaningful threshold — has no published estimates for this construction approach.",
      "Refresh wave revenue ($60K default) is included in the model, but per-refresh operational costs are not modeled. The cost of a partial re-interview campaign depends on how many agents need updating and whether source participants remain reachable.",
      "Monte Carlo simulations draw uncertainty from interview duration, response rate, and attrition. Library longevity uncertainty is not included because there is no distributional basis for it yet. This means the MC output understates total uncertainty for projections beyond 12–18 months.",
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
    const deploymentCosts = computeCosts({ ...cfg, mode: 'scaleup' });
    let minViableMinutes = 0;
    for (let m = 30; m <= 180; m += 5) {
      if (qualityScore(cfg, 'attitude_belief', m) >= threshold) {
        minViableMinutes = m;
        break;
      }
    }

    const pricePerProject = cfg.revenue.price_per_project;
    const perProjectRunCost = cfg.revenue.per_project_run_cost;
    const grossMargin = (pricePerProject - perProjectRunCost) / pricePerProject;

    return {
      attitudeQuality: tiers.attitude_belief,
      behaviorQuality: tiers.self_report_behavior,
      incentivizedQuality: tiers.incentivized_behavior,
      threshold,
      libraryBuildCost: deploymentCosts.total_cost,
      pricePerProject,
      perProjectRunCost,
      grossMargin,
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
            <h3>Maps the investment case</h3>
            <p>
              Separates the one-time library build cost (interviews, incentives, setup)
              from the low marginal cost of running each subsequent project against
              the existing agent library.
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
        <h2>What the model accounts for — and what it reveals</h2>
        <p className="landing-section-intro">
          Some of these cards describe established knowledge the model explicitly
          encodes: evidence hierarchies, cost structure assumptions, federal procurement
          adjustments. Others are patterns that emerge only when running the full model
          across configurations. Click any card to read the methodology behind it.
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
          120-minute AI voice interviews, attitude/belief construct. The library build (2,000 participants) is a one-time investment. Per-project run cost reflects ongoing marginal cost once the library exists.
        </p>
        <div className="landing-kpis">
          <div className="landing-kpi">
            <div className="landing-kpi-value">{baseStats.attitudeQuality.toFixed(2)}</div>
            <div className="landing-kpi-label">Attitude fidelity score</div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-value">${Math.round(baseStats.libraryBuildCost / 1000)}k</div>
            <div className="landing-kpi-label">
              Library build cost{' '}
              <Tooltip content={`One-time cost to interview 2,000 participants, construct their agents, and set up infrastructure. After this investment, projects run against the existing library at much lower marginal cost.`}>
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-value">${Math.round(baseStats.perProjectRunCost / 1000)}k</div>
            <div className="landing-kpi-label">
              Per-project run cost{' '}
              <Tooltip content="Marginal cost per project sold against the existing library: LLM inference, QA, PM, and data delivery. No new interviews or incentives.">
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-value">{(baseStats.grossMargin * 100).toFixed(0)}%</div>
            <div className="landing-kpi-label">
              Gross margin per project{' '}
              <Tooltip content={`(Price − per-project run cost) / price. At defaults: $${Math.round(baseStats.pricePerProject / 1000)}k price vs. $${Math.round(baseStats.perProjectRunCost / 1000)}k run cost. Library build cost ($${Math.round(baseStats.libraryBuildCost / 1000)}k) is recovered through the NPV model as upfront investment.`}>
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </div>
          </div>
        </div>
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
