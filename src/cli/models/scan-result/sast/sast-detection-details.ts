import { ScanDetectionDetailsBase } from '../scan-detection-details-base';

export class SastDetectionDetails extends ScanDetectionDetailsBase {
  externalScannerId: string;
  lineInFile: number;
  startPosition: number;
  endPosition: number;
  fileName: string;
  filePath: string;
  cwe: string[];
  owasp: string[];
  category: string;
  languages: string[];
  description: string;
  policyDisplayName: string;
  remediationGuidelines?: string;
  customRemediationGuidelines?: string;

  getFilepath(): string {
    return this.filePath.startsWith('/') ? this.filePath : `/${this.filePath}`;
  }

  getLineInFile(): number {
    return this.lineInFile;
  }
}
