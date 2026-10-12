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

## [x] Feature 8: The Origin (`~`) and Entering the Dungeon

**Description:** Set up the actual home directory, implement hidden file logic for `ls`, and use `cat` to read the first lore note.
**Acceptance Criteria:**

- The VFS starting directory (the player's spawn) is now strictly `/home/player` (representing `~`).
- In `/home/player`, initialize a hidden file named `.bashrc`, and a symlink named `dungeon` pointing to the first grid tile `.t_0_0`.
- **Important:** The `ls` command must NOT show `.bashrc` by default. It must only be visible if the player types `ls -a`.
- The `cd dungeon` command successfully changes the `cwd` to the start of the grid (`.t_0_0`), and updates the Phaser camera/player sprite to coordinate 0,0.
- Inside `.t_1_0` (Tile 2), initialize `note.txt`. The contents read: _"The dark absorbs all sound ahead. It demands a voice."_
- The shell can execute `cat <filename>`. If it's a valid text file in the current directory, print its contents to the terminal.

## [ ] Feature 9: The "Speak" Command (`echo`)

**Description:** Implement `echo` and create the "Silent Room" puzzle in Tile 3 (`.t_2_0`).
**Acceptance Criteria:**

- The shell can execute `echo <string>` and print the string back to the terminal.
- **The Puzzle:** `.t_2_0` starts in a "silent" state. If the player types `ls` while silent, do not list files; instead, output `ls: the heavy silence absorbs your light.`
- If the player types `echo` followed by any string while in `.t_2_0`, remove the "silent" state and output: `The silence shatters.`
- Subsequent `ls` commands in `.t_2_0` reveal the `east` symlink.

## [ ] Feature 10: The Engraving Puzzle (`>`)

**Description:** Implement basic file writing (overwrite) to solve a dynamic door puzzle in Tile 4 (`.t_3_0`).
**Acceptance Criteria:**

- The shell parser must handle `>`. E.g., `echo "open" > key.txt` creates (or overwrites) a file named `key.txt` in the current directory containing the text "open".
- **The Puzzle:** `.t_3_0` initializes with a file `tablet.txt`. There is NO `east` symlink.
- `tablet.txt` contents: _"Speaking is fleeting; writing is permanent. The door ahead is sealed. It only opens when it finds a file named `key.txt` containing the word `open`. Use the redirect symbol `>` to create it. (e.g., `echo "open" > key.txt`)"_
- **Watcher:** If a file named `key.txt` is created in `.t_3_0` containing "open", automatically generate the `east` symlink pointing to `.t_4_0`, emit the VFS change event, and draw the new tile.

## [ ] Feature 11: The Append Puzzle (`>>`) and Climax

**Description:** Implement file appending (`>>`) to solve Tile 5, and place the final lore in Tile 6.
**Acceptance Criteria:**

- The shell parser must handle `>>`. E.g., `echo "bone" >> offering.txt` appends text to a new line without deleting existing content.
- **The Puzzle:** `.t_4_0` initializes with `shrine.txt`. There is NO `east` symlink.
- `shrine.txt` contents: _"The mechanism requires two offerings: `blood` and `bone`, placed in `offering.txt`. Do not overwrite your first offering! Use `>>` to append. (e.g., `echo "blood" > offering.txt` then `echo "bone" >> offering.txt`)"_
- **Watcher:** If `offering.txt` exists in `.t_4_0` and contains both "blood" and "bone", generate the `east` symlink to `.t_5_0`.
- **Climax:** `.t_5_0` contains `corpse_log.txt` with contents: _"Day 4. My fingers bleed from typing 'cd east' and 'ls' in every room. I realize now that every traveler has a hidden Soul Record at their origin: `~/.bashrc`. If you append an alias into it, reality bends. I wrote `echo 'alias e="cd east; ls"' >> ~/.bashrc`. Thank the gods. Now I just type `e`."_

## [ ] Feature 12: The Ethereal Guide (Tutorial Overlays)

**Description:** Implement a state-based floating text UI in Phaser to nudge the player, and mirror these messages in the terminal.
**Acceptance Criteria:**

- A ghostly Phaser Text object floats near the player sprite.
- **Console Mirroring:** Every time the Guide's text changes, also print it directly into the Xterm.js terminal buffer, formatted as `[Guide]: <text>`.
- **State 1:** In `/home/player`, reads: _"You awaken at your origin. (type `ls` and press Enter)"_
- **State 2:** After first `ls`: _"The depths beckon. (type `cd dungeon`)"_
- **State 3:** Inside `.t_0_0` (after entering): _"It is too dark to see. (type `ls`)"_
- **State 4:** After `ls` reveals `east`: _"A path exists. (type `cd east`)"_
- **State 5:** In `.t_1_0` (after player types `ls`): _"A remnant left behind. (type `cat note.txt`)"_
- **State 6:** In `.t_2_0` (if silent): _"The void demands a voice. (type `echo "hello"`)"_.
- Text clears permanently after solving the silent room.
