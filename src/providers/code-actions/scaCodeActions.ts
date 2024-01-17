import * as vscode from 'vscode';
import {DiagnosticCode} from '../../services/common';
import {createIgnorePathAction, createIgnoreRuleAction} from './commonActions';

export const createCommandCodeActions = (
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    diagnosticCode: DiagnosticCode,
): vscode.CodeAction[] => {
  return [
    createIgnoreRuleAction(diagnostic, diagnosticCode, document),
    createIgnorePathAction(diagnostic, diagnosticCode, document),
  ];
};
