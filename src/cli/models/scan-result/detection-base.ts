import { ScanDetectionDetailsBase } from './scan-detection-details-base';

export abstract class DetectionBase {
  public abstract severity: string;
  public abstract detectionDetails: ScanDetectionDetailsBase;

  public abstract getFormattedMessage(): string;
  public abstract getFormattedNodeTitle(): string;
}
