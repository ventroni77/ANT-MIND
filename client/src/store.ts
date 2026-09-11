import { create } from 'zustand';
import { C } from './sim/constants';
import type { ThoughtEvent } from './sim/World';
import type { Meme } from './sim/Memes';
import type { MetricSample } from './sim/Metrics';

export type Tool = 'none' | 'chalk' | 'food' | 'wall' | 'eraser' | 'smite';

export interface MetricsView {
  foodPerMin: number;
  foodStored: number;
  trailCoherence: number;
  meetings: number;
  ideologies: number;
  dominantShare: number;
  dread: number;
  hoardedFood: number;
  antsIdle: number;
  productivityDelta: number;
  baseline: number;
  series: MetricSample[];
}

export interface InspectorView {
  id: number;
  name: string | null;
  caste: string;
  emotion: string;
  conviction: number;
  primitive: string;
  meme: string | null;
  belief: string;
  memory: string[];
  isMind: boolean;
  idleSeconds: number;
  carrying: boolean;
}

interface State {
  consciousness: number;
  setConsciousness: (v: number) => void;

  tool: Tool;
  setTool: (t: Tool) => void;
  handActive: boolean;
  setHandActive: (v: boolean) => void;

  brushSize: number;
  setBrushSize: (v: number) => void;

  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  welcomeOpen: boolean;
  setWelcomeOpen: (v: boolean) => void;
  chromeHidden: boolean;
  toggleChrome: () => void;

  paused: boolean;
  setPaused: (v: boolean) => void;

  muted: boolean;
  toggleMuted: () => void;

  operatorOpen: boolean;
  toggleOperator: () => void;

  fps: number;
  setFps: (v: number) => void;

  brainSource: 'groq' | 'offline';
  brainLatency: number;
  wsConnected: boolean;
  setBrain: (source: 'groq' | 'offline', latency: number) => void;
  setWs: (v: boolean) => void;

  thoughts: ThoughtEvent[];
  pushThought: (t: ThoughtEvent) => void;

  memes: Meme[];
  setMemes: (m: Meme[]) => void;

  metrics: MetricsView;
  setMetrics: (m: MetricsView) => void;

  inspect: InspectorView | null;
  setInspect: (v: InspectorView | null) => void;

  scarcity: number;
  susceptibility: number;
  drama: number;
  seed: number;
  setKnob: (k: 'scarcity' | 'susceptibility' | 'drama' | 'seed', v: number) => void;

  resetToken: number;
  requestReset: () => void;
  stepToken: number;
  requestStep: () => void;
  fitToken: number;
  requestFit: () => void;
}

export const useStore = create<State>((set) => ({
  consciousness: 0,
  setConsciousness: (v) => set({ consciousness: v }),

  tool: 'none',
  setTool: (t) => set({ tool: t }),
  handActive: false,
  setHandActive: (v) => set({ handActive: v }),

  brushSize: 1,
  setBrushSize: (v) => set({ brushSize: v }),

  helpOpen: false,
  setHelpOpen: (v) => set({ helpOpen: v }),
  welcomeOpen: true,
  setWelcomeOpen: (v) => set({ welcomeOpen: v }),
  chromeHidden: false,
  toggleChrome: () => set((s) => ({ chromeHidden: !s.chromeHidden })),

  paused: false,
  setPaused: (v) => set({ paused: v }),

  muted: false,
  toggleMuted: () => set((s) => ({ muted: !s.muted })),

  operatorOpen: false,
  toggleOperator: () => set((s) => ({ operatorOpen: !s.operatorOpen })),

  fps: 60,
  setFps: (v) => set({ fps: v }),

  brainSource: 'groq',
  brainLatency: 0,
  wsConnected: false,
  setBrain: (brainSource, brainLatency) => set({ brainSource, brainLatency }),
  setWs: (wsConnected) => set({ wsConnected }),

  thoughts: [],
  pushThought: (t) =>
    set((s) => ({ thoughts: [t, ...s.thoughts].slice(0, 40) })),

  memes: [],
  setMemes: (memes) => set({ memes }),

  metrics: {
    foodPerMin: 0,
    foodStored: 0,
    trailCoherence: 0,
    meetings: 0,
    ideologies: 0,
    dominantShare: 0,
    dread: 0,
    hoardedFood: 0,
    antsIdle: 0,
    productivityDelta: 0,
    baseline: 0,
    series: [],
  },
  setMetrics: (metrics) => set({ metrics }),

  inspect: null,
  setInspect: (inspect) => set({ inspect }),

  scarcity: C.SCARCITY,
  susceptibility: C.SUSCEPTIBILITY,
  drama: 0.95,
  seed: C.SEED,
  setKnob: (k, v) => set({ [k]: v } as Partial<State>),

  resetToken: 0,
  requestReset: () => set((s) => ({ resetToken: s.resetToken + 1 })),
  stepToken: 0,
  requestStep: () => set((s) => ({ stepToken: s.stepToken + 1 })),
  fitToken: 0,
  requestFit: () => set((s) => ({ fitToken: s.fitToken + 1 })),
}));
