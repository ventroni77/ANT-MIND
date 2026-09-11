import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStore } from '../store';

function Stat({ label, value, tone = 'text-white/80' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[9px] tracking-[0.15em] text-white/35">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

export default function MetricsPanel() {
  const m = useStore((s) => s.metrics);
  const fps = useStore((s) => s.fps);
  const delta = Math.round(m.productivityDelta * 100);
  const data = m.series.map((s, i) => ({
    i,
    food: s.foodPerMin,
    k: s.consciousness,
  }));

  return (
    <div className="pointer-events-auto w-[560px] rounded-lg border border-white/10 bg-black/70 p-3 backdrop-blur">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <div className="font-mono text-[9px] tracking-[0.15em] text-white/35">FOOD / MIN</div>
          <div className="font-mono text-3xl tabular-nums text-amber-300">
            {m.foodPerMin.toFixed(1)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[9px] tracking-[0.15em] text-white/35">
            PRODUCTIVITY Δ vs BASELINE
          </div>
          <div
            className={`font-mono text-3xl tabular-nums ${
              delta < -5 ? 'text-red-400' : delta > 5 ? 'text-emerald-400' : 'text-white/60'
            }`}
          >
            {m.baseline <= 0.01 ? '—' : `${delta > 0 ? '+' : ''}${delta}%`}
          </div>
          <div className="font-mono text-[9px] text-white/25">
            baseline {m.baseline.toFixed(1)} /min @ k=0
          </div>
        </div>
      </div>

      <div className="h-[92px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <CartesianGrid stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="i" hide />
            <YAxis yAxisId="food" tick={{ fontSize: 9, fill: '#ffffff40' }} width={40} />
            <YAxis yAxisId="k" orientation="right" domain={[0, 100]} hide />
            <Line
              yAxisId="food"
              type="monotone"
              dataKey="food"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="k"
              type="monotone"
              dataKey="k"
              stroke="#a855f7"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2 border-t border-white/10 pt-2">
        <Stat label="MEETINGS" value={`${m.meetings}`} />
        <Stat label="IDEOLOGIES" value={`${m.ideologies}`} />
        <Stat label="DREAD" value={`${Math.round(m.dread * 100)}%`} tone="text-purple-300" />
        <Stat label="IDLE" value={`${Math.round(m.antsIdle * 100)}%`} />
        <Stat label="HOARDED" value={`${m.hoardedFood}`} />
        <Stat label="COHERENCE" value={m.trailCoherence.toFixed(2)} />
        <Stat label="FPS" value={`${fps}`} tone={fps < 45 ? 'text-red-400' : 'text-white/50'} />
      </div>
    </div>
  );
}
