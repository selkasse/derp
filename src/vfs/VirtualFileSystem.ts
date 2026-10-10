import type { DirectoryNode, FileNode, SymlinkNode, VfsNode } from "./types";

const DUNGEON_ROOT = "/home/player/dungeon";

function makeDirectory(name: string): DirectoryNode {
  return { type: "directory", name, children: new Map() };
}

/** Splits an absolute path into its non-empty segments. */
function splitPath(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0);
}

export class VirtualFileSystem {
  private readonly root: DirectoryNode = makeDirectory("/");
  private cwd: string;

  constructor() {
    this.ensureDirectory(`${DUNGEON_ROOT}/.t_0_0`);
    this.ensureDirectory(`${DUNGEON_ROOT}/.t_1_0`);
    this.createSymlink(`${DUNGEON_ROOT}/.t_0_0/east`, `${DUNGEON_ROOT}/.t_1_0`);
    this.createSymlink(`${DUNGEON_ROOT}/.t_1_0/west`, `${DUNGEON_ROOT}/.t_0_0`);
    this.createFile(`${DUNGEON_ROOT}/.t_1_0/note.txt`, "You found a note.\n");

    this.cwd = `${DUNGEON_ROOT}/.t_0_0`;
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

  /** Lists the entry names of a directory (defaults to the cwd). */
  listDirectory(path: string = this.cwd): string[] {
    return this.listEntries(path).map((entry) => entry.name);
  }

  /** Lists the entries of a directory (defaults to the cwd) with their node types. */
  listEntries(path: string = this.cwd): { name: string; type: VfsNode["type"] }[] {
    const node = this.getNode(path);
    if (!node) {
      throw new Error(`ls: cannot access '${path}': No such file or directory`);
    }
    if (node.type !== "directory") {
      throw new Error(`ls: cannot access '${path}': Not a directory`);
    }
    return Array.from(node.children.values())
      .map((child) => ({ name: child.name, type: child.type }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Changes the cwd to the directory at `path` (relative or absolute),
   * following symlinks. Returns false if the target doesn't resolve to a
   * directory.
   */
  changeDirectory(path: string): boolean {
    const resolved = this.resolvePath(path);
    if (!resolved || resolved.node.type !== "directory") return false;
    this.cwd = resolved.canonicalPath;
    return true;
  }

  /**
   * Resolves a relative or absolute path against the cwd into its canonical
   * node, following symlinks (including chained ones) and `..`/`.` segments.
   */
  private resolvePath(path: string): { node: VfsNode; canonicalPath: string } | undefined {
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
        throw new Error(`Invariant violated: "${segment}" parent is not a directory`);
      }
      const next = node.children.get(segment);
      if (!next) {
        throw new Error(`Invariant violated: missing segment "${segment}"`);
      }
      node = next;
    }
    return node;
  }

  /** Creates a file (and any missing parent directories) at an absolute path. */
  createFile(path: string, content: string): FileNode {
    const { parent, name } = this.ensureParent(path);
    const node: FileNode = { type: "file", name, content };
    parent.children.set(name, node);
    return node;
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
        throw new Error(`Path segment "${segment}" in "${path}" is not a directory`);
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
