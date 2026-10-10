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

## [ ] Feature 4: Visualizing the Room (Phaser)
**Description:** Connect the Phaser game state to the VFS. Create a basic tileset using emojis/shapes.
**Acceptance Criteria:**
- When the game loads, Phaser renders a 2D tile at coordinates 0,0. The rest of the screen is black (Fog of War).
- The player character is visually represented by a 🧙♂️ emoji or a blue square.
- When the player types `ls`, Phaser reads the VFS. If there is a symlink called `east`, Phaser draws a door (🚪 emoji or brown square) on the right side of the tile.
- When the player types `cd east`, the Phaser camera pans to 1,0 and draws the player sprite there.
