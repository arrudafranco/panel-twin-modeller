import { useMemo } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Legend, ResponsiveContainer, Area, ComposedChart,
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
      const ab = qualityScore(cfg, 'attitude_belief', mins);
      const sr = qualityScore(cfg, 'self_report_behavior', mins);
      const ib = qualityScore(cfg, 'incentivized_behavior', mins);
      points.push({
        minutes: mins,
        'Attitudes & beliefs': Number(ab.toFixed(4)),
        'Self-reported behaviors': Number(sr.toFixed(4)),
        'Incentivized behaviors': Number(ib.toFixed(4)),
        // Fix 2: Uncertainty bands
        ab_upper: Number(Math.min(1, ab + QUALITY_UNCERTAINTY_BANDS.attitude_belief).toFixed(4)),
        ab_lower: Number(Math.max(0, ab - QUALITY_UNCERTAINTY_BANDS.attitude_belief).toFixed(4)),
        sr_upper: Number(Math.min(1, sr + QUALITY_UNCERTAINTY_BANDS.self_report_behavior).toFixed(4)),
        sr_lower: Number(Math.max(0, sr - QUALITY_UNCERTAINTY_BANDS.self_report_behavior).toFixed(4)),
        ib_upper: Number(Math.min(1, ib + QUALITY_UNCERTAINTY_BANDS.incentivized_behavior).toFixed(4)),
        ib_lower: Number(Math.max(0, ib - QUALITY_UNCERTAINTY_BANDS.incentivized_behavior).toFixed(4)),
      });
    }
    return points;
  }, [cfg]);

  return (
    <div className="chart-container" role="img" aria-label="Quality score by interview duration. Shows three construct types as lines with uncertainty bands. A horizontal dashed line marks the quality threshold.">
      <h3 className="chart-title">Quality by interview duration</h3>
      <p className="chart-subtitle">
        Shaded regions show uncertainty bands (wider for less-studied constructs).
        The 0.85 attitude base is anchored to Park et al. (2024).
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="minutes"
            label={{ value: 'Interview duration (minutes)', position: 'insideBottom', offset: -10, style: { fontSize: 12 } }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[0.4, 1.0]}
            label={{ value: 'Quality score', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            tick={{ fontSize: 11 }}
          />
          {/* Uncertainty bands */}
          <Area type="monotone" dataKey="ab_upper" stroke="none" fill="#E8772233" />
          <Area type="monotone" dataKey="ab_lower" stroke="none" fill="#ffffff" />
          <Area type="monotone" dataKey="sr_upper" stroke="none" fill="#3B82F622" />
          <Area type="monotone" dataKey="sr_lower" stroke="none" fill="#ffffff" />
          <Area type="monotone" dataKey="ib_upper" stroke="none" fill="#10B98122" />
          <Area type="monotone" dataKey="ib_lower" stroke="none" fill="#ffffff" />
          {/* Main lines */}
          <Line type="monotone" dataKey="Attitudes & beliefs" stroke="#E87722" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="Self-reported behaviors" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="Incentivized behaviors" stroke="#10B981" strokeWidth={2.5} dot={false} />
          {/* Threshold */}
          <ReferenceLine y={threshold} stroke="#991B1B" strokeDasharray="6 4" label={{ value: `Threshold ${threshold.toFixed(2)}`, position: 'right', fontSize: 11, fill: '#991B1B' }} />
          {/* Current interview duration */}
          <ReferenceLine x={cfg.interview_minutes} stroke="#6B7280" strokeDasharray="4 4" />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
