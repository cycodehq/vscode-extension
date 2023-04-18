import * as vscode from "vscode";
import { extensionId } from "../utils/texts";

/**
 * Cycode CodelensProvider
 */
export class CodelensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = [];
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  constructor() {}

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);

    this.codeLenses = diagnostics
      .filter((diag) => diag.source === extensionId)
      .map((diagnostic) => {
        const range = diagnostic.range;
        const codeLens = new vscode.CodeLens(range);
        codeLens.command = {
          title: "Cycode secret detection",
          tooltip: "Cycode secret detection",
          command: "",
          arguments: ["Argument 1", false],
        };
        return codeLens;
      });

    return this.codeLenses;
  }

  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ) {
    codeLens.command = {
      title: "Codelens provided by sample extension",
      tooltip: "Tooltip provided by sample extension",
      command: "codelens-sample.codelensAction",
      arguments: ["Argument 1", false],
    };
    return codeLens;
  }
}
