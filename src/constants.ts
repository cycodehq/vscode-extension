import * as path from 'path';
import {getContext} from './utils/context';

// keep in lowercase.
// eslint-disable-next-line max-len
// source: https://github.com/cycodehq/cycode-cli/blob/ec8333707ab2590518fd0f36454c8636ccbf1061/cycode/cli/consts.py#L50-L82
const _SCA_CONFIGURATION_SCAN_SUPPORTED_FILES: ReadonlyArray<string> = [
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
];

// keep in lowercase. based on _SCA_CONFIGURATION_SCAN_SUPPORTED_FILES
const _SCA_CONFIGURATION_SCAN_LOCK_FILE_TO_PACKAGE_FILE: { [key: string]: string } = {
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
};

const _SCA_CONFIGURATION_SCAN_SUPPORTED_LOCK_FILES: ReadonlyArray<string> =
    Object.keys(_SCA_CONFIGURATION_SCAN_LOCK_FILE_TO_PACKAGE_FILE);

// keep in lowercase.
// source: https://github.com/cycodehq/cycode-cli/blob/ec8333707ab2590518fd0f36454c8636ccbf1061/cycode/cli/consts.py#L16
const _INFRA_CONFIGURATION_SCAN_SUPPORTED_FILE_SUFFIXES: ReadonlyArray<string> = [
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
      (fileSuffix) => lowerCaseFileName.endsWith(fileSuffix)
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

export enum ScanType {
  Secrets = 'Secrets',
  Sca = 'SCA',
  Sast = 'SAST',
  Iac = 'IaC',
}

export enum ScanTypeDisplayName {
  Secrets = 'Hardcoded Secrets',
  Sca = 'Open Source Threat (beta)',
  Sast = 'Code Security',
  Iac = 'Infrastructure As Code',
}

export const SEVERITY_PRIORITIES_FIRST_LETTERS: ReadonlyArray<string> = ['C', 'H', 'M', 'L', 'I'];
export const SEVERITY_PRIORITIES: ReadonlyArray<string> = ['Critical', 'High', 'Medium', 'Low', 'Info'];

const _SCAN_TYPE_TO_DISPLAY_NAME: { [key: string]: string } = {
  [ScanType.Secrets]: ScanTypeDisplayName.Secrets,
  [ScanType.Sca]: ScanTypeDisplayName.Sca,
  [ScanType.Sast]: ScanTypeDisplayName.Sast,
  [ScanType.Iac]: ScanTypeDisplayName.Iac,
};

export const getScanTypeDisplayName = (scanType: string): string => {
  if (!(scanType in _SCAN_TYPE_TO_DISPLAY_NAME)) {
    throw Error(`Unknown scan type: ${scanType}`);
  }

  return _SCAN_TYPE_TO_DISPLAY_NAME[scanType];
};

export const DIAGNOSTIC_CODE_SEPARATOR = '::';

export const REQUIRED_CLI_VERSION = '1.9.5';

export const CLI_GITHUB = {
  OWNER: 'cycodehq',
  REPO: 'cycode-cli',
  TAG: `v${REQUIRED_CLI_VERSION}`,
};

export const CLI_CHECK_NEW_VERSION_EVERY_SEC = 24 * 60 * 60; // 24 hours

export const getPluginPath = (): string => {
  return path.join(getContext().extensionPath, 'cycode-vscode-extension');
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
