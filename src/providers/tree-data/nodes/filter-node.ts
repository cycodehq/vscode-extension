import { BaseNode } from './base-node';
import { ThemeIcon } from 'vscode';
import vscode from 'vscode';

export class FilterNode extends BaseNode {
  constructor() {
    const title = 'Filters';
    const summary = '(hover to view)';
    super(title, summary);

    this.contextValue = `FilterNode`;

    this.iconPath = new ThemeIcon('filter');
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
  }
}
