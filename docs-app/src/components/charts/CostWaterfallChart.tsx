import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList, Tooltip as RTooltip } from 'recharts';
import type { CostResult } from '../../model/costModel.ts';

interface Props {
  costs: CostResult;
  otherUpfront?: number;
  subtitle?: string;
}

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;
const shortMoney = (v: number) => v > 1000 ? `$${(v / 1000).toFixed(1)}k` : money(v);

export function CostWaterfallChart({ costs, otherUpfront, subtitle }: Props) {
  const data = useMemo(() => {
    const rows: { name: string; value: number; fill: string }[] = [
      { name: 'Recruitment', value: costs.recruitment_cost, fill: '#E87722' },
      { name: 'Incentives', value: costs.incentives_cost, fill: '#F59E0B' },
      { name: 'Voice ops', value: costs.voice_ops_cost, fill: '#3B82F6' },
      { name: 'LLM tokens', value: costs.llm_ops_cost, fill: '#6366F1' },
      { name: 'Post-processing', value: costs.postproc_cost, fill: '#8B5CF6' },
      { name: 'Labor', value: costs.labor_cost, fill: '#EC4899' },
      { name: 'Overhead', value: costs.overhead_cost, fill: '#6B7280' },
    ];
    const total = costs.total_cost + (otherUpfront ?? 0);
    if (otherUpfront && otherUpfront > 0) {
      rows.push({ name: 'Ad-hoc costs', value: otherUpfront, fill: '#059669' });
    }
    rows.push({ name: 'Total', value: total, fill: '#1F2937' });
    return rows;
  }, [costs, otherUpfront]);

  const displayTotal = costs.total_cost + (otherUpfront ?? 0);

  return (
    <div className="chart-container" role="img" aria-label={`Cost breakdown. Total cost is ${money(displayTotal)}.`}>
      <h3 className="chart-title">Cost breakdown</h3>
      <p className="chart-subtitle">
        {subtitle ?? 'Pilot cost components. Adjust incentives, labor rate, and overhead in the Advanced settings sidebar.'}
      </p>
      <ResponsiveContainer width="100%" height={310}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 72, bottom: 4, left: 110 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={104} />
          <RTooltip formatter={(v: unknown) => [money(Number(v)), 'Cost']} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: unknown) => shortMoney(Number(v))}
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
