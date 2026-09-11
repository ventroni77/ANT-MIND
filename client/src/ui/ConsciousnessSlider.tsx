import { useStore } from '../store';
import { cutVoices } from '../audio/voice';

const LABELS = ['INSTINCT', 'STIRRING', 'AWARE', 'AWAKE', 'FULLY CONSCIOUS'];

function labelFor(pct: number): string {
  if (pct < 12) return LABELS[0];
  if (pct < 38) return LABELS[1];
  if (pct < 63) return LABELS[2];
  if (pct < 88) return LABELS[3];
  return LABELS[4];
}

export default function ConsciousnessSlider() {
  const k = useStore((s) => s.consciousness);
  const set = useStore((s) => s.setConsciousness);
  const pct = Math.round(k * 100);

  return (
    <div className="pointer-events-auto w-[360px] rounded-lg border border-purple-900/60 bg-black/70 p-4 backdrop-blur">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[0.2em] text-purple-300/70">
          CONSCIOUSNESS
        </span>
        <span className="font-mono text-2xl tabular-nums text-purple-200">{pct}%</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        aria-label="Consciousness level"
        onChange={(e) => set(Number(e.target.value) / 100)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-amber-700/60 via-purple-700/60 to-fuchsia-500/70 accent-purple-400"
      />

      <div className="mt-1 flex justify-between font-mono text-[9px] text-white/25">
        {[0, 25, 50, 75, 100].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-sm tracking-[0.18em] text-fuchsia-300">
          {labelFor(pct)}
        </span>
        <button
          onClick={() => {
            set(0);
            cutVoices();
          }}
          className="rounded border border-red-800/70 bg-red-950/50 px-3 py-1 font-mono text-[11px] tracking-[0.15em] text-red-300 transition hover:bg-red-900/60"
        >
          MERCY
        </button>
      </div>
    </div>
  );
}
