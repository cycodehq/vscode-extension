import * as vscode from 'vscode';
import {DiagnosticCode} from '../../services/common';
import {ScanType} from '../../constants';
import {createCommandCodeActions as createSecretCommandCodeActions} from './secretsCodeActions';
import {createCommandCodeActions as createScaCommandCodeActions} from './scaCodeActions';
import {createCommandCodeActions as createIacCommandCodeActions} from './iacCodeActions';
import {createCommandCodeActions as createSastCommandCodeActions} from './sastCodeActions';
import {aggregateDiagnosticsByCode} from './uniqueDiagnostics';

export class CycodeActions implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
      document: vscode.TextDocument,
      range: vscode.Range | vscode.Selection,
      context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const aggregatedDiagnostics = aggregateDiagnosticsByCode(context.diagnostics);

    const codeActions: vscode.CodeAction[] = [];
    for (const [diagnosticCode, diagnostics] of aggregatedDiagnostics.entries()) {
      codeActions.push(...this.createCodeActions(diagnosticCode, diagnostics, document, range));
    }

    return this.getUniqueCodeActions(codeActions);
  }

  private createCodeActions(
      rawDiagnosticCode: string,
      diagnostics: vscode.Diagnostic[],
      document: vscode.TextDocument,
      range: vscode.Range | vscode.Selection,
  ) {
    const diagnosticCode = DiagnosticCode.fromString(rawDiagnosticCode);
    switch (diagnosticCode.scanType) {
      case ScanType.Secrets:
        return createSecretCommandCodeActions(document, range, diagnostics, diagnosticCode);
      case ScanType.Sca:
        return createScaCommandCodeActions(document, diagnostics, diagnosticCode);
      case ScanType.Iac:
        return createIacCommandCodeActions(document, diagnostics, diagnosticCode);
      case ScanType.Sast:
        return createSastCommandCodeActions(document, diagnostics, diagnosticCode);
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
