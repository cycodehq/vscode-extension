import { Type } from 'class-transformer';
import { SastDetectionDetails } from './sast-detection-details';
import { DetectionBase } from '../detection-base';

export class SastDetection extends DetectionBase {
  message: string;
  @Type(() => SastDetectionDetails)
  detectionDetails: SastDetectionDetails;

  severity: string;
  type: string;
  detectionRuleId: string;
  detectionTypeId: string;

  getFormattedMessage(): string {
    return this.detectionDetails.policyDisplayName;
  }

  getFormattedTitle(): string {
    return this.getFormattedMessage();
  }

  getFormattedNodeTitle(): string {
    return `line ${this.detectionDetails.lineInFile}: ${this.getFormattedMessage()}`;
  }
}
