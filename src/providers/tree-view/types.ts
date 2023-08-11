import { TreeViewItem } from "./item";
import { TreeViewDataProvider } from "./provider";

import * as vscode from "vscode";

export interface TreeView {
  provider: TreeViewDataProvider;
  view: vscode.TreeView<TreeViewItem>;
}

export interface TreeViewDisplayedData {
  severityFirstLetter: SeverityFirstLetter;
  severity: string;
  lineNumber: number;
  type: string;
}

export enum SeverityFirstLetter {
  Low = "L",
  High = "H",
  Medium = "M",
  Critical = "C",
}
