import {ScanType} from '../constants';

export enum VscodeStates {
  AuthenticatingInProgress = 'auth.isAuthenticating',
  IsAuthorized = 'auth.isAuthed',

  SecretsScanInProgress = 'scan.isSecretsScanning',
  ScaScanInProgress = 'scan.isScaScanning',
  IacScanInProgress = 'scan.isIacScanning',

  NotificationIsOpen = 'cycode.notifOpen',
  NotificationWasShown = 'cycode.notifShown',

  HasSecretDetections = 'scan.hasSecretDetections',
  HasScaDetections = 'scan.hasScaDetections',
  HasIacDetections = 'scan.hasIacDetections',
  HasDetections = 'scan.hasDetections', // any detections

  TreeViewIsOpen = 'treeView.isShowed',

  CliHash = 'cli.hash',
  CliDirHashes = 'cli.dirHashes',
  CliVersion = 'cli.version',
  CliInstalled = 'cli.installed',
  CliLastUpdateCheckedAt = 'cli.lastUpdateCheckedAt',
}

export const getHasDetectionState = (scanType: ScanType): string => {
  switch (scanType) {
    case ScanType.Secrets:
      return VscodeStates.HasSecretDetections;
    case ScanType.Sca:
      return VscodeStates.HasScaDetections;
    case ScanType.Iac:
      return VscodeStates.HasIacDetections;
    default:
      throw Error(`Unknown scan type: ${scanType}`);
  }
};
