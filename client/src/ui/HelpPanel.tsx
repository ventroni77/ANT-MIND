import { X } from 'lucide-react';
import { useStore } from '../store';

const KEYS: { keys: string; what: string }[] = [
  { keys: '1', what: 'Chalk — draw a line ants can sense but that does nothing' },
  { keys: '2', what: 'Food — drop a source and watch a trail form' },
  { keys: '3', what: 'Wall — a real obstacle' },
  { keys: '4', what: 'Smite — erase an ant; witnesses remember' },
  { keys: 'E', what: 'Eraser' },
  { keys: 'G', what: 'The Hand — an unexplained shadow follows the cursor' },
  { keys: 'click', what: 'Inspect an ant: its belief, memory and conviction' },
  { keys: 'drag', what: 'Pan the camera' },
  { keys: 'wheel', what: 'Zoom' },
  { keys: 'F', what: 'Fit the view back to the whole world' },
  { keys: 'space', what: 'Pause / resume' },
  { keys: '.', what: 'Advance one frame' },
  { keys: 'R', what: 'Reset the colony (same seed, identical run)' },
  { keys: 'M', what: 'Mute the ant voices' },
  { keys: 'H', what: 'Hide every panel' },
  { keys: '?', what: 'This help' },
  { keys: '~', what: 'Operator panel — live tuning knobs' },
];

const GLOSSARY: { term: string; what: string }[] = [
  {
    term: 'FOOD / MIN',
    what: 'Food reaching the nest, measured over a rolling window. This is the number that collapses.',
  },
  {
    term: 'MEETINGS',
    what: 'Groups of five or more ants standing still together for over three seconds. Ants do not hold meetings.',
  },
  {
    term: 'IDEOLOGIES',
    what: 'Ideas invented by ants and adopted by at least three others.',
  },
  {
    term: 'DREAD',
    what: 'Share of thinking ants currently anxious, afraid, grieving or nihilistic.',
  },
  {
    term: 'COHERENCE',
    what: 'How much the trail network agrees with itself, 0 to 1. Doubt frays it.',
  },
  {
    term: 'HOARDED',
    what: 'Food deliberately hidden away from the nest by ants that stopped sharing.',
  },
];

export default function HelpPanel() {
  const open = useStore((s) => s.helpOpen);
  const close = useStore((s) => s.setHelpOpen);
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => close(false)}
    >
      <div
        className="mx-4 max-h-[86vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-white/15 bg-[#0c0a12]/97 p-6 shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-purple-400/70">
              FORMICA
            </div>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Controls &amp; readouts</h2>
          </div>
          <button
            onClick={() => close(false)}
            aria-label="Close help"
            className="rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-white/40">SHORTCUTS</div>
            <div className="mt-2 space-y-1">
              {KEYS.map((k) => (
                <div key={k.keys} className="flex gap-2.5">
                  <kbd className="mt-px h-[18px] min-w-[42px] shrink-0 rounded border border-white/15 bg-white/5 px-1.5 text-center font-mono text-[10px] leading-[16px] text-white/75">
                    {k.keys}
                  </kbd>
                  <span className="text-[11.5px] leading-tight text-white/60">{k.what}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-white/40">
              WHAT THE NUMBERS MEAN
            </div>
            <div className="mt-2 space-y-2.5">
              {GLOSSARY.map((g) => (
                <div key={g.term}>
                  <div className="font-mono text-[10px] text-amber-300/80">{g.term}</div>
                  <div className="text-[11.5px] leading-snug text-white/55">{g.what}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
              <div className="font-mono text-[10px] tracking-[0.2em] text-purple-300/80">
                TRY THIS
              </div>
              <ol className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-white/60">
                <li>1. Let it run at 0% until trails form.</li>
                <li>2. Draw chalk across a trail. Nothing happens.</li>
                <li>3. Raise consciousness to 100%.</li>
                <li>4. Draw chalk across the same trail again.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
