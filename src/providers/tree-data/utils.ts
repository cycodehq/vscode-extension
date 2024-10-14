import * as path from 'path';
import { container } from 'tsyringe';
import { FileScanResult } from './provider';
import { SeverityFirstLetter, TreeView, TreeDisplayedData } from './types';
import { ScanType, SEVERITY_PRIORITIES } from '../../constants';
import { IScanResultsService } from '../../services/scan-results-service';
import { CliServiceSymbol, ScanResultsServiceSymbol } from '../../symbols';
import { ICliService } from '../../services/cli-service';
import { SecretDetection } from '../../cli/models/scan-result/secret/secret-detection';
import { ScaDetection } from '../../cli/models/scan-result/sca/sca-detection';
import { IacDetection } from '../../cli/models/scan-result/iac/iac-detection';
import { SastDetection } from '../../cli/models/scan-result/sast/sast-detection';
import { DetectionBase } from '../../cli/models/scan-result/detection-base';

interface ValueItem {
  fullFilePath: string;
  data: TreeDisplayedData;
}

type SeverityCounted = Record<string, number>;

const VSCODE_ENTRY_LINE_NUMBER = 1;

export const refreshTreeViewData = (
  scanType: ScanType, treeView: TreeView,
) => {
  const cliService = container.resolve<ICliService>(CliServiceSymbol);
  const projectRoot = cliService.getProjectRootDirectory();
  if (!projectRoot) {
    return;
  }

  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const detections = scanResultsService.getDetections(scanType);

  const affectedFiles: FileScanResult[] = [];
  const detectionsMapped = mapDetectionsByFileName(detections, scanType);
  detectionsMapped.forEach((vulnerabilities, fullFilePath) => {
    const projectRelativePath = path.relative(projectRoot, fullFilePath);
    affectedFiles.push(new FileScanResult(projectRelativePath, fullFilePath, vulnerabilities));
  });

  treeView.provider.refresh(affectedFiles, scanType);
};

const _getSecretValueItem = (detection: SecretDetection): ValueItem => {
  const { detectionDetails, severity } = detection;
  const { line } = detectionDetails;

  const lineNumber = line + VSCODE_ENTRY_LINE_NUMBER; // CLI starts counting from 0, although vscode starts from line 1.

  const valueItem: TreeDisplayedData = {
    title: detection.getFormattedNodeTitle(),
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    lineNumber: lineNumber,
    detection: detection,
    detectionType: ScanType.Secret,
  };

  return { fullFilePath: detectionDetails.getFilepath(), data: valueItem };
};

const _getScaValueItem = (detection: ScaDetection): ValueItem => {
  const { detectionDetails, severity } = detection;
  const { lineInFile } = detectionDetails;

  const valueItem: TreeDisplayedData = {
    title: detection.getFormattedNodeTitle(),
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    lineNumber: lineInFile,
    detection: detection,
    detectionType: ScanType.Sca,
  };

  return { fullFilePath: detectionDetails.getFilepath(), data: valueItem };
};

const _getIacValueItem = (detection: IacDetection): ValueItem => {
  const { detectionDetails, severity } = detection;
  const { lineInFile } = detectionDetails;

  const valueItem: TreeDisplayedData = {
    title: detection.getFormattedNodeTitle(),
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    lineNumber: lineInFile,
    detection: detection,
    detectionType: ScanType.Iac,
  };

  return { fullFilePath: detectionDetails.getFilepath(), data: valueItem };
};

const _getSastValueItem = (detection: SastDetection): ValueItem => {
  const { detectionDetails, severity } = detection;
  const { lineInFile } = detectionDetails;

  const valueItem: TreeDisplayedData = {
    title: detection.getFormattedNodeTitle(),
    severityFirstLetter: mapSeverityToFirstLetter(severity),
    lineNumber: lineInFile,
    detection: detection,
    detectionType: ScanType.Sast,
  };

  return { fullFilePath: detectionDetails.getFilepath(), data: valueItem };
};

const mapDetectionsByFileName = (
  detections: DetectionBase[],
  scanType: ScanType,
): Map<string, TreeDisplayedData[]> => {
  const resultMap = new Map<string, TreeDisplayedData[]>();

  detections.forEach((detection) => {
    let valueItem: ValueItem | undefined;

    if (scanType === ScanType.Secret) {
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
};

const mapSeverityToFirstLetter = (severity: string): SeverityFirstLetter => {
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
        `Supplied unsupported severity ${severity}, can not map to severity first letter`,
      );
  }
};

export const mapScanResultsToSeverityStatsString = (scanResults: FileScanResult[]): string => {
  const severityToCount: SeverityCounted = {};

  for (const scanResult of scanResults) {
    const { vulnerabilities } = scanResult;
    for (const vulnerability of vulnerabilities) {
      const { severityFirstLetter } = vulnerability;

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
