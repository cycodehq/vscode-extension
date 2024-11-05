import * as vscode from 'vscode';
import authCommand from './auth-command';
import ignoreCommand from './ignore-command';
import scaScanCommand from './sca-scan-command';
import secretScanCommand from './secret-scan-command';
import secretScanForCurrentProjectCommand from './secret-scan-for-current-project-command';
import iacScanCommand from './iac-scan-command';
import iacScanForCurrentProjectCommand from './iac-scan-for-current-project-command';
import sastScanCommand from './sast-scan-command';
import sastScanForCurrentProjectCommand from './sast-scan-for-current-project-command';
import openViolationInFileCommand from './open-violation-in-file-command';
import openViolationPanelCommand from './open-violation-panel-command';
import openSettingsCommand from './open-settings-command';
import onTreeViewDetectionNodeClickCommand from './on-tree-view-detection-node-click-command';
import treeViewExpandAllCommand from './tree-view-expand-all-command';
import treeViewCollapseAllCommand from './tree-view-collapse-all-command';
import runAllScansCommand from './run-all-scans-command';
import clearAllScanResultsCommand from './clear-all-scan-results-command';

export enum VscodeCommands {
  SecretScanCommandId = 'cycode.secretScan',
  SecretScanForProjectCommandId = 'cycode.secretScanForProject',
  ScaScanCommandId = 'cycode.scaScan',
  IacScanCommandId = 'cycode.iacScan',
  IacScanForProjectCommandId = 'cycode.iacScanForProject',
  SastScanCommandId = 'cycode.sastScan',
  SastScanForProjectCommandId = 'cycode.sastScanForProject',
  RunAllScansCommandId = 'cycode.runAllScans',

  AuthCommandId = 'cycode.auth',
  IgnoreCommandId = 'cycode.ignore',

  OpenSettingsCommandId = 'cycode.openSettings',
  ClearAllScanResultsCommand = 'cycode.clearAllScanResults',

  OpenViolationInFile = 'cycode.openViolationInFile',
  OpenViolationPanel = 'cycode.openViolationPanel',

  OnTreeViewDetectionNodeClickCommand = 'cycode.onTreeViewDetectionNodeClickCommand',
  TreeViewExpandAllCommand = 'cycode.treeViewExpandAllCommand',
  TreeViewCollapseAllCommand = 'cycode.treeViewCollapseAllCommand',

  /*
   * Warning: These commands do not exist in Theia API.
   *
   * Built-in or created automatically by vscode:
   */
  WorkbenchShowProblemsTab = 'workbench.action.problems.focus',
  WorkbenchShowCycodeView = 'workbench.view.extension.cycode',
  WorkbenchTreeViewCollapseAll = 'workbench.actions.treeView.cycode.view.tree.collapseAll',
}

const _VS_CODE_COMMANDS_ID_TO_CALLBACK: Record<string, (...args: never[]) => unknown> = {
  [VscodeCommands.AuthCommandId]: authCommand,
  [VscodeCommands.IgnoreCommandId]: ignoreCommand,
  [VscodeCommands.SecretScanCommandId]: secretScanCommand,
  [VscodeCommands.SecretScanForProjectCommandId]: secretScanForCurrentProjectCommand,
  [VscodeCommands.ScaScanCommandId]: scaScanCommand,
  [VscodeCommands.IacScanCommandId]: iacScanCommand,
  [VscodeCommands.IacScanForProjectCommandId]: iacScanForCurrentProjectCommand,
  [VscodeCommands.SastScanCommandId]: sastScanCommand,
  [VscodeCommands.SastScanForProjectCommandId]: sastScanForCurrentProjectCommand,
  [VscodeCommands.RunAllScansCommandId]: runAllScansCommand,
  [VscodeCommands.OpenViolationInFile]: openViolationInFileCommand,
  [VscodeCommands.OpenViolationPanel]: openViolationPanelCommand,
  [VscodeCommands.OpenSettingsCommandId]: openSettingsCommand,
  [VscodeCommands.ClearAllScanResultsCommand]: clearAllScanResultsCommand,
  [VscodeCommands.OnTreeViewDetectionNodeClickCommand]: onTreeViewDetectionNodeClickCommand,
  [VscodeCommands.TreeViewExpandAllCommand]: treeViewExpandAllCommand,
  [VscodeCommands.TreeViewCollapseAllCommand]: treeViewCollapseAllCommand,
};

export const registerCommands = (context: vscode.ExtensionContext): void => {
  for (const [commandId, commandCallback] of Object.entries(_VS_CODE_COMMANDS_ID_TO_CALLBACK)) {
    context.subscriptions.push(vscode.commands.registerCommand(commandId, commandCallback));
  }
};
