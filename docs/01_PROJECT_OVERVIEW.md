# Project Overview: Terminal Crawler

## The Vision
Terminal Crawler is a hybrid 2D dungeon crawler and terminal emulator. The game teaches Linux command-line skills by dropping players into a tedious, manual UI and challenging them to automate their controls using real bash concepts (aliases, scripts, symlinks). 

The visual GUI (built with Phaser 3) is strictly a "viewer" for the underlying file system. When the user manipulates files in the terminal, the GUI updates instantly.

## The Core Concept: Files as Space
- **The Dungeon:** A master directory.
- **The Rooms (Tiles):** Every tile on the floor is a hidden directory (e.g., `.t_0_0`).
- **Movement:** Moving is navigating directories via `cd`.
- **Connections:** If Tile A is connected to Tile B to the east, Tile A contains a symlink named `east` pointing to Tile B's directory.
- **Vision:** If a player types `ls`, the GUI "illuminates" the current tile and reveals the names of the symlinks (doors/paths) and files (items) in that directory.

## The Progression Arc
1. **The Flashlight (`ls`):** The screen is dark. The player types `ls` to illuminate their current tile and see paths.
2. **The First Steps (`cd`):** The player manually types `cd east` to move one tile right. They must `ls` again to see.
3. **The Alias Epiphany:** The player edits `~/.bashrc` to add `alias e="cd east; ls"`. Movement becomes faster.
4. **The Scripting Era:** The player writes or finds `walk.sh` (a bash loop) to move multiple tiles at once (`./walk e 5`).
5. **The Keybind Sandbox:** The player uses a `bindkey` utility to map physical arrow keys to their scripts. The terminal overlay can be hidden, and they are now playing a fully customized GUI game.
