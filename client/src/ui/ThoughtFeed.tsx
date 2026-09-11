import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';

const EMOTION_COLOR: Record<string, string> = {
  anxious: '#e0b341',
  afraid: '#e07f41',
  enraged: '#e04141',
  furious: '#e04141',
  nihilistic: '#8a8ab0',
  grieving: '#6b8fd4',
  smug: '#a8d441',
  curious: '#41d4c4',
  reverent: '#c341e0',
  suspicious: '#d4a041',
  blank: '#555566',
  certain: '#d441a8',
  weary: '#7a7a8a',
};

function colorFor(emotion: string): string {
  return EMOTION_COLOR[emotion?.toLowerCase()] ?? '#8b6bbf';
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`;
}

export default function ThoughtFeed() {
  const thoughts = useStore((s) => s.thoughts);
  const source = useStore((s) => s.brainSource);
  const latency = useStore((s) => s.brainLatency);
  const [, tickNow] = useState(0);
  const hovering = useRef(false);

  useEffect(() => {
    const id = setInterval(() => tickNow((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-black/60 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/45">
          COGNITION FEED
        </span>
        {source === 'offline' ? (
          <span className="animate-pulse rounded bg-red-900/70 px-2 py-0.5 font-mono text-[9px] tracking-wider text-red-200">
            ⚠ OFFLINE CORTEX
          </span>
        ) : (
          <span className="font-mono text-[9px] text-white/30">{latency}ms · groq</span>
        )}
      </div>

      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2"
        onMouseEnter={() => (hovering.current = true)}
        onMouseLeave={() => (hovering.current = false)}
      >
        {thoughts.length === 0 && (
          <div className="p-3 font-mono text-[11px] text-white/25">
            &gt; no cognitive activity detected
          </div>
        )}
        {thoughts.map((t, i) => (
          <div
            key={`${t.antId}-${t.at}-${i}`}
            className="rounded border-l-2 bg-white/[0.03] px-3 py-2"
            style={{ borderColor: colorFor(t.emotion) }}
          >
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className="text-white/80">🐜 {t.name}</span>
              <span className="text-white/30">· {t.caste} ·</span>
              <span style={{ color: colorFor(t.emotion) }}>{t.emotion}</span>
              {t.memeLabel && (
                <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white/60">
                  {t.memeLabel}
                </span>
              )}
            </div>
            <div className="mt-1 text-[13px] leading-snug text-white/90">"{t.say}"</div>
            <div className="mt-1 flex justify-between font-mono text-[9px] text-white/30">
              <span>{t.to ? `↳ to ${t.to}` : ''}</span>
              <span>{ago(t.at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
