import { ScanDetectionDetailsBase } from '../scan-detection-details-base';

export class SecretDetectionDetails extends ScanDetectionDetailsBase {
  sha512: string;
  provider: string;
  concreteProvider: string;
  length: number;
  startPosition: number;
  line: number;
  committedAt: string; // TODO: consider using Date for DateTime
  filePath: string;
  fileName: string;
  fileExtension?: string;
  description?: string;
  remediationGuidelines?: string;
  customRemediationGuidelines?: string;
  policyDisplayName?: string;
  detectedValue?: string | null;

  public getFilepath(): string {
    return `${this.filePath}${this.fileName}`;
  }
}
