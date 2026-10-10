# System Architecture

The application is built on three main pillars: the Terminal UI, the Virtual File System (VFS), and the Game Engine.

```mermaid
flowchart TD
  subgraph user_interface["User Interface"]
    xterm["Xterm.js (Terminal)"]
    phaser["Phaser 3 (Canvas GUI)"]
  end

  subgraph core_logic["Core Logic"]
    shell["Mock Bash Shell Parser"]
    vfs["Virtual File System (State)"]
    watcher["VFS Event Watcher"]
  end

  xterm -->|"User Input"| shell
  shell -->|"Executes Command"| vfs
  vfs -->|"File/Dir Change Event"| watcher
  watcher -->|"Updates Sprites/Camera"| phaser
  phaser -->|"Visualizes current working directory (cwd)"| user_interface
```

## State Management
- **Source of Truth:** The Virtual File System (VFS) is the absolute source of truth. Phaser does not manage player position. The player's position is simply the VFS `currentWorkingDirectory`.
- **Event Bus:** Use a simple EventEmitter to bridge the VFS and Phaser.
  - Events: `onDirectoryChange(path)`, `onFileCreated(file)`, `onFileDeleted(file)`.
