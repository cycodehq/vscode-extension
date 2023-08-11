import * as vscode from "vscode";
import {
  Vulnerability,
  TreeViewItem,
} from "./item";

interface SetViewTitleArgs {
  treeViewItem: vscode.TreeView<TreeViewItem>;
  title: string;
}

export class FileScanResults {
  constructor(
    public fileName: string,
    public vulnerabilities: Vulnerability[]
  ) {}
}

export class TreeViewDataProvider
  implements vscode.TreeDataProvider<TreeViewItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeViewItem | undefined | void
  > = new vscode.EventEmitter<TreeViewItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TreeViewItem | undefined | void
  > = this._onDidChangeTreeData.event;

  private filesScanResults: FileScanResults[] = [];

  constructor(filesScanResults: FileScanResults[]) {
    this.filesScanResults = filesScanResults;
  }

  getTreeItem(element: TreeViewItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: TreeViewItem
  ): Thenable<TreeViewItem[]> {
    if (!element) {
      // If the element is undefined, return files at top-level (root)
      return Promise.resolve(
        this.filesScanResults.map(
          (file) =>
            new TreeViewItem(
              file.fileName,
              vscode.TreeItemCollapsibleState.Collapsed,
              file.vulnerabilities
            )
        )
      );
    }

    // otherwise, the element is a file, return detections as its children
    return Promise.resolve(
      (element.vulnerabilities || []).map((vulnerability) => {
        const { lineNumber, severityFirstLetter, type } = vulnerability;
        return new TreeViewItem(
          `${severityFirstLetter} line ${lineNumber}: a hardcoded ${type} is used`,
          vscode.TreeItemCollapsibleState.None
        );
      })
    );
  }

  refresh(filesScanResults: FileScanResults[]): void {
    this.filesScanResults = filesScanResults;
    this._onDidChangeTreeData.fire();
  }

  setViewTitle(args: SetViewTitleArgs): void {
    const { treeViewItem, title } = args;
    treeViewItem.title = title;
  }
}
