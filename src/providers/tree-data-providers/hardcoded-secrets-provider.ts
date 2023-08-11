import * as vscode from "vscode";
import {
  HardcodedSecret,
  HardcodedSecretsTreeItem,
} from "./hardcoded-secrets-item";

interface SetViewTitleArgs {
  hardcodedSecretsTreeView: vscode.TreeView<HardcodedSecretsTreeItem>;
  title: string;
}

export class FileScanResults {
  constructor(
    public fileName: string,
    public hardcodedSecrets: HardcodedSecret[]
  ) {}
}

export class HardcodedSecretsTreeDataProvider
  implements vscode.TreeDataProvider<HardcodedSecretsTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    HardcodedSecretsTreeItem | undefined | void
  > = new vscode.EventEmitter<HardcodedSecretsTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    HardcodedSecretsTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  private filesScanResults: FileScanResults[] = [];

  constructor(filesScanResults: FileScanResults[]) {
    this.filesScanResults = filesScanResults;
  }

  getTreeItem(element: HardcodedSecretsTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: HardcodedSecretsTreeItem
  ): Thenable<HardcodedSecretsTreeItem[]> {
    if (!element) {
      // If the element is undefined, return files at top-level (root)
      return Promise.resolve(
        this.filesScanResults.map(
          (hardcodedFile) =>
            new HardcodedSecretsTreeItem(
              hardcodedFile.fileName,
              vscode.TreeItemCollapsibleState.Collapsed,
              hardcodedFile.hardcodedSecrets
            )
        )
      );
    }

    // otherwise, the element is a file, return detections as its children
    return Promise.resolve(
      (element.hardcodedSecrets || []).map((hardCodedItem) => {
        const { lineNumber, severityFirstLetter, type } = hardCodedItem;
        return new HardcodedSecretsTreeItem(
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
    const { hardcodedSecretsTreeView, title } = args;
    hardcodedSecretsTreeView.title = title;
  }
}
