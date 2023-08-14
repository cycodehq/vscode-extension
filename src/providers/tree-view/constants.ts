import * as vscode from 'vscode';
import { TreeViewItem } from './item';
import { ScanType } from '../../constants';

const SECRETS_SECTION = new TreeViewItem(
  "Hardcoded Secrets",
  vscode.TreeItemCollapsibleState.Collapsed,
  undefined,
  ScanType.Secrets,
);

const SCA_SECTION = new TreeViewItem(
  "Software Composition Analysis",
  vscode.TreeItemCollapsibleState.Collapsed,
  undefined,
  ScanType.Sca,
);

const SAST_SECTION = new TreeViewItem(
  "Static Application Security Testing",
  vscode.TreeItemCollapsibleState.Collapsed,
  undefined,
  ScanType.Sast,
);

const IAC_SECTION = new TreeViewItem(
  "Infrastructure As Code",
  vscode.TreeItemCollapsibleState.Collapsed,
  undefined,
  ScanType.Iac,
);

export const TREE_VIEW_TOP_LEVEL_ITEMS = [SECRETS_SECTION, SCA_SECTION];

// for testing purposes. SAST and IaC are not yet supported
// export const TREE_VIEW_TOP_LEVEL_ITEMS = [SECRETS_SECTION, SCA_SECTION, SAST_SECTION, IAC_SECTION];
