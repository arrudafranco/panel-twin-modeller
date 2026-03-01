import { useMemo } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Legend, ResponsiveContainer, Area, ComposedChart, Tooltip as RTooltip,
} from 'recharts';
import type { ScenarioConfig } from '../../model/params.ts';
import { QUALITY_UNCERTAINTY_BANDS } from '../../model/params.ts';
import { qualityScore } from '../../model/qualityModel.ts';

interface Props {
  cfg: ScenarioConfig;
  threshold: number;
}

export function QualityCurveChart({ cfg, threshold }: Props) {
  const data = useMemo(() => {
    const points = [];
    for (let mins = 30; mins <= 180; mins += 5) {
      const mg = qualityScore(cfg, 'mixed_general', mins);
      const br = qualityScore(cfg, 'behavioral_recall', mins);
      const ib = qualityScore(cfg, 'incentivized_behavior', mins);
      points.push({
        minutes: mins,
        'Mixed general': Number(mg.toFixed(4)),
        'Behavioral recall': Number(br.toFixed(4)),
        'Incentivized experiments': Number(ib.toFixed(4)),
        mg_upper: Number(Math.min(1, mg + QUALITY_UNCERTAINTY_BANDS.mixed_general).toFixed(4)),
        mg_lower: Number(Math.max(0, mg - QUALITY_UNCERTAINTY_BANDS.mixed_general).toFixed(4)),
        br_upper: Number(Math.min(1, br + QUALITY_UNCERTAINTY_BANDS.behavioral_recall).toFixed(4)),
        br_lower: Number(Math.max(0, br - QUALITY_UNCERTAINTY_BANDS.behavioral_recall).toFixed(4)),
        ib_upper: Number(Math.min(1, ib + QUALITY_UNCERTAINTY_BANDS.incentivized_behavior).toFixed(4)),
        ib_lower: Number(Math.max(0, ib - QUALITY_UNCERTAINTY_BANDS.incentivized_behavior).toFixed(4)),
      });
    }
    return points;
  }, [cfg]);

  return (
    <div className="chart-container" role="img" aria-label="Estimated agent fidelity by interview duration. Shows three construct types as lines with uncertainty bands. A horizontal dashed line marks the fidelity threshold.">
      <h3 className="chart-title">Estimated agent fidelity by interview duration</h3>
      <p className="chart-subtitle">
        Shaded regions show uncertainty bands (wider for constructs with less published evidence).
        The 0.85 mixed general anchor and 0.66 incentivized experiments anchor both come directly
        from Park et al. (2024, arXiv:2411.10109). Behavioral recall (0.80) is a planning discount.
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 14, right: 64, bottom: 32, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="minutes"
            label={{ value: 'Interview duration (minutes)', position: 'insideBottom', offset: -16, style: { fontSize: 12 } }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[0.4, 1.0]}
            label={{ value: 'Fidelity score', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            tick={{ fontSize: 11 }}
          />
          <RTooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              if (!name || name.includes('_')) return [null, null]; // hide band series from tooltip
              return [value != null ? value.toFixed(3) : '', name];
            }}
            labelFormatter={(label) => `${label} minutes`}
          />
          {/* Uncertainty bands — legendType="none" hides them from the legend */}
          <Area type="monotone" dataKey="mg_upper" stroke="none" fill="#E8772233" legendType="none" />
          <Area type="monotone" dataKey="mg_lower" stroke="none" fill="#ffffff" legendType="none" />
          <Area type="monotone" dataKey="br_upper" stroke="none" fill="#3B82F622" legendType="none" />
          <Area type="monotone" dataKey="br_lower" stroke="none" fill="#ffffff" legendType="none" />
          <Area type="monotone" dataKey="ib_upper" stroke="none" fill="#10B98122" legendType="none" />
          <Area type="monotone" dataKey="ib_lower" stroke="none" fill="#ffffff" legendType="none" />
          {/* Main lines */}
          <Line type="monotone" dataKey="Mixed general" stroke="#E87722" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="Behavioral recall" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="Incentivized experiments" stroke="#10B981" strokeWidth={2.5} dot={false} />
          {/* Threshold */}
          <ReferenceLine y={threshold} stroke="#991B1B" strokeDasharray="6 4" label={{ value: `Threshold ${threshold.toFixed(2)}`, position: 'insideTopRight', fontSize: 11, fill: '#991B1B' }} />
          {/* Current interview duration */}
          <ReferenceLine x={cfg.interview_minutes} stroke="#6B7280" strokeDasharray="4 4" />
          {/* Legend at top to avoid x-axis collision */}
          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
