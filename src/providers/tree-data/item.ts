import * as vscode from 'vscode';
import {ScanType} from '../../constants';
import {TreeDisplayedData} from './types';


interface TreeItemOptions {
  title: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  vulnerability?: TreeDisplayedData;
  vulnerabilities?: TreeDisplayedData[];
  scanSectionType?: ScanType;
  customIconPath?: string;
  description?: string;
  fullFilePath?: string;
  command?: vscode.Command;
  contextValue?: string;
}

export class TreeItem extends vscode.TreeItem {
  public static readonly viewType = 'cycode.view.tree';

  public scanSectionType: ScanType | undefined;
  public fullFilePath: string | undefined;
  public vulnerabilities: TreeDisplayedData[] | undefined;
  public vulnerability: TreeDisplayedData | undefined;

  constructor(options: TreeItemOptions) {
    super(options.title, options.collapsibleState);

    // vscode
    this.tooltip = options.title;
    this.command = options.command;
    this.contextValue = options.contextValue || options.scanSectionType;

    // custom
    this.fullFilePath = options.fullFilePath;

    // section tree item
    this.scanSectionType = options.scanSectionType;
    // detection tree item
    this.vulnerability = options.vulnerability;
    // file tree item
    this.vulnerabilities = options.vulnerabilities;
    if (options.vulnerabilities && options.fullFilePath) {
      // used to enable file theme icon
      this.iconPath = vscode.ThemeIcon.File;
      this.resourceUri = vscode.Uri.file(options.fullFilePath);
    }

    if (options.customIconPath) {
      this.iconPath = {
        light: options.customIconPath,
        dark: options.customIconPath,
      };
    }

    if (options.description) {
      this.description = options.description;
    } else if (options.vulnerabilities) {
      this.description = `${options.vulnerabilities.length} vulnerabilities`;
    } else {
      this.description = '';
    }
  }
}
