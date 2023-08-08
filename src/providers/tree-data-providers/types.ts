import { HardcodedSecretsTreeItem } from "./hardcoded-secrets-item";
import { HardcodedSecretsTreeDataProvider } from "./hardcoded-secrets-provider";

import * as vscode from "vscode";

export interface HardcodedSecretsTree {
  provider: HardcodedSecretsTreeDataProvider;
  view: vscode.TreeView<HardcodedSecretsTreeItem>;
}

export enum SeverityFirstLetter {
  Low = "L",
  High = "H",
  Medium = "M",
  Critical = "C",
}
