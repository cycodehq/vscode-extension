import * as vscode from "vscode";

export interface Vulnerability {
  readonly severityFirstLetter: string;
  readonly lineNumber: number;
  readonly type: string;
}

export class TreeViewItem extends vscode.TreeItem {
  public static readonly viewType = "scan.treeView";
  constructor(
    public readonly title: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly vulnerabilities?: Vulnerability[]
  ) {
    super(title, collapsibleState);
    this.tooltip = `${this.title}`;
    this.description =
      this.vulnerabilities !== undefined
        ? `${this.vulnerabilities.length} vulnerabilities`
        : "";
  }
}
