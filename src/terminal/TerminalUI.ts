import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const ENTER = "\r";
const BACKSPACE = "\u007f";
const CTRL_C = "\u0003";
const CTRL_U = "\u0015";
const TAB = "\t";
const ARROW_UP = "\u001b[A";
const ARROW_DOWN = "\u001b[B";

export type LineHandler = (line: string) => void;
export type CompletionHandler = (line: string) => string[];

function longestCommonPrefix(words: string[]): string {
  if (words.length === 0) return "";
  let prefix = words[0];
  for (const word of words.slice(1)) {
    while (!word.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === "") return "";
    }
  }
  return prefix;
}

/**
 * Thin wrapper around xterm.js that owns raw input buffering (line editing,
 * backspace, tab completion, prompt rendering) so callers just react to
 * completed lines.
 */
export class TerminalUI {
  private readonly term: Terminal;
  private readonly fitAddon = new FitAddon();
  private lineBuffer = "";
  private lineHandler: LineHandler = () => {};
  private completionHandler: CompletionHandler = () => [];
  private promptText = "$ ";
  private readonly history: string[] = [];
  private historyIndex = 0;
  private draftLine = "";

  constructor(container: HTMLElement) {
    this.term = new Terminal({
      cursorBlink: true,
      fontFamily: "Menlo, Consolas, monospace",
      fontSize: 14,
      theme: {
        background: "#000000",
        foreground: "#33ff33",
      },
    });

    this.term.loadAddon(this.fitAddon);
    this.term.open(container);
    this.fitAddon.fit();

    window.addEventListener("resize", () => this.fitAddon.fit());

    this.term.onData((data) => this.handleData(data));
  }

  setLineHandler(handler: LineHandler): void {
    this.lineHandler = handler;
  }

  setCompletionHandler(handler: CompletionHandler): void {
    this.completionHandler = handler;
  }

  setPrompt(prompt: string): void {
    this.promptText = prompt;
  }

  writeLine(text: string): void {
    this.term.write(`${text}\r\n`);
  }

  prompt(): void {
    this.term.write(this.promptText);
  }

  fit(): void {
    this.fitAddon.fit();
  }

  private handleData(data: string): void {
    switch (data) {
      case ENTER:
        this.term.write("\r\n");
        if (this.lineBuffer.trim().length > 0) {
          this.history.push(this.lineBuffer);
        }
        this.historyIndex = this.history.length;
        this.draftLine = "";
        this.lineHandler(this.lineBuffer);
        this.lineBuffer = "";
        break;
      case BACKSPACE:
        if (this.lineBuffer.length > 0) {
          this.lineBuffer = this.lineBuffer.slice(0, -1);
          this.redrawLine();
        }
        break;
      case CTRL_U:
        this.lineBuffer = "";
        this.redrawLine();
        break;
      case CTRL_C:
        this.lineBuffer = "";
        this.term.write("^C\r\n");
        this.prompt();
        break;
      case TAB:
        this.handleTabCompletion();
        break;
      case ARROW_UP:
        this.navigateHistory(-1);
        break;
      case ARROW_DOWN:
        this.navigateHistory(1);
        break;
      default:
        // Ignore other control/escape sequences for now.
        if (data >= " ") {
          this.lineBuffer += data;
          this.term.write(data);
        }
        break;
    }
  }

  private handleTabCompletion(): void {
    const endsWithSpace = /\s$/.test(this.lineBuffer);
    const tokens = this.lineBuffer.split(/\s+/).filter((token) => token.length > 0);
    const currentWord = endsWithSpace ? "" : (tokens[tokens.length - 1] ?? "");

    const completions = this.completionHandler(this.lineBuffer);
    if (completions.length === 0) return;

    if (completions.length === 1) {
      this.replaceLastWord(currentWord, completions[0]);
      return;
    }

    const commonPrefix = longestCommonPrefix(completions);
    if (commonPrefix.length > currentWord.length) {
      this.replaceLastWord(currentWord, commonPrefix);
      return;
    }

    this.term.write(`\r\n${completions.join("  ")}\r\n`);
    this.redrawLine();
  }

  /** Moves `historyIndex` by `direction` (-1 for older, +1 for newer) and loads that entry. */
  private navigateHistory(direction: -1 | 1): void {
    if (this.history.length === 0) return;

    if (direction === -1 && this.historyIndex === 0) return;
    if (direction === 1 && this.historyIndex === this.history.length) return;

    if (this.historyIndex === this.history.length) {
      this.draftLine = this.lineBuffer;
    }

    this.historyIndex += direction;
    this.lineBuffer = this.historyIndex === this.history.length ? this.draftLine : this.history[this.historyIndex];
    this.redrawLine();
  }

  private replaceLastWord(currentWord: string, replacement: string): void {
    this.lineBuffer = this.lineBuffer.slice(0, this.lineBuffer.length - currentWord.length) + replacement;
    this.redrawLine();
  }

  /** Clears the current terminal line and redraws it from `promptText` + `lineBuffer`. */
  private redrawLine(): void {
    this.term.write(`\r\x1b[K${this.promptText}${this.lineBuffer}`);
  }
}
