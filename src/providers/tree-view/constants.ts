import * as vscode from 'vscode';
import * as path from 'path';
import {TreeViewItem} from './item';
import {ScanType, ScanTypeDisplayName} from '../../constants';

const _PATH_TO_RESOURCES = path.join(__filename, '..', '..', 'resources');
const PATH_TO_SCAN_TYPE_ICONS = path.join(_PATH_TO_RESOURCES, 'scan-type');
const PATH_TO_SEVERITY_ICONS = path.join(_PATH_TO_RESOURCES, 'severity');

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
    throw Error('Malformed filename string');
  }
};

const getSecretsSectionItem = (description: string): TreeViewItem => new TreeViewItem({
  title: ScanTypeDisplayName.Secrets,
  collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
  scanSectionType: ScanType.Secrets,
  customIconPath: getScanTypeIconPath(ScanType.Secrets),
  description,
});

const getScaSectionItem = (description: string): TreeViewItem => new TreeViewItem({
  title: ScanTypeDisplayName.Sca,
  collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
  scanSectionType: ScanType.Sca,
  customIconPath: getScanTypeIconPath(ScanType.Sca),
  description,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getSastSectionItem = (_: string): TreeViewItem => new TreeViewItem({
  title: ScanTypeDisplayName.Sast,
  collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
  scanSectionType: ScanType.Sast,
  customIconPath: getScanTypeIconPath(ScanType.Sast),
  description: '(coming soon)', // use fun arg when implemented
});

const getIacSectionItem = (description: string): TreeViewItem => new TreeViewItem({
  title: ScanTypeDisplayName.Iac,
  collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
  scanSectionType: ScanType.Iac,
  customIconPath: getScanTypeIconPath(ScanType.Iac),
  description,
});

const _SCAN_TYPE_TO_SECTION_ITEM_CREATOR: { [key: string]: ((description: string) => TreeViewItem)} = {
  [ScanType.Secrets]: getSecretsSectionItem,
  [ScanType.Sca]: getScaSectionItem,
  [ScanType.Sast]: getSastSectionItem,
  [ScanType.Iac]: getIacSectionItem,
};

export const SECTIONS_ORDER: ReadonlyArray<ScanType> = [ScanType.Secrets, ScanType.Sca, ScanType.Sast, ScanType.Iac];

export const getSectionItem = (scanType: string, description: string): TreeViewItem => {
  if (!(scanType in _SCAN_TYPE_TO_SECTION_ITEM_CREATOR)) {
    throw Error(`Unknown scan type: ${scanType}`);
  }

  return _SCAN_TYPE_TO_SECTION_ITEM_CREATOR[scanType](description);
};
