import { useStore } from '../store';
import { C } from '../sim/constants';

const BARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

function sparkline(history: number[]): string {
  if (history.length === 0) return '';
  const slice = history.slice(-8);
  const max = Math.max(...slice, 1);
  return slice.map((v) => BARS[Math.min(7, Math.floor((v / max) * 7))]).join('');
}

export default function IdeologyTracker() {
  const memes = useStore((s) => s.memes);
  const sorted = [...memes].sort((a, b) => {
    if (a.extinct !== b.extinct) return a.extinct ? 1 : -1;
    return b.followers - a.followers;
  });

  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-white/10 bg-black/60 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/45">IDEOLOGIES</span>
        <span className="font-mono text-[9px] text-white/30">
          {sorted.filter((m) => !m.extinct).length} live
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {sorted.length === 0 && (
          <div className="p-3 font-mono text-[11px] text-white/25">
            &gt; no ideas have been had
          </div>
        )}
        {sorted.map((m) => {
          const share = Math.round((m.followers / C.N_ANTS) * 100);
          return (
            <div
              key={m.id}
              className={`flex items-center gap-2 rounded px-2 py-1.5 font-mono text-[11px] ${
                m.extinct ? 'opacity-40' : 'hover:bg-white/5'
              }`}
            >
              <span
                className="shrink-0 text-sm leading-none"
                style={{ color: `hsl(${m.hue} 85% 60%)` }}
              >
                {m.extinct ? '◌' : '●'}
              </span>
              <span
                className={`w-[104px] shrink-0 truncate text-white/85 ${
                  m.extinct ? 'line-through' : ''
                }`}
                title={`${m.label} — coined by ${m.coinedBy}`}
              >
                {m.label}
              </span>
              <span className="w-[88px] shrink-0 truncate text-[9px] text-white/35">
                {m.primitive}
              </span>
              <span
                className="w-[52px] shrink-0 text-[11px]"
                style={{ color: `hsl(${m.hue} 70% 55%)` }}
              >
                {sparkline(m.history)}
              </span>
              {m.extinct ? (
                <span className="ml-auto text-[9px] text-white/35">
                  extinct · lived {Math.round(m.lifespanMs / 1000)}s
                </span>
              ) : (
                <span className="ml-auto tabular-nums text-white/70">
                  {m.followers}{' '}
                  <span className="text-white/30">({share}%)</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
