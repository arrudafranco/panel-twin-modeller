export interface TabDef {
  key: string;
  label: string;
}

interface TabNavProps {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}

export function TabNav({ tabs, active, onChange }: TabNavProps) {
  return (
    <nav className="tab-nav" role="tablist" aria-label="Content sections">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          aria-controls={`panel-${t.key}`}
          className={`tab-btn ${active === t.key ? 'tab-btn-active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
