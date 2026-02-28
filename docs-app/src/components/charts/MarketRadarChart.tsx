import { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
import type { ScenarioConfig } from '../../model/params.ts';
import type { FinanceResult } from '../../model/revenueModel.ts';

interface Props {
  cfg: ScenarioConfig;
  quality: number;
  finance: FinanceResult;
}

export function MarketRadarChart({ cfg, quality, finance }: Props) {
  const c = cfg.competition;

  const data = useMemo(() => {
    // Normalize each dimension to 0-1 scale
    const maxPrice = Math.max(
      cfg.revenue.price_per_project,
      c.probability_benchmark_price,
      c.hybrid_benchmark_price,
      c.external_synthetic_price
    );
    const maxTurnaround = Math.max(
      c.turnaround_days,
      c.probability_benchmark_turnaround_days,
      c.hybrid_benchmark_turnaround_days,
      c.external_synthetic_turnaround_days
    );

    // Price competitiveness is inverted (lower price = higher score)
    const priceComp = (p: number) => Math.max(0, 1 - p / maxPrice);
    const speedComp = (d: number) => Math.max(0, 1 - d / maxTurnaround);

    return [
      {
        dimension: 'Quality',
        'Panel Twin': Number(quality.toFixed(3)),
        'Probability benchmark': Number(c.probability_benchmark_quality.toFixed(3)),
        'Hybrid benchmark': Number(c.hybrid_benchmark_quality.toFixed(3)),
        'External synthetic': Number(c.external_synthetic_quality.toFixed(3)),
      },
      {
        dimension: 'Price advantage',
        'Panel Twin': Number(priceComp(cfg.revenue.price_per_project).toFixed(3)),
        'Probability benchmark': Number(priceComp(c.probability_benchmark_price).toFixed(3)),
        'Hybrid benchmark': Number(priceComp(c.hybrid_benchmark_price).toFixed(3)),
        'External synthetic': Number(priceComp(c.external_synthetic_price).toFixed(3)),
      },
      {
        dimension: 'Speed',
        'Panel Twin': Number(speedComp(c.turnaround_days).toFixed(3)),
        'Probability benchmark': Number(speedComp(c.probability_benchmark_turnaround_days).toFixed(3)),
        'Hybrid benchmark': Number(speedComp(c.hybrid_benchmark_turnaround_days).toFixed(3)),
        'External synthetic': Number(speedComp(c.external_synthetic_turnaround_days).toFixed(3)),
      },
      {
        dimension: 'Brand trust',
        'Panel Twin': Number(c.brand_trust.toFixed(3)),
        'Probability benchmark': 0.92,
        'Hybrid benchmark': 0.75,
        'External synthetic': 0.55,
      },
    ];
  }, [cfg, quality, c, finance]);

  return (
    <div className="chart-container" role="img" aria-label="Market positioning radar chart comparing Panel Twin against three competitor archetypes across quality, price, speed, and brand trust.">
      <h3 className="chart-title">Market positioning</h3>
      <p className="chart-subtitle">
        Relative comparison across four competitive dimensions. Higher is better for all axes.
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#d1d5db" />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#374151' }} />
          <Radar name="Panel Twin" dataKey="Panel Twin" stroke="#E87722" fill="#E8772244" strokeWidth={2} />
          <Radar name="Probability benchmark" dataKey="Probability benchmark" stroke="#3B82F6" fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
          <Radar name="Hybrid benchmark" dataKey="Hybrid benchmark" stroke="#10B981" fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
          <Radar name="External synthetic" dataKey="External synthetic" stroke="#8B5CF6" fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
      {/* Accessible comparison table */}
      <details className="chart-table-fallback">
        <summary>View as table</summary>
        <table>
          <thead>
            <tr><th>Dimension</th><th>Panel Twin</th><th>Probability</th><th>Hybrid</th><th>External</th></tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.dimension}>
                <td>{row.dimension}</td>
                <td>{row['Panel Twin']}</td>
                <td>{row['Probability benchmark']}</td>
                <td>{row['Hybrid benchmark']}</td>
                <td>{row['External synthetic']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
