import { IacDetectionDetails } from './iac-detection-details';
import { Type } from 'class-transformer';
import { DetectionBase } from '../detection-base';

export class IacDetection extends DetectionBase {
  id: string;
  message: string;
  @Type(() => IacDetectionDetails)
  detectionDetails: IacDetectionDetails;

  severity: string;
  type: string;
  detectionRuleId: string;
  detectionTypeId: string;

  getFormattedMessage(): string {
    return this.message;
  }

  getFormattedTitle(): string {
    return this.getFormattedMessage();
  }

  getFormattedNodeTitle(): string {
    return `line ${this.detectionDetails.lineInFile + 1}: ${this.getFormattedMessage()}`;
  }
}
