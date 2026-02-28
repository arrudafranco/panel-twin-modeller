import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { CostResult } from '../../model/costModel.ts';

interface Props {
  costs: CostResult;
}

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function CostWaterfallChart({ costs }: Props) {
  const data = useMemo(() => [
    { name: 'Recruitment', value: costs.recruitment_cost, fill: '#E87722' },
    { name: 'Incentives', value: costs.incentives_cost, fill: '#F59E0B' },
    { name: 'Voice ops', value: costs.voice_ops_cost, fill: '#3B82F6' },
    { name: 'LLM tokens', value: costs.llm_ops_cost, fill: '#6366F1' },
    { name: 'Post-processing', value: costs.postproc_cost, fill: '#8B5CF6' },
    { name: 'Labor', value: costs.labor_cost, fill: '#EC4899' },
    { name: 'Overhead', value: costs.overhead_cost, fill: '#6B7280' },
    { name: 'Total', value: costs.total_cost, fill: '#1F2937' },
  ], [costs]);

  return (
    <div className="chart-container" role="img" aria-label={`Cost breakdown. Total cost is ${money(costs.total_cost)}.`}>
      <h3 className="chart-title">Cost breakdown</h3>
      <p className="chart-subtitle">
        Per-pilot cost components. The largest driver is typically labor and recruitment.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: unknown) => { const n = Number(v); return n > 1000 ? `$${(n / 1000).toFixed(1)}k` : money(n); }}
              style={{ fontSize: 10, fill: '#374151' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Accessible data table */}
      <details className="chart-table-fallback">
        <summary>View as table</summary>
        <table>
          <thead><tr><th>Component</th><th>Cost</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.name}><td>{d.name}</td><td>{money(d.value)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
