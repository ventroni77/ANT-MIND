import { useStore } from '../store';
import Tooltip from './Tooltip';

/**
 * Bottom-right connection and mode strip. Small, but it answers "why is nothing
 * thinking?" without the user having to guess.
 */
export default function StatusBar() {
  const ws = useStore((s) => s.wsConnected);
  const source = useStore((s) => s.brainSource);
  const latency = useStore((s) => s.brainLatency);
  const paused = useStore((s) => s.paused);
  const k = useStore((s) => s.consciousness);

  const offline = source === 'offline';

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-black/80 px-3 py-1.5 backdrop-blur">
      {paused && (
        <>
          <span className="font-mono text-[10px] tracking-wider text-amber-300">PAUSED</span>
          <span className="h-3.5 w-px bg-white/15" />
        </>
      )}

      {k === 0 && (
        <>
          <Tooltip
            label="PURE INSTINCT"
            hint="No ant is thinking. This is the control group, and it is the most efficient the colony will ever be."
            side="top"
          >
            <span className="cursor-help font-mono text-[10px] tracking-wider text-emerald-400/70">
              INSTINCT ONLY
            </span>
          </Tooltip>
          <span className="h-3.5 w-px bg-white/15" />
        </>
      )}

      <Tooltip
        label={offline ? 'OFFLINE CORTEX' : ws ? 'CORTEX CONNECTED' : 'CORTEX UNREACHABLE'}
        hint={
          offline
            ? 'No language model is answering, so a much dumber grammar is writing the thoughts. Still grounded in real perception.'
            : ws
              ? `Thoughts are coming from the language model. Round trip ${latency}ms.`
              : 'Cannot reach the backend. The colony keeps running on instinct regardless.'
        }
        side="top"
      >
        <span className="flex cursor-help items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              offline ? 'bg-red-400' : ws ? 'bg-emerald-400' : 'bg-red-400'
            } ${ws && !offline ? '' : 'animate-pulse'}`}
          />
          <span
            className={`font-mono text-[10px] tracking-wider ${
              offline ? 'text-red-300' : ws ? 'text-white/45' : 'text-red-300'
            }`}
          >
            {offline ? 'OFFLINE CORTEX' : ws ? `CORTEX ${latency}ms` : 'NO CORTEX'}
          </span>
        </span>
      </Tooltip>
    </div>
  );
}
