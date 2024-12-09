import { SecretDetectionDetails } from './secret-detection-details';
import { DetectionBase } from '../detection-base';
import { Type } from 'class-transformer';

const IDE_ENTRY_LINE_NUMBER = 1;

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
    return `line ${this.detectionDetails.line + IDE_ENTRY_LINE_NUMBER}: a hardcoded ${this.type} is used`;
  }
}
