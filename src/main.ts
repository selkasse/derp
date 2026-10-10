import "./style.css";
import { VirtualFileSystem } from "./vfs/VirtualFileSystem";
import { TerminalUI } from "./terminal/TerminalUI";
import { Shell } from "./shell/Shell";
import { createGame } from "./game/createGame";
import { gameEvents } from "./events/EventBus";

const gameContainer = document.querySelector<HTMLDivElement>("#game-container")!;
const terminalContainer = document.querySelector<HTMLDivElement>("#terminal-container")!;

const vfs = new VirtualFileSystem();
const shell = new Shell(vfs, gameEvents);

createGame(gameContainer, gameEvents, vfs.getCwd());

const terminal = new TerminalUI(terminalContainer);

function promptFor(cwd: string): string {
  return `${cwd} $ `;
}

terminal.writeLine("Terminal Crawler v0.1");
terminal.setPrompt(promptFor(vfs.getCwd()));
terminal.prompt();

terminal.setCompletionHandler((line) => shell.getCompletions(line));

terminal.setLineHandler((line) => {
  for (const output of shell.execute(line)) {
    terminal.writeLine(output);
  }
  terminal.setPrompt(promptFor(vfs.getCwd()));
  terminal.prompt();
});
