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
