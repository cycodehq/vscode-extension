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

    const lineObj: { [key: number]: number } = {};

    diagnostics
      .filter((diag) => diag.source === extensionId)
      .forEach((diagnostic) => {
        const range = diagnostic.range;
        lineObj[range.start.line] = (lineObj[range.start.line] || 0) + 1;
        const codeLens = new vscode.CodeLens(range);
        codeLens.command = {
          title: "Cycode secret detection",
          tooltip: "Cycode secret detection",
          command: "",
          arguments: ["Argument 1", false],
        };
        return codeLens;
      });

    this.codeLenses = Object.keys(lineObj).map((key: string) => {
      const line = parseInt(key);
      const range = new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, 0)
      );
      const codeLens = new vscode.CodeLens(range);
      codeLens.command = {
        title: `Cycode: ${lineObj[line]} ${
          lineObj[line] === 1 ? "detection" : "detections"
        }`,
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
      title: "Cycode secret detection",
      tooltip: "Cycode secret detection",
      command: "codelens-sample.codelensAction",
      arguments: ["Argument 1", false],
    };
    return codeLens;
  }
}
