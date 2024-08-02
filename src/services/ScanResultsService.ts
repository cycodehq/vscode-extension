import * as crypto from 'crypto';
import {getWorkspaceState, updateWorkspaceState} from '../utils/context';
import {AnyDetection} from '../types/detection';
import {ScanType} from '../constants';

const _STORAGE_KEY_PREFIX = 'CS:';

const getScanTypeKey = (scanType: ScanType): string => {
  return `${_STORAGE_KEY_PREFIX}${scanType}`;
};

const getDetectionsKey = (): string => {
  return `${_STORAGE_KEY_PREFIX}DETECTIONS`;
};

export const calculateUniqueDetectionId = (detection: AnyDetection): string => {
  const hash = crypto.createHash('sha256');

  const detectionJson = JSON.stringify(detection);
  hash.update(detectionJson);

  const hexHash = hash.digest('hex');
  const shortHashLength = Math.ceil(hexHash.length / 4); // 2 ** 64 combinations
  return hexHash.slice(0, shortHashLength);
};

interface ScanResult {
  scanType: ScanType;
  detection: AnyDetection;
}

type LocalStorage = Record<string, ScanResult>;

const _slowDeepClone = (obj: any): any => {
  // TODO(MarshalX): move to faster approauch if the performance is critical
  return JSON.parse(JSON.stringify(obj));
};

class ScanResultsService {
  // We are returning cloned objects to prevent mutations in the storage.
  // The mutations of detections itself happen, for example, for enriching detections for rendering violation card.
  // But not mutated detections are used to create diagnostics, tree view, etc.

  public getDetectionById(detectionId: string): ScanResult | undefined {
    const detections = getWorkspaceState(getDetectionsKey()) as LocalStorage;
    return _slowDeepClone(detections[detectionId]) as ScanResult | undefined;
  }

  public getDetections(scanType: ScanType): AnyDetection[] {
    const scanTypeKey = getScanTypeKey(scanType);
    const detections = getWorkspaceState(scanTypeKey) as AnyDetection[] || [];
    return _slowDeepClone(detections);
  }

  public clearDetections(scanType: ScanType): void {
    updateWorkspaceState(getScanTypeKey(scanType), []);
  }

  public saveDetections(scanType: ScanType, detections: AnyDetection[]): void {
    detections.forEach((detection) => {
      this.saveDetection(scanType, detection);
    });
  }

  public setDetections(scanType: ScanType, detections: AnyDetection[]): void {
    // TODO(MarshalX): smart merge with existing detections will be cool someday
    this.clearDetections(scanType);
    this.saveDetections(scanType, detections);
  }

  public saveDetection(scanType: ScanType, detection: AnyDetection): void {
    const scanTypeDetections = this.getDetections(scanType);
    scanTypeDetections.push(detection);
    updateWorkspaceState(getScanTypeKey(scanType), scanTypeDetections);

    const detectionsKey = getDetectionsKey();
    const detections = getWorkspaceState(detectionsKey) as LocalStorage;

    const uniqueDetectionKey = calculateUniqueDetectionId(detection);
    detections[uniqueDetectionKey] = {scanType, detection};

    updateWorkspaceState(detectionsKey, detections);
  }

  public dropAllScanResults(): void {
    // free memory, clean state
    // typically called on launch to drop all previous scan results
    const detectionsKey = getDetectionsKey();
    updateWorkspaceState(detectionsKey, {});

    for (const scanType of Object.values(ScanType)) {
      this.clearDetections(scanType);
    }
  }
}

export const scanResultsService = new ScanResultsService();
