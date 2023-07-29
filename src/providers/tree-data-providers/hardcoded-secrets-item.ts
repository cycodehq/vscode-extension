import * as vscode from "vscode";

export interface HardcodedSecret {
  readonly severityFirstLetter: string;
  readonly lineNumber: number;
  readonly type: string;
}

export class HardcodedSecretsTreeItem extends vscode.TreeItem {
  public static readonly viewType = "scan.treeView";
  constructor(
    public readonly title: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly hardcodedSecrets?: HardcodedSecret[]
  ) {
    super(title, collapsibleState);
    this.tooltip = `${this.title}`;
    this.description =
      this.hardcodedSecrets !== undefined
        ? `${this.hardcodedSecrets.length} vulnerabilities`
        : "";
  }
}
