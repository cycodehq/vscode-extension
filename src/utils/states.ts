export enum VscodeStates {
  AuthenticatingInProgress = 'auth.isAuthenticating',
  IsAuthorized = 'auth.isAuthed',
  SecretsScanInProgress = 'scan.isSecretsScanning',
  ScaScanInProgress = 'scan.isScaScanning',
  NotificationIsOpen = 'cycode.notifOpen',
  NotificationWasShown = 'cycode.notifShown',
  HasDetections = 'scan.hasDetections',
  TreeViewIsOpen = 'treeView.isShowed',

  CliHash = 'cli.hash',
  CliDirHashes = 'cli.dirHashes',
  CliVersion = 'cli.version',
  CliInstalled = 'cli.installed',
  CliLastUpdateCheckedAt = 'cli.lastUpdateCheckedAt',
}
