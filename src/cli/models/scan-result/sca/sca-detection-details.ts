import { ScaDetectionDetailsAlert } from './sca-detection-details-alert';
import { Type } from 'class-transformer';
import { ScanDetectionDetailsBase } from '../scan-detection-details-base';

export class ScaDetectionDetails extends ScanDetectionDetailsBase {
  fileName: string;
  startPosition: number;
  endPosition: number;
  line: number;
  lineInFile: number;
  dependencyPaths: string;
  license?: string;
  packageName: string;
  packageVersion: string;
  vulnerabilityDescription?: string;
  vulnerabilityId?: string;
  @Type(() => ScaDetectionDetailsAlert)
  alert?: ScaDetectionDetailsAlert;

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
