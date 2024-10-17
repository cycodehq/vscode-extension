import { Type } from 'class-transformer';
import { ScanResultBase } from '../scan-result-base';
import { IacDetection } from './iac-detection';

export class IacScanResult extends ScanResultBase {
  @Type(() => IacDetection)
  detections: IacDetection[];
}
