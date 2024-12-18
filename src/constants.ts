import * as path from 'path';
import { container } from 'tsyringe';
import { IExtensionService } from './services/extension-service';
import { ExtensionServiceSymbol } from './symbols';
import { CliScanType } from './cli/models/cli-scan-type';

// keep in lowercase.
// eslint-disable-next-line max-len
// source: https://github.com/cycodehq/cycode-cli/blob/ec8333707ab2590518fd0f36454c8636ccbf1061/cycode/cli/consts.py#L50-L82
const _SCA_CONFIGURATION_SCAN_SUPPORTED_FILES: readonly string[] = [
  'cargo.lock',
  'cargo.toml',
  'composer.json',
  'composer.lock',
  'go.sum',
  'go.mod',
  // 'gopkg.toml', // FIXME(MarshalX): missed in CLI?
  'gopkg.lock',
  'pom.xml',
  'build.gradle',
  'gradle.lockfile',
  'build.gradle.kts',
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'npm-shrinkwrap.json',
  'packages.config',
  'project.assets.json',
  'packages.lock.json',
  'nuget.config',
  '.csproj',
  'gemfile',
  'gemfile.lock',
  'build.sbt',
  'build.scala',
  'build.sbt.lock',
  'pyproject.toml',
  'poetry.lock',
  'pipfile',
  'pipfile.lock',
  'requirements.txt',
  'setup.py',
  'mix.exs',
  'mix.lock',
  'package.swift',
  'package.resolved',
];

// keep in lowercase. based on _SCA_CONFIGURATION_SCAN_SUPPORTED_FILES
const _SCA_CONFIGURATION_SCAN_LOCK_FILE_TO_PACKAGE_FILE: Record<string, string> = {
  'cargo.lock': 'cargo.toml',
  'composer.lock': 'composer.json',
  'go.sum': 'go.mod',
  'gopkg.lock': 'gopkg.toml',
  'gradle.lockfile': 'build.gradle',
  'package-lock.json': 'package.json',
  'yarn.lock': 'package.json',
  'packages.lock.json': 'nuget.config',
  'gemfile.lock': 'gemfile',
  'build.sbt.lock': 'build.sbt', // and build.scala?
  'poetry.lock': 'pyproject.toml',
  'pipfile.lock': 'pipfile',
  'mix.lock': 'mix.exs',
  'package.resolved': 'package.swift',
};

const _SCA_CONFIGURATION_SCAN_SUPPORTED_LOCK_FILES: readonly string[]
    = Object.keys(_SCA_CONFIGURATION_SCAN_LOCK_FILE_TO_PACKAGE_FILE);

/*
 * keep in lowercase.
 * source: https://github.com/cycodehq/cycode-cli/blob/ec8333707ab2590518fd0f36454c8636ccbf1061/cycode/cli/consts.py#L16
 */
const _INFRA_CONFIGURATION_SCAN_SUPPORTED_FILE_SUFFIXES: readonly string[] = [
  '.tf',
  '.tf.json',
  '.json',
  '.yaml',
  '.yml',
  'dockerfile',
];

export const isSupportedIacFile = (fileName: string): boolean => {
  const lowerCaseFileName = fileName.toLowerCase();
  return _INFRA_CONFIGURATION_SCAN_SUPPORTED_FILE_SUFFIXES.some(
    (fileSuffix) => lowerCaseFileName.endsWith(fileSuffix),
  );
};

export const isSupportedPackageFile = (fileName: string): boolean => {
  const lowerCaseFileName = fileName.toLowerCase();
  return _SCA_CONFIGURATION_SCAN_SUPPORTED_FILES.some((fileSuffix) => lowerCaseFileName.endsWith(fileSuffix));
};

export const isSupportedLockFile = (lockFileName: string): boolean => {
  const lowerCaseFileName = lockFileName.toLowerCase();
  return _SCA_CONFIGURATION_SCAN_SUPPORTED_LOCK_FILES.some((fileSuffix) => lowerCaseFileName.endsWith(fileSuffix));
};

export const getPackageFileForLockFile = (lockFile: string): string => {
  const lowerCaseFileName = lockFile.toLowerCase();
  if (!(lowerCaseFileName in _SCA_CONFIGURATION_SCAN_LOCK_FILE_TO_PACKAGE_FILE)) {
    return 'package';
  }

  return _SCA_CONFIGURATION_SCAN_LOCK_FILE_TO_PACKAGE_FILE[lowerCaseFileName];
};

export enum ScanTypeDisplayName {
  Secrets = 'Hardcoded Secrets',
  Sca = 'Open Source Threat',
  Sast = 'Code Security',
  Iac = 'Infrastructure As Code',
}

const _SCAN_TYPE_TO_DISPLAY_NAME: Record<string, string> = {
  [CliScanType.Secret]: ScanTypeDisplayName.Secrets,
  [CliScanType.Sca]: ScanTypeDisplayName.Sca,
  [CliScanType.Sast]: ScanTypeDisplayName.Sast,
  [CliScanType.Iac]: ScanTypeDisplayName.Iac,
};

export const getScanTypeDisplayName = (scanType: string): string => {
  if (!(scanType in _SCAN_TYPE_TO_DISPLAY_NAME)) {
    throw Error(`Unknown scan type: ${scanType}`);
  }

  return _SCAN_TYPE_TO_DISPLAY_NAME[scanType];
};

export const REQUIRED_CLI_VERSION = '2.2.0';

export const CLI_GITHUB = {
  OWNER: 'cycodehq',
  REPO: 'cycode-cli',
  TAG: `v${REQUIRED_CLI_VERSION}`,
};

export const CLI_CHECK_NEW_VERSION_EVERY_SEC = 24 * 60 * 60; // 24 hours

export const getPluginPath = (): string => {
  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);
  return path.join(extension.extensionContext.extensionPath, 'cycode-vscode-extension');
};

export const getDefaultCliPath = (): string => {
  if (process.platform === 'win32') {
    return path.join(getPluginPath(), 'cycode.exe');
  }

  if (process.platform === 'darwin') {
    // on macOS, we are always using onedir mode because of gatekeeper
    return path.join(getPluginPath(), 'cycode-cli', 'cycode-cli');
  }

  return path.join(getPluginPath(), 'cycode');
};

export const CYCODE_DOMAIN = 'cycode.com';
export const DEFAULT_CYCODE_API_URL = `https://api.${CYCODE_DOMAIN}`;
export const DEFAULT_CYCODE_APP_URL = `https://app.${CYCODE_DOMAIN}`;

export const SENTRY_DSN = 'https://d9527c2348300201235516c0c33a5824@o1026942.ingest.us.sentry.io/4507543875813376';
export const SENTRY_DEBUG = false;
export const SENTRY_SAMPLE_RATE = 1.0;
export const SENTRY_SEND_DEFAULT_PII = false;
export const SENTRY_INCLUDE_LOCAL_VARIABLES = false;
