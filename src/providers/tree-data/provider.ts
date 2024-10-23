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
import { VscodeCommands } from '../../commands';

export class TreeDataProvider implements vscode.TreeDataProvider<BaseNode> {
  public static readonly viewType = 'cycode.view.tree';

  public treeView: vscode.TreeView<BaseNode>;

  private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

  private _createdRootNodes: ScanTypeNode[] = [];
  private _createdNodesToChildren = new Map<BaseNode, BaseNode[]>();
  private _createdChildToParentNode = new Map<BaseNode, BaseNode>();

  getTreeItem(element: BaseNode): vscode.TreeItem {
    return element;
  }

  getParent(element: BaseNode): vscode.ProviderResult<BaseNode> {
    // must be implemented properly to be able to call this.treeView.reveal()
    return this._createdChildToParentNode.get(element);
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
    const severityWeights: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return severityWeights[severity.toLowerCase()] || 0;
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
      return this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity);
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
      this._createdChildToParentNode.set(fileNode, scanTypeNode);

      for (const detection of detections) {
        const detectionNode = new DetectionNode(scanType, detection);
        this._createdNodesToChildren.get(fileNode)?.push(detectionNode);
        this._createdChildToParentNode.set(detectionNode, fileNode);
      }
    }
  }

  public refresh(): void {
    this._createdRootNodes = [];
    this._createdNodesToChildren.clear();
    this._createdChildToParentNode.clear();

    this.createNodes(CliScanType.Secret);
    this.createNodes(CliScanType.Sca);
    this.createNodes(CliScanType.Iac);
    this.createNodes(CliScanType.Sast);

    this._onDidChangeTreeData.fire();
  }

  public async expandAll() {
    /*
     * vscode api limits rendering of expanding.
     * Editing of collapsibleState field doesn't affect nodes that are visible already.
     * To bypass this limitation, we can use reveal method instead.
     * This method is limited to depth of 3; it is enough to our tree.
     * More of the context: https://github.com/microsoft/vscode/issues/131955
     */

    const revealOptions = { expand: 3, select: false, focus: false };
    const thenables: Thenable<void>[] = [];
    for (const rootNode of this._createdRootNodes) {
      thenables.push(this.treeView.reveal(rootNode, revealOptions));
      for (const fileNode of this._createdNodesToChildren.get(rootNode) || []) {
        thenables.push(this.treeView.reveal(fileNode, revealOptions));
      }
    }

    await Promise.all(thenables);
  }

  public async collapseAll() {
    /*
     * It works excellently and always re-renders the tree view,
     * even already visible elements,
     * but unfortunately, there is no build-in "ExpandAll" command.
     * That's why we use our own implementation.
     */

    await vscode.commands.executeCommand(VscodeCommands.WorkbenchTreeViewCollapseAll);
  }
}
