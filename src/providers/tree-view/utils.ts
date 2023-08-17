import * as path from 'path';
import { AnyDetection, Detection, ScaDetection } from '../../types/detection';
import { FileScanResult } from './provider';
import { SeverityFirstLetter, TreeView, TreeViewDisplayedData } from './types';
import { ScanType } from '../../constants';

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
  detectionsMapped.forEach((vulnerabilities, fileName) => {
    affectedFiles.push(new FileScanResult(fileName, vulnerabilities));
  });
  provider.refresh(affectedFiles, scanType);
}

const _getSecretValueItem = (detection: Detection): { filename: string, data: TreeViewDisplayedData } => {
  const { type, detection_details, severity } = detection;
  const { line, file_name } = detection_details;

  const lineNumber = line + VSCODE_ENTRY_LINE_NUMBER; // CLI starts counting from 0, although vscode starts from line 1.

  const valueItem: TreeViewDisplayedData = {
    title: `line ${lineNumber}: a hardcoded ${type} is used`,
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    severity: severity,
    lineNumber: lineNumber,
  };

  return {filename: file_name, data: valueItem};
};

const _getScaValueItem = (detection: ScaDetection): { filename: string, data: TreeViewDisplayedData } => {
  const { message, detection_details, severity } = detection;
  const { package_name, package_version, vulnerability_description, line_in_file, file_name } = detection_details;

  let description = vulnerability_description;
  if (!description) {
    // if detection is about non-premise licence
    description = message;
  }

  const valueItem: TreeViewDisplayedData = {
    title: `${package_name}@${package_version}: ${description}`,
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    severity: severity,
    lineNumber: line_in_file,
  };

  return {filename: path.basename(file_name), data: valueItem};
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

    const {filename, data} = valueItem;
    if (resultMap.has(filename)) {
      resultMap.get(filename)!.push(data);
    } else {
      resultMap.set(filename, [data]);
    }
  });

  return resultMap;
}

function mapSeverityToFirstLetter(severity: string): SeverityFirstLetter {
  switch (severity.toLowerCase()) {
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

export const mapDetectionsToSeverityString = (vulnerabilities: TreeViewDisplayedData[]): string => {
  // FIXME(MarshalX): return to UI somehow?
  const severityToCount: SeverityCounted = {};

  for (const vulnerability of vulnerabilities) {
    const { severity } = vulnerability;

    if (severityToCount[severity] === undefined) {
      severityToCount[severity] = 1;
    } else {
      severityToCount[severity] += 1;
    }
  }

  const severityStrings = Object.entries(severityToCount).map(
    ([severity, count]) => `${count} ${severity}`
  );

  return severityStrings.join(" | ");
};
