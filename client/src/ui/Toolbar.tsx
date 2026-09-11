import {
  Pencil, Apple, BrickWall, Eraser, Zap, Hand, Play, Pause,
  StepForward, RotateCcw, Volume2, VolumeX, HelpCircle, Maximize2, Eye, EyeOff,
} from 'lucide-react';
import { useStore, type Tool } from '../store';
import Tooltip from './Tooltip';
import { cutVoices } from '../audio/voice';

const TOOLS: {
  id: Exclude<Tool, 'none'>;
  key: string;
  label: string;
  hint: string;
  Icon: typeof Pencil;
}[] = [
  {
    id: 'chalk', key: '1', label: 'CHALK', Icon: Pencil,
    hint: 'Draw a line ants can perceive but that has no physics. Instinct walks over it. A mind stops and theorises.',
  },
  {
    id: 'food', key: '2', label: 'FOOD', Icon: Apple,
    hint: 'Drop a food source. Watch a trail form toward it within seconds.',
  },
  {
    id: 'wall', key: '3', label: 'WALL', Icon: BrickWall,
    hint: 'A real obstacle. Blocks ants and stops pheromone spreading through it.',
  },
  {
    id: 'eraser', key: 'E', label: 'ERASE', Icon: Eraser,
    hint: 'Remove chalk, walls and danger marks.',
  },
  {
    id: 'smite', key: '4', label: 'SMITE', Icon: Zap,
    hint: 'Erase one ant. Nearby minds remember it happened and may invent a reason.',
  },
];

function IconButton({
  label, hint, active, onClick, children, danger,
}: {
  label: string;
  hint: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip label={label} hint={hint}>
      <button
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
          active
            ? danger
              ? 'bg-red-500/25 text-red-200 ring-1 ring-red-400/50'
              : 'bg-purple-500/25 text-purple-100 ring-1 ring-purple-400/50'
            : 'text-white/45 hover:bg-white/10 hover:text-white/90'
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

const BRUSHES = [
  { v: 1, label: 'S' },
  { v: 3, label: 'M' },
  { v: 6, label: 'L' },
];

export default function Toolbar() {
  const s = useStore();
  const activeTool = TOOLS.find((t) => t.id === s.tool);

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/80 px-2 py-1.5 shadow-lg shadow-black/50 backdrop-blur">
        {TOOLS.map((t) => (
          <IconButton
            key={t.id}
            label={`${t.label}  ·  ${t.key}`}
            hint={t.hint}
            active={s.tool === t.id}
            danger={t.id === 'smite'}
            onClick={() => s.setTool(s.tool === t.id ? 'none' : t.id)}
          >
            <t.Icon size={15} />
          </IconButton>
        ))}

        <span className="mx-0.5 h-5 w-px bg-white/10" />

        <IconButton
          label="THE HAND  ·  G"
          hint="An enormous unexplained shadow follows your cursor. Ants beneath it notice. They will not call it a hand."
          active={s.handActive}
          onClick={() => s.setHandActive(!s.handActive)}
        >
          <Hand size={15} />
        </IconButton>

        <span className="mx-0.5 h-5 w-px bg-white/10" />

        <IconButton
          label={s.paused ? 'RESUME  ·  SPACE' : 'PAUSE  ·  SPACE'}
          hint="Freeze the world. Useful for inspecting an ant mid-thought."
          active={s.paused}
          onClick={() => s.setPaused(!s.paused)}
        >
          {s.paused ? <Play size={15} /> : <Pause size={15} />}
        </IconButton>
        <IconButton
          label="STEP  ·  ."
          hint="Advance exactly one frame while paused."
          onClick={s.requestStep}
        >
          <StepForward size={15} />
        </IconButton>
        <IconButton
          label="RESET  ·  R"
          hint="Restart the colony. The seed is preserved, so the run repeats identically."
          onClick={() => {
            s.requestReset();
            cutVoices();
          }}
        >
          <RotateCcw size={15} />
        </IconButton>

        <span className="mx-0.5 h-5 w-px bg-white/10" />

        <IconButton
          label={s.muted ? 'UNMUTE  ·  M' : 'MUTE  ·  M'}
          hint="Ants speak their thoughts aloud, each with its own voice."
          active={s.muted}
          danger
          onClick={s.toggleMuted}
        >
          {s.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </IconButton>
        <IconButton
          label="FIT VIEW  ·  F"
          hint="Reset the camera. Scroll to zoom, drag to pan."
          onClick={s.requestFit}
        >
          <Maximize2 size={15} />
        </IconButton>
        <IconButton
          label={s.chromeHidden ? 'SHOW PANELS  ·  H' : 'HIDE PANELS  ·  H'}
          hint="Clear the screen down to just the colony."
          active={s.chromeHidden}
          onClick={s.toggleChrome}
        >
          {s.chromeHidden ? <EyeOff size={15} /> : <Eye size={15} />}
        </IconButton>
        <IconButton
          label="HELP  ·  ?"
          hint="What all of this is, and every keyboard shortcut."
          active={s.helpOpen}
          onClick={() => s.setHelpOpen(!s.helpOpen)}
        >
          <HelpCircle size={15} />
        </IconButton>
      </div>

      {/* Contextual second row: only appears when a drawing tool is live. */}
      {activeTool && (
        <div className="flex items-center gap-2 rounded-lg border border-purple-500/25 bg-black/80 px-3 py-1.5 backdrop-blur">
          <span className="font-mono text-[10px] tracking-wider text-purple-200">
            {activeTool.label}
          </span>
          <span className="max-w-[380px] text-[11px] leading-snug text-white/55">
            {activeTool.id === 'smite' || activeTool.id === 'food'
              ? 'Click on the world.'
              : 'Click and drag on the world.'}
          </span>

          {activeTool.id !== 'smite' && activeTool.id !== 'food' && (
            <>
              <span className="h-4 w-px bg-white/15" />
              <span className="font-mono text-[9px] text-white/35">SIZE</span>
              {BRUSHES.map((b) => (
                <button
                  key={b.v}
                  onClick={() => s.setBrushSize(b.v)}
                  aria-label={`Brush size ${b.label}`}
                  aria-pressed={s.brushSize === b.v}
                  className={`h-5 w-5 rounded font-mono text-[9px] transition ${
                    s.brushSize === b.v
                      ? 'bg-purple-500/30 text-purple-100 ring-1 ring-purple-400/50'
                      : 'text-white/40 hover:bg-white/10'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </>
          )}

          <button
            onClick={() => s.setTool('none')}
            className="ml-1 rounded px-1.5 py-0.5 font-mono text-[9px] text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            ESC
          </button>
        </div>
      )}
    </div>
  );
}
