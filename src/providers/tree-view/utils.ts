import * as path from 'path';
import {AnyDetection, IacDetection, SastDetection, ScaDetection, SecretDetection} from '../../types/detection';
import {FileScanResult} from './provider';
import {SeverityFirstLetter, TreeView, TreeViewDisplayedData} from './types';
import {ScanType, SEVERITY_PRIORITIES} from '../../constants';
import {cliService} from '../../services/CliService';

interface RefreshTreeViewDataArgs {
  detections: AnyDetection[];
  treeView?: TreeView;
  scanType: ScanType;
}

interface ValueItem {
  fullFilePath: string;
  data: TreeViewDisplayedData;
}

type SeverityCounted = { [severity: string]: number };

const VSCODE_ENTRY_LINE_NUMBER = 1;

export function refreshTreeViewData(
    args: RefreshTreeViewDataArgs
): void {
  const {detections, treeView, scanType} = args;
  if (treeView === undefined) {
    return;
  }

  const projectRoot = cliService.getProjectRootDirectory();

  const {provider} = treeView;
  const affectedFiles: FileScanResult[] = [];
  const detectionsMapped = mapDetectionsByFileName(detections, scanType);
  detectionsMapped.forEach((vulnerabilities, fullFilePath) => {
    const projectRelativePath = path.relative(projectRoot, fullFilePath);
    affectedFiles.push(new FileScanResult(projectRelativePath, fullFilePath, vulnerabilities));
  });
  provider.refresh(affectedFiles, scanType);
}

const _getSecretValueItem = (detection: SecretDetection): ValueItem => {
  const {type, detection_details, severity} = detection;
  const {line, file_path, file_name} = detection_details;

  const lineNumber = line + VSCODE_ENTRY_LINE_NUMBER; // CLI starts counting from 0, although vscode starts from line 1.

  const valueItem: TreeViewDisplayedData = {
    title: `line ${lineNumber}: a hardcoded ${type} is used`,
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    lineNumber: lineNumber,
    detection: detection,
    detectionType: ScanType.Secrets,
  };

  return {fullFilePath: path.join(file_path, file_name), data: valueItem};
};

const _getScaValueItem = (detection: ScaDetection): ValueItem => {
  const {message, detection_details, severity} = detection;
  const {package_name, package_version, vulnerability_description, line_in_file, file_name} = detection_details;

  let description = vulnerability_description;
  if (!description) {
    // if detection is about non-premise licence
    description = message;
  }

  const valueItem: TreeViewDisplayedData = {
    title: `line ${line_in_file}: ${package_name}@${package_version} - ${description}`,
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    lineNumber: line_in_file,
    detection: detection,
    detectionType: ScanType.Sca,
  };

  return {fullFilePath: file_name, data: valueItem};
};

const _getIacValueItem = (detection: IacDetection): ValueItem => {
  const {message, detection_details, severity} = detection;
  const {line_in_file, file_name} = detection_details;

  const valueItem: TreeViewDisplayedData = {
    title: `line ${line_in_file}: ${message}`,
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    lineNumber: line_in_file,
    detection: detection,
    detectionType: ScanType.Iac,
  };

  return {fullFilePath: file_name, data: valueItem};
};

const _getSastValueItem = (detection: SastDetection): ValueItem => {
  const {message, detection_details, severity} = detection;
  const {line_in_file, file_path} = detection_details;

  const valueItem: TreeViewDisplayedData = {
    title: `line ${line_in_file}: ${message}`,
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    lineNumber: line_in_file,
    detection: detection,
    detectionType: ScanType.Sast,
  };

  return {fullFilePath: file_path, data: valueItem};
};

function mapDetectionsByFileName(
    detections: AnyDetection[],
    scanType: ScanType,
): Map<string, TreeViewDisplayedData[]> {
  const resultMap: Map<string, TreeViewDisplayedData[]> = new Map();

  detections.forEach((detection) => {
    let valueItem: ValueItem | undefined;

    if (scanType === ScanType.Secrets) {
      valueItem = _getSecretValueItem(detection as SecretDetection);
    } else if (scanType === ScanType.Sca) {
      valueItem = _getScaValueItem(detection as ScaDetection);
    } else if (scanType === ScanType.Iac) {
      valueItem = _getIacValueItem(detection as IacDetection);
    } else if (scanType == ScanType.Sast) {
      valueItem = _getSastValueItem(detection as SastDetection);
    }

    if (!valueItem) {
      return;
    }

    if (resultMap.has(valueItem.fullFilePath)) {
      resultMap.get(valueItem.fullFilePath)?.push(valueItem.data);
    } else {
      resultMap.set(valueItem.fullFilePath, [valueItem.data]);
    }
  });

  return resultMap;
}

function mapSeverityToFirstLetter(severity: string): SeverityFirstLetter {
  switch (severity.toLowerCase()) {
    case 'info':
      return SeverityFirstLetter.Info;
    case 'low':
      return SeverityFirstLetter.Low;
    case 'medium':
      return SeverityFirstLetter.Medium;
    case 'high':
      return SeverityFirstLetter.High;
    case 'critical':
      return SeverityFirstLetter.Critical;
    default:
      throw new Error(
          `Supplied unsupported severity ${severity}, can not map to severity first letter`
      );
  }
}

export const mapScanResultsToSeverityStatsString = (scanResults: FileScanResult[]): string => {
  const severityToCount: SeverityCounted = {};

  for (const scanResult of scanResults) {
    const {vulnerabilities} = scanResult;
    for (const vulnerability of vulnerabilities) {
      const {severityFirstLetter} = vulnerability;

      if (severityToCount[severityFirstLetter] === undefined) {
        severityToCount[severityFirstLetter] = 1;
      } else {
        severityToCount[severityFirstLetter] += 1;
      }
    }
  }

  const severityStrings: string[] = [];

  // add severity stats strings in severity priority order
  SEVERITY_PRIORITIES.forEach((severity) => {
    const severityFirstLetter = severity[0];
    const count = severityToCount[severityFirstLetter];
    if (count !== undefined) {
      severityStrings.push(`${severity}-${count}`);
    }
  });

  return severityStrings.join(' | ');
};
