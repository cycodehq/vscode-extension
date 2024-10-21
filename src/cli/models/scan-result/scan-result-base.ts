import { CliError } from '../cli-error';
import { DetectionBase } from './detection-base';
import { Type } from 'class-transformer';

export abstract class ScanResultBase {
  public abstract detections: DetectionBase[];

  @Type(() => CliError)
  errors: CliError[];
}
