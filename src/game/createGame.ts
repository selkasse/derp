import Phaser from "phaser";
import type { EventEmitter, GameEvents } from "../events/EventBus";

class MainScene extends Phaser.Scene {
  constructor(private readonly gameEvents: EventEmitter<GameEvents>) {
    super("main");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#000000");
    this.gameEvents.on("dir_changed", (path) => {
      console.log("[Phaser] dir_changed:", path);
    });
  }
}

export function createGame(container: HTMLElement, events: EventEmitter<GameEvents>): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: container.clientWidth,
    height: container.clientHeight,
    backgroundColor: "#000000",
    scene: [new MainScene(events)],
  });
}
