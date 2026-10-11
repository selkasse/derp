import Phaser from "phaser";
import type { EventEmitter, GameEvents, IlluminatedEntry } from "../events/EventBus";

const TILE_SIZE = 128;

const DEPTH_TILE = 0;
const DEPTH_ITEM = 5;
const DEPTH_PLAYER = 10;
const DEPTH_GUIDE = 20;

const NOTE_FILE_NAME = "note.txt";

/** Diegetic hint text shown at each tutorial state; states without an entry show nothing. */
const TUTORIAL_MESSAGES: Partial<Record<number, string>> = {
  0: "It is too dark to see. List your surroundings. (type `ls` and press Enter)",
  1: "The depths beckon. Step into the dungeon. (type `cd dungeon`)",
  2: "It is too dark to see. List your surroundings. (type `ls` and press Enter)",
  3: "A path exists. Change your directory to move forward. (type `cd east`)",
  5: "A remnant left behind. Read its contents. (type `cat note.txt`)",
};

/** The tutorial completes and the guide disappears for good at this state. */
const TUTORIAL_COMPLETE_STATE = 6;

const DIRECTIONS: Record<string, { dx: number; dy: number }> = {
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
};

/** The first dungeon tile is always `.t_0_0`, which doubles as the tutorial's reference point. */
const DUNGEON_START_COORDS = { x: 0, y: 0 };

/** The home tile isn't part of the dungeon grid, so it gets a fixed spot just outside it. */
const HOME_COORDS = { x: -1, y: 0 };

/** Tile directories are named `.t_<x>_<y>`, which doubles as their world coordinates. */
function parseTileCoords(path: string): { x: number; y: number } | undefined {
  const match = /\.t_(-?\d+)_(-?\d+)$/.exec(path);
  if (!match) return undefined;
  return { x: Number(match[1]), y: Number(match[2]) };
}

function tileCenter(x: number, y: number): { x: number; y: number } {
  return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
}

/** Picks a display emoji for an item: a file (by extension) or a non-directional symlink. */
function entryEmoji(entry: IlluminatedEntry): string {
  if (entry.type === "symlink") {
    return entry.name === "dungeon" ? "🏰" : "🚪";
  }
  return entry.name.endsWith(".txt") ? "📜" : "📄";
}

class MainScene extends Phaser.Scene {
  private readonly tiles = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly items = new Map<string, Phaser.GameObjects.Text[]>();
  private player?: Phaser.GameObjects.Text;
  private currentPath = "";

  private guideText?: Phaser.GameObjects.Text;
  private tutorialState = 0;
  private readonly startCoords = DUNGEON_START_COORDS;

  constructor(
    private readonly gameEvents: EventEmitter<GameEvents>,
    private readonly initialPath: string,
  ) {
    super("main");
  }

  /** Resolves a VFS path to world coordinates: dungeon tiles parse from their name, the home directory gets a fixed spot. */
  private resolveCoords(path: string): { x: number; y: number } | undefined {
    if (path === this.initialPath) return HOME_COORDS;
    return parseTileCoords(path);
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#000000");

    this.guideText = this.add
      .text(this.scale.width / 2, 24, TUTORIAL_MESSAGES[0] ?? "", {
        fontSize: "18px",
        color: "#cccccc",
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: this.scale.width - 80 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setAlpha(0.85)
      .setDepth(DEPTH_GUIDE);

    this.gameEvents.on("dir_changed", (path) => {
      console.log("[Phaser] dir_changed:", path);
      if (this.currentPath === this.initialPath) {
        this.resetWorld();
      }
      this.spawnAt(path, true);
      this.advanceTutorialOnDirChanged(path);
    });

    this.gameEvents.on("room_illuminated", ({ path, entries }) => {
      this.illuminateRoom(entries);
      this.advanceTutorialOnIlluminated(path);
    });

    this.gameEvents.on("file_read", ({ name }) => {
      this.advanceTutorialOnFileRead(name);
    });

    this.spawnAt(this.initialPath, false);
  }

  /** The tile one step east of the player's starting room — where `note.txt` lives. */
  private get nextCoords(): { x: number; y: number } {
    return { x: this.startCoords.x + 1, y: this.startCoords.y };
  }

  private advanceTutorialOnIlluminated(path: string): void {
    const coords = this.resolveCoords(path);
    if (!coords) return;

    if (this.tutorialState === 0 && coords.x === HOME_COORDS.x && coords.y === HOME_COORDS.y) {
      this.setTutorialState(1);
    } else if (this.tutorialState === 2 && coords.x === this.startCoords.x && coords.y === this.startCoords.y) {
      this.setTutorialState(3);
    } else if (this.tutorialState === 4 && coords.x === this.nextCoords.x && coords.y === this.nextCoords.y) {
      this.setTutorialState(5);
    }
  }

  private advanceTutorialOnDirChanged(path: string): void {
    const coords = this.resolveCoords(path);
    if (!coords) return;

    if (this.tutorialState === 1 && coords.x === this.startCoords.x && coords.y === this.startCoords.y) {
      this.setTutorialState(2);
    } else if (this.tutorialState === 3 && coords.x === this.nextCoords.x && coords.y === this.nextCoords.y) {
      this.setTutorialState(4);
    }
  }

  private advanceTutorialOnFileRead(name: string): void {
    if (this.tutorialState === 5 && name === NOTE_FILE_NAME) {
      this.setTutorialState(TUTORIAL_COMPLETE_STATE);
    }
  }

  private setTutorialState(state: number): void {
    this.tutorialState = state;
    if (!this.guideText) return;

    if (state === TUTORIAL_COMPLETE_STATE) {
      this.guideText.destroy();
      this.guideText = undefined;
      return;
    }

    this.guideText.setText(TUTORIAL_MESSAGES[state] ?? "");
  }

  /** Clears all revealed tiles/items so entering a new area (e.g. the dungeon) repaints a fresh, dark canvas. */
  private resetWorld(): void {
    for (const tile of this.tiles.values()) tile.destroy();
    this.tiles.clear();

    for (const sprites of this.items.values()) {
      for (const sprite of sprites) sprite.destroy();
    }
    this.items.clear();
  }

  private spawnAt(path: string, animate: boolean): void {
    const coords = this.resolveCoords(path);
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
   * Acts as the "flashlight": directional symlinks reveal the adjacent floor
   * tile itself (no door sprite), while files and other symlinks (e.g. the
   * `dungeon` entrance) are rendered as item emoji on the current tile.
   */
  private illuminateRoom(entries: IlluminatedEntry[]): void {
    const coords = this.resolveCoords(this.currentPath);
    if (!coords) return;

    const itemEntries = entries.filter((entry) => {
      if (entry.type === "directory") return false;
      if (entry.type === "symlink") {
        const delta = DIRECTIONS[entry.name];
        if (delta) {
          this.revealTile(coords.x + delta.dx, coords.y + delta.dy);
          return false;
        }
      }
      return true;
    });

    this.revealItems(coords.x, coords.y, itemEntries);
  }

  private revealItems(x: number, y: number, items: IlluminatedEntry[]): void {
    const key = `${x},${y}`;
    for (const sprite of this.items.get(key) ?? []) sprite.destroy();

    const center = tileCenter(x, y);
    const itemSprites = items.map((item, index) => {
      const sprite = this.add
        .text(center.x - TILE_SIZE / 2 + 20, center.y - TILE_SIZE / 2 + 20 + index * 24, entryEmoji(item), {
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
