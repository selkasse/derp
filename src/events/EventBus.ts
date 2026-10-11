export interface IlluminatedEntry {
  name: string;
  type: "file" | "directory" | "symlink";
}

export interface GameEvents {
  dir_changed: string;
  room_illuminated: { path: string; entries: IlluminatedEntry[] };
  file_read: { path: string; name: string };
}

type Listener<T> = (payload: T) => void;

/** Minimal typed pub/sub bridge between the VFS/shell and Phaser. */
export class EventEmitter<Events extends object> {
  private readonly listeners: { [K in keyof Events]?: Listener<Events[K]>[] } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const existing = this.listeners[event] ?? [];
    existing.push(listener);
    this.listeners[event] = existing;
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    for (const listener of this.listeners[event] ?? []) {
      listener(payload);
    }
  }
}

export const gameEvents = new EventEmitter<GameEvents>();
