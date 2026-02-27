import { useState, type JSX } from 'react'
import './App.css'

type TabKey = 'overview' | 'methods' | 'ops' | 'econ' | 'bench' | 'downloads'

type Scenario = {
  minutes: number
  pilotN: number
  responseRate: number
  attrition: number
  price: number
  projectsPerYear: number
  horizonMonths: number
  otherInitialInvestment: number
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
  risk: 'commercial',
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x))
}

function money(x: number): string {
  return `$${Math.round(x).toLocaleString()}`
}

function App() {
  const [tab, setTab] = useState<TabKey>('overview')
  const [cfg, setCfg] = useState<Scenario>(INITIAL)

  const threshold = cfg.risk === 'federal' ? 0.77 : 0.72
  const quality = clamp(
    0.83 -
      (cfg.minutes - 90) * 0.0012 -
      cfg.attrition * 0.17 +
      cfg.responseRate * 0.07 +
      (Math.log10(cfg.pilotN) - 2.1) * 0.03,
    0,
    1
  )
  const cost = 72 + cfg.minutes * 0.58 + (1 / Math.max(cfg.responseRate, 0.05)) * 16 + cfg.attrition * 40
  const winProb = clamp(0.12 + (quality - threshold) * 1.9, 0.02, 0.96)
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
  const favorable = quality >= threshold && npv > 0

  const plainLanguage = favorable
    ? 'Quality clears threshold and expected value is positive. Focus on implementation rigor and pilot precision.'
    : quality < threshold && npv > 0
      ? 'Economics look promising, but quality is below benchmark policy. Prioritize methodological upgrades.'
      : quality >= threshold && npv <= 0
        ? 'Method quality appears acceptable, but economics are weak. Revisit pricing and project volume assumptions.'
        : 'Quality and economics are below target. Rework assumptions before scale-up decisions.'

  const sensitivity = [
    ['conservative', threshold + 0.03],
    ['base', threshold],
    ['optimistic', threshold - 0.03],
  ].map(([name, t]) => {
    const wp = clamp(0.12 + (quality - (t as number)) * 1.9, 0.02, 0.96)
    const n = ((cfg.price - cost * 1000) * cfg.projectsPerYear * wp) * 2.8 - totalUpfrontInvestment
    const low = n - Math.abs(n) * 0.15
    const high = n + Math.abs(n) * 0.15
    return `${(name as string).padEnd(12)} threshold=${(t as number).toFixed(3)} win=${wp.toFixed(3)} npv=${money(n)} band=[${money(low)}, ${money(high)}]`
  })

  function update<K extends keyof Scenario>(key: K, value: Scenario[K]): void {
    setCfg((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Panel Twin Modeller</h1>
        <p>Feasibility explorer for quality, operations, economics, and benchmark-driven decision support.</p>
      </header>

      <div className="layout">
        <aside className="card controls">
          <h2>Scenario Controls</h2>
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
              <div className="kpis">
                <Kpi label="Sellable quality" value={quality.toFixed(3)} />
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
                </tbody>
              </table>
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
                  <tr><th>Retest attrition</th><td>{cfg.attrition.toFixed(2)}</td></tr>
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
