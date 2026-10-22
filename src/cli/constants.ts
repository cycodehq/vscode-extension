import { CliScanType } from './models/cli-scan-type';

export enum CliCommands {
  Path = 'path',
  CommitHistory = 'commit-history',
  PreCommit = 'pre-commit',
  Scan = 'scan',
  Auth = 'auth',
  Ignore = 'ignore',
  Status = 'status',
  AiRemediation = 'ai_remediation',
}

export enum CommandParameters {
  OutputFormatJson = '--output=json',
  ByRule = '--by-rule',
  ByCve = '--by-cve',
  ByValue = '--by-value',
  ByPath = '--by-path',
  UserAgent = '--user-agent',
  scanType = '--scan-type',
  CommitRange = '--commit-range',
  BaseRef = '--base-ref',
  IncludeUnstaged = '--include-unstaged',
  Path = '--path',
}

export const MIN_CLI_VERSION_FOR_DIFF_SCAN = '3.25.0';

const SCAN_TYPE_TO_SCAN_TYPE_CLI_FLAG_VALUE = {
  [CliScanType.Secret]: 'secret',
  [CliScanType.Sca]: 'sca',
  [CliScanType.Sast]: 'sast',
  [CliScanType.Iac]: 'iac',
};

export const getScanTypeCliValue = (scanType: CliScanType): string => {
  if (!SCAN_TYPE_TO_SCAN_TYPE_CLI_FLAG_VALUE[scanType]) {
    throw new Error(`Unsupported scan type: ${scanType}`);
  }

  return SCAN_TYPE_TO_SCAN_TYPE_CLI_FLAG_VALUE[scanType];
};
