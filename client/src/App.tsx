import Stage from './render/Stage';
import ConsciousnessSlider from './ui/ConsciousnessSlider';
import ThoughtFeed from './ui/ThoughtFeed';
import IdeologyTracker from './ui/IdeologyTracker';
import MetricsPanel from './ui/MetricsPanel';
import AntInspector from './ui/AntInspector';
import OperatorPanel from './ui/OperatorPanel';
import { useStore } from './store';

const TOOLS: { key: string; id: 'chalk' | 'food' | 'wall' | 'eraser'; label: string }[] = [
  { key: '1', id: 'chalk', label: 'CHALK' },
  { key: '2', id: 'food', label: 'FOOD' },
  { key: '3', id: 'wall', label: 'WALL' },
  { key: 'E', id: 'eraser', label: 'ERASE' },
];

export default function App() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const paused = useStore((s) => s.paused);
  const muted = useStore((s) => s.muted);
  const ws = useStore((s) => s.wsConnected);
  const hand = useStore((s) => s.handActive);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#07060a] text-white">
      <Stage />

      <div className="pointer-events-none absolute left-4 top-4 z-20">
        <ConsciousnessSlider />
      </div>

      <AntInspector />
      <OperatorPanel />

      <div className="pointer-events-none absolute bottom-4 left-4 z-20">
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

      <div className="pointer-events-auto absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-white/10 bg-black/70 px-2 py-1.5 backdrop-blur">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(tool === t.id ? 'none' : t.id)}
            className={`rounded px-2 py-1 font-mono text-[10px] tracking-wider transition ${
              tool === t.id
                ? 'bg-white/20 text-white'
                : 'text-white/45 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            {t.key} {t.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-white/15" />
        <span className={`font-mono text-[10px] ${hand ? 'text-purple-300' : 'text-white/30'}`}>
          G HAND
        </span>
        <span className="font-mono text-[10px] text-white/30">⇧CLICK SMITE</span>
        <span className="mx-1 h-4 w-px bg-white/15" />
        <span className={`font-mono text-[10px] ${paused ? 'text-amber-300' : 'text-white/25'}`}>
          {paused ? 'PAUSED' : 'SPACE'}
        </span>
        <span className={`font-mono text-[10px] ${muted ? 'text-red-300' : 'text-white/25'}`}>
          {muted ? 'MUTED' : 'M'}
        </span>
        <span
          className={`font-mono text-[10px] ${ws ? 'text-emerald-400/70' : 'text-red-400/70'}`}
          title={ws ? 'brain connected' : 'brain offline'}
        >
          ●
        </span>
      </div>
    </div>
  );
}
