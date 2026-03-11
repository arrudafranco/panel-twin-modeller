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
    summary: "At 1,000 participants, incentives alone total $89K out of a ~$174K library build. LLM inference for those same 1,000 interviews costs roughly $111. The binding constraint is human compensation, not technology.",
    methodology: [
      "Incentive structure: $60 Phase 1 interview + ($30 × 0.8 retest rate) Phase 2 + $5 bonus = $89 per participant. At 1,000 participants: $89,000 — roughly 51% of the total library build cost.",
      "LLM inference for 1,000 interviews at 117 turns each: roughly $111 total at $0.003/1K input, $0.012/1K output tokens. Voice ops (ASR and TTS, at $0.027/min × 120 min) add $3,240. Staff cost for the library build ($45,000 default) and overhead together add ~$59K flat — adjust in Advanced settings.",
      "Per-project run cost once the library exists: LLM inference to run a 50-item survey through 1,000 agents costs roughly $150–250. At loaded labor rates for QA, PM, and data delivery, total run cost is estimated at $18,000 (default) — about 10% of the library build cost.",
      "Implication: the technology cost curve is not the binding constraint. LLM price changes have minimal impact on the investment case. Response rate and incentive levels have major impact. Scale decisions (how many participants) are primarily a human cost question.",
    ],
  },
  {
    title: "The cost structure transforms from linear to fixed-plus-marginal",
    summary: "Traditional survey research charges per-study fees for every project. Panel Twin separates a one-time library build (~$174K for 1,000 participants) from a lower marginal per-project run cost (~$18K). This is the same cost-structure shift that distinguishes SaaS from consulting.",
    methodology: [
      "Library build cost covers AI-conducted interviews, participant incentives, voice infrastructure, agent construction, setup labor, and overhead. This is a capital investment charged once (or per refresh cycle), not per project.",
      "Per-project run cost covers LLM inference, per-project QA, PM, and data delivery against the existing agent library. No new interviews or incentives. Default estimate: $18,000 per project at fully loaded labor rates.",
      "With ~67% variable margin per project (at $55K price, $18K run cost), the break-even on the library investment depends on project volume over the library's useful life. At default volume (15 projects/year), the investment recovers after roughly 5 projects won — about 17 months.",
      "The critical open question is library useful life: how many projects can run before agent profiles go stale and re-interviewing is needed. The model cannot answer this — it is an open empirical question. The NPV projections are conditional on the library remaining valid.",
    ],
  },
  {
    title: "Project volume is the primary NPV lever — not per-project margin",
    summary: "Gross margin per project is ~67%, but win probability in a four-way market is only ~36%. At 15 projects pursued per year (the default), the investment breaks even around month 17. Reduce to fewer than 7 projects/year and break-even moves outside the 36-month horizon — volume matters more than what you charge per project.",
    methodology: [
      "Win probability ~36% in the default four-way market. Net-new fraction 70% (30% cannibalization). Per-project margin $37,000 ($55K price minus $18K run cost). At 15 projects pursued per year, expected monthly margin is roughly $11,500 before discounting. Over 36 months cumulative margin approaches $425,000 against ~$186,000 upfront, with break-even around month 17.",
      "A non-probability panel at $5K captures ~40% of the market on price alone under the stylized utility coefficients. Panel Twin must win on quality and turnaround, not price. Since quality has the highest utility weight (3.2), this is achievable — but only if quality thresholds are cleared.",
      "The model is sensitive to projects_per_year because wins scale linearly with volume but the upfront investment is fixed. Reducing to fewer than 7 projects per year moves break-even outside the 36-month horizon. Use the model to find the volume and pricing combination that makes the investment case work for your scenario.",
      "These projections use stylized market utility coefficients, not historical win/loss data. Actual win rates depend on client relationships, proposal quality, pricing negotiations, and factors not captured in a logit model. Treat NPV as a directional planning signal, not a forecast.",
    ],
  },
  {
    title: "60–90 minutes captures most of the quality gain",
    summary: "Quality improves logarithmically with interview length — the first hour contributes more than the second. For mixed general and behavioral recall surveys, most gain over a 30-minute baseline is captured by 60–90 minutes. Beyond 120 minutes, incremental quality is small while build cost keeps rising linearly.",
    methodology: [
      "Quality is modeled as base × log-linear adjustment relative to a 120-minute reference point (the genagents interview length). The log functional form reflects diminishing marginal returns on additional interview time. This is a modeling assumption; the actual sensitivity has not been directly measured for this construction approach.",
      "Interview duration drives build cost linearly (voice ops at $0.027/min per participant). At 120 min vs. 90 min: $0.027 × 30 min = $0.81/participant, or $810 saved on a 1,000-person library. At 120 vs. 60 min: $1,620 saved. These are modest but real trade-offs.",
      "Under default settings (mixed general survey), the quality threshold is typically cleared well before 90 minutes. The threshold crossover depends on study type, memory architecture, and benchmark mode. Under federal settings, longer interviews provide more buffer above the stricter threshold.",
      "Extrapolating outside the 60–150 minute range carries higher uncertainty. Very short interviews (30 min) represent a significant departure from the paper anchor and should be treated as speculative.",
    ],
    citations: [
      "Park et al. (2024). Generative Agent Simulations of 1,000 People. arXiv:2411.10109. https://arxiv.org/abs/2411.10109",
    ],
  },
  {
    title: "Federal clients are a harder sell than the quality numbers alone would suggest",
    summary: "Federal settings raise the quality threshold by 0.05 — a configuration that passes commercially may fall short in federal mode with the same interview design. The model also applies a conservatism penalty reflecting documented federal risk aversion toward novel research methods.",
    methodology: [
      "Federal quality threshold: the benchmark-derived threshold increases by 0.05 in federal mode. This reflects the stricter evidence standards associated with federal research procurement, derived from published NSDUH, BRFSS, and GSS reliability benchmarks. The uplift is a modeling convention, not a formally measured procurement standard.",
      "Federal risk penalty: the competition model applies a −0.08 utility reduction across all options in federal mode. Since this applies equally to all competitors, it does not change relative win probabilities within the four-way market. Its effect is better understood as a signal: the federal market is overall less favorable for novel methods, and that context should temper NPV projections rather than shift specific win probability estimates.",
      "In practice, the most actionable federal-mode output is whether the quality score clears the stricter threshold. A configuration that passes in commercial mode but fails in federal mode is not federally viable regardless of economic assumptions.",
      "These are modeling conventions intended to make the federal/commercial distinction plannable, not predictions about any specific procurement. Actual federal buying behavior varies substantially by agency, program office, and contracting officer.",
    ],
    citations: [
      "NSDUH Reliability Study (SAMHSA). https://www.ncbi.nlm.nih.gov/books/NBK519788/",
      "BRFSS HRQOL Reliability (CDC). https://pubmed.ncbi.nlm.nih.gov/12700216/",
    ],
  },
  {
    title: "The main uncertainty is now library longevity, not project margin",
    summary: "With ~67% variable margin per project, the investment case is meaningful once the library is built. The dominant open question has shifted: how long does an agent library remain valid before agents need re-interviewing? The model tracks net present value (NPV) but cannot estimate agent shelf life.",
    methodology: [
      "At ~67% variable margin, win probability sensitivity has a meaningful but not dominant NPV impact. Small changes in win rate shift the timeline to break-even but do not change the direction of the investment case under reasonable assumptions.",
      "Library useful life is the dominant uncertainty. As real participants' views evolve over time, agent responses gradually diverge from what those participants would currently say. The rate of this divergence — and when it crosses a meaningful threshold — has no published estimates for this construction approach.",
      "The current model does not include refresh wave revenue or operational costs, because the trigger conditions for re-interviewing are not yet estimable. The cost of a partial re-interview campaign depends on how many agents need updating and whether source participants remain reachable.",
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
    const threshold = recommendedQualityThreshold(cfg, 'mixed_general');
    const deploymentCosts = computeCosts({ ...cfg, mode: 'scaleup' });
    let minViableMinutes = 0;
    for (let m = 30; m <= 180; m += 5) {
      if (qualityScore(cfg, 'mixed_general', m) >= threshold) {
        minViableMinutes = m;
        break;
      }
    }

    const pricePerProject = cfg.revenue.price_per_project;
    const perProjectRunCost = cfg.revenue.per_project_run_cost;
    const grossMargin = (pricePerProject - perProjectRunCost) / pricePerProject;

    return {
      attitudeQuality: tiers.mixed_general,
      behaviorQuality: tiers.behavioral_recall,
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
        <h1 className="landing-hero-title">Panel Twin Modeler</h1>
        <p className="landing-hero-subtitle">
          Map the investment case for AI-powered survey research: build cost, per-project pricing, market positioning, and break-even.
        </p>
        <button className="cta-button landing-hero-skip" onClick={onEnterExplorer} aria-label="Explore the model">
          Explore the model
        </button>
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
          human interviewer, enabling scale while maintaining semi-structured depth.
          Our model explores the feasibility of operationalizing this approach commercially.
        </p>
        <p>
          When agents are built from a representative sample of participants, the resulting
          collection is called an <strong>agent library</strong>. Once built, the library can
          answer new survey questions on demand without re-interviewing participants, transforming
          the cost structure from per-study to fixed-plus-marginal.
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
              break even? Includes market positioning against probability panels, calibrated hybrid panels, and non-probability online panels.
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
          120-minute AI voice interviews, mixed general survey (attitudes, opinions, and behavioral recall combined). The library build (1,000 participants) is a one-time investment. Per-project run cost reflects ongoing marginal cost once the library exists. All figures are model estimates at default parameter values — adjust the controls in the model to explore your scenario.
        </p>
        <div className="landing-kpis">
          <div className="landing-kpi">
            <div className="landing-kpi-info-anchor">
              <Tooltip content="How closely AI agents replicate real participants' survey responses, expressed as a fraction of human test-retest reliability. A score of 0.83 means agents reproduce answers at 83% of the rate real people reproduce their own answers on re-survey. Mixed general survey covers attitudes, opinions, and behavioral recall -- the question types most common in commercial research. Calibrated from Park et al. (2024), who achieved 0.85 on the full GSS Core at 120-minute interview depth.">
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </div>
            <div className="landing-kpi-value">{baseStats.attitudeQuality.toFixed(2)}</div>
            <div className="landing-kpi-label">Fidelity score (mixed general survey)</div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-info-anchor">
              <Tooltip content="One-time cost to interview 1,000 participants, construct their agents, and set up infrastructure. After this investment, projects run against the existing library at much lower marginal cost.">
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </div>
            <div className="landing-kpi-value">${Math.round(baseStats.libraryBuildCost / 1000)}k</div>
            <div className="landing-kpi-label">Library build cost</div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-info-anchor">
              <Tooltip content="Marginal cost per project sold against the existing library: LLM inference, QA, PM, and data delivery. No new interviews or incentives.">
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </div>
            <div className="landing-kpi-value">${Math.round(baseStats.perProjectRunCost / 1000)}k</div>
            <div className="landing-kpi-label">Per-project run cost</div>
          </div>
          <div className="landing-kpi">
            <div className="landing-kpi-info-anchor">
              <Tooltip content={`(Price - per-project run cost) / price. At defaults: $${Math.round(baseStats.pricePerProject / 1000)}k price vs. $${Math.round(baseStats.perProjectRunCost / 1000)}k run cost. Library build cost ($${Math.round(baseStats.libraryBuildCost / 1000)}k) is recovered through the NPV model as upfront investment.`}>
                <span className="info-icon" aria-hidden="true">i</span>
              </Tooltip>
            </div>
            <div className="landing-kpi-value">{(baseStats.grossMargin * 100).toFixed(0)}%</div>
            <div className="landing-kpi-label">Gross margin per project</div>
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
          Model defaults last updated March 2026. LLM (large language model), ASR (automatic speech recognition), and TTS (text-to-speech)
          pricing change rapidly, as do market conditions. Review Advanced settings against current figures before drawing conclusions.
        </p>
        <p className="cta-credit">
          Built by{' '}
          <a href="https://github.com/arrudafranco" target="_blank" rel="noopener noreferrer" className="cta-credit-link">
            Gustavo Arruda Franco
          </a>
          {'. '}
          Bug reports and suggestions welcome via{' '}
          <a href="https://github.com/arrudafranco/panel-twin-modeller/issues" target="_blank" rel="noopener noreferrer" className="cta-credit-link">
            GitHub Issues
          </a>
          {'.'}
        </p>
      </section>
    </div>
  );
}
