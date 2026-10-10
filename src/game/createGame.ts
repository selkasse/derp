import Phaser from "phaser";
import type { EventEmitter, GameEvents, IlluminatedEntry } from "../events/EventBus";

const TILE_SIZE = 128;

const DEPTH_TILE = 0;
const DEPTH_ITEM = 5;
const DEPTH_PLAYER = 10;

const DIRECTIONS: Record<string, { dx: number; dy: number }> = {
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
};

/** Tile directories are named `.t_<x>_<y>`, which doubles as their world coordinates. */
function parseTileCoords(path: string): { x: number; y: number } | undefined {
  const match = /\.t_(-?\d+)_(-?\d+)$/.exec(path);
  if (!match) return undefined;
  return { x: Number(match[1]), y: Number(match[2]) };
}

function tileCenter(x: number, y: number): { x: number; y: number } {
  return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
}

/** Picks a display emoji for a file entry based on its extension. */
function fileEmoji(name: string): string {
  return name.endsWith(".txt") ? "📜" : "📄";
}

class MainScene extends Phaser.Scene {
  private readonly tiles = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly items = new Map<string, Phaser.GameObjects.Text[]>();
  private player?: Phaser.GameObjects.Text;
  private currentPath = "";

  constructor(
    private readonly gameEvents: EventEmitter<GameEvents>,
    private readonly initialPath: string,
  ) {
    super("main");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#000000");

    this.gameEvents.on("dir_changed", (path) => {
      console.log("[Phaser] dir_changed:", path);
      this.spawnAt(path, true);
    });

    this.gameEvents.on("room_illuminated", ({ entries }) => {
      this.illuminateRoom(entries);
    });

    this.spawnAt(this.initialPath, false);
  }

  private spawnAt(path: string, animate: boolean): void {
    const coords = parseTileCoords(path);
    if (!coords) return;

    this.currentPath = path;
    this.revealTile(coords.x, coords.y);
    this.movePlayer(coords.x, coords.y, animate);
  }

  private revealTile(x: number, y: number): void {
    const key = `${x},${y}`;
    if (this.tiles.has(key)) return;

    const center = tileCenter(x, y);
    const rect = this.add.rectangle(center.x, center.y, TILE_SIZE - 4, TILE_SIZE - 4, 0x1a3a1a);
    rect.setStrokeStyle(2, 0x2f5f2f);
    rect.setDepth(DEPTH_TILE);
    this.tiles.set(key, rect);
  }

  private movePlayer(x: number, y: number, animate: boolean): void {
    const center = tileCenter(x, y);

    if (!this.player) {
      this.player = this.add.text(center.x, center.y, "🧙‍♂️", { fontSize: "40px" }).setOrigin(0.5);
      this.player.setDepth(DEPTH_PLAYER);
    } else if (animate) {
      this.tweens.add({ targets: this.player, x: center.x, y: center.y, duration: 300, ease: "Sine.easeInOut" });
    } else {
      this.player.setPosition(center.x, center.y);
    }

    if (animate) {
      this.cameras.main.pan(center.x, center.y, 300, "Sine.easeInOut");
    } else {
      this.cameras.main.centerOn(center.x, center.y);
    }
  }

  /**
   * Acts as the "flashlight": symlinked directions reveal the adjacent floor
   * tile itself (no door sprite), and files are rendered as item emoji on
   * the current tile.
   */
  private illuminateRoom(entries: IlluminatedEntry[]): void {
    const coords = parseTileCoords(this.currentPath);
    if (!coords) return;

    for (const entry of entries) {
      if (entry.type === "symlink") {
        const delta = DIRECTIONS[entry.name];
        if (delta) this.revealTile(coords.x + delta.dx, coords.y + delta.dy);
      }
    }

    this.revealItems(coords.x, coords.y, entries.filter((entry) => entry.type === "file"));
  }

  private revealItems(x: number, y: number, files: IlluminatedEntry[]): void {
    const key = `${x},${y}`;
    for (const sprite of this.items.get(key) ?? []) sprite.destroy();

    const center = tileCenter(x, y);
    const itemSprites = files.map((file, index) => {
      const sprite = this.add
        .text(center.x - TILE_SIZE / 2 + 20, center.y - TILE_SIZE / 2 + 20 + index * 24, fileEmoji(file.name), {
          fontSize: "24px",
        })
        .setOrigin(0.5);
      sprite.setDepth(DEPTH_ITEM);
      return sprite;
    });

    this.items.set(key, itemSprites);
  }
}

export function createGame(container: HTMLElement, events: EventEmitter<GameEvents>, initialPath: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: container.clientWidth,
    height: container.clientHeight,
    backgroundColor: "#000000",
    scene: [new MainScene(events, initialPath)],
  });
}
