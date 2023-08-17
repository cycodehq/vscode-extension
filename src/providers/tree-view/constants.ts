import * as vscode from 'vscode';
import * as path from 'path';
import { TreeViewItem } from './item';
import { ScanType } from '../../constants';

const _PATH_TO_RESOURCES = path.join(__filename, '..', '..', 'resources');
const PATH_TO_SCAN_TYPE_ICONS= path.join(_PATH_TO_RESOURCES, 'scan-type');
const PATH_TO_SEVERITY_ICONS= path.join(_PATH_TO_RESOURCES, 'severity');

const getScanTypeIconPath = (scanType: string) => {
  _validateIconFilename(scanType);
  return path.join(PATH_TO_SCAN_TYPE_ICONS, `${scanType}.png`);
};


export const getSeverityIconPath = (severityFirstLetter: string) => {
  _validateIconFilename(severityFirstLetter);
  return path.join(PATH_TO_SEVERITY_ICONS, `${severityFirstLetter}.png`);
};


const _validateIconFilename = (filename: string): void => {
  const letters = /^[A-Za-z]+$/;
  if (filename.match(letters) === null) {
    throw Error("Malformed filename string");
  }
};


const SECRETS_SECTION = new TreeViewItem(
  "Hardcoded Secrets",
  vscode.TreeItemCollapsibleState.Collapsed,
  undefined,
  ScanType.Secrets,
  getScanTypeIconPath(ScanType.Secrets),
);

const SCA_SECTION = new TreeViewItem(
  "Software Composition Analysis",
  vscode.TreeItemCollapsibleState.Collapsed,
  undefined,
  ScanType.Sca,
  getScanTypeIconPath(ScanType.Sca),
);

const SAST_SECTION = new TreeViewItem(
  "Static Application Security Testing",
  vscode.TreeItemCollapsibleState.Collapsed,
  undefined,
  ScanType.Sast,
  getScanTypeIconPath(ScanType.Sast),
  "(coming soon)",
);

const IAC_SECTION = new TreeViewItem(
  "Infrastructure As Code",
  vscode.TreeItemCollapsibleState.Collapsed,
  undefined,
  ScanType.Iac,
  getScanTypeIconPath(ScanType.Iac),
  "(coming soon)",
);

export const TREE_VIEW_TOP_LEVEL_ITEMS = [SECRETS_SECTION, SCA_SECTION, SAST_SECTION, IAC_SECTION];
