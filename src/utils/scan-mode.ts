import { CliScanType } from '../cli/models/cli-scan-type';

export enum ScanMode {
  Project = 'project',
  CommitRange = 'commit-range',
  LocalDiff = 'local-diff',
}

// the CLI cannot do commit-range or pre-commit (local diff) scans for IaC, so IaC can only scan the whole project
const SUPPORTED_SCAN_MODES: Record<CliScanType, readonly ScanMode[]> = {
  [CliScanType.Secret]: [ScanMode.Project, ScanMode.CommitRange, ScanMode.LocalDiff],
  [CliScanType.Sca]: [ScanMode.Project, ScanMode.CommitRange, ScanMode.LocalDiff],
  [CliScanType.Sast]: [ScanMode.Project, ScanMode.CommitRange, ScanMode.LocalDiff],
  [CliScanType.Iac]: [ScanMode.Project],
};

/** Returns the mode a scanner will actually run in: the requested one if it supports it, else a full project scan. */
export const resolveScanMode = (scanType: CliScanType, requested: ScanMode): ScanMode => {
  return SUPPORTED_SCAN_MODES[scanType].includes(requested) ? requested : ScanMode.Project;
};
