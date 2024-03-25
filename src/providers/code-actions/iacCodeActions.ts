import * as vscode from 'vscode';
import {DiagnosticCode} from '../../services/common';
import {createIgnorePathAction, createIgnoreRuleAction} from './commonActions';

export const createCommandCodeActions = (
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[],
    diagnosticCode: DiagnosticCode,
): vscode.CodeAction[] => {
  return [
    createIgnoreRuleAction(diagnostics, diagnosticCode, document),
    createIgnorePathAction(diagnostics, diagnosticCode, document),
  ];
};
