import * as path from 'path';
import { AnyDetection, Detection, ScaDetection } from '../../types/detection';
import { FileScanResult } from './provider';
import { SeverityFirstLetter, TreeView, TreeViewDisplayedData } from './types';
import { ScanType } from '../../constants';
import { SEVERITY_PRIORITIES } from './constants';

interface RefreshTreeViewDataArgs {
  detections: AnyDetection[];
  treeView?: TreeView;
  scanType: ScanType;
}

type SeverityCounted = { [severity: string]: number };

const VSCODE_ENTRY_LINE_NUMBER = 1;

export function refreshTreeViewData(
  args: RefreshTreeViewDataArgs
): void {
  const { detections, treeView, scanType } = args;
  if (treeView === undefined) {
    return;
  }

  const { provider } = treeView;
  const affectedFiles: FileScanResult[] = [];
  const detectionsMapped = mapDetectionsByFileName(detections, scanType);
  detectionsMapped.forEach((vulnerabilities, fullFilePath) => {
    const fileName = path.basename(fullFilePath);
    affectedFiles.push(new FileScanResult(fileName, fullFilePath, vulnerabilities));
  });
  provider.refresh(affectedFiles, scanType);
}

const _getSecretValueItem = (detection: Detection): { fullFilePath: string, data: TreeViewDisplayedData } => {
  const { type, detection_details, severity } = detection;
  const { line, file_path, file_name } = detection_details;

  const lineNumber = line + VSCODE_ENTRY_LINE_NUMBER; // CLI starts counting from 0, although vscode starts from line 1.

  const valueItem: TreeViewDisplayedData = {
    title: `line ${lineNumber}: a hardcoded ${type} is used`,
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    lineNumber: lineNumber,
  };

  return {fullFilePath: path.join(file_path, file_name), data: valueItem};
};

const _getScaValueItem = (detection: ScaDetection): { fullFilePath: string, data: TreeViewDisplayedData } => {
  const { message, detection_details, severity } = detection;
  const { package_name, package_version, vulnerability_description, line_in_file, file_name } = detection_details;

  let description = vulnerability_description;
  if (!description) {
    // if detection is about non-premise licence
    description = message;
  }

  const valueItem: TreeViewDisplayedData = {
    title: `line ${line_in_file}: ${package_name}@${package_version} - ${description}`,
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    lineNumber: line_in_file,
  };

  return {fullFilePath: file_name, data: valueItem};
};

function mapDetectionsByFileName(
  detections: AnyDetection[],
  scanType: ScanType,
): Map<string, TreeViewDisplayedData[]> {
  const resultMap: Map<string, TreeViewDisplayedData[]> = new Map();

  detections.forEach((detection) => {
    let valueItem;

    if (scanType === ScanType.Secrets) {
      valueItem = _getSecretValueItem(detection as Detection);
    } else if (scanType === ScanType.Sca) {
      valueItem = _getScaValueItem(detection as ScaDetection);
    }

    if (!valueItem) {
      return;
    }

    const {fullFilePath, data} = valueItem;
    if (resultMap.has(fullFilePath)) {
      resultMap.get(fullFilePath)!.push(data);
    } else {
      resultMap.set(fullFilePath, [data]);
    }
  });

  return resultMap;
}

function mapSeverityToFirstLetter(severity: string): SeverityFirstLetter {
  switch (severity.toLowerCase()) {
    case "info":
      return SeverityFirstLetter.Info;
    case "low":
      return SeverityFirstLetter.Low;
    case "medium":
      return SeverityFirstLetter.Medium;
    case "high":
      return SeverityFirstLetter.High;
    case "critical":
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
    const { vulnerabilities } = scanResult;
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

  return severityStrings.join(" | ");
};
