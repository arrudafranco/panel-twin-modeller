import { BENCHMARKS } from '../model/benchmarkModel.ts';

export function BenchmarksTab() {
  return (
    <section id="panel-benchmarks" role="tabpanel" aria-labelledby="tab-benchmarks">
      <h2>Federal survey benchmarks</h2>
      <p>
        These benchmarks serve a specific and limited role: they characterize how
        self-consistent real human respondents are when re-interviewed on similar
        constructs. That human test-retest consistency becomes the <strong>normalizing
        ceiling</strong> for agent fidelity comparisons, following the logic of{' '}
        <a href="https://arxiv.org/abs/2411.10109" target="_blank" rel="noopener noreferrer">Park et al. (2024)</a>.
      </p>
      <p>
        The comparison works like this. If humans agree with their own earlier
        answers roughly X% of the time on a given construct, then an agent that
        agrees with its source participant X% of the time is performing at the
        ceiling of what we could reasonably expect. The fidelity threshold in this
        model is set at a percentile of the benchmark distribution, not as a claim
        that agents are "reliable" in the same sense these surveys are.
      </p>
      <p>
        What these benchmarks do not address: whether agents validly represent
        their source participants beyond the measured items, whether the underlying
        constructs are well-specified, or whether fidelity generalizes to topics not
        covered in the interview. They are a practical ceiling for a specific
        comparison, not a comprehensive validity standard.
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
