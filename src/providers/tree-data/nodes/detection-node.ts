import * as vscode from 'vscode';
import { BaseNode } from './base-node';
import { getSeverityIconPath } from '../node-icons';
import { VscodeCommands } from '../../../commands';
import { CliScanType } from '../../../cli/models/cli-scan-type';
import { DetectionBase } from '../../../cli/models/scan-result/detection-base';

export class DetectionNode extends BaseNode {
  public detection: DetectionBase;

  constructor(scanType: CliScanType, detection: DetectionBase) {
    const icon = getSeverityIconPath(detection.severity);
    super(detection.getFormattedNodeTitle(), undefined, icon);

    this.detection = detection;
    this.contextValue = 'detectionNode';

    this.command = {
      title: '',
      command: VscodeCommands.OnTreeItemClick,
      arguments: [scanType, detection],
    };
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
  }
}
