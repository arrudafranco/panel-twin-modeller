import { useState, useRef, type ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

const TOOLTIP_WIDTH = 260;

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const above = r.top > 140;
    // Horizontally center on trigger, but clamp to viewport
    const left = Math.max(
      8,
      Math.min(r.left + r.width / 2 - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - 8)
    );
    if (above) {
      setStyle({ left, bottom: window.innerHeight - r.top + 6, top: 'auto' });
    } else {
      setStyle({ left, top: r.bottom + 6, bottom: 'auto' });
    }
  }, []);

  const show = useCallback(() => { computePosition(); setVisible(true); }, [computePosition]);
  const hide = useCallback(() => setVisible(false), []);

  return (
    <span
      className="tooltip-trigger"
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      role="button"
      aria-label="More information"
    >
      {children}
      {visible && createPortal(
        <span
          className="tooltip-content tooltip-portal"
          role="tooltip"
          style={style}
        >
          {content}
        </span>,
        document.body
      )}
    </span>
  );
}
