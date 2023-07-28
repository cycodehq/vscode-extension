import {
  HardcodedSecretsTreeDataProvider,
  HardcodedSecretsTreeItem,
} from "./hardcoded-secrets";

import * as vscode from "vscode";

export interface HardcodedSecretsTree {
  provider: HardcodedSecretsTreeDataProvider;
  view: vscode.TreeView<HardcodedSecretsTreeItem>;
}

export enum SeverityFirstLetter {
  High = "H",
}
