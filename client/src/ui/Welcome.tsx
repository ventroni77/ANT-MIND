import { useStore } from '../store';

/**
 * First-run orientation. Explains the paradox in three lines and offers the two
 * things a newcomer should actually do, rather than dumping them on a dark canvas.
 */
export default function Welcome() {
  const open = useStore((s) => s.welcomeOpen);
  const close = useStore((s) => s.setWelcomeOpen);
  const setConsciousness = useStore((s) => s.setConsciousness);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-[560px] rounded-2xl border border-purple-500/30 bg-[#0c0a12]/95 p-7 shadow-2xl shadow-black/80">
        <div className="font-mono text-[10px] tracking-[0.3em] text-purple-400/70">FORMICA</div>
        <h1 className="mt-1 text-2xl font-semibold text-white">
          400 ants. No plan. It works.
        </h1>

        <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-white/70">
          <p>
            Ants coordinate by leaving pheromone trails, not by thinking. Shorter routes get
            walked more, so they smell stronger, so they get walked more. The route optimises
            itself and no individual ant knows it exists.
          </p>
          <p className="text-white/85">
            This works <em>because</em> nobody deliberates. So what happens if an ant can doubt
            the trail?
          </p>
          <p>
            Drag the <span className="text-purple-300">consciousness slider</span> and a handful
            of ants get a real language model for a brain. They question the trail, invent
            ideologies, and those ideas spread to ants that cannot think at all.
          </p>
          <p className="text-amber-300/90">
            Watch the food graph collapse. Nothing about it is scripted.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => close(false)}
            className="rounded-lg bg-purple-600/80 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-purple-500"
          >
            Watch the colony first
          </button>
          <button
            onClick={() => {
              setConsciousness(1);
              close(false);
            }}
            className="rounded-lg border border-white/15 px-4 py-2 text-[13px] text-white/80 transition hover:bg-white/10"
          >
            Skip ahead, wake them up
          </button>
          <button
            onClick={() => {
              setHelpOpen(true);
              close(false);
            }}
            className="rounded-lg px-4 py-2 text-[13px] text-white/45 transition hover:bg-white/5 hover:text-white/80"
          >
            Show controls
          </button>
        </div>

        <div className="mt-4 font-mono text-[10px] text-white/25">
          Tip: let it run at 0% for about thirty seconds first. The trails are the point.
        </div>
      </div>
    </div>
  );
}
