import { ScanDetectionDetailsBase } from '../scan-detection-details-base';

export class IacDetectionDetails extends ScanDetectionDetailsBase {
  info: string;
  failureType: string;
  infraProvider: string;
  lineInFile: number;
  startPosition: number;
  endPosition: number;
  filePath: string;
  fileName: string;
  description?: string;
  remediationGuidelines?: string;
  customRemediationGuidelines?: string;
  policyDisplayName?: string;

  getFilepath(): string {
    return this.fileName;
  }

  getLineInFile(): number {
    return this.lineInFile;
  }
}
