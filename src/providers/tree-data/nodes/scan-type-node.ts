import { BaseNode } from './base-node';
import { CliScanType } from '../../../cli/models/cli-scan-type';
import { getScanTypeDisplayName } from '../../../constants';
import { getScanTypeIconPath } from '../node-icons';

export class ScanTypeNode extends BaseNode {
  public scanType: CliScanType;

  constructor(scanType: CliScanType, summary: string) {
    const title = getScanTypeDisplayName(scanType);
    const icon = getScanTypeIconPath(scanType);
    super(title, summary, icon);

    this.scanType = scanType;
    this.contextValue = `${scanType.toLowerCase()}ScanTypeNode`;
    console.log(this.contextValue);
  }
}
