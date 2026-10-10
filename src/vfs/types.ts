export interface FileNode {
  type: "file";
  name: string;
  content: string;
}

export interface SymlinkNode {
  type: "symlink";
  name: string;
  /** Absolute path this symlink points to. */
  target: string;
}

export interface DirectoryNode {
  type: "directory";
  name: string;
  children: Map<string, VfsNode>;
}

export type VfsNode = FileNode | DirectoryNode | SymlinkNode;
