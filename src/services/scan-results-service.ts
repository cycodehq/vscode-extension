import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { singleton } from 'tsyringe';
import { instanceToPlain } from 'class-transformer';
import { LocalKeyValueStorage } from './key-value-storage-service';
import { SecretDetection } from '../cli/models/scan-result/secret/secret-detection';
import { SastDetection } from '../cli/models/scan-result/sast/sast-detection';
import { IacDetection } from '../cli/models/scan-result/iac/iac-detection';
import { ScaDetection } from '../cli/models/scan-result/sca/sca-detection';
import { DetectionBase } from '../cli/models/scan-result/detection-base';
import { CliScanType } from '../cli/models/cli-scan-type';

export const calculateUniqueDetectionId = (detection: DetectionBase): string => {
  const hash = crypto.createHash('sha256');

  const detectionJson = JSON.stringify(instanceToPlain(detection));
  hash.update(detectionJson);

  const hexHash = hash.digest('hex');
  const shortHashLength = Math.ceil(hexHash.length / 4); // 2 ** 64 combinations
  return hexHash.slice(0, shortHashLength);
};

export interface IScanResultsService {
  initContext(context: vscode.ExtensionContext): void;
  getDetectionById(detectionId: string): DetectionBase | undefined;
  getDetections(scanType: CliScanType): DetectionBase[];
  setDetections(scanType: CliScanType, detections: DetectionBase[]): void;
  hasResults(): boolean;
  dropAllScanResults(): void;
  excludeResultsByValue(value: string): void;
}

@singleton()
export class ScanResultsService implements IScanResultsService {
  private storage = new LocalKeyValueStorage();

  private _secretScanDetections: SecretDetection[] = [];
  private _scaScanDetections: ScaDetection[] = [];
  private _iacScanDetections: IacDetection[] = [];
  private _sastScanDetections: SastDetection[] = [];

  private _uniqueDetectionIdMap = new Map<string, DetectionBase>();

  public initContext(context: vscode.ExtensionContext): void {
    this.storage.initContext(context);
  }

  public getDetectionById(detectionId: string): DetectionBase | undefined {
    return this._uniqueDetectionIdMap.get(detectionId);
  }

  public getDetections(scanType: CliScanType): DetectionBase[] {
    const detectionMap = {
      [CliScanType.Secret]: () => this._secretScanDetections,
      [CliScanType.Sca]: () => this._scaScanDetections,
      [CliScanType.Iac]: () => this._iacScanDetections,
      [CliScanType.Sast]: () => this._sastScanDetections,
    };

    const getDetectionsFunc = detectionMap[scanType];
    return getDetectionsFunc ? getDetectionsFunc() : [];
  }

  public hasResults(): boolean {
    return this._secretScanDetections.length > 0
      || this._scaScanDetections.length > 0
      || this._iacScanDetections.length > 0
      || this._sastScanDetections.length > 0;
  }

  private clearDetections(scanType: CliScanType): void {
    const detectionMap = {
      [CliScanType.Secret]: () => this._secretScanDetections = [],
      [CliScanType.Sca]: () => this._scaScanDetections = [],
      [CliScanType.Iac]: () => this._iacScanDetections = [],
      [CliScanType.Sast]: () => this._sastScanDetections = [],
    };

    const clearDetectionsFunc = detectionMap[scanType];
    if (clearDetectionsFunc) {
      clearDetectionsFunc();
    }
  }

  private saveDetections(scanType: CliScanType, detections: DetectionBase[]): void {
    detections.forEach((detection) => {
      this.saveDetection(scanType, detection);
    });
  }

  public setDetections(scanType: CliScanType, detections: DetectionBase[]): void {
    // TODO(MarshalX): smart merge with existing detections will be cool someday
    this.clearDetections(scanType);
    this.saveDetections(scanType, detections);
  }

  private saveDetection(scanType: CliScanType, detection: DetectionBase): void {
    const detectionMap = {
      [CliScanType.Secret]: () => this._secretScanDetections.push(detection as SecretDetection),
      [CliScanType.Sca]: () => this._scaScanDetections.push(detection as ScaDetection),
      [CliScanType.Iac]: () => this._iacScanDetections.push(detection as IacDetection),
      [CliScanType.Sast]: () => this._sastScanDetections.push(detection as SastDetection),
    };

    const saveDetectionFunc = detectionMap[scanType];
    if (saveDetectionFunc) {
      saveDetectionFunc();
    }

    const uniqueDetectionKey = calculateUniqueDetectionId(detection);
    this._uniqueDetectionIdMap.set(uniqueDetectionKey, detection);
  }

  public dropAllScanResults(): void {
    /*
     * free memory, clean state
     * typically called on launch to drop all previous scan results
     */
    this._uniqueDetectionIdMap.clear();

    for (const scanType of Object.values(CliScanType)) {
      this.clearDetections(scanType);
    }
  }

  public excludeResultsByValue(value: string): void {
    this._secretScanDetections = this._secretScanDetections.filter((detection) => {
      return detection.detectionDetails.detectedValue !== value;
    });
  }
}
