import { useState, useRef, useEffect, type ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('above');
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition(rect.top < 120 ? 'below' : 'above');
    }
  }, [visible]);

  return (
    <span
      className="tooltip-trigger"
      ref={triggerRef}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      role="button"
      aria-label="More information"
    >
      {children}
      {visible && (
        <span className={`tooltip-content tooltip-${position}`} role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}
