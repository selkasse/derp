import type { DirectoryNode, FileNode, SymlinkNode, VfsNode } from "./types";

const HOME = "/home/player";
const DUNGEON_ROOT = "/dungeon";

function makeDirectory(name: string): DirectoryNode {
  return { type: "directory", name, children: new Map() };
}

/** Splits an absolute path into its non-empty segments. */
function splitPath(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0);
}

/** A room whose exit is sealed until a specific file is written with qualifying content. */
interface DoorPuzzle {
  roomPath: string;
  fileName: string;
  direction: string;
  targetPath: string;
  isSolved: (content: string) => boolean;
}

export class VirtualFileSystem {
  private readonly root: DirectoryNode = makeDirectory("/");
  private cwd: string;

  /** Paths of rooms currently in a "silent" state (see `.t_2_0`'s puzzle). */
  private readonly silentRooms = new Set<string>([`${DUNGEON_ROOT}/.t_2_0`]);

  /** Paths of rooms the player has `ls`'d since arriving (required before `cd`'ing out, including via symlinks). */
  private readonly illuminatedRooms = new Set<string>();

  /** Rooms with a watcher waiting for a file to be written with qualifying content (see `.t_3_0`'s puzzle). */
  private readonly doorPuzzles: DoorPuzzle[] = [
    {
      roomPath: `${DUNGEON_ROOT}/.t_3_0`,
      fileName: "key.txt",
      direction: "east",
      targetPath: `${DUNGEON_ROOT}/.t_4_0`,
      isSolved: (content) => content.includes("open"),
    },
  ];

  constructor() {
    this.ensureDirectory(`${DUNGEON_ROOT}/.t_0_0`);
    this.ensureDirectory(`${DUNGEON_ROOT}/.t_1_0`);
    this.ensureDirectory(`${DUNGEON_ROOT}/.t_2_0`);
    this.ensureDirectory(`${DUNGEON_ROOT}/.t_3_0`);

    this.createSymlink(`${DUNGEON_ROOT}/.t_0_0/east`, `${DUNGEON_ROOT}/.t_1_0`);
    this.createSymlink(`${DUNGEON_ROOT}/.t_1_0/west`, `${DUNGEON_ROOT}/.t_0_0`);
    this.createSymlink(`${DUNGEON_ROOT}/.t_1_0/east`, `${DUNGEON_ROOT}/.t_2_0`);

    this.createFile(
      `${DUNGEON_ROOT}/.t_1_0/note.txt`,
      "The dark absorbs all sound ahead. It demands a voice."
    );

    this.createSymlink(`${DUNGEON_ROOT}/.t_2_0/west`, `${DUNGEON_ROOT}/.t_1_0`);
    this.createSymlink(`${DUNGEON_ROOT}/.t_2_0/east`, `${DUNGEON_ROOT}/.t_3_0`);
    this.createSymlink(`${DUNGEON_ROOT}/.t_3_0/west`, `${DUNGEON_ROOT}/.t_2_0`);
    this.createSymlink(`${DUNGEON_ROOT}/.t_4_0/west`, `${DUNGEON_ROOT}/.t_3_0`);

    this.createFile(
      `${DUNGEON_ROOT}/.t_3_0/tablet.txt`,
      'Speaking is fleeting; writing is permanent. The door ahead is sealed. It only opens when it finds a file named `key.txt` containing the word `open`. Use the redirect symbol `>` to create it. (e.g., `echo "open" > key.txt`)'
    );

    this.createFile(`${HOME}/.bashrc`, "");

    this.createSymlink(`${HOME}/dungeon`, `${DUNGEON_ROOT}/.t_0_0`);

    this.cwd = HOME;
  }

  /** Returns whether the room at `path` (defaults to cwd) is in a "silent" state. */
  isSilent(path: string = this.cwd): boolean {
    return this.silentRooms.has(path);
  }

  /** Clears the "silent" state for the room at `path` (defaults to cwd). */
  breakSilence(path: string = this.cwd): void {
    this.silentRooms.delete(path);
  }

  /** Returns whether the room at `path` (defaults to cwd) has been `ls`'d since the player arrived. */
  isIlluminated(path: string = this.cwd): boolean {
    return this.illuminatedRooms.has(path);
  }

  /** Marks the room at `path` (defaults to cwd) as `ls`'d, permitting `cd` out of it. */
  illuminate(path: string = this.cwd): void {
    this.illuminatedRooms.add(path);
  }

  getCwd(): string {
    return this.cwd;
  }

  /** Resolves a node at an absolute path, or undefined if it doesn't exist. */
  getNode(path: string): VfsNode | undefined {
    const segments = splitPath(path);
    let current: VfsNode = this.root;
    for (const segment of segments) {
      if (current.type !== "directory") return undefined;
      const next = current.children.get(segment);
      if (!next) return undefined;
      current = next;
    }
    return current;
  }

  /** Lists the entry names of a directory (defaults to the cwd). Hidden (dotfile) entries are omitted unless `showHidden` is set. */
  listDirectory(path: string = this.cwd, showHidden = false): string[] {
    return this.listEntries(path, showHidden).map((entry) => entry.name);
  }

  /** Lists the entries of a directory (defaults to the cwd) with their node types. Hidden (dotfile) entries are omitted unless `showHidden` is set. */
  listEntries(
    path: string = this.cwd,
    showHidden = false
  ): { name: string; type: VfsNode["type"] }[] {
    const node = this.getNode(path);
    if (!node) {
      throw new Error(`ls: cannot access '${path}': No such file or directory`);
    }
    if (node.type !== "directory") {
      throw new Error(`ls: cannot access '${path}': Not a directory`);
    }
    return Array.from(node.children.values())
      .filter((child) => showHidden || !child.name.startsWith("."))
      .map((child) => ({ name: child.name, type: child.type }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Changes the cwd to the directory at `path` (relative or absolute),
   * following symlinks (including directional ones like `east`). Returns
   * false if the current room hasn't been `ls`'d yet, or if the target
   * doesn't resolve to a directory.
   */
  changeDirectory(path: string): boolean {
    if (!this.isIlluminated()) return false;
    const resolved = this.resolvePath(path);
    if (!resolved || resolved.node.type !== "directory") return false;
    this.cwd = resolved.canonicalPath;
    return true;
  }

  /**
   * Resolves a relative or absolute path against the cwd into its canonical
   * node, following symlinks (including chained ones) and `..`/`.` segments.
   */
  private resolvePath(
    path: string
  ): { node: VfsNode; canonicalPath: string } | undefined {
    const base = path.startsWith("/") ? "" : this.cwd;
    const queue = splitPath(`${base}/${path}`);

    const visitedSymlinks = new Set<string>();
    let stack: string[] = [];
    let node: VfsNode = this.root;

    while (queue.length > 0) {
      const segment = queue.shift()!;
      if (segment === ".") continue;

      if (segment === "..") {
        stack.pop();
        node = this.walkFromRoot(stack);
        continue;
      }

      if (node.type !== "directory") return undefined;
      const child = node.children.get(segment);
      if (!child) return undefined;

      if (child.type === "symlink") {
        if (visitedSymlinks.has(child.target)) return undefined;
        visitedSymlinks.add(child.target);
        queue.unshift(...splitPath(child.target));
        stack = [];
        node = this.root;
        continue;
      }

      stack.push(segment);
      node = child;
    }

    return { node, canonicalPath: `/${stack.join("/")}` };
  }

  /** Walks from the root through a list of directory names, assumed valid. */
  private walkFromRoot(segments: string[]): VfsNode {
    let node: VfsNode = this.root;
    for (const segment of segments) {
      if (node.type !== "directory") {
        throw new Error(
          `Invariant violated: "${segment}" parent is not a directory`
        );
      }
      const next = node.children.get(segment);
      if (!next) {
        throw new Error(`Invariant violated: missing segment "${segment}"`);
      }
      node = next;
    }
    return node;
  }

  /**
   * Reads the contents of the file at `path` (relative or absolute),
   * following symlinks. Throws a `cat`-style error if the path doesn't
   * resolve, or resolves to a directory.
   */
  readFile(path: string): string {
    const resolved = this.resolvePath(path);
    if (!resolved) {
      throw new Error(`cat: ${path}: No such file or directory`);
    }
    if (resolved.node.type === "directory") {
      throw new Error(`cat: ${path}: Is a directory`);
    }
    if (resolved.node.type !== "file") {
      throw new Error(`cat: ${path}: No such file or directory`);
    }
    return resolved.node.content;
  }

  /** Creates a file (and any missing parent directories) at an absolute path. */
  createFile(path: string, content: string): FileNode {
    const { parent, name } = this.ensureParent(path);
    const node: FileNode = { type: "file", name, content };
    parent.children.set(name, node);
    return node;
  }

  /**
   * Writes (creating or overwriting) a file at `path` (relative or absolute,
   * resolved against the cwd). Returns the direction of a door symlink if
   * this write solved a sealed room's puzzle.
   */
  writeFile(path: string, content: string): string | undefined {
    const absolutePath = path.startsWith("/") ? path : `${this.cwd}/${path}`;
    const segments = splitPath(absolutePath);
    const name = segments.pop();
    if (!name) {
      throw new Error(`Invalid path: "${path}"`);
    }
    const roomPath = `/${segments.join("/")}`;
    const parent = this.ensureDirectory(roomPath);

    const existing = parent.children.get(name);
    if (existing && existing.type === "directory") {
      throw new Error(`bash: ${path}: Is a directory`);
    }

    parent.children.set(name, { type: "file", name, content });
    return this.checkDoorPuzzles(roomPath, name, content);
  }

  /** Checks whether writing `fileName` in `roomPath` solves a pending door puzzle, creating the exit symlink if so. */
  private checkDoorPuzzles(
    roomPath: string,
    fileName: string,
    content: string
  ): string | undefined {
    for (const puzzle of this.doorPuzzles) {
      if (puzzle.roomPath !== roomPath || puzzle.fileName !== fileName)
        continue;
      if (this.getNode(`${puzzle.roomPath}/${puzzle.direction}`)) continue;
      if (!puzzle.isSolved(content)) continue;

      this.ensureDirectory(puzzle.targetPath);
      this.createSymlink(
        `${puzzle.roomPath}/${puzzle.direction}`,
        puzzle.targetPath
      );
      return puzzle.direction;
    }
    return undefined;
  }

  /** Creates a symlink (and any missing parent directories) at an absolute path. */
  createSymlink(path: string, target: string): SymlinkNode {
    const { parent, name } = this.ensureParent(path);
    const node: SymlinkNode = { type: "symlink", name, target };
    parent.children.set(name, node);
    return node;
  }

  /** Creates a directory (and any missing parents) at an absolute path. */
  private ensureDirectory(path: string): DirectoryNode {
    const segments = splitPath(path);
    let current = this.root;
    for (const segment of segments) {
      let next = current.children.get(segment);
      if (!next) {
        next = makeDirectory(segment);
        current.children.set(segment, next);
      }
      if (next.type !== "directory") {
        throw new Error(
          `Path segment "${segment}" in "${path}" is not a directory`
        );
      }
      current = next;
    }
    return current;
  }

  /** Ensures the parent directory of a path exists, returning it with the final path segment. */
  private ensureParent(path: string): { parent: DirectoryNode; name: string } {
    const segments = splitPath(path);
    const name = segments.pop();
    if (!name) {
      throw new Error(`Invalid path: "${path}"`);
    }
    const parent = this.ensureDirectory(`/${segments.join("/")}`);
    return { parent, name };
  }
}
