import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { FinanceResult } from '../../model/revenueModel.ts';

interface Props {
  finance: FinanceResult;
}

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function NpvTimelineChart({ finance }: Props) {
  const data = useMemo(() =>
    finance.monthly_cumulative_margin.map((v, i) => ({
      month: i + 1,
      margin: Math.round(v),
    })),
    [finance]
  );

  return (
    <div className="chart-container" role="img" aria-label={`NPV timeline. ${finance.break_even_within_horizon ? `Break-even at month ${finance.time_to_break_even_months}.` : 'Break-even not reached within horizon.'} NPV is ${money(finance.npv)}.`}>
      <h3 className="chart-title">Cumulative margin over time</h3>
      <p className="chart-subtitle">
        {finance.break_even_within_horizon
          ? `Projected break-even at month ${finance.time_to_break_even_months}. Total NPV: ${money(finance.npv)}.`
          : `Break-even not reached within ${finance.time_horizon_months} months. NPV: ${money(finance.npv)}.`
        }
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            label={{ value: 'Month', position: 'insideBottom', offset: -10, style: { fontSize: 12 } }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Area
            type="monotone"
            dataKey="margin"
            stroke="#E87722"
            fill="#E8772233"
            strokeWidth={2}
          />
          {/* Investment line */}
          <ReferenceLine
            y={finance.total_upfront_investment}
            stroke="#991B1B"
            strokeDasharray="6 4"
            label={{ value: `Investment ${money(finance.total_upfront_investment)}`, position: 'right', fontSize: 10, fill: '#991B1B' }}
          />
          {/* Break-even line */}
          {finance.time_to_break_even_months && (
            <ReferenceLine
              x={finance.time_to_break_even_months}
              stroke="#059669"
              strokeDasharray="4 4"
              label={{ value: `Break-even`, position: 'top', fontSize: 10, fill: '#059669' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
