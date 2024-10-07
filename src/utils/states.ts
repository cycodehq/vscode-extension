import {ScanType} from '../constants';

export enum VscodeStates {
  AuthenticatingInProgress = 'auth.isAuthenticating',
  IsAuthorized = 'auth.isAuthed',

  SecretsScanInProgress = 'scan.isSecretsScanning',
  ScaScanInProgress = 'scan.isScaScanning',
  IacScanInProgress = 'scan.isIacScanning',
  SastScanInProgress = 'scan.isSastScanning',

  NotificationIsOpen = 'cycode.notifOpen',
  NotificationWasShown = 'cycode.notifShown',

  HasSecretDetections = 'scan.hasSecretDetections',
  HasScaDetections = 'scan.hasScaDetections',
  HasIacDetections = 'scan.hasIacDetections',
  HasSastDetections = 'scan.hasSastDetections',
  HasDetections = 'scan.hasDetections', // any detections

  TreeViewIsOpen = 'treeView.isShowed',
}

export const getHasDetectionState = (scanType: ScanType): string => {
  switch (scanType) {
    case ScanType.Secrets:
      return VscodeStates.HasSecretDetections;
    case ScanType.Sca:
      return VscodeStates.HasScaDetections;
    case ScanType.Iac:
      return VscodeStates.HasIacDetections;
    case ScanType.Sast:
      return VscodeStates.HasSastDetections;
    default:
      throw Error(`Unknown scan type: ${scanType}`);
  }
};
