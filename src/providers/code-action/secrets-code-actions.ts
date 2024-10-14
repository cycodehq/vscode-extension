import * as vscode from 'vscode';
import { DiagnosticCode } from '../../services/common';
import { createOpenViolationCardAction } from './common-actions';

export const createCommandCodeActions = (
  diagnostics: vscode.Diagnostic[],
  diagnosticCode: DiagnosticCode,
): vscode.CodeAction[] => {
  return [createOpenViolationCardAction(diagnostics, diagnosticCode)];
};
