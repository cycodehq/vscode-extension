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

class ScanResultsService {
  public getDetectionById(detectionId: string): ScanResult | undefined {
    const detections = getWorkspaceState(getDetectionsKey()) as LocalStorage;
    return detections[detectionId] as ScanResult | undefined;
  }

  public getDetections(scanType: ScanType): AnyDetection[] {
    const scanTypeKey = getScanTypeKey(scanType);
    return getWorkspaceState(scanTypeKey) as AnyDetection[] || [];
  }

  public saveDetections(scanType: ScanType, detections: AnyDetection[]): void {
    detections.forEach((detection) => {
      this.saveDetection(scanType, detection);
    });
  }

  public saveDetection(scanType: ScanType, detection: AnyDetection): void {
    const scanTypeKey = getScanTypeKey(scanType);

    const scanTypeDetections = getWorkspaceState(scanTypeKey) as AnyDetection[] || [];
    scanTypeDetections.push(detection);
    updateWorkspaceState(scanTypeKey, scanTypeDetections);

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
      updateWorkspaceState(getScanTypeKey(scanType), []);
    }
  }
}

export const scanResultsService = new ScanResultsService();
