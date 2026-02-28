import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip as RTooltip,
} from 'recharts';
import type { ScenarioConfig } from '../../model/params.ts';
import type { FinanceResult } from '../../model/revenueModel.ts';

interface Props {
  cfg: ScenarioConfig;
  quality: number;
  finance: FinanceResult;
}

const COLORS = {
  'Panel Twin': '#E87722',
  'Probability benchmark': '#3B82F6',
  'Hybrid benchmark': '#10B981',
  'Fully synthetic': '#8B5CF6',
};

export function MarketRadarChart({ cfg, quality, finance }: Props) {
  const c = cfg.competition;

  const data = useMemo(() => {
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

    const priceComp = (p: number) => Number(Math.max(0, 1 - p / maxPrice).toFixed(3));
    const speedComp = (d: number) => Number(Math.max(0, 1 - d / maxTurnaround).toFixed(3));

    return [
      {
        dimension: 'Quality',
        'Panel Twin': Number(quality.toFixed(3)),
        'Probability benchmark': Number(c.probability_benchmark_quality.toFixed(3)),
        'Hybrid benchmark': Number(c.hybrid_benchmark_quality.toFixed(3)),
        'Fully synthetic': Number(c.external_synthetic_quality.toFixed(3)),
      },
      {
        dimension: 'Price advantage',
        'Panel Twin': priceComp(cfg.revenue.price_per_project),
        'Probability benchmark': priceComp(c.probability_benchmark_price),
        'Hybrid benchmark': priceComp(c.hybrid_benchmark_price),
        'Fully synthetic': priceComp(c.external_synthetic_price),
      },
      {
        dimension: 'Speed',
        'Panel Twin': speedComp(c.turnaround_days),
        'Probability benchmark': speedComp(c.probability_benchmark_turnaround_days),
        'Hybrid benchmark': speedComp(c.hybrid_benchmark_turnaround_days),
        'Fully synthetic': speedComp(c.external_synthetic_turnaround_days),
      },
      {
        dimension: 'Brand trust',
        'Panel Twin': Number(c.brand_trust.toFixed(3)),
        'Probability benchmark': 0.92,
        'Hybrid benchmark': 0.75,
        'Fully synthetic': 0.55,
      },
    ];
  }, [cfg, quality, c, finance]);

  return (
    <div className="chart-container" role="img" aria-label="Market positioning comparison across four competitive dimensions. Horizontal grouped bar chart showing Panel Twin, Probability benchmark, Hybrid benchmark, and Fully synthetic competitors.">
      <h3 className="chart-title">Market positioning</h3>
      <p className="chart-subtitle">
        Normalized 0–1 scores across four competitive dimensions (higher is better for all axes).
        Price advantage and speed are inverted from raw values so all axes read the same direction.
      </p>
      <ResponsiveContainer width="100%" height={270}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, bottom: 4, left: 110 }}
          barCategoryGap="28%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <YAxis type="category" dataKey="dimension" tick={{ fontSize: 11 }} width={104} />
          <RTooltip formatter={(v: number | undefined) => v != null ? v.toFixed(3) : ''} />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((name) => (
            <Bar
              key={name}
              dataKey={name}
              fill={COLORS[name]}
              radius={[0, 3, 3, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Accessible comparison table */}
      <details className="chart-table-fallback">
        <summary>View as table</summary>
        <table>
          <thead>
            <tr><th>Dimension</th><th>Panel Twin</th><th>Probability</th><th>Hybrid</th><th>Fully synthetic</th></tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.dimension}>
                <td>{row.dimension}</td>
                <td>{row['Panel Twin']}</td>
                <td>{row['Probability benchmark']}</td>
                <td>{row['Hybrid benchmark']}</td>
                <td>{row['Fully synthetic']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
