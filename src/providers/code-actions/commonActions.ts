import * as vscode from 'vscode';
import {DiagnosticCode} from '../../services/common';
import {VscodeCommands} from '../../utils/commands';
import {CommandParameters} from '../../cli-wrapper/constants';
import {IgnoreCommandConfig} from '../../types/commands';

export const createIgnoreRuleAction = (
    diagnostics: vscode.Diagnostic[], diagnosticCode: DiagnosticCode, document: vscode.TextDocument
): vscode.CodeAction => {
  const ignoreRuleAction = new vscode.CodeAction(
      `ignore rule ${diagnosticCode.ruleId}`,
      vscode.CodeActionKind.QuickFix
  );
  ignoreRuleAction.command = {
    command: VscodeCommands.IgnoreCommandId,
    title: `Ignore rule ID: ${diagnosticCode.ruleId}`,
    tooltip: 'This will always ignore this rule type',
    arguments: [
      {
        scanType: diagnosticCode.scanType,
        ignoreBy: CommandParameters.ByRule,
        param: diagnosticCode.ruleId,
        document: document,
      } as IgnoreCommandConfig,
    ],
  };
  ignoreRuleAction.diagnostics = diagnostics;
  ignoreRuleAction.isPreferred = false;

  return ignoreRuleAction;
};

export const createIgnorePathAction = (
    diagnostics: vscode.Diagnostic[], diagnosticCode: DiagnosticCode, document: vscode.TextDocument
): vscode.CodeAction => {
  const ignorePathAction = new vscode.CodeAction(
      `ignore path ${document.uri.fsPath}`,
      vscode.CodeActionKind.QuickFix
  );
  ignorePathAction.command = {
    command: VscodeCommands.IgnoreCommandId,
    title: `Ignore path: ${document.uri.fsPath}`,
    tooltip: 'This will always ignore this path',
    arguments: [
      {
        scanType: diagnosticCode.scanType,
        ignoreBy: CommandParameters.ByPath,
        param: document.uri.fsPath,
        document: document,
      } as IgnoreCommandConfig,
    ],
  };
  ignorePathAction.diagnostics = diagnostics;
  ignorePathAction.isPreferred = false;

  return ignorePathAction;
};

