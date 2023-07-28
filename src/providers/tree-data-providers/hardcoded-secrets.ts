import * as vscode from "vscode";

interface HardcodedSecret {
  readonly severityFirstLetter: string;
  readonly lineNumber: number;
  readonly type: string;
}

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
      // If element is undefined, return top-level movies
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
    } else {
      // If element is a movie, return characters as children
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

export class HardcodedSecretsTreeItem extends vscode.TreeItem {
  constructor(
    public readonly title: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly hardcodedSecrets?: HardcodedSecret[]
  ) {
    super(title, collapsibleState);
    this.tooltip = `${this.title}`;
    this.description =
      this.hardcodedSecrets !== undefined
        ? `${this.hardcodedSecrets.length} vulnerabilities`
        : "";
  }
}
