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
import onTreeItemClickCommand from './on-tree-item-click-command';
import onOpenViolationInFileFromTreeItemContextMenuCommand
  from './on-open-violation-in-file-from-tree-item-context-menu-command';
import onOpenViolationPanelFromTreeItemContextMenuCommand
  from './on-open-violation-panel-from-tree-item-context-menu-command';
import openViolationInFileCommand from './open-violation-in-file-command';
import openViolationPanelCommand from './open-violation-panel-command';
import openSettingsCommand from './open-settings-command';
import openMainMenuCommand from './open-main-menu-command';

export enum VscodeCommands {
  SecretScanCommandId = 'cycode.secretScan',
  SecretScanForProjectCommandId = 'cycode.secretScanForProject',
  ScaScanCommandId = 'cycode.scaScan',
  IacScanCommandId = 'cycode.iacScan',
  IacScanForProjectCommandId = 'cycode.iacScanForProject',
  SastScanCommandId = 'cycode.sastScan',
  SastScanForProjectCommandId = 'cycode.sastScanForProject',

  AuthCommandId = 'cycode.auth',
  IgnoreCommandId = 'cycode.ignore',

  OpenSettingsCommandId = 'cycode.openSettings',
  OpenMainMenuCommandId = 'cycode.openMainMenu',

  ShowProblemsTab = 'workbench.action.problems.focus',
  ShowCycodeView = 'workbench.view.extension.cycode',

  OpenViolationInFile = 'cycode.openViolationInFile',
  OpenViolationPanel = 'cycode.openViolationPanel',
  OnTreeItemClick = 'cycode.onTreeItemClick',
  OpenViolationInFileFromTreeItemContextMenu = 'cycode.openViolationInFileFromTreeItemContextMenu',
  OpenViolationPanelFromTreeItemContextMenu = 'cycode.openViolationPanelFromTreeItemContextMenu',
}

const _VS_CODE_COMMANDS_ID_TO_CALLBACK: Record<string, (...args: any[]) => any> = {
  [VscodeCommands.AuthCommandId]: authCommand,
  [VscodeCommands.IgnoreCommandId]: ignoreCommand,
  [VscodeCommands.SecretScanCommandId]: secretScanCommand,
  [VscodeCommands.SecretScanForProjectCommandId]: secretScanForCurrentProjectCommand,
  [VscodeCommands.ScaScanCommandId]: scaScanCommand,
  [VscodeCommands.IacScanCommandId]: iacScanCommand,
  [VscodeCommands.IacScanForProjectCommandId]: iacScanForCurrentProjectCommand,
  [VscodeCommands.SastScanCommandId]: sastScanCommand,
  [VscodeCommands.SastScanForProjectCommandId]: sastScanForCurrentProjectCommand,
  [VscodeCommands.OnTreeItemClick]: onTreeItemClickCommand,
  [VscodeCommands.OpenViolationInFileFromTreeItemContextMenu]: onOpenViolationInFileFromTreeItemContextMenuCommand,
  [VscodeCommands.OpenViolationPanelFromTreeItemContextMenu]: onOpenViolationPanelFromTreeItemContextMenuCommand,
  [VscodeCommands.OpenViolationInFile]: openViolationInFileCommand,
  [VscodeCommands.OpenViolationPanel]: openViolationPanelCommand,
  [VscodeCommands.OpenSettingsCommandId]: openSettingsCommand,
  [VscodeCommands.OpenMainMenuCommandId]: openMainMenuCommand,
};

export const registerCommands = (context: vscode.ExtensionContext): void => {
  for (const [commandId, commandCallback] of Object.entries(_VS_CODE_COMMANDS_ID_TO_CALLBACK)) {
    context.subscriptions.push(vscode.commands.registerCommand(commandId, commandCallback));
  }
};
