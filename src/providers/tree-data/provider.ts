import * as vscode from 'vscode';
import { CliScanType } from '../../cli/models/cli-scan-type';
import { ScanTypeNode } from './nodes/scan-type-node';
import { BaseNode } from './nodes/base-node';
import { FileNode } from './nodes/file-node';
import { DetectionNode } from './nodes/detection-node';
import { container } from 'tsyringe';
import { IScanResultsService } from '../../services/scan-results-service';
import { ScanResultsServiceSymbol } from '../../symbols';
import { DetectionBase } from '../../cli/models/scan-result/detection-base';

export class TreeDataProvider implements vscode.TreeDataProvider<BaseNode> {
  public static readonly viewType = 'cycode.view.tree';

  private _onDidChangeTreeData:
  vscode.EventEmitter<BaseNode | undefined> = new vscode.EventEmitter<BaseNode | undefined>();

  readonly onDidChangeTreeData:
  vscode.Event<BaseNode | undefined> = this._onDidChangeTreeData.event;

  private _createdRootNodes: ScanTypeNode[] = [];
  private _createdNodesToChildren = new Map<BaseNode, BaseNode[]>();

  getTreeItem(element: BaseNode): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: BaseNode,
  ): Thenable<BaseNode[]> {
    if (!element) {
      return Promise.resolve(this._createdRootNodes);
    }

    return Promise.resolve(this._createdNodesToChildren.get(element) || []);
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  }

  private getScanTypeNodeSummary(sortedDetections: DetectionBase[]): string {
    // detections must be sorted by severity
    const groupedBySeverity = sortedDetections.reduce<Map<string, DetectionBase[]>>((acc, detection) => {
      acc.set(detection.severity, acc.get(detection.severity) || []);
      acc.get(detection.severity)?.push(detection);
      return acc;
    }, new Map());

    const summaries: string[] = [];
    for (const [severity, detections] of groupedBySeverity) {
      summaries.push(`${severity} - ${detections.length}`);
    }

    return summaries.join(' | ');
  }

  private createNodes(scanType: CliScanType) {
    const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
    const detections = scanResultsService.getDetections(scanType);

    const severitySortedDetections = detections.sort((a, b) => {
      return this.getSeverityWeight(b.severity.toLowerCase()) - this.getSeverityWeight(a.severity.toLowerCase());
    });
    const groupedByFilepathDetection = severitySortedDetections
      .reduce<Map<string, DetectionBase[]>>((acc, detection) => {
        const filepath = detection.detectionDetails.getFilepath();
        if (!acc.has(filepath)) {
          acc.set(filepath, []);
        }
        acc.get(filepath)?.push(detection);
        return acc;
      }, new Map());

    const scanTypeNode = new ScanTypeNode(scanType, this.getScanTypeNodeSummary(severitySortedDetections));
    this._createdRootNodes.push(scanTypeNode);
    this._createdNodesToChildren.set(scanTypeNode, []);

    for (const [filepath, detections] of groupedByFilepathDetection) {
      const fileNode = new FileNode(filepath, detections.length);
      this._createdNodesToChildren.get(scanTypeNode)?.push(fileNode);
      this._createdNodesToChildren.set(fileNode, []);
      for (const detection of detections) {
        const detectionNode = new DetectionNode(scanType, detection);
        this._createdNodesToChildren.get(fileNode)?.push(detectionNode);
      }
    }
  }

  public refresh(): void {
    this._createdRootNodes = [];
    this._createdNodesToChildren.clear();

    this.createNodes(CliScanType.Secret);
    this.createNodes(CliScanType.Sca);
    this.createNodes(CliScanType.Iac);
    this.createNodes(CliScanType.Sast);

    this._onDidChangeTreeData.fire(undefined);
  }
}
