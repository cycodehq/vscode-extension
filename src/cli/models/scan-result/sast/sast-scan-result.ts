import { Type } from 'class-transformer';
import { ScanResultBase } from '../scan-result-base';
import { SastDetection } from './sast-detection';

export class SastScanResult extends ScanResultBase {
  @Type(() => SastDetection)
  detections: SastDetection[];
}
