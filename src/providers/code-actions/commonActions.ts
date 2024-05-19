import * as vscode from 'vscode';
import {DiagnosticCode} from '../../services/common';
import {VscodeCommands} from '../../utils/commands';
import {CommandParameters} from '../../cli-wrapper/constants';
import {IgnoreCommandConfig} from '../../types/commands';
import {scanResultsService} from '../../services/ScanResultsService';

export const createIgnoreRuleAction = (
    diagnostics: vscode.Diagnostic[], diagnosticCode: DiagnosticCode, document: vscode.TextDocument
): vscode.CodeAction => {
  const detection = scanResultsService.getDetectionById(diagnosticCode.uniqueDetectionId);
  const ruleId = detection?.detection_rule_id;

  const ignoreRuleAction = new vscode.CodeAction(
      `ignore rule ${ruleId}`,
      vscode.CodeActionKind.QuickFix
  );
  ignoreRuleAction.command = {
    command: VscodeCommands.IgnoreCommandId,
    title: `Ignore rule ID: ${ruleId}`,
    tooltip: 'This will always ignore this rule type',
    arguments: [
      {
        scanType: diagnosticCode.scanType,
        ignoreBy: CommandParameters.ByRule,
        param: ruleId,
        filePath: document.fileName,
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
        filePath: document.fileName,
      } as IgnoreCommandConfig,
    ],
  };
  ignorePathAction.diagnostics = diagnostics;
  ignorePathAction.isPreferred = false;

  return ignorePathAction;
};

export const createOpenViolationCardAction = (
    diagnostics: vscode.Diagnostic[], diagnosticCode: DiagnosticCode
): vscode.CodeAction => {
  const detection = scanResultsService.getDetectionById(diagnosticCode.uniqueDetectionId);

  let message = detection?.message;
  if (detection?.type === 'SAST') {
    message = detection?.detection_details.policy_display_name;
  }

  if (message && message.length > 50) {
    message = message.slice(0, 50) + '...';
  }

  const openViolationCardAction = new vscode.CodeAction(
      `open violation card for ${message}`,
      vscode.CodeActionKind.QuickFix
  );
  openViolationCardAction.command = {
    command: VscodeCommands.OpenViolationPanel,
    title: `Open Violation Card: ${message}`,
    tooltip: 'This will open violation card for this detection',
    arguments: [
      diagnosticCode.scanType,
      detection,
    ],
  };
  openViolationCardAction.diagnostics = diagnostics;
  openViolationCardAction.isPreferred = true;

  return openViolationCardAction;
};

