import * as vscode from 'vscode';

export class BaseNode extends vscode.TreeItem {
  constructor(title: string, summary?: string, icon?: string) {
    super(title, vscode.TreeItemCollapsibleState.Collapsed);

    this.tooltip = title;

    if (icon) {
      this.iconPath = {
        light: icon,
        dark: icon,
      };
    }

    if (summary) {
      this.description = summary;
    }
  }
}
