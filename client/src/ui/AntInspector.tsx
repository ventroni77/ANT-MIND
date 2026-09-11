import { X } from 'lucide-react';
import { useStore } from '../store';

export default function AntInspector() {
  const insp = useStore((s) => s.inspect);
  const close = useStore((s) => s.setInspect);
  if (!insp) return null;

  return (
    <div className="pointer-events-auto absolute left-4 top-[168px] z-20 w-[330px] rounded-lg border border-purple-800/50 bg-black/85 p-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] text-white/90">
          {insp.name ?? `unnamed · #${insp.id}`}
        </span>
        <button
          onClick={() => close(null)}
          aria-label="Close inspector"
          className="text-white/40 hover:text-white/80"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[10px] text-white/50">
        <span>caste</span><span className="text-white/80">{insp.caste}</span>
        <span>mind</span>
        <span className={insp.isMind ? 'text-fuchsia-300' : 'text-white/80'}>
          {insp.isMind ? 'yes' : 'instinct only'}
        </span>
        <span>primitive</span><span className="text-amber-300">{insp.primitive}</span>
        <span>emotion</span><span className="text-white/80">{insp.emotion || '—'}</span>
        <span>ideology</span><span className="text-white/80">{insp.meme ?? '—'}</span>
        <span>carrying</span><span className="text-white/80">{insp.carrying ? 'food' : 'nothing'}</span>
        <span>idle</span><span className="text-white/80">{insp.idleSeconds.toFixed(1)}s</span>
      </div>

      <div className="mt-2">
        <div className="font-mono text-[9px] tracking-[0.15em] text-white/35">CONVICTION</div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-fuchsia-500"
            style={{ width: `${Math.round(insp.conviction * 100)}%` }}
          />
        </div>
      </div>

      {insp.belief && (
        <div className="mt-2 rounded bg-white/5 p-2">
          <div className="font-mono text-[9px] tracking-[0.15em] text-white/35">BELIEF</div>
          <div className="mt-0.5 text-[12px] italic text-white/85">"{insp.belief}"</div>
        </div>
      )}

      {insp.memory.length > 0 && (
        <div className="mt-2">
          <div className="font-mono text-[9px] tracking-[0.15em] text-white/35">MEMORY</div>
          <ul className="mt-1 space-y-0.5">
            {insp.memory.map((l, i) => (
              <li key={i} className="font-mono text-[10px] text-white/55">
                · {l}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
