export const extensionId = "cycode";
export const extensionName = "Cycode";
export const scanOnSaveProperty = "scanOnSave";

export enum StatusBarTexts {
  ScanButton = "$(cycode-logo) Scan with Cycode",
  ScanWait = "$(loading~spin) Waiting for scan to complete….",
  ScanRunning = "$(loading~spin) Scan running",
  ScanComplete = "$(cycode-logo) Scan completed successfully",
  ScanError = "$(circle-slash) Cycode failed to scan, please try again",
  AuthError = "$(circle-slash) Authentication error, please try again",
  AuthIsRequired = "$(circle-slash) Authentication is required",
  CliPathWarning = "$(warning) Cycode CLI not found, please install it",
}

export enum TrayNotificationTexts {
  AuthError = "Cycode authentication failed",
  AuthCompleted = "Cycode authentication completed",
  CliNotInstalledError = "Cycode CLI is not installed. Please install it manually and try again",
  ScanError = "Cycode failed to scan, please try again",
  InstallCompleted = "Cycode CLI installed successfully",
  UninstallCompleted = "Cycode CLI uninstalled successfully",
  InstallError = "Cycode CLI installation failed. Check output for more details.",
  UninstallError = "Cycode CLI removing failed. Check output for more details.",
  IgnoreError = "Cycode failed to ignore the rule, please try again",
  IgnoreCompleted = "Cycode ignore completed successfully",
  BadAuth = "Bad authentication. Please authenticate with Cycode",
  OpenCycodeViewText = "Open Cycode view",
  MustBeFocusedOnFile = "Cycode scans the file that is currently focused. Please focus on a file and try again",
}
