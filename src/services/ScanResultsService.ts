import * as crypto from 'crypto';
import {getWorkspaceState, updateWorkspaceState} from '../utils/context';
import {AnyDetection} from '../types/detection';

const _STORAGE_KEY_PREFIX = 'CS:';

export const calculateUniqueDetectionId = (detection: AnyDetection): string => {
  const hash = crypto.createHash('sha256');

  const detectionJson = JSON.stringify(detection);
  hash.update(detectionJson);

  const hexHash = hash.digest('hex');
  const shortHashLength = Math.ceil(hexHash.length / 4); // 2 ** 64 combinations
  return hexHash.slice(0, shortHashLength);
};

class ScanResultsService {
  public getDetectionById(detectionId: string): AnyDetection | undefined {
    const value = getWorkspaceState(detectionId);
    if (!value) {
      return undefined;
    }

    return getWorkspaceState(detectionId) as AnyDetection;
  }

  public getDetections(scanType: string): AnyDetection[] {
    const scanTypeKey = `${_STORAGE_KEY_PREFIX}${scanType}`;
    return getWorkspaceState(scanTypeKey) as AnyDetection[] || [];
  }

  public saveDetections(scanType: string, detections: AnyDetection[]): void {
    detections.forEach((detection) => {
      this.saveDetection(scanType, detection);
    });
  }

  public saveDetection(scanType: string, detection: AnyDetection): void {
    const scanTypeKey = `${_STORAGE_KEY_PREFIX}${scanType}`;

    const detections = getWorkspaceState(scanTypeKey) as AnyDetection[] || [];
    detections.push(detection);

    updateWorkspaceState(scanTypeKey, detections);

    const uniqueDetectionKey = calculateUniqueDetectionId(detection);
    updateWorkspaceState(uniqueDetectionKey, detection);
  }
}

export const scanResultsService = new ScanResultsService();
