import { useId } from 'react';
import { Tooltip } from './Tooltip.tsx';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  tooltip?: string;
}

export function Slider({ label, value, min, max, step, onChange, format, tooltip }: SliderProps) {
  const id = useId();
  const display = format ? format(value) : String(value);

  return (
    <div className="slider-field">
      <label htmlFor={id} className="slider-label">
        <span className="slider-label-text">
          {label}
          {tooltip && (
            <Tooltip content={tooltip}>
              <span className="info-icon" aria-hidden="true">i</span>
            </Tooltip>
          )}
        </span>
        <span className="slider-value" aria-live="polite">{display}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={display}
      />
    </div>
  );
}
