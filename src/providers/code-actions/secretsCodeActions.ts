import * as vscode from 'vscode';
import {DiagnosticCode} from '../../services/common';
import {VscodeCommands} from '../../utils/commands';
import {CommandParameters} from '../../cli-wrapper/constants';
import {IgnoreCommandConfig} from '../../types/commands';
import {createIgnorePathAction, createIgnoreRuleAction} from './commonActions';
import {ScanType} from '../../constants';

const createIgnoreValueAction = (
    diagnostic: vscode.Diagnostic, range: vscode.Range | vscode.Selection, document: vscode.TextDocument
): vscode.CodeAction => {
  const value = document.getText(range);

  const ignoreValueAction = new vscode.CodeAction(
      `ignore value ${value}`,
      vscode.CodeActionKind.QuickFix
  );
  ignoreValueAction.command = {
    command: VscodeCommands.IgnoreCommandId,
    title: `Ignore value: ${value}`,
    tooltip: 'This will always ignore this value',
    arguments: [
      {
        scanType: ScanType.Secrets,
        ignoreBy: CommandParameters.ByValue,
        param: value,
        document: document,
      } as IgnoreCommandConfig,
    ],
  };
  ignoreValueAction.diagnostics = [diagnostic];
  ignoreValueAction.isPreferred = true;

  return ignoreValueAction;
};

export const createCommandCodeActions = (
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    diagnostic: vscode.Diagnostic,
    diagnosticCode: DiagnosticCode,
): vscode.CodeAction[] => {
  return [
    createIgnoreValueAction(diagnostic, range, document),
    createIgnoreRuleAction(diagnostic, diagnosticCode, document),
    createIgnorePathAction(diagnostic, diagnosticCode, document),
  ];
};
