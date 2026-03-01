import type { ComputedResults } from '../hooks/useScenario.ts';
import type { ScenarioConfig } from '../model/params.ts';

interface Props {
  cfg: ScenarioConfig;
  results: ComputedResults;
}

const CONSTRUCT_LABELS: Record<string, string> = {
  mixed_general: 'mixed general survey items (attitudes and behavioral recall)',
  behavioral_recall: 'behavioral recall items',
  incentivized_behavior: 'incentivized / economic experiments',
};

export function DynamicNarrative({ cfg, results }: Props) {
  const { quality, threshold, qualityEval, finance, favorable } = results;
  const constructLabel = CONSTRUCT_LABELS[cfg.quality_profile] ?? cfg.quality_profile;

  // Build narrative sentences
  const sentences: string[] = [];

  // Quality vs threshold
  if (qualityEval.quality_pass) {
    sentences.push(
      `At ${cfg.interview_minutes} minutes, estimated agent fidelity for ${constructLabel} (${quality.toFixed(2)}) clears the benchmark-derived threshold of ${threshold.toFixed(2)}.`
    );
  } else {
    const gap = threshold - quality;
    sentences.push(
      `At ${cfg.interview_minutes} minutes, estimated agent fidelity for ${constructLabel} (${quality.toFixed(2)}) falls ${gap.toFixed(2)} below the benchmark-derived threshold of ${threshold.toFixed(2)}. Consider longer interviews or a different construct focus.`
    );
  }

  // NPV signal
  if (finance.npv > 0 && finance.break_even_within_horizon) {
    sentences.push(
      `Under these assumptions, the project would break even within ${finance.time_to_break_even_months} months, with a projected net present value (NPV) of $${Math.round(finance.npv).toLocaleString()}.`
    );
  } else if (finance.npv > 0) {
    sentences.push(
      `Projected net present value (NPV) is positive ($${Math.round(finance.npv).toLocaleString()}), but break-even is not reached within the ${cfg.revenue.horizon_months}-month horizon.`
    );
  } else {
    sentences.push(
      `Economics are challenging under current assumptions. Projected net present value (NPV) is $${Math.round(finance.npv).toLocaleString()}. Revisit pricing, volume, or cost assumptions.`
    );
  }

  // Key drivers
  const drivers: string[] = [];
  if (cfg.interview_minutes < 90) drivers.push('interview duration');
  if (cfg.cost.response_rate < 0.2) drivers.push('response rate');
  if (cfg.cost.attrition_rate > 0.3) drivers.push('attrition');
  if (finance.win_probability < 0.2) drivers.push('win probability');
  if (drivers.length > 0) {
    sentences.push(`The most sensitive factors in this scenario are ${drivers.join(', ')}.`);
  }

  // Risk flags
  if (results.warnings.length > 0) {
    sentences.push(`${results.warnings.length} guardrail${results.warnings.length > 1 ? 's' : ''} triggered. See details below.`);
  }

  return (
    <div className={`narrative ${favorable ? 'narrative-favorable' : 'narrative-caution'}`} role="status" aria-live="polite">
      {sentences.map((s, i) => (
        <p key={i}>{s}</p>
      ))}
    </div>
  );
}
