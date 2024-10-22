import * as path from 'path';

const _PATH_TO_RESOURCES = path.join(__filename, '..', '..', 'resources');
const PATH_TO_SCAN_TYPE_ICONS = path.join(_PATH_TO_RESOURCES, 'scan-type');
const PATH_TO_SEVERITY_ICONS = path.join(_PATH_TO_RESOURCES, 'severity');

export const getScanTypeIconPath = (scanType: string) => {
  _validateIconFilename(scanType);
  return path.join(PATH_TO_SCAN_TYPE_ICONS, `${scanType}.png`);
};

export const getSeverityIconPath = (severity: string) => {
  _validateIconFilename(severity);
  return path.join(PATH_TO_SEVERITY_ICONS, `${severity}.png`);
};

const _validateIconFilename = (filename: string): void => {
  const letters = /^[A-Za-z]+$/;
  if ((letters.exec(filename)) === null) {
    throw Error('Malformed filename string');
  }
};
