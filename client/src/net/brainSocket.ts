import type { PerceivePacket } from '../sim/Perception';
import type { ThoughtCmd } from '../sim/World';

export interface ThoughtsMsg {
  type: 'thoughts';
  tick: number;
  latency_ms: number;
  source: 'groq' | 'offline';
  thoughts: ThoughtCmd[];
}

type Handler = (msg: ThoughtsMsg) => void;
type StatusHandler = (connected: boolean) => void;

export class BrainSocket {
  private ws: WebSocket | null = null;
  private backoff = 500;
  private closed = false;
  private url: string;

  constructor(
    private onThoughts: Handler,
    private onStatus: StatusHandler
  ) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${proto}//${location.host}/ws`;
    this.connect();
  }

  private connect() {
    if (this.closed) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.backoff = 500;
      this.onStatus(true);
    };
    this.ws.onclose = () => {
      this.onStatus(false);
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      this.ws?.close();
    };
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg?.type === 'thoughts' && Array.isArray(msg.thoughts)) {
          this.onThoughts(msg as ThoughtsMsg);
        }
      } catch {
        // malformed frame: ignore, never crash the sim
      }
    };
  }

  private scheduleReconnect() {
    if (this.closed) return;
    setTimeout(() => this.connect(), this.backoff);
    this.backoff = Math.min(8000, this.backoff * 1.8);
  }

  get ready(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(packet: PerceivePacket) {
    if (!this.ready) return false;
    this.ws!.send(JSON.stringify(packet));
    return true;
  }

  destroy() {
    this.closed = true;
    this.ws?.close();
  }
}
