import { ScaDetectionDetails } from './sca-detection-details';
import { DetectionBase } from '../detection-base';
import { Type } from 'class-transformer';

export class ScaDetection extends DetectionBase {
  id: string;
  message: string;
  @Type(() => ScaDetectionDetails)
  detectionDetails: ScaDetectionDetails;

  severity: string;
  type: string;
  detectionRuleId: string;
  detectionTypeId: string;

  getFormattedMessage(): string {
    return this.message;
  }

  getFormattedTitle(): string {
    const message = this.detectionDetails.vulnerabilityDescription || this.getFormattedMessage();
    return `${this.detectionDetails.packageName}@${this.detectionDetails.packageVersion} - ${message}`;
  }

  getFormattedNodeTitle(): string {
    return `line ${this.detectionDetails.getLineInFile()}: ${this.getFormattedTitle()}`;
  }
}
