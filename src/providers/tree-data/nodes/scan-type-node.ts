import { BaseNode } from './base-node';
import { CliScanType } from '../../../cli/models/cli-scan-type';
import { getScanTypeDisplayName } from '../../../constants';
import { getScanTypeIconPath } from '../node-icons';
import { ThemeIcon } from 'vscode';

export class ScanTypeNode extends BaseNode {
  public scanType: CliScanType;

  constructor(scanType: CliScanType, summary: string, isRunning: boolean) {
    const title = getScanTypeDisplayName(scanType);
    const icon = getScanTypeIconPath(scanType);
    super(title, summary, icon);

    this.scanType = scanType;
    this.contextValue = `${scanType.toLowerCase()}ScanTypeNode${isRunning ? 'Running' : ''}`;

    if (isRunning) {
      this.iconPath = new ThemeIcon('sync~spin');
    }
  }
}
