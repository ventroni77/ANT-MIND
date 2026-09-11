import { useState, type ReactNode } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';

const POS: Record<Side, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

/**
 * Hover/focus explainer. Nothing in this app is self-evident, so every control
 * gets to say what it does in plain language.
 */
export default function Tooltip({
  label,
  hint,
  side = 'bottom',
  children,
}: {
  label: string;
  hint?: string;
  side?: Side;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-50 w-max max-w-[240px] rounded-md border border-white/15 bg-[#12101a] px-2.5 py-1.5 text-left shadow-xl shadow-black/60 ${POS[side]}`}
        >
          <span className="block font-mono text-[10px] tracking-wider text-white/90">
            {label}
          </span>
          {hint && (
            <span className="mt-0.5 block text-[11px] leading-snug text-white/55">{hint}</span>
          )}
        </span>
      )}
    </span>
  );
}
