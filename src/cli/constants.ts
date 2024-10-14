import { ScanType } from '../constants';

export enum CliCommands {
  Path = 'path',
  Scan = 'scan',
  Auth = 'auth',
  AuthCheck = 'auth check',
  Ignore = 'ignore',
  Version = 'version',
}

export enum CommandParameters {
  OutputFormatJson = '--output=json',
  ByRule = '--by-rule',
  ByValue = '--by-value',
  ByPath = '--by-path',
  UserAgent = '--user-agent',
  scanType = '--scan-type',
}

const SCAN_TYPE_TO_SCAN_TYPE_CLI_FLAG_VALUE = {
  [ScanType.Secret]: 'secret',
  [ScanType.Sca]: 'sca',
  [ScanType.Sast]: 'sast',
  [ScanType.Iac]: 'iac',
};

export const getScanTypeCliValue = (scanType: ScanType): string => {
  if (!SCAN_TYPE_TO_SCAN_TYPE_CLI_FLAG_VALUE[scanType]) {
    throw new Error(`Unsupported scan type: ${scanType}`);
  }

  return SCAN_TYPE_TO_SCAN_TYPE_CLI_FLAG_VALUE[scanType];
};
