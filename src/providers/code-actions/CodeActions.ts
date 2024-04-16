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

    return codeActions;
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
}
