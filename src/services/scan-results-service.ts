import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { singleton } from 'tsyringe';
import { instanceToPlain } from 'class-transformer';
import { ScanType } from '../constants';
import { LocalKeyValueStorage } from './key-value-storage-service';
import { SecretDetection } from '../cli/models/scan-result/secret/secret-detection';
import { SastDetection } from '../cli/models/scan-result/sast/sast-detection';
import { IacDetection } from '../cli/models/scan-result/iac/iac-detection';
import { ScaDetection } from '../cli/models/scan-result/sca/sca-detection';
import { DetectionBase } from '../cli/models/scan-result/detection-base';

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
  getDetections(scanType: ScanType): DetectionBase[];
  setDetections(scanType: ScanType, detections: DetectionBase[]): void;
  dropAllScanResults(): void;
}

@singleton()
export class ScanResultsService implements IScanResultsService {
  private storage = new LocalKeyValueStorage();

  private _secretScanDetections: SecretDetection[] = [];
  private _scaScanDetections: ScaDetection[] = [];
  private _iacScanDetections: IacDetection[] = [];
  private _sastScanDetections: SastDetection[] = [];

  private _uniqueDetectionIdMap: Record<string, DetectionBase> = {};

  public initContext(context: vscode.ExtensionContext): void {
    this.storage.initContext(context);
  }

  public getDetectionById(detectionId: string): DetectionBase | undefined {
    return this._uniqueDetectionIdMap[detectionId];
  }

  public getDetections(scanType: ScanType): DetectionBase[] {
    const detectionMap = {
      [ScanType.Secret]: () => this._secretScanDetections,
      [ScanType.Sca]: () => this._scaScanDetections,
      [ScanType.Iac]: () => this._iacScanDetections,
      [ScanType.Sast]: () => this._sastScanDetections,
    };

    const getDetectionsFunc = detectionMap[scanType];
    return getDetectionsFunc ? getDetectionsFunc() : [];
  }

  private clearDetections(scanType: ScanType): void {
    const detectionMap = {
      [ScanType.Secret]: () => this._secretScanDetections = [],
      [ScanType.Sca]: () => this._scaScanDetections = [],
      [ScanType.Iac]: () => this._iacScanDetections = [],
      [ScanType.Sast]: () => this._sastScanDetections = [],
    };

    const clearDetectionsFunc = detectionMap[scanType];
    if (clearDetectionsFunc) {
      clearDetectionsFunc();
    }
  }

  private saveDetections(scanType: ScanType, detections: DetectionBase[]): void {
    detections.forEach((detection) => {
      this.saveDetection(scanType, detection);
    });
  }

  public setDetections(scanType: ScanType, detections: DetectionBase[]): void {
    // TODO(MarshalX): smart merge with existing detections will be cool someday
    this.clearDetections(scanType);
    this.saveDetections(scanType, detections);
  }

  private saveDetection(scanType: ScanType, detection: DetectionBase): void {
    const detectionMap = {
      [ScanType.Secret]: () => this._secretScanDetections.push(detection as SecretDetection),
      [ScanType.Sca]: () => this._scaScanDetections.push(detection as ScaDetection),
      [ScanType.Iac]: () => this._iacScanDetections.push(detection as IacDetection),
      [ScanType.Sast]: () => this._sastScanDetections.push(detection as SastDetection),
    };

    const saveDetectionFunc = detectionMap[scanType];
    if (saveDetectionFunc) {
      saveDetectionFunc();
    }

    const uniqueDetectionKey = calculateUniqueDetectionId(detection);
    this._uniqueDetectionIdMap[uniqueDetectionKey] = detection;
  }

  public dropAllScanResults(): void {
    /*
     * free memory, clean state
     * typically called on launch to drop all previous scan results
     */
    this._uniqueDetectionIdMap = {};

    for (const scanType of Object.values(ScanType)) {
      this.clearDetections(scanType);
    }
  }
}
