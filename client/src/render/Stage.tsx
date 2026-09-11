import { useEffect, useRef } from 'react';
import { Application, Container } from 'pixi.js';
import { C } from '../sim/constants';
import { World } from '../sim/World';
import { buildPerceive } from '../sim/Perception';
import { PheromoneLayer } from './PheromoneLayer';
import { AntLayer } from './AntLayer';
import { ToolLayer } from './ToolLayer';
import { BrainSocket } from '../net/brainSocket';
import { useStore } from '../store';
import { speak, cutVoices, initAudio, setAudioLevels } from '../audio/voice';

export default function Stage() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    const app = new Application();
    const world = new World(useStore.getState().seed);
    let antLayer: AntLayer | null = null;
    let cleanupFns: (() => void)[] = [];

    (async () => {
      await app.init({
        background: 0x07060a,
        antialias: false,
        resizeTo: host,
        preference: 'webgl',
      });
      if (disposed) {
        app.destroy(true);
        return;
      }
      host.appendChild(app.canvas);

      const camera = new Container();
      app.stage.addChild(camera);

      const pheroLayer = new PheromoneLayer();
      const toolLayer = new ToolLayer(app.renderer);
      antLayer = new AntLayer(app.renderer, C.N_ANTS);

      camera.addChild(pheroLayer.sprite, toolLayer.root, antLayer.root);
      // tint must sit above the ants
      toolLayer.root.removeChild(toolLayer.tintSprite);
      camera.addChild(toolLayer.tintSprite);

      // ---- camera fit + controls ----
      let zoom = 1;
      let panX = 0;
      let panY = 0;

      const fit = () => {
        const w = app.renderer.width;
        const h = app.renderer.height;
        zoom = Math.min(w / C.WORLD_W, h / C.WORLD_H);
        panX = (w - C.WORLD_W * zoom) / 2;
        panY = (h - C.WORLD_H * zoom) / 2;
        applyCamera();
      };
      const applyCamera = () => {
        camera.scale.set(zoom);
        camera.x = panX;
        camera.y = panY;
      };
      fit();
      const onResize = () => fit();
      window.addEventListener('resize', onResize);
      cleanupFns.push(() => window.removeEventListener('resize', onResize));

      const toWorld = (cx: number, cy: number) => {
        const r = app.canvas.getBoundingClientRect();
        return { x: (cx - r.left - panX) / zoom, y: (cy - r.top - panY) / zoom };
      };

      // ---- input ----
      let dragging = false;
      let painting = false;
      let lastPan = { x: 0, y: 0 };

      const applyTool = (wx: number, wy: number) => {
        const st2 = useStore.getState();
        const r = st2.brushSize;
        if (st2.tool === 'chalk') world.phero.paint(wx, wy, 'chalk', 1, r);
        else if (st2.tool === 'wall') world.phero.setWall(wx, wy, true, r);
        else if (st2.tool === 'eraser') world.phero.erase(wx, wy, r + 2);
      };

      const onDown = (e: PointerEvent) => {
        const p = toWorld(e.clientX, e.clientY);
        world.cursor.x = p.x;
        world.cursor.y = p.y;
        const tool = useStore.getState().tool;

        if (e.shiftKey || tool === 'smite') {
          world.smite(p.x, p.y);
          return;
        }
        if (tool === 'food') {
          world.addFood(p.x, p.y, e.button === 0 ? 60 : 20);
          return;
        }
        if (tool !== 'none') {
          painting = true;
          applyTool(p.x, p.y);
          return;
        }
        // no tool: click selects an ant, drag pans
        dragging = true;
        lastPan = { x: e.clientX, y: e.clientY };
        const hit = world.ants
          .filter((a) => a.alive)
          .map((a) => ({ a, d: (a.x - p.x) ** 2 + (a.y - p.y) ** 2 }))
          .sort((m, n) => m.d - n.d)[0];
        if (hit && hit.d < 18 * 18) {
          const a = hit.a;
          useStore.getState().setInspect({
            id: a.id,
            name: a.name,
            caste: a.caste,
            emotion: a.emotion,
            conviction: a.conviction,
            primitive: a.primitive,
            meme: a.memeId ? (world.memes.get(a.memeId)?.label ?? null) : null,
            belief: a.belief,
            memory: [...a.memory],
            isMind: a.isMind,
            idleSeconds: a.idleSeconds,
            carrying: a.carrying,
          });
        }
      };

      const onMove = (e: PointerEvent) => {
        const p = toWorld(e.clientX, e.clientY);
        world.cursor.x = p.x;
        world.cursor.y = p.y;
        world.cursor.active = true;
        if (painting) applyTool(p.x, p.y);
        else if (dragging && useStore.getState().tool === 'none') {
          panX += e.clientX - lastPan.x;
          panY += e.clientY - lastPan.y;
          lastPan = { x: e.clientX, y: e.clientY };
          applyCamera();
        }
      };

      const onUp = () => {
        dragging = false;
        painting = false;
      };

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const r = app.canvas.getBoundingClientRect();
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        const before = { x: (mx - panX) / zoom, y: (my - panY) / zoom };
        zoom = Math.max(0.25, Math.min(6, zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
        panX = mx - before.x * zoom;
        panY = my - before.y * zoom;
        applyCamera();
      };

      app.canvas.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      app.canvas.addEventListener('wheel', onWheel, { passive: false });
      cleanupFns.push(() => {
        app.canvas.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        app.canvas.removeEventListener('wheel', onWheel);
      });

      const onKey = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement) return;
        const s = useStore.getState();
        switch (e.key) {
          case '1': s.setTool(s.tool === 'chalk' ? 'none' : 'chalk'); break;
          case '2': s.setTool(s.tool === 'food' ? 'none' : 'food'); break;
          case '3': s.setTool(s.tool === 'wall' ? 'none' : 'wall'); break;
          case '4': s.setTool(s.tool === 'smite' ? 'none' : 'smite'); break;
          case 'e': case 'E': s.setTool(s.tool === 'eraser' ? 'none' : 'eraser'); break;
          case 'g': case 'G': s.setHandActive(true); break;
          case 'm': case 'M': s.toggleMuted(); break;
          case 'h': case 'H': s.toggleChrome(); break;
          case '?': s.setHelpOpen(!s.helpOpen); break;
          case '~': case '`': s.toggleOperator(); break;
          case 'f': case 'F': fit(); break;
          case ' ': e.preventDefault(); s.setPaused(!s.paused); break;
          case '.': s.requestStep(); break;
          case 'r': case 'R': s.requestReset(); break;
          case 'Escape':
            if (s.welcomeOpen) s.setWelcomeOpen(false);
            else if (s.helpOpen) s.setHelpOpen(false);
            else { s.setInspect(null); s.setTool('none'); }
            break;
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'g' || e.key === 'G') useStore.getState().setHandActive(false);
      };
      window.addEventListener('keydown', onKey);
      window.addEventListener('keyup', onKeyUp);
      cleanupFns.push(() => {
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKeyUp);
      });

      // ---- brain ----
      const st = useStore.getState();
      const socket = new BrainSocket(
        (msg) => {
          world.applyThoughts(msg.thoughts, msg.source);
          useStore.getState().setBrain(msg.source, msg.latency_ms);
        },
        (connected) => useStore.getState().setWs(connected)
      );
      cleanupFns.push(() => socket.destroy());

      world.onThought = (ev) => {
        useStore.getState().pushThought(ev);
        antLayer?.addBubble(ev.antId, ev.say, performance.now());
        speak(ev.name, ev.say, world.consciousness, useStore.getState().muted);
      };

      let brainGroup = 0;
      let lastBrain = 0;
      let lastUi = 0;
      let lastStepToken = st.stepToken;
      let lastResetToken = st.resetToken;
      let lastFitToken = st.fitToken;
      let lastCursorTool = '';

      const onFirstGesture = () => initAudio();
      window.addEventListener('pointerdown', onFirstGesture, { once: true });
      window.addEventListener('keydown', onFirstGesture, { once: true });

      // ---- main loop ----
      app.ticker.add((ticker) => {
        const s = useStore.getState();
        const now = performance.now();

        if (s.resetToken !== lastResetToken) {
          lastResetToken = s.resetToken;
          world.nAnts = C.N_ANTS;
          world.reset(s.seed);
          cutVoices();
        }
        if (s.fitToken !== lastFitToken) {
          lastFitToken = s.fitToken;
          fit();
        }
        if (s.tool !== lastCursorTool) {
          lastCursorTool = s.tool;
          app.canvas.style.cursor =
            s.tool === 'none' ? 'grab' : s.tool === 'smite' ? 'pointer' : 'crosshair';
        }

        const prevK = world.consciousness;
        world.consciousness = s.consciousness;
        world.paused = s.paused;
        world.scarcity = s.scarcity;
        world.susceptibility = s.susceptibility;
        world.drama = s.drama;
        world.handActive = s.handActive;
        if (prevK > 0 && s.consciousness === 0) cutVoices();

        world.step(ticker.deltaMS);
        if (s.stepToken !== lastStepToken) {
          lastStepToken = s.stepToken;
          world.stepOnce();
        }

        pheroLayer.update(world, now);
        toolLayer.update(world);
        antLayer!.update(world, s.consciousness > 0.1 && zoom > 0.55, now);

        setAudioLevels(s.consciousness, s.muted);

        // brain tick: alternate mind groups, never block the sim
        if (
          s.consciousness > 0 &&
          !s.paused &&
          now - lastBrain > C.BRAIN_TICK_MS &&
          socket.ready
        ) {
          const packet = buildPerceive(world, brainGroup++);
          if (packet) {
            socket.send(packet);
            lastBrain = now;
          }
        }

        // UI sync at 5Hz
        if (now - lastUi > 200) {
          lastUi = now;
          const m = world.metrics;
          s.setMetrics({
            foodPerMin: m.foodPerMin,
            foodStored: m.foodStored,
            trailCoherence: m.trailCoherence,
            meetings: m.meetings,
            ideologies: m.ideologies,
            dominantShare: m.dominantShare,
            dread: m.dread,
            hoardedFood: m.hoardedFood,
            antsIdle: m.antsIdle,
            productivityDelta: m.productivityDelta,
            baseline: m.baselineFoodPerMin,
            series: [...m.series],
          });
          s.setMemes(world.memes.list());
          s.setFps(Math.round(ticker.FPS));

          const insp = s.inspect;
          if (insp) {
            const a = world.ants[insp.id];
            if (a) {
              s.setInspect({
                id: a.id,
                name: a.name,
                caste: a.caste,
                emotion: a.emotion,
                conviction: a.conviction,
                primitive: a.primitive,
                meme: a.memeId ? (world.memes.get(a.memeId)?.label ?? null) : null,
                belief: a.belief,
                memory: [...a.memory],
                isMind: a.isMind,
                idleSeconds: a.idleSeconds,
                carrying: a.carrying,
              });
            }
          }
        }
      });
    })();

    return () => {
      disposed = true;
      cleanupFns.forEach((f) => f());
      cutVoices();
      try {
        app.destroy(true, { children: true });
      } catch {
        // already torn down
      }
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
}
