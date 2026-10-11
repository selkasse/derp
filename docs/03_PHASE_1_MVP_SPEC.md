# Phase 1: MVP Specification

This document outlines the first features to build. Do not proceed to the next feature until the Acceptance Criteria (AC) are met.

## Global Technical Rules for the Agent

- **No External Assets:** Do not attempt to load `.png`, `.jpg`, or spritesheets. Use Phaser's built-in shape generation (colored rectangles/circles) or render Text objects with emojis (e.g., 🧙♂️ for player, 🚪 for doors) for all visuals.

## [x] Feature 1: The App Shell and VFS Setup

**Description:** Set up the Vite + TypeScript project. Integrate Xterm.js taking up the bottom 40% of the screen, and an empty Phaser canvas taking the top 60%. Implement a basic Virtual File System in JS.
**Acceptance Criteria:**

- Vite runs successfully.
- Xterm.js renders and can echo user input.
- A VFS object exists in memory (can be a simple JS object/tree).
- The player starts with `cwd` set to `/home/player/dungeon/.t_0_0`.
- The terminal supports basic line editing: `Backspace` deletes the previous character, and the display never desyncs from the underlying input buffer (e.g. control characters like `Tab` must not be inserted as literal text).
- `Ctrl+U` clears the entire current line in one action.

## [x] Feature 2: Basic Command Parsing (`ls` and `pwd`)

**Description:** Build a mock shell that parses commands from Xterm.js and interacts with the VFS.
**Acceptance Criteria:**

- Typing `pwd` returns the current VFS path.
- Typing `ls` lists the contents of the current directory.
- The VFS structure should be initialized with three directories: `.t_0_0` containing a symlink `east` pointing to `.t_1_0`, and `.t_1_0` containing a `note.txt` and a symlink `west` pointing back to `.t_0_0`.
- Pressing `Tab` triggers completion: completing the first word suggests known commands (`cd`, `ls`, `pwd`); completing a later word suggests entries in the current directory. A single match completes it fully; multiple matches complete to their longest common prefix and, if still ambiguous, are listed above the prompt.

## [x] Feature 3: Navigation (`cd`) and The Event Bridge

**Description:** Allow the user to change directories, and fire an event when this happens.
**Acceptance Criteria:**

- Typing `cd east` from `.t_0_0` changes the `cwd` to `.t_1_0`.
- The terminal prompt updates to reflect the new directory.
- Create an `EventEmitter`. When `cd` is successful, emit `dir_changed`.
- Phaser listens for `dir_changed` and simply logs the new directory to the console (visuals come next).

## [x] Feature 4: Visualizing the Room (Phaser)

**Description:** Connect the Phaser game state to the VFS. Create a basic tileset using emojis/shapes.
**Acceptance Criteria:**

- When the game loads, Phaser renders a 2D tile at coordinates 0,0. The rest of the screen is black (Fog of War).
- The player character is visually represented by a 🧙♂️ emoji or a blue square.
- When the player types `ls`, Phaser reads the VFS. If there is a symlink called `east`, Phaser does NOT draw a door emoji. Instead, it draws the actual adjacent floor tile (e.g., at coordinates 1,0) to reveal that a path exists.
- When the player types `cd east`, the Phaser camera pans to 1,0 and moves the player sprite there.
- When the player types `ls` in the new directory, Phaser renders any files (e.g., `note.txt` as a 📜 emoji) on that specific tile.

## [x] Feature 5: Command History

- Up and down arrows should cycle through command history

## [x] Feature 6: Reading files (`cat` command)

**Description:** Implement the `cat` command to allow the player to read the contents of text files, specifically using it to read the `note.txt` lore file that teaches them about aliases.
**Acceptance Criteria:**

- The mock shell can parse and execute the `cat <filename>` command.
- If the target file exists in the current VFS directory and is a text file, its contents are printed to the terminal display.
- If the file does not exist, or if the user tries to `cat` a directory/symlink, the terminal outputs a standard Linux error (e.g., `cat: <filename>: No such file or directory` or `cat: <filename>: Is a directory`).
- Update the VFS initialization for `.t_1_0` so that `note.txt` contains the following string content:
  _"Day 4. My fingers are bleeding from typing 'cd' and 'ls' every time I enter a room. I can't do it anymore. I managed to scrounge up some magic to bend the environment. I wrote `alias e="cd east; ls"` into my `~/.bashrc` file. Thank god. Now I just type `e` and it does both for me. Moving much faster now."_

## [x] Feature 7: The Ethereal Guide (Tutorial Sequence)

**Description:** Implement a state-based tutorial overlay in the Phaser GUI that gently guides new players through their first three commands (`ls`, `cd`, and `cat`) using diegetic floating text.
**Acceptance Criteria:**

- Create a Phaser Text object that floats centrally in the upper part of the game screen (or just above the player sprite), styled with a faint, ghostly color (e.g., light gray or translucent white).
- **State 0 (On game load):** The text reads: _"It is too dark to see. List your surroundings. (type `ls` and press Enter)"_
- **State 1 (After first `ls`):** When the player successfully executes `ls` in `.t_0_0`, the text updates to: _"A path exists. Change your directory to move forward. (type `cd east`)"_
- **State 2 (After `cd east`):** When the player enters `.t_1_0`, the text is temporarily cleared/hidden.
- **State 3 (After second `ls`):** When the player executes `ls` in `.t_1_0` (revealing `note.txt`), the text updates to: _"A remnant left behind. Read its contents. (type `cat note.txt`)"_
- **State 4 (Completion):** When the player successfully executes `cat note.txt`, the floating text disappears permanently for the remainder of the session.
