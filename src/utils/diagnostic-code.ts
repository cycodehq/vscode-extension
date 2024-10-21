import { calculateUniqueDetectionId } from '../services/scan-results-service';
import { DetectionBase } from '../cli/models/scan-result/detection-base';
import { CliScanType } from '../cli/models/cli-scan-type';

export const _DIAGNOSTIC_CODE_SEPARATOR = '::';

export class DiagnosticCode {
  scanType: CliScanType;
  uniqueDetectionId: string;

  constructor(scanType: CliScanType, uniqueDetectionId: string) {
    this.scanType = scanType;
    this.uniqueDetectionId = uniqueDetectionId;
  }

  public toString(): string {
    return `${this.scanType}${_DIAGNOSTIC_CODE_SEPARATOR}${this.uniqueDetectionId}`;
  }

  public static fromDetection(scanType: CliScanType, detection: DetectionBase): DiagnosticCode {
    return new DiagnosticCode(scanType, calculateUniqueDetectionId(detection));
  }

  public static fromString(diagnosticCode: string): DiagnosticCode {
    const [scanType, uniqueDetectionId] = diagnosticCode.split(_DIAGNOSTIC_CODE_SEPARATOR);
    return new DiagnosticCode(scanType as CliScanType, uniqueDetectionId);
  }
}
