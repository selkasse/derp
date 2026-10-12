import type { VirtualFileSystem } from "../vfs/VirtualFileSystem";
import type { EventEmitter, GameEvents } from "../events/EventBus";

const COMMANDS = ["cat", "cd", "echo", "ls", "pwd"];

/** Splits a line into whitespace-separated tokens, stripping (but preserving the contents of) quoted segments. */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inToken = false;
  let quote: '"' | "'" | undefined;

  for (const char of input) {
    if (quote) {
      if (char === quote) quote = undefined;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      inToken = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (inToken) {
        tokens.push(current);
        current = "";
        inToken = false;
      }
      continue;
    }
    current += char;
    inToken = true;
  }
  if (inToken) tokens.push(current);
  return tokens;
}

/** Splits a line on a top-level (unquoted) `>` redirect operator, ignoring `>>` (handled by a future feature). */
function splitRedirect(line: string): { command: string; target: string } | undefined {
  let quote: '"' | "'" | undefined;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote) {
      if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") {
      if (line[i + 1] === ">") return undefined;
      return { command: line.slice(0, i), target: line.slice(i + 1) };
    }
  }
  return undefined;
}

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

    const redirect = splitRedirect(trimmed);
    if (redirect) return this.runRedirect(redirect.command, redirect.target);

    return this.runCommand(trimmed);
  }

  private runCommand(input: string): string[] {
    const [command, ...args] = tokenize(input);
    switch (command) {
      case "pwd":
        return [this.vfs.getCwd()];
      case "ls":
        return this.runLs(args);
      case "cd":
        return this.runCd(args);
      case "cat":
        return this.runCat(args);
      case "echo":
        return this.runEcho(args);
      default:
        return [`${command}: command not found`];
    }
  }

  private runRedirect(command: string, targetRaw: string): string[] {
    const target = tokenize(targetRaw)[0];
    if (!command.trim() || !target) {
      return ["bash: syntax error near unexpected token `newline'"];
    }

    const output = this.runCommand(command);
    const direction = this.vfs.writeFile(target, output.join("\n"));
    if (direction) {
      this.events.emit("door_unlocked", { path: this.vfs.getCwd(), direction });
    }
    return [];
  }

  private runCd(args: string[]): string[] {
    const target = args[0];
    if (!target) return ["cd: missing operand"];

    if (!this.vfs.isIlluminated()) {
      return ["cd: it's too dark to see. Try `ls` first."];
    }

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

  private runEcho(args: string[]): string[] {
    const cwd = this.vfs.getCwd();
    if (this.vfs.isSilent(cwd)) {
      this.vfs.breakSilence(cwd);
      this.events.emit("silence_broken", { path: cwd });
      return ["The silence shatters."];
    }
    return [args.join(" ")];
  }

  private runLs(args: string[]): string[] {
    const showHidden = args.includes("-a");
    const cwd = this.vfs.getCwd();
    if (this.vfs.isSilent(cwd)) {
      this.events.emit("room_silenced", { path: cwd });
      return ["ls: the heavy silence absorbs your light."];
    }
    try {
      const entries = this.vfs.listEntries(cwd, showHidden);
      this.vfs.illuminate(cwd);
      this.events.emit("room_illuminated", { path: cwd, entries });
      return entries.length > 0 ? [entries.map((entry) => entry.name).join("  ")] : [];
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)];
    }
  }
}
