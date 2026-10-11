import type { VirtualFileSystem } from "../vfs/VirtualFileSystem";
import type { EventEmitter, GameEvents } from "../events/EventBus";

const COMMANDS = ["cat", "cd", "ls", "pwd"];

/** Parses and executes mock shell commands against the VFS. */
export class Shell {
  constructor(
    private readonly vfs: VirtualFileSystem,
    private readonly events: EventEmitter<GameEvents>,
  ) {}

  /** Returns completion candidates for the word currently being typed. */
  getCompletions(line: string): string[] {
    const endsWithSpace = /\s$/.test(line);
    const tokens = line.split(/\s+/).filter((token) => token.length > 0);

    if (tokens.length === 0 || (tokens.length === 1 && !endsWithSpace)) {
      const prefix = tokens[0] ?? "";
      return COMMANDS.filter((command) => command.startsWith(prefix));
    }

    const prefix = endsWithSpace ? "" : tokens[tokens.length - 1];
    try {
      return this.vfs.listDirectory().filter((name) => name.startsWith(prefix));
    } catch {
      return [];
    }
  }

  /** Executes a line of input, returning the output lines to print. */
  execute(line: string): string[] {
    const trimmed = line.trim();
    if (trimmed.length === 0) return [];

    const [command, ...args] = trimmed.split(/\s+/);
    switch (command) {
      case "pwd":
        return [this.vfs.getCwd()];
      case "ls":
        return this.runLs(args);
      case "cd":
        return this.runCd(args);
      case "cat":
        return this.runCat(args);
      default:
        return [`${command}: command not found`];
    }
  }

  private runCd(args: string[]): string[] {
    const target = args[0];
    if (!target) return ["cd: missing operand"];

    const ok = this.vfs.changeDirectory(target);
    if (!ok) return [`cd: no such file or directory: ${target}`];

    this.events.emit("dir_changed", this.vfs.getCwd());
    return [];
  }

  private runCat(args: string[]): string[] {
    const target = args[0];
    if (!target) return ["cat: missing operand"];

    try {
      const content = this.vfs.readFile(target);
      this.events.emit("file_read", { path: this.vfs.getCwd(), name: target });
      return content.split("\n");
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)];
    }
  }

  private runLs(args: string[]): string[] {
    const showHidden = args.includes("-a");
    try {
      const entries = this.vfs.listEntries(this.vfs.getCwd(), showHidden);
      this.events.emit("room_illuminated", { path: this.vfs.getCwd(), entries });
      return entries.length > 0 ? [entries.map((entry) => entry.name).join("  ")] : [];
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)];
    }
  }
}
