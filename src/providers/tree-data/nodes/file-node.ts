import * as vscode from 'vscode';
import { BaseNode } from './base-node';

export class FileNode extends BaseNode {
  constructor(filepath: string, detectionCount: number) {
    const title = vscode.workspace.asRelativePath(filepath, false);
    const summary = `${detectionCount} vulnerabilities`;
    super(title, summary);

    this.contextValue = 'fileNode';

    // used to enable file theme icon
    this.iconPath = vscode.ThemeIcon.File;
    this.resourceUri = vscode.Uri.file(filepath);
  }
}
