// Source: https://github.com/cycodehq-public/cycode-cli/blob/ec8333707ab2590518fd0f36454c8636ccbf1061/cycode/cli/consts.py#L50-L82
export const SCA_CONFIGURATION_SCAN_SUPPORTED_FILES: ReadonlyArray<string> = [
  'cargo.lock',
  'cargo.toml',
  'composer.json',
  'composer.lock',
  'go.sum',
  'go.mod',
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
];

export enum ScanType {
  Secrets = "Secrets",
  Sca = "SCA",
  Sast = "SAST",
  Iac = "IaC",
}

export enum ScanTypeDisplayName {
  Secrets = "Hardcoded Secrets",
  Sca = "Open Source Threat",
  Sast = "Code Security",
  Iac = "Infrastructure As Code",
}


const _SCAN_TYPE_TO_DISPLAY_NAME: { [key: string]: string } = {
  [ScanType.Secrets]: ScanTypeDisplayName.Secrets,
  [ScanType.Sca]: ScanTypeDisplayName.Sca,
  [ScanType.Sast]: ScanTypeDisplayName.Sast,
  [ScanType.Iac]: ScanTypeDisplayName.Iac,
};

export const getScanTypeDisplayName = (scanType: string): string => {
  if (!_SCAN_TYPE_TO_DISPLAY_NAME.hasOwnProperty(scanType)) {
    throw Error(`Unknown scan type: ${scanType}`);
  }

  return _SCAN_TYPE_TO_DISPLAY_NAME[scanType];
};
