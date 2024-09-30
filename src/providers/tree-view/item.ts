import * as vscode from 'vscode';
import {ScanType} from '../../constants';
import {TreeViewDisplayedData} from './types';


interface TreeViewItemOptions {
  title: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  vulnerability?: TreeViewDisplayedData;
  vulnerabilities?: TreeViewDisplayedData[];
  scanSectionType?: ScanType;
  customIconPath?: string;
  description?: string;
  fullFilePath?: string;
  command?: vscode.Command;
  contextValue?: string;
}

export class TreeViewItem extends vscode.TreeItem {
  public static readonly viewType = 'cycode.view.tree';

  public scanSectionType: ScanType | undefined;
  public fullFilePath: string | undefined;
  public vulnerabilities: TreeViewDisplayedData[] | undefined;
  public vulnerability: TreeViewDisplayedData | undefined;

  constructor(options: TreeViewItemOptions) {
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
