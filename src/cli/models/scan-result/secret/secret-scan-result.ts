import { Type } from 'class-transformer';
import { ScanResultBase } from '../scan-result-base';
import { SecretDetection } from './secret-detection';

export class SecretScanResult extends ScanResultBase {
  @Type(() => SecretDetection)
  detections: SecretDetection[];
}
