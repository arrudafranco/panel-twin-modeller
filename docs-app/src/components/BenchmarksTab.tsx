import { BENCHMARKS } from '../model/benchmarkModel.ts';

export function BenchmarksTab() {
  return (
    <section id="panel-benchmarks" role="tabpanel" aria-labelledby="tab-benchmarks">
      <h2>Federal survey benchmarks</h2>
      <p>
        Quality thresholds are grounded in retest reliability from major federal
        surveys. These benchmarks represent how consistently real human respondents
        answer the same questions when re-interviewed. An AI agent that matches or
        exceeds this reliability is performing at research-grade levels.
      </p>

      <div className="benchmarks-grid">
        {BENCHMARKS.map((b, i) => (
          <div key={i} className="benchmark-card">
            <h3>{b.instrument_name}</h3>
            <div className="benchmark-meta">
              <span className="benchmark-agency">{b.agency}</span>
              <span className="benchmark-interval">Retest: {b.retest_interval_days} days</span>
              {b.near_2week && <span className="benchmark-badge">Near 2-week</span>}
              {b.federal_national_representative && <span className="benchmark-badge">Federal/national</span>}
            </div>
            <p className="benchmark-range">{b.typical_range_or_distribution}</p>
            <p className="benchmark-note">{b.comparability_note}</p>
            <div className="benchmark-metrics">
              {b.metrics.kappa_range && (
                <span>Kappa: {b.metrics.kappa_range[0].toFixed(2)}-{b.metrics.kappa_range[1].toFixed(2)}</span>
              )}
              {b.metrics.icc_range && (
                <span>ICC: {b.metrics.icc_range[0].toFixed(2)}-{b.metrics.icc_range[1].toFixed(2)}</span>
              )}
              {b.metrics.spearman_range && (
                <span>Spearman: {b.metrics.spearman_range[0].toFixed(2)}-{b.metrics.spearman_range[1].toFixed(2)}</span>
              )}
              {b.metrics.agreement_range && (
                <span>Agreement: {(b.metrics.agreement_range[0] * 100).toFixed(0)}%-{(b.metrics.agreement_range[1] * 100).toFixed(0)}%</span>
              )}
            </div>
            <div className="benchmark-citations">
              {b.citations.map((c, j) => (
                <a key={j} href={c} target="_blank" rel="noopener noreferrer" className="citation-link">
                  [{j + 1}]
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
