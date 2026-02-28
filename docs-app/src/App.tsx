import { useState } from 'react';
import './App.css';
import { ExecutiveLanding } from './components/ExecutiveLanding.tsx';
import { ScenarioControls } from './components/ScenarioControls.tsx';
import { TabNav } from './components/ui/TabNav.tsx';
import { OverviewTab } from './components/OverviewTab.tsx';
import { QualityTab } from './components/QualityTab.tsx';
import { CostTab } from './components/CostTab.tsx';
import { EconomicsTab } from './components/EconomicsTab.tsx';
import { BenchmarksTab } from './components/BenchmarksTab.tsx';
import { useScenario } from './hooks/useScenario.ts';

type View = 'landing' | 'explorer';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'quality', label: 'Quality' },
  { key: 'cost', label: 'Cost' },
  { key: 'economics', label: 'Economics' },
  { key: 'benchmarks', label: 'Benchmarks' },
];

function App() {
  const [view, setView] = useState<View>('landing');
  const [activeTab, setActiveTab] = useState('overview');
  const scenario = useScenario();

  if (view === 'landing') {
    return <ExecutiveLanding onEnterExplorer={() => setView('explorer')} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="app-title" onClick={() => setView('landing')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setView('landing')}>
            Panel Twin Modeller
          </h1>
          <span className="app-subtitle">Interactive feasibility explorer</span>
        </div>
      </header>

      <div className="app-layout">
        <ScenarioControls
          cfg={scenario.cfg}
          update={scenario.update}
          updateCost={scenario.updateCost}
          updateQuality={scenario.updateQuality}
          updateRevenue={scenario.updateRevenue}
          updateCompetition={scenario.updateCompetition}
          resetToDefaults={scenario.resetToDefaults}
        />

        <main className="main-content">
          <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'overview' && (
            <OverviewTab cfg={scenario.cfg} results={scenario.computed} />
          )}
          {activeTab === 'quality' && (
            <QualityTab cfg={scenario.cfg} results={scenario.computed} />
          )}
          {activeTab === 'cost' && (
            <CostTab cfg={scenario.cfg} results={scenario.computed} />
          )}
          {activeTab === 'economics' && (
            <EconomicsTab
              cfg={scenario.cfg}
              results={scenario.computed}
              mcEnabled={scenario.mcEnabled}
              setMcEnabled={scenario.setMcEnabled}
            />
          )}
          {activeTab === 'benchmarks' && <BenchmarksTab />}
        </main>
      </div>
    </div>
  );
}

export default App;
