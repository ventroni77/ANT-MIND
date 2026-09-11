import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStore } from '../store';
import Tooltip from './Tooltip';

function Stat({
  label, value, hint, tone = 'text-white/80',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <Tooltip label={label} hint={hint} side="top">
      <div className="flex cursor-help flex-col items-start">
        <span className="font-mono text-[9px] tracking-[0.14em] text-white/35">{label}</span>
        <span className={`font-mono text-sm tabular-nums ${tone}`}>{value}</span>
      </div>
    </Tooltip>
  );
}

export default function MetricsPanel() {
  const m = useStore((s) => s.metrics);
  const fps = useStore((s) => s.fps);
  const k = useStore((s) => s.consciousness);

  const delta = Math.round(m.productivityDelta * 100);
  const hasBaseline = m.baseline > 0.01;
  const data = m.series.map((s, i) => ({ i, food: s.foodPerMin, k: s.consciousness }));

  // headline verdict, derived from measurement rather than the slider
  const verdict = !hasBaseline
    ? { text: 'MEASURING BASELINE', tone: 'text-white/40' }
    : delta <= -60
      ? { text: 'COLONY COLLAPSING', tone: 'text-red-400' }
      : delta <= -20
        ? { text: 'PRODUCTIVITY FALLING', tone: 'text-amber-400' }
        : { text: 'COLONY HEALTHY', tone: 'text-emerald-400' };

  return (
    <div className="pointer-events-auto w-[560px] rounded-xl border border-white/10 bg-black/80 p-3 shadow-lg shadow-black/50 backdrop-blur">
      <div className="mb-2 flex items-end justify-between">
        <Tooltip
          label="FOOD PER MINUTE"
          hint="Food actually reaching the nest. The single number that matters: watch it fall as consciousness rises."
          side="top"
        >
          <div className="cursor-help">
            <div className="font-mono text-[9px] tracking-[0.14em] text-white/35">FOOD / MIN</div>
            <div className="font-mono text-3xl leading-none tabular-nums text-amber-300">
              {m.foodPerMin.toFixed(0)}
            </div>
            <div className={`mt-1 font-mono text-[9px] tracking-[0.12em] ${verdict.tone}`}>
              {verdict.text}
            </div>
          </div>
        </Tooltip>

        <Tooltip
          label="VS THE COLONY'S OWN BEST"
          hint="Compared against the best rate this colony achieved at 0% consciousness in this session. Measured, not a constant."
          side="top"
        >
          <div className="cursor-help text-right">
            <div className="font-mono text-[9px] tracking-[0.14em] text-white/35">
              PRODUCTIVITY Δ
            </div>
            <div
              className={`font-mono text-3xl leading-none tabular-nums ${
                delta < -5 ? 'text-red-400' : delta > 5 ? 'text-emerald-400' : 'text-white/60'
              }`}
            >
              {hasBaseline ? `${delta > 0 ? '+' : ''}${delta}%` : '—'}
            </div>
            <div className="mt-1 font-mono text-[9px] text-white/25">
              {hasBaseline
                ? `baseline ${m.baseline.toFixed(0)}/min at 0%`
                : 'run at 0% to set a baseline'}
            </div>
          </div>
        </Tooltip>
      </div>

      <div className="relative h-[92px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <CartesianGrid stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="i" hide />
            <YAxis yAxisId="food" tick={{ fontSize: 9, fill: '#ffffff40' }} width={40} />
            <YAxis yAxisId="k" orientation="right" domain={[0, 100]} hide />
            <Line
              yAxisId="food" type="monotone" dataKey="food"
              stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false}
            />
            <Line
              yAxisId="k" type="monotone" dataKey="k"
              stroke="#a855f7" strokeWidth={1.5} dot={false} isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute right-1 top-0 flex gap-2.5 font-mono text-[8px]">
          <span className="text-amber-400/80">━ food</span>
          <span className="text-purple-400/80">━ consciousness</span>
        </div>

        {data.length < 4 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[10px] text-white/25">
            gathering data…
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2 border-t border-white/10 pt-2">
        <Stat
          label="MEETINGS" value={`${m.meetings}`}
          hint="Clusters of 5+ ants standing still together for over 3 seconds. Real ants never do this."
          tone={m.meetings > 0 ? 'text-amber-300' : 'text-white/80'}
        />
        <Stat
          label="IDEAS" value={`${m.ideologies}`}
          hint="Ideologies invented by ants and believed by at least 3 others."
        />
        <Stat
          label="DREAD" value={`${Math.round(m.dread * 100)}%`}
          hint="Share of thinking ants that are anxious, afraid, grieving or nihilistic."
          tone="text-purple-300"
        />
        <Stat
          label="IDLE" value={`${Math.round(m.antsIdle * 100)}%`}
          hint="Ants barely moving. Deliberation costs seconds not spent walking."
          tone={m.antsIdle > 0.4 ? 'text-red-400' : 'text-white/80'}
        />
        <Stat
          label="HOARDED" value={`${m.hoardedFood}`}
          hint="Food hidden away from the nest by ants that stopped sharing."
        />
        <Stat
          label="COHERENCE" value={m.trailCoherence.toFixed(2)}
          hint="How much the trail network agrees with itself, 0 to 1. Doubt frays it."
        />
        <Stat
          label="FPS" value={`${fps}`}
          hint={`Render rate. The simulation never waits for the language model. Consciousness at ${Math.round(k * 100)}%.`}
          tone={fps < 45 ? 'text-red-400' : 'text-white/50'}
        />
      </div>
    </div>
  );
}
