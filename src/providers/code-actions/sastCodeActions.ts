import * as vscode from 'vscode';
import {DiagnosticCode} from '../../services/common';
import {createIgnorePathAction, createIgnoreRuleAction, createOpenViolationCardAction} from './commonActions';

export const createCommandCodeActions = (
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[],
    diagnosticCode: DiagnosticCode,
): vscode.CodeAction[] => {
  return [
    createOpenViolationCardAction(diagnostics, diagnosticCode),
    createIgnoreRuleAction(diagnostics, diagnosticCode, document),
    createIgnorePathAction(diagnostics, diagnosticCode, document),
  ];
};
