import { useStore } from '../store';

function Knob({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="flex justify-between font-mono text-[10px] text-white/45">
        <span>{label}</span>
        <span className="tabular-nums text-white/75">{fmt ? fmt(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-1 w-full cursor-pointer appearance-none rounded bg-white/15 accent-emerald-400"
      />
    </label>
  );
}

export default function OperatorPanel() {
  const s = useStore();
  if (!s.operatorOpen) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-30 w-[300px] -translate-x-1/2 space-y-2.5 rounded-lg border border-emerald-900/60 bg-black/90 p-3 backdrop-blur">
      <div className="font-mono text-[10px] tracking-[0.2em] text-emerald-400/70">
        OPERATOR · ~ to hide
      </div>

      <Knob
        label="SCARCITY"
        value={s.scarcity}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => s.setKnob('scarcity', v)}
        fmt={(v) => v.toFixed(2)}
      />
      <Knob
        label="SUSCEPTIBILITY"
        value={s.susceptibility}
        min={0}
        max={2}
        step={0.05}
        onChange={(v) => s.setKnob('susceptibility', v)}
        fmt={(v) => v.toFixed(2)}
      />
      <Knob
        label="DRAMA (temp)"
        value={s.drama}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => s.setKnob('drama', v)}
        fmt={(v) => v.toFixed(2)}
      />
      <Knob
        label="SEED"
        value={s.seed}
        min={1}
        max={9999}
        step={1}
        onChange={(v) => s.setKnob('seed', v)}
      />

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => s.setPaused(!s.paused)}
          className="flex-1 rounded border border-white/15 py-1 font-mono text-[10px] text-white/70 hover:bg-white/10"
        >
          {s.paused ? 'RESUME' : 'PAUSE'}
        </button>
        <button
          onClick={s.requestStep}
          className="flex-1 rounded border border-white/15 py-1 font-mono text-[10px] text-white/70 hover:bg-white/10"
        >
          STEP
        </button>
        <button
          onClick={s.requestReset}
          className="flex-1 rounded border border-white/15 py-1 font-mono text-[10px] text-white/70 hover:bg-white/10"
        >
          RESET
        </button>
      </div>
      <div className="font-mono text-[9px] text-white/25">
        scarcity + seed apply on RESET
      </div>
    </div>
  );
}
