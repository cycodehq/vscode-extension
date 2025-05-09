import { SecretDetectionDetails } from './secret-detection-details';
import { DetectionBase } from '../detection-base';
import { Type } from 'class-transformer';

export class SecretDetection extends DetectionBase {
  id: string;
  message: string;

  @Type(() => SecretDetectionDetails)
  detectionDetails: SecretDetectionDetails;

  severity: string;
  type: string;
  detectionRuleId: string; // UUID
  detectionTypeId: string; // UUID

  public getFormattedMessage(): string {
    return this.message.replace('within \'\' repository', ''); // BE bug
  }

  public getFormattedTitle(): string {
    return `${this.type}. ${this.getFormattedMessage()}`;
  }

  public getFormattedNodeTitle(): string {
    return `line ${this.detectionDetails.getLineInFile()}: a hardcoded ${this.type} is used`;
  }
}
