import { useState, useRef, type ReactNode, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

const TOOLTIP_WIDTH = 260;
const HEADER_HEIGHT = 60; // app-header-inner (50px) + border-top (3px) + buffer
const VIEWPORT_PAD = 8;

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    // Horizontally center on trigger, clamped to viewport
    const left = Math.max(
      VIEWPORT_PAD,
      Math.min(r.left + r.width / 2 - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PAD)
    );
    // Available space above (below the fixed header) and below (above the viewport bottom)
    const spaceAbove = r.top - HEADER_HEIGHT - VIEWPORT_PAD;
    const spaceBelow = vh - r.bottom - VIEWPORT_PAD;
    if (spaceAbove >= spaceBelow) {
      // Show above: anchor bottom edge just above the trigger, cap height so it clears the header
      setStyle({ left, bottom: vh - r.top + 6, top: 'auto', maxHeight: Math.max(40, spaceAbove) });
    } else {
      // Show below: anchor top edge just below the trigger, cap height so it stays in viewport
      setStyle({ left, top: r.bottom + 6, bottom: 'auto', maxHeight: Math.max(40, spaceBelow) });
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
