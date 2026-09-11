import { useStore } from '../store';
import { cutVoices } from '../audio/voice';
import { C } from '../sim/constants';
import Tooltip from './Tooltip';

const STAGES = [
  { max: 12, label: 'INSTINCT', desc: 'Pure stigmergy. Nobody thinks. It works perfectly.' },
  { max: 38, label: 'STIRRING', desc: 'A few ants notice things. Fragments, no conclusions.' },
  { max: 63, label: 'AWARE', desc: 'They ask questions. Trails start to fray.' },
  { max: 88, label: 'AWAKE', desc: 'Doctrine spreads. Ants stop to hold meetings.' },
  { max: 101, label: 'FULLY CONSCIOUS', desc: 'Grievance, schism, and nobody is eating.' },
];

const PRESETS = [
  { pct: 0, label: '0', hint: 'Pure instinct. The control group.' },
  { pct: 35, label: '35', hint: 'Barely awake. Doubt begins.' },
  { pct: 70, label: '70', hint: 'Ideologies take hold.' },
  { pct: 100, label: '100', hint: 'Full deliberation. Total collapse.' },
];

export default function ConsciousnessSlider() {
  const k = useStore((s) => s.consciousness);
  const set = useStore((s) => s.setConsciousness);
  const pct = Math.round(k * 100);
  const stage = STAGES.find((s) => pct < s.max) ?? STAGES[STAGES.length - 1];
  const minds = Math.round(k * C.N_MINDS_MAX);

  return (
    <div className="pointer-events-auto w-[360px] rounded-xl border border-purple-900/60 bg-black/80 p-4 shadow-lg shadow-black/50 backdrop-blur">
      <div className="mb-1.5 flex items-baseline justify-between">
        <Tooltip
          label="CONSCIOUSNESS"
          hint="Replaces instinct with deliberation. Higher means more ants think for themselves, trust the trail less, and pause to consider things."
          side="right"
        >
          <span className="cursor-help font-mono text-[11px] tracking-[0.2em] text-purple-300/70">
            CONSCIOUSNESS
          </span>
        </Tooltip>
        <span className="font-mono text-2xl leading-none tabular-nums text-purple-200">
          {pct}%
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        aria-label="Consciousness level"
        aria-valuetext={`${pct} percent, ${stage.label}`}
        onChange={(e) => set(Number(e.target.value) / 100)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-amber-700/60 via-purple-700/60 to-fuchsia-500/70"
      />

      <div className="mt-1.5 flex gap-1">
        {PRESETS.map((p) => (
          <Tooltip key={p.pct} label={`${p.label}%`} hint={p.hint} side="bottom">
            <button
              onClick={() => {
                set(p.pct / 100);
                if (p.pct === 0) cutVoices();
              }}
              aria-label={`Set consciousness to ${p.label} percent`}
              className={`rounded px-2 py-0.5 font-mono text-[9px] transition ${
                pct === p.pct
                  ? 'bg-purple-500/30 text-purple-100 ring-1 ring-purple-400/40'
                  : 'text-white/35 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {p.label}
            </button>
          </Tooltip>
        ))}

        <Tooltip
          label="MERCY"
          hint="Drop to zero instantly and cut every voice mid-word."
          side="left"
        >
          <button
            onClick={() => {
              set(0);
              cutVoices();
            }}
            className="ml-auto rounded border border-red-800/70 bg-red-950/50 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-red-300 transition hover:bg-red-900/60"
          >
            MERCY
          </button>
        </Tooltip>
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[12px] tracking-[0.16em] text-fuchsia-300">
            {stage.label}
          </span>
          <span className="font-mono text-[9px] text-white/35">
            {minds === 0 ? 'no thinking ants' : `${minds} thinking ant${minds === 1 ? '' : 's'}`}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] leading-snug text-white/50">{stage.desc}</div>
      </div>
    </div>
  );
}
