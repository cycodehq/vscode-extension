export const extensionId = 'cycode';
export const publisherId = 'cycode';
export const extensionName = 'Cycode';
export const scanOnSaveProperty = 'scanOnSave';

export enum StatusBarTexts {
  ScanButton = '$(cycode-logo) Scan with Cycode',
  ScanWait = '$(loading~spin) Waiting for scan to complete….',
  ScanComplete = '$(cycode-logo) Scan completed successfully',
  ScanError = '$(circle-slash) Cycode failed to scan, please try again',
  AuthError = '$(circle-slash) Authentication error, please try again',
  AuthIsRequired = '$(circle-slash) Authentication is required',
  CliPathWarning = '$(warning) Cycode CLI not found, please install it',
}

export enum TrayNotificationTexts {
  CliInstallError = 'Cycode CLI installation failed. Check output for more details.',
  ScanError = 'Cycode failed to scan, please try again',
  MustBeFocusedOnFile = 'Cycode scans the file that is currently focused. Please focus on a file and try again',
  OpenSettings = 'Open settings',
  OpenProblemsTab = 'Open Problems tab',
}
