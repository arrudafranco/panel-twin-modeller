# Accessibility Checklist

Use this checklist before releasing major UI changes.

## Keyboard

- Tab through all controls and tabs in a logical order.
- Confirm visible focus indicator is present at every step.
- Confirm all actions work without a mouse (tabs, expanders, downloads, search).

## Screen Reader Basics

- Verify page has one clear `h1`.
- Verify section headings follow logical order (no skipped hierarchy).
- Confirm controls have understandable labels and values.
- Confirm tabs announce selected state and names.

## Content and Interpretation

- Verify top-level metrics are visible without expanding details.
- Verify plain-language interpretation appears near headline metrics.
- Verify assumptions and caveats are discoverable in expanders.

## Color and Contrast

- Ensure text/background pairs meet WCAG AA contrast.
- Ensure status is not conveyed by color alone.

## Automated Audit

Run:

```bash
python scripts/playwright_ui_audit.py
```

Review:

- `outputs/ui_audit_001/audit_report.json`
- `outputs/ui_audit_001/audit_summary.md`
- `outputs/ui_audit_001/axe_violations_*.json`

Policy:

- `critical` and `serious` axe violations must be zero.
- `moderate` violations require triage notes before release.
- Current known framework limitation: Streamlit may emit `region` moderate findings; treat as tracked debt unless new moderate IDs appear.
