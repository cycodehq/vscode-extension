import * as vscode from 'vscode';
import {DiagnosticCode} from '../../services/common';
import {ScanType} from '../../constants';
import {createCommandCodeActions as createSecretsCommandCodeActions} from './SecretsCodeActions';
import {createCommandCodeActions as createScaCommandCodeActions} from './ScaCodeActions';
import {getUniqueDiagnostics} from './uniqueDiagnostics';

export class CycodeActions implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
      document: vscode.TextDocument,
      range: vscode.Range | vscode.Selection,
      context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    return getUniqueDiagnostics(context.diagnostics).flatMap((diagnostic) => {
      if (typeof diagnostic.code !== 'string') {
        // malformed diagnostic code
        return [];
      }

      const diagnosticCode = DiagnosticCode.fromString(diagnostic.code);
      switch (diagnosticCode.scanType) {
        case ScanType.Secrets:
          return createSecretsCommandCodeActions(document, range, diagnostic, diagnosticCode);
        case ScanType.Sca:
          return createScaCommandCodeActions(document, diagnostic, diagnosticCode);
        default:
          return [];
      }
    }
    );
  }
}
