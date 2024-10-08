import * as vscode from 'vscode';
import {DiagnosticCode} from '../../services/common';
import {ScanType} from '../../constants';
import {createCommandCodeActions as createSecretCommandCodeActions} from './secrets-code-actions';
import {createCommandCodeActions as createScaCommandCodeActions} from './sca-code-actions';
import {createCommandCodeActions as createIacCommandCodeActions} from './iac-code-actions';
import {createCommandCodeActions as createSastCommandCodeActions} from './sast-code-actions';
import {aggregateDiagnosticsByCode} from './unique-diagnostics';

export class CycodeActions implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
      _document: vscode.TextDocument,
      _range: vscode.Range | vscode.Selection,
      context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const aggregatedDiagnostics = aggregateDiagnosticsByCode(context.diagnostics);

    const codeActions: vscode.CodeAction[] = [];
    for (const [diagnosticCode, diagnostics] of aggregatedDiagnostics.entries()) {
      codeActions.push(...this.createCodeActions(diagnosticCode, diagnostics));
    }

    return this.getUniqueCodeActions(codeActions);
  }

  private createCodeActions(
      rawDiagnosticCode: string,
      diagnostics: vscode.Diagnostic[],
  ) {
    const diagnosticCode = DiagnosticCode.fromString(rawDiagnosticCode);
    switch (diagnosticCode.scanType) {
      case ScanType.Secrets:
        return createSecretCommandCodeActions(diagnostics, diagnosticCode);
      case ScanType.Sca:
        return createScaCommandCodeActions(diagnostics, diagnosticCode);
      case ScanType.Iac:
        return createIacCommandCodeActions(diagnostics, diagnosticCode);
      case ScanType.Sast:
        return createSastCommandCodeActions(diagnostics, diagnosticCode);
      default:
        return [];
    }
  }

  private getUniqueCodeActions(actions: vscode.CodeAction[]): vscode.CodeAction[] {
    /*
    * The idea behind this function is to remove duplicate code actions using display name as a key.
    * The aggregation of diagnostics by code is not enough for "ignore path" action.
    * One range could have multiple diagnostics with different codes, *ignore path* action is the same for all of them.
    *
    * We don't have this problem in Intellij Plugin because, I assume, they have this deduplication logic in place.
    *
    * Note: display name must be unique for each action, for example, "Ignore rule: UUID"
    */
    const codeActions: vscode.CodeAction[] = [];
    const visitedActions = new Set<string>();

    for (const action of actions) {
      if (visitedActions.has(action.title)) {
        continue;
      }

      visitedActions.add(action.title);
      codeActions.push(action);
    }

    return codeActions;
  }
}

export const registerCodeActionsProvider = (context: vscode.ExtensionContext) => {
  const quickActionsDisposable = vscode.languages.registerCodeActionsProvider(
      {scheme: 'file', language: '*'},
      new CycodeActions(),
      {providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]}
  );
  context.subscriptions.push(quickActionsDisposable);
};
