import { Exclude } from 'class-transformer';
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
  @Exclude({ toPlainOnly: true })
  detectedValue?: string | null; // this field is used and exist only in IDE

  public getFilepath(): string {
    return `${this.filePath}${this.fileName}`;
  }
}
