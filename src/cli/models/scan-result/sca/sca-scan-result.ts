import { Type } from 'class-transformer';
import { ScanResultBase } from '../scan-result-base';
import { ScaDetection } from './sca-detection';

export class ScaScanResult extends ScanResultBase {
  @Type(() => ScaDetection)
  detections: ScaDetection[];
}
