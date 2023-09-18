export enum CliCommands {
  Path = 'path',
  Scan = 'scan',
  Configure = 'configure',
  Auth = 'auth',
  AuthCheck = 'auth check',
  Ignore = 'ignore',
  Version = 'version',
}

export enum CommandParameters {
  OutputFormatJson = '--output=json',
  Usage = '--help',
  ByRule = '--by-rule',
  ByValue = '--by-value',
  ByPath = '--by-path',
  UserAgent = '--user-agent',
  Version = '--version',
  scanType = '--scan-type',
  SCAScanType = 'sca',
}

export const MinCLIVersion = '1.2.0';
