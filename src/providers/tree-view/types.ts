import { TreeViewItem } from "./item";
import { TreeViewDataProvider } from "./provider";

import * as vscode from "vscode";

export interface TreeView {
  provider: TreeViewDataProvider;
  view: vscode.TreeView<TreeViewItem>;
}

export interface TreeViewDisplayedData {
  title: string;
  severityFirstLetter: SeverityFirstLetter;
  severity: string;
  lineNumber: number;
}

export enum SeverityFirstLetter {
  Low = "L",
  High = "H",
  Medium = "M",
  Critical = "C",
}
