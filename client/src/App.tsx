import Stage from './render/Stage';
import ConsciousnessSlider from './ui/ConsciousnessSlider';
import ThoughtFeed from './ui/ThoughtFeed';
import IdeologyTracker from './ui/IdeologyTracker';
import MetricsPanel from './ui/MetricsPanel';
import AntInspector from './ui/AntInspector';
import OperatorPanel from './ui/OperatorPanel';
import Toolbar from './ui/Toolbar';
import Welcome from './ui/Welcome';
import HelpPanel from './ui/HelpPanel';
import StatusBar from './ui/StatusBar';
import { useStore } from './store';

export default function App() {
  const chromeHidden = useStore((s) => s.chromeHidden);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#07060a] text-white">
      <Stage />

      {/* Toolbar stays visible even when panels are hidden: it is how you get them back. */}
      <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2">
        <Toolbar />
      </div>

      {!chromeHidden && (
        <>
          <div className="absolute left-4 top-4 z-20">
            <ConsciousnessSlider />
          </div>

          <AntInspector />

          <div className="absolute bottom-4 left-4 z-20">
            <MetricsPanel />
          </div>

          <div className="absolute right-4 top-4 bottom-4 z-20 flex w-[380px] flex-col gap-3">
            <div className="flex min-h-0 flex-[0_0_55%]">
              <ThoughtFeed />
            </div>
            <div className="flex min-h-0 flex-1">
              <IdeologyTracker />
            </div>
          </div>

          <StatusBar />
        </>
      )}

      <OperatorPanel />
      <HelpPanel />
      <Welcome />
    </div>
  );
}
