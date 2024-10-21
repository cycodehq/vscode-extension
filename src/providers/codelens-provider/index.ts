import * as vscode from 'vscode';
import { extensionId } from '../../utils/texts';
import { validateTextRangeInOpenDoc } from '../../utils/range';

export class CodelensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void>
    = new vscode.EventEmitter<void>();

  public readonly onDidChangeCodeLenses: vscode.Event<void>
    = this._onDidChangeCodeLenses.event;

  constructor() {
    vscode.workspace.onDidChangeTextDocument(
      () => { this.onDidChangeTextDocument(); },
      this,
    );
  }

  private onDidChangeTextDocument() {
    this._onDidChangeCodeLenses.fire();
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    const lineToDetectionsCount: Record<number, number> = {};

    diagnostics
      .filter((diag) => diag.source === extensionId)
      .forEach((diagnostic) => {
        // only count valid detections
        if (validateTextRangeInOpenDoc(document.uri, diagnostic.range)) {
          const startLine = diagnostic.range.start.line;
          lineToDetectionsCount[startLine] = (lineToDetectionsCount[startLine] || 0) + 1;
        }
      });

    const usedLines = new Set<number>();
    return diagnostics
      .filter((diag) => diag.source === extensionId)
      .map((diagnostic) => {
        if (!validateTextRangeInOpenDoc(document.uri, diagnostic.range)) {
          return null;
        }

        const startLine = diagnostic.range.start.line;
        // Avoid duplicate code lenses on the same line
        if (usedLines.has(startLine)) {
          return null;
        }

        const detectionCount = lineToDetectionsCount[startLine];
        if (!detectionCount) {
          return null;
        }

        const pluralPart = detectionCount === 1 ? '' : 's';
        const title = `Cycode: ${detectionCount} detection${pluralPart}`;

        const codeLens = new vscode.CodeLens(diagnostic.range);
        codeLens.command = {
          title,
          tooltip: 'Cycode secret detection',
          command: '',
          arguments: ['Argument 1', false],
        };

        usedLines.add(startLine);

        return codeLens;
      })
      .filter((codeLens) => codeLens !== null) as vscode.CodeLens[];
  }

  public resolveCodeLens(
    codeLens: vscode.CodeLens,
  ) {
    return codeLens;
  }
}

export const registerCodeLensProvider = (context: vscode.ExtensionContext) => {
  const codeLensDisposable = vscode.languages.registerCodeLensProvider(
    { scheme: 'file', language: '*' },
    new CodelensProvider(),
  );
  context.subscriptions.push(codeLensDisposable);
};
