import { useState, type JSX } from 'react'
import './App.css'

type TabKey = 'overview' | 'methods' | 'ops' | 'econ' | 'bench' | 'downloads'
type FocusPreset = 'none' | 'economics' | 'sampling_quality' | 'operations'

type Scenario = {
  minutes: number
  pilotN: number
  responseRate: number
  attrition: number
  price: number
  projectsPerYear: number
  horizonMonths: number
  otherInitialInvestment: number
  memoryRetrievalK: number
  memoryRecencyWeight: number
  memoryRelevanceWeight: number
  memoryImportanceWeight: number
  reflectionEnabled: boolean
  reflectionIntervalTurns: number
  reflectionSummaryCount: number
  categoricalQuestionShare: number
  numericQuestionShare: number
  openEndedQuestionShare: number
  categoricalModeReliability: number
  numericModeReliability: number
  openEndedModeReliability: number
  contactAttempts: number
  responseLiftPerExtraAttempt: number
  responseDecayPerExtraAttempt: number
  retestRescheduleFraction: number
  reschedulingCostPerEvent: number
  crossPriceElasticity: number
  probabilityPrice: number
  probabilityQuality: number
  probabilityTurnaroundDays: number
  hybridPrice: number
  hybridQuality: number
  hybridTurnaroundDays: number
  externalPrice: number
  externalQuality: number
  externalTurnaroundDays: number
  risk: 'commercial' | 'federal'
}

const INITIAL: Scenario = {
  minutes: 90,
  pilotN: 150,
  responseRate: 0.35,
  attrition: 0.2,
  price: 120_000,
  projectsPerYear: 8,
  horizonMonths: 36,
  otherInitialInvestment: 0,
  memoryRetrievalK: 8,
  memoryRecencyWeight: 1,
  memoryRelevanceWeight: 1,
  memoryImportanceWeight: 1,
  reflectionEnabled: true,
  reflectionIntervalTurns: 8,
  reflectionSummaryCount: 3,
  categoricalQuestionShare: 0.45,
  numericQuestionShare: 0.2,
  openEndedQuestionShare: 0.35,
  categoricalModeReliability: 1.02,
  numericModeReliability: 0.95,
  openEndedModeReliability: 0.98,
  contactAttempts: 1,
  responseLiftPerExtraAttempt: 0,
  responseDecayPerExtraAttempt: 0,
  retestRescheduleFraction: 0,
  reschedulingCostPerEvent: 0,
  crossPriceElasticity: 0.2,
  probabilityPrice: 260_000,
  probabilityQuality: 0.9,
  probabilityTurnaroundDays: 18,
  hybridPrice: 160_000,
  hybridQuality: 0.8,
  hybridTurnaroundDays: 12,
  externalPrice: 130_000,
  externalQuality: 0.72,
  externalTurnaroundDays: 7,
  risk: 'commercial',
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x))
}

function money(x: number): string {
  return `$${Math.round(x).toLocaleString()}`
}

function utility(
  quality: number,
  price: number,
  turnaroundDays: number,
  risk: Scenario['risk'],
  tailwind: number,
  ownPrice: number,
  crossPriceElasticity: number,
  includeBrand: boolean
): number {
  const riskPenalty = risk === 'federal' ? 0.08 : 0
  const brand = includeBrand ? 0.7 : 0
  const relPrice = Math.max(ownPrice, 1) / Math.max(price, 1)
  return (
    3.2 * quality +
    1.1 * brand +
    0.8 * tailwind -
    0.000012 * price -
    0.03 * turnaroundDays +
    crossPriceElasticity * Math.log(relPrice) -
    riskPenalty
  )
}

function App() {
  const [tab, setTab] = useState<TabKey>('overview')
  const [cfg, setCfg] = useState<Scenario>(INITIAL)
  const [focusPreset, setFocusPreset] = useState<FocusPreset>('none')

  const threshold = cfg.risk === 'federal' ? 0.77 : 0.72
  const tailwind = 0.1
  const extraAttempts = Math.max(0, cfg.contactAttempts - 1)
  const effectiveResponse = clamp(
    cfg.responseRate *
      (1 + cfg.responseLiftPerExtraAttempt * extraAttempts) *
      Math.exp(-cfg.responseDecayPerExtraAttempt * extraAttempts),
    0.01,
    0.99
  )
  const responseShareTotal = Math.max(
    cfg.categoricalQuestionShare + cfg.numericQuestionShare + cfg.openEndedQuestionShare,
    0.0001
  )
  const categoricalShare = cfg.categoricalQuestionShare / responseShareTotal
  const numericShare = cfg.numericQuestionShare / responseShareTotal
  const openEndedShare = cfg.openEndedQuestionShare / responseShareTotal
  const meanMemoryWeight =
    (cfg.memoryRecencyWeight + cfg.memoryRelevanceWeight + cfg.memoryImportanceWeight) / 3
  const memoryImbalance =
    (Math.abs(cfg.memoryRecencyWeight - meanMemoryWeight) +
      Math.abs(cfg.memoryRelevanceWeight - meanMemoryWeight) +
      Math.abs(cfg.memoryImportanceWeight - meanMemoryWeight)) /
    Math.max(meanMemoryWeight * 3, 0.0001)
  const memoryBalanceEffect = clamp(1 - 0.12 * memoryImbalance, 0.85, 1)
  const memoryRetrievalEffect = clamp(
    0.9 + (0.1 * Math.log(Math.max(cfg.memoryRetrievalK, 1))) / Math.log(8),
    0.9,
    1.06
  )
  const reflectionEffect = cfg.reflectionEnabled
    ? clamp(
        (0.97 + 0.03 * Math.sqrt(8 / Math.max(cfg.reflectionIntervalTurns, 1))) *
          (0.97 + 0.01 * Math.min(cfg.reflectionSummaryCount, 6)),
        0.95,
        1.03
      )
    : 0.96
  const memorySystemAdjustment = clamp(
    memoryBalanceEffect * memoryRetrievalEffect * reflectionEffect,
    0.82,
    1.08
  )
  const responseModeAdjustment = clamp(
    categoricalShare * cfg.categoricalModeReliability +
      numericShare * cfg.numericModeReliability +
      openEndedShare * cfg.openEndedModeReliability,
    0.85,
    1.1
  )
  const quality = clamp(
    0.83 -
      (cfg.minutes - 90) * 0.0012 -
      cfg.attrition * 0.17 +
      effectiveResponse * 0.07 +
      (Math.log10(cfg.pilotN) - 2.1) * 0.03,
    0,
    1
  ) * memorySystemAdjustment * responseModeAdjustment
  const boundedQuality = clamp(quality, 0, 1)
  const reschedulingCost =
    cfg.pilotN * 0.8 * cfg.retestRescheduleFraction * cfg.reschedulingCostPerEvent
  const cost =
    72 +
    cfg.minutes * 0.58 +
    (1 / Math.max(effectiveResponse, 0.05)) * 16 +
    cfg.attrition * 40 +
    reschedulingCost / Math.max(cfg.pilotN, 1)

  const ownU = utility(
    boundedQuality,
    cfg.price,
    10,
    cfg.risk,
    tailwind,
    cfg.price,
    cfg.crossPriceElasticity,
    true
  )
  const probU = utility(
    cfg.probabilityQuality,
    cfg.probabilityPrice,
    cfg.probabilityTurnaroundDays,
    cfg.risk,
    tailwind,
    cfg.price,
    cfg.crossPriceElasticity,
    false
  )
  const hybridU = utility(
    cfg.hybridQuality,
    cfg.hybridPrice,
    cfg.hybridTurnaroundDays,
    cfg.risk,
    tailwind,
    cfg.price,
    cfg.crossPriceElasticity,
    false
  )
  const externalU = utility(
    cfg.externalQuality,
    cfg.externalPrice,
    cfg.externalTurnaroundDays,
    cfg.risk,
    tailwind,
    cfg.price,
    cfg.crossPriceElasticity,
    false
  )
  const maxU = Math.max(ownU, probU, hybridU, externalU)
  const ownE = Math.exp(ownU - maxU)
  const probE = Math.exp(probU - maxU)
  const hybridE = Math.exp(hybridU - maxU)
  const externalE = Math.exp(externalU - maxU)
  const sumE = ownE + probE + hybridE + externalE
  const winProb = ownE / Math.max(sumE, 1e-9)
  const shareProbability = probE / Math.max(sumE, 1e-9)
  const shareHybrid = hybridE / Math.max(sumE, 1e-9)
  const shareExternal = externalE / Math.max(sumE, 1e-9)
  const annual = (cfg.price - cost * 1000) * cfg.projectsPerYear * winProb
  const monthlyContribution = annual / 12
  const cac = 210_000
  const totalUpfrontInvestment = cac + cfg.otherInitialInvestment
  const npv = annual * 2.8 - totalUpfrontInvestment
  const breakEvenMonths =
    monthlyContribution > 0 ? Math.ceil(totalUpfrontInvestment / monthlyContribution) : null
  const breakEvenWithinHorizon =
    breakEvenMonths !== null && breakEvenMonths <= cfg.horizonMonths
  const breakEvenLabel =
    breakEvenMonths === null
      ? `Not reached in ${cfg.horizonMonths} months`
      : `${breakEvenMonths} months (${(breakEvenMonths / 12).toFixed(1)} years)`
  const favorable = boundedQuality >= threshold && npv > 0
  const warnings: string[] = []
  if (cfg.minutes > 150) warnings.push('Interview duration is high relative to common calibration windows.')
  if (cfg.contactAttempts > 4) warnings.push('Contact attempts are high and may overstate response uplift.')
  if (cfg.responseRate < 0.1) warnings.push('Very low response rate increases uncertainty in cost and quality estimates.')
  if (cfg.attrition > 0.4) warnings.push('High retest attrition can weaken normalized-accuracy grounding.')
  if (cfg.crossPriceElasticity > 0.6) warnings.push('High cross-price elasticity may overstate substitution sensitivity.')

  const plainLanguage = favorable
    ? 'Quality clears threshold and expected value is positive. Focus on implementation rigor and pilot precision.'
    : boundedQuality < threshold && npv > 0
      ? 'Economics look promising, but quality is below benchmark policy. Prioritize methodological upgrades.'
      : boundedQuality >= threshold && npv <= 0
        ? 'Method quality appears acceptable, but economics are weak. Revisit pricing and project volume assumptions.'
        : 'Quality and economics are below target. Rework assumptions before scale-up decisions.'

  const sensitivity = [
    ['conservative', threshold + 0.03],
    ['base', threshold],
    ['optimistic', threshold - 0.03],
  ].map(([name, t]) => {
    const wp = clamp(winProb + (boundedQuality - (t as number)) * 0.3, 0.01, 0.99)
    const n = ((cfg.price - cost * 1000) * cfg.projectsPerYear * wp) * 2.8 - totalUpfrontInvestment
    const low = n - Math.abs(n) * 0.15
    const high = n + Math.abs(n) * 0.15
    return `${(name as string).padEnd(12)} threshold=${(t as number).toFixed(3)} win=${wp.toFixed(3)} npv=${money(n)} band=[${money(low)}, ${money(high)}]`
  })

  function update<K extends keyof Scenario>(key: K, value: Scenario[K]): void {
    setCfg((prev) => ({ ...prev, [key]: value }))
  }

  function applyFocusPreset(preset: FocusPreset): void {
    setFocusPreset(preset)
    if (preset === 'economics') {
      setCfg((prev) => ({ ...prev, horizonMonths: Math.max(prev.horizonMonths, 60), crossPriceElasticity: Math.max(prev.crossPriceElasticity, 0.25) }))
    } else if (preset === 'sampling_quality') {
      setCfg((prev) => ({ ...prev, responseRate: Math.max(prev.responseRate, 0.15), attrition: Math.min(prev.attrition, 0.3) }))
    } else if (preset === 'operations') {
      setCfg((prev) => ({ ...prev, contactAttempts: Math.max(prev.contactAttempts, 2), retestRescheduleFraction: Math.max(prev.retestRescheduleFraction, 0.1) }))
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Panel Twin Modeller</h1>
        <p>Feasibility explorer for quality, operations, economics, and benchmark-driven decision support.</p>
        <p className="hero-subnote" title="The full Python model (Streamlit + CLI) remains the source of truth for production analysis.">
          Pages app runs on React + TypeScript (built with Node/Vite) and mirrors core controls for interactive exploration.
        </p>
      </header>

      <div className="layout">
        <aside className="card controls">
          <h2>Scenario Controls</h2>
          <label className="field">
            <span>Focus preset</span>
            <select value={focusPreset} onChange={(e) => applyFocusPreset(e.target.value as FocusPreset)}>
              <option value="none">none</option>
              <option value="economics">economics</option>
              <option value="sampling_quality">sampling & quality</option>
              <option value="operations">operations</option>
            </select>
          </label>
          <Range
            label="Interview minutes"
            value={cfg.minutes}
            min={30}
            max={180}
            step={5}
            onChange={(v) => update('minutes', v)}
          />
          <Range label="Pilot N" value={cfg.pilotN} min={50} max={400} step={10} onChange={(v) => update('pilotN', v)} />
          <Range
            label="Response rate"
            value={cfg.responseRate}
            min={0.05}
            max={0.9}
            step={0.01}
            onChange={(v) => update('responseRate', Number(v.toFixed(2)))}
          />
          <Range
            label="Retest attrition"
            value={cfg.attrition}
            min={0}
            max={0.6}
            step={0.01}
            onChange={(v) => update('attrition', Number(v.toFixed(2)))}
          />
          <Range
            label="Price per project"
            value={cfg.price}
            min={10_000}
            max={500_000}
            step={5000}
            onChange={(v) => update('price', v)}
          />
          <Range
            label="Projects per year"
            value={cfg.projectsPerYear}
            min={1}
            max={30}
            step={1}
            onChange={(v) => update('projectsPerYear', v)}
          />
          <Range
            label="Time horizon (months)"
            value={cfg.horizonMonths}
            min={6}
            max={120}
            step={3}
            onChange={(v) => update('horizonMonths', v)}
          />
          <Range
            label="Other upfront investment ($)"
            value={cfg.otherInitialInvestment}
            min={0}
            max={1_000_000}
            step={5000}
            onChange={(v) => update('otherInitialInvestment', v)}
          />
          <label className="field">
            <span>Risk profile</span>
            <select value={cfg.risk} onChange={(e) => update('risk', e.target.value as Scenario['risk'])}>
              <option value="commercial">commercial_exploratory</option>
              <option value="federal">federal_high_risk</option>
            </select>
          </label>
          <details className="advanced">
            <summary>Advanced modular controls (optional)</summary>
            <Range
              label="Contact attempts"
              value={cfg.contactAttempts}
              min={1}
              max={6}
              step={0.5}
              onChange={(v) => update('contactAttempts', v)}
            />
            <Range
              label="Response lift per extra attempt"
              value={cfg.responseLiftPerExtraAttempt}
              min={0}
              max={0.3}
              step={0.01}
              onChange={(v) => update('responseLiftPerExtraAttempt', Number(v.toFixed(2)))}
            />
            <Range
              label="Response decay per extra attempt"
              value={cfg.responseDecayPerExtraAttempt}
              min={0}
              max={0.8}
              step={0.01}
              onChange={(v) => update('responseDecayPerExtraAttempt', Number(v.toFixed(2)))}
            />
            <Range
              label="Retest reschedule fraction"
              value={cfg.retestRescheduleFraction}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => update('retestRescheduleFraction', Number(v.toFixed(2)))}
            />
            <Range
              label="Rescheduling cost per event"
              value={cfg.reschedulingCostPerEvent}
              min={0}
              max={100}
              step={1}
              onChange={(v) => update('reschedulingCostPerEvent', v)}
            />
            <Range
              label="Cross-price elasticity"
              value={cfg.crossPriceElasticity}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => update('crossPriceElasticity', Number(v.toFixed(2)))}
            />
            <Range label="Retrieved memory items" value={cfg.memoryRetrievalK} min={1} max={20} step={1} onChange={(v) => update('memoryRetrievalK', v)} />
            <Range label="Recency weight" value={cfg.memoryRecencyWeight} min={0} max={3} step={0.1} onChange={(v) => update('memoryRecencyWeight', Number(v.toFixed(1)))} />
            <Range label="Relevance weight" value={cfg.memoryRelevanceWeight} min={0} max={3} step={0.1} onChange={(v) => update('memoryRelevanceWeight', Number(v.toFixed(1)))} />
            <Range label="Importance weight" value={cfg.memoryImportanceWeight} min={0} max={3} step={0.1} onChange={(v) => update('memoryImportanceWeight', Number(v.toFixed(1)))} />
            <label className="field">
              <span>Reflection summaries</span>
              <select value={cfg.reflectionEnabled ? 'on' : 'off'} onChange={(e) => update('reflectionEnabled', e.target.value === 'on')}>
                <option value="on">enabled</option>
                <option value="off">disabled</option>
              </select>
            </label>
            {cfg.reflectionEnabled && (
              <>
                <Range label="Reflection interval (turns)" value={cfg.reflectionIntervalTurns} min={1} max={30} step={1} onChange={(v) => update('reflectionIntervalTurns', v)} />
                <Range label="Reflection summary count" value={cfg.reflectionSummaryCount} min={1} max={8} step={1} onChange={(v) => update('reflectionSummaryCount', v)} />
              </>
            )}
            <Range label="Categorical share" value={cfg.categoricalQuestionShare} min={0} max={1} step={0.01} onChange={(v) => update('categoricalQuestionShare', Number(v.toFixed(2)))} />
            <Range label="Numeric share" value={cfg.numericQuestionShare} min={0} max={1} step={0.01} onChange={(v) => update('numericQuestionShare', Number(v.toFixed(2)))} />
            <Range label="Open-ended share" value={cfg.openEndedQuestionShare} min={0} max={1} step={0.01} onChange={(v) => update('openEndedQuestionShare', Number(v.toFixed(2)))} />
            <Range label="Categorical reliability" value={cfg.categoricalModeReliability} min={0.7} max={1.2} step={0.01} onChange={(v) => update('categoricalModeReliability', Number(v.toFixed(2)))} />
            <Range label="Numeric reliability" value={cfg.numericModeReliability} min={0.7} max={1.2} step={0.01} onChange={(v) => update('numericModeReliability', Number(v.toFixed(2)))} />
            <Range label="Open-ended reliability" value={cfg.openEndedModeReliability} min={0.7} max={1.2} step={0.01} onChange={(v) => update('openEndedModeReliability', Number(v.toFixed(2)))} />
            <Range label="Probability benchmark price" value={cfg.probabilityPrice} min={20_000} max={600_000} step={5000} onChange={(v) => update('probabilityPrice', v)} />
            <Range label="Probability benchmark quality" value={cfg.probabilityQuality} min={0.4} max={1.0} step={0.01} onChange={(v) => update('probabilityQuality', Number(v.toFixed(2)))} />
            <Range label="Probability benchmark turnaround" value={cfg.probabilityTurnaroundDays} min={3} max={45} step={1} onChange={(v) => update('probabilityTurnaroundDays', v)} />
            <Range label="Hybrid benchmark price" value={cfg.hybridPrice} min={20_000} max={600_000} step={5000} onChange={(v) => update('hybridPrice', v)} />
            <Range label="Hybrid benchmark quality" value={cfg.hybridQuality} min={0.4} max={1.0} step={0.01} onChange={(v) => update('hybridQuality', Number(v.toFixed(2)))} />
            <Range label="Hybrid benchmark turnaround" value={cfg.hybridTurnaroundDays} min={3} max={45} step={1} onChange={(v) => update('hybridTurnaroundDays', v)} />
            <Range label="External synthetic price" value={cfg.externalPrice} min={20_000} max={600_000} step={5000} onChange={(v) => update('externalPrice', v)} />
            <Range label="External synthetic quality" value={cfg.externalQuality} min={0.4} max={1.0} step={0.01} onChange={(v) => update('externalQuality', Number(v.toFixed(2)))} />
            <Range label="External synthetic turnaround" value={cfg.externalTurnaroundDays} min={3} max={45} step={1} onChange={(v) => update('externalTurnaroundDays', v)} />
          </details>
        </aside>

        <main className="card content">
          <nav className="tabs">
            {([
              ['overview', 'Overview'],
              ['methods', 'Model & Methods'],
              ['ops', 'Operations & Cost'],
              ['econ', 'Economics & Risk'],
              ['bench', 'Benchmarks'],
              ['downloads', 'Downloads'],
            ] as const).map(([k, label]) => (
              <button key={k} className={tab === k ? 'tab active' : 'tab'} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </nav>

          {tab === 'overview' && (
            <section>
              <h2>Decision Overview</h2>
              {warnings.length > 0 && (
                <div className="note">
                  <strong>Guardrails:</strong>
                  <ul>
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="kpis">
                <Kpi label="Sellable quality" value={boundedQuality.toFixed(3)} />
                <Kpi label="Quality threshold" value={threshold.toFixed(3)} />
                <Kpi label="Cost per complete" value={money(cost)} />
                <Kpi label="Projected NPV" value={money(npv)} />
                <Kpi label="Time to break-even" value={breakEvenMonths === null ? 'Not reached' : `${breakEvenMonths} mo`} />
              </div>
              <p className={favorable ? 'pill ok' : 'pill warn'}>{favorable ? 'favorable' : 'needs work'}</p>
              <p className="note">{plainLanguage}</p>
            </section>
          )}

          {tab === 'methods' && (
            <section>
              <h2>Model & Methods</h2>
              <table>
                <tbody>
                  <tr><th>Threshold policy</th><td>strict_near_2week_federal</td></tr>
                  <tr><th>Risk profile</th><td>{cfg.risk === 'federal' ? 'federal_high_risk' : 'commercial_exploratory'}</td></tr>
                  <tr><th>Mapping intercept</th><td>{cfg.risk === 'federal' ? '0.18' : '0.16'}</td></tr>
                  <tr><th>Mapping slope</th><td>{cfg.risk === 'federal' ? '0.82' : '0.80'}</td></tr>
                  <tr><th>Mapping uncertainty</th><td>0.04 (illustrative)</td></tr>
                  <tr><th>Memory strategy</th><td>retrieval k={cfg.memoryRetrievalK}; reflection {cfg.reflectionEnabled ? 'on' : 'off'}</td></tr>
                  <tr><th>Memory weights</th><td>recency {cfg.memoryRecencyWeight.toFixed(1)} / relevance {cfg.memoryRelevanceWeight.toFixed(1)} / importance {cfg.memoryImportanceWeight.toFixed(1)}</td></tr>
                  <tr><th>Response mode mix</th><td>cat {categoricalShare.toFixed(2)} / num {numericShare.toFixed(2)} / open {openEndedShare.toFixed(2)}</td></tr>
                  <tr><th>Response-mode reliability</th><td>{responseModeAdjustment.toFixed(3)} multiplier</td></tr>
                </tbody>
              </table>
              <p className="note">
                Reflection and importance are prompt-mediated heuristics in the reference architecture. This app treats them as transparent assumptions, not direct measurements.
              </p>
            </section>
          )}

          {tab === 'ops' && (
            <section>
              <h2>Operations & Cost</h2>
              <table>
                <tbody>
                  <tr><th>Pilot N</th><td>{cfg.pilotN}</td></tr>
                  <tr><th>Token burden proxy</th><td>{(cfg.minutes * cfg.pilotN).toLocaleString()}</td></tr>
                  <tr><th>Response rate</th><td>{cfg.responseRate.toFixed(2)}</td></tr>
                  <tr><th>Effective response rate</th><td>{effectiveResponse.toFixed(2)}</td></tr>
                  <tr><th>Retest attrition</th><td>{cfg.attrition.toFixed(2)}</td></tr>
                  <tr><th>Rescheduling cost (total)</th><td>{money(reschedulingCost)}</td></tr>
                  <tr><th>Reflection token proxy</th><td>{Math.round((cfg.minutes + cfg.memoryRetrievalK * 3) * (cfg.reflectionEnabled ? 1 + 8 / Math.max(cfg.reflectionIntervalTurns, 1) : 1)).toLocaleString()}</td></tr>
                  <tr><th>Cost per completed interview</th><td>{money(cost)}</td></tr>
                </tbody>
              </table>
            </section>
          )}

          {tab === 'econ' && (
            <section>
              <h2>Economics & Risk</h2>
              <table>
                <tbody>
                  <tr><th>Win probability</th><td>{winProb.toFixed(3)}</td></tr>
                  <tr><th>Market share: probability benchmark</th><td>{shareProbability.toFixed(3)}</td></tr>
                  <tr><th>Market share: calibrated hybrid</th><td>{shareHybrid.toFixed(3)}</td></tr>
                  <tr><th>Market share: external synthetic</th><td>{shareExternal.toFixed(3)}</td></tr>
                  <tr><th>Annual expected contribution</th><td>{money(annual)}</td></tr>
                  <tr><th>Total upfront investment</th><td>{money(totalUpfrontInvestment)}</td></tr>
                  <tr><th>Time horizon</th><td>{cfg.horizonMonths} months</td></tr>
                  <tr><th>Time to break-even</th><td>{breakEvenLabel}</td></tr>
                  <tr><th>Projected NPV</th><td>{money(npv)}</td></tr>
                  <tr><th>Break-even within horizon</th><td>{breakEvenWithinHorizon ? 'Yes' : 'No'}</td></tr>
                </tbody>
              </table>
              <h3>Assumption sensitivity</h3>
              <pre className="mono">{sensitivity.join('\n')}</pre>
            </section>
          )}

          {tab === 'bench' && (
            <section>
              <h2>Benchmarks</h2>
              <table>
                <thead>
                  <tr><th>Instrument</th><th>Agency</th><th>Retest interval</th><th>Construct</th></tr>
                </thead>
                <tbody>
                  <tr><td>NSDUH Reliability Study</td><td>SAMHSA</td><td>5-15 days</td><td>attitude_belief / behavior</td></tr>
                  <tr><td>BRFSS HRQOL Reinterview</td><td>CDC</td><td>mean 13.5 days</td><td>self_report_health_status</td></tr>
                  <tr><td>HINTS Test-Retest</td><td>NCI</td><td>mean 34 days</td><td>attitude_belief (contextual)</td></tr>
                </tbody>
              </table>
            </section>
          )}

          {tab === 'downloads' && (
            <section>
              <h2>Downloads</h2>
              <p>Use the full app/CLI in the repository for exportable deliverables and scenario files.</p>
              <pre className="mono">
{`# Limitations Snapshot
- This Pages model is illustrative and should be validated with calibrated backend outputs.
- Triggered guardrails: ${warnings.length}
- Reflection and response-mode settings are transparent heuristics, not validated empirical estimates.
- P(positive economics): proxy signal from current scenario direction only (not full Monte Carlo).`}
              </pre>
              <pre className="mono">
Repo: https://github.com/arrudafranco/panel-twin-modeller{'\n'}
Pages: https://arrudafranco.github.io/panel-twin-modeller/
              </pre>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  )
}

function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (n: number) => void
}): JSX.Element {
  return (
    <label className="field">
      <span>{label} <strong>{value}</strong></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export default App
