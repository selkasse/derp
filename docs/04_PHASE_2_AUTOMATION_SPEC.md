# Phase 2: Automation and Items

## Feature 1: The `.bashrc` and Aliases
**Description:** Implement basic alias parsing in the mock shell.
**Acceptance Criteria:**
- The VFS contains a `~/.bashrc` file.
- The player can use a mock `echo 'alias e="cd east"' >> ~/.bashrc` command (or a simple mocked text editor) to add an alias.
- Typing `e` executes the alias.
- The Phaser GUI updates accordingly just like a manual `cd`.

## Feature 2: Items and The `mv` Command
**Description:** Allow files to act as items.
**Acceptance Criteria:**
- Create a `potion.sh` file in a dungeon tile.
- Phaser renders a potion sprite on that tile.
- The user can type `mv potion.sh ~/inventory/`.
- Phaser removes the potion sprite from the floor.
- The VFS reflects the file moving to `/home/player/inventory/`.

## Feature 3: The Keybind Engine
**Description:** Implement a `bindkey` utility to allow physical keystrokes to trigger shell commands.
**Acceptance Criteria:**
- The user can execute a mock command `bindkey ArrowRight "cd east"`.
- Pressing the physical Right Arrow key on the keyboard sends the `cd east` string directly into the shell executor.
- The game reacts instantly without the user needing to type in Xterm.
