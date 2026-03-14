import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell, ResponsiveContainer } from 'recharts';
import type { MCResult } from '../../model/mcModel.ts';

interface Props {
  mcResult: MCResult;
}

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function MonteCarloChart({ mcResult }: Props) {
  const { bins } = useMemo(() => {
    const npvs = mcResult.rows.map((r) => r.npv);
    const min = Math.min(...npvs);
    const max = Math.max(...npvs);
    const range = max - min;
    const nBins = 30;
    const binWidth = range / nBins;

    const counts = new Array(nBins).fill(0) as number[];
    for (const npv of npvs) {
      const idx = Math.min(Math.floor((npv - min) / binWidth), nBins - 1);
      counts[idx]++;
    }

    const bins = counts.map((count, i) => {
      const binStart = min + i * binWidth;
      const binMid = binStart + binWidth / 2;
      return {
        npv: Math.round(binMid),
        count,
        positive: binMid > 0,
      };
    });

    return { bins };
  }, [mcResult]);

  const { p_positive_npv, p_break_even, p_feasible, p5_npv, p95_npv } = mcResult.summary;

  return (
    <div className="chart-container" role="img" aria-label={`Monte Carlo NPV distribution. ${(p_positive_npv * 100).toFixed(0)}% of scenarios have positive NPV. 90% confidence interval: ${money(p5_npv)} to ${money(p95_npv)}.`}>
      <h3 className="chart-title">NPV distribution ({mcResult.rows.length} simulations)</h3>
      <p className="chart-subtitle">
        P(NPV {'>'} 0) = {(p_positive_npv * 100).toFixed(1)}%.
        P(break-even in horizon) = {(p_break_even * 100).toFixed(1)}%.
        P(feasible) = {(p_feasible * 100).toFixed(1)}%.
        Varied: interview duration, response rate, attrition, and win probability (additive shock, σ=10pp).
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={bins} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="npv"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            label={{ value: 'NPV ($)', position: 'insideBottom', offset: -10, style: { fontSize: 12 } }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            label={{ value: 'Frequency', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />
          <ReferenceLine x={0} stroke="#991B1B" strokeWidth={2} label={{ value: 'Break-even', position: 'top', fontSize: 10, fill: '#991B1B' }} />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {bins.map((entry, i) => (
              <Cell key={i} fill={entry.positive ? '#E8772288' : '#EF444488'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mc-stats">
        <span>90% CI: {money(p5_npv)} ... {money(p95_npv)}</span>
        <span>Mean: {money(mcResult.summary.mean_npv)}</span>
        <span>Median: {money(mcResult.summary.median_npv)}</span>
      </div>
    </div>
  );
}
