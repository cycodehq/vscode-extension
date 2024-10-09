import * as vscode from 'vscode';
import {AnyDetection} from '../../types/detection';
import {TreeView} from '../../providers/tree-data/types';
import {updateDetectionState} from '../common';
import {ScanType} from '../../constants';
import {refreshDiagnosticCollectionData} from '../diagnostics/common';
import TrayNotifications from '../../utils/tray-notifications';
import {refreshTreeViewData} from '../../providers/tree-data/utils';
import {container} from 'tsyringe';
import {IScanResultsService} from '../scan-results-service';
import {ScanResultsServiceSymbol} from '../../symbols';

type ScanResult = { detections?: AnyDetection[] };

export const handleScanResult = async (
    scanType: ScanType,
    result: ScanResult,
    diagnosticCollection: vscode.DiagnosticCollection,
    treeView: TreeView
) => {
  let {detections} = result;
  if (!detections) {
    detections = [];
  }

  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  scanResultsService.setDetections(scanType, detections);

  updateDetectionState(scanType);
  await refreshDiagnosticCollectionData(diagnosticCollection);
  refreshTreeViewData(scanType, treeView);

  if (detections.length) {
    TrayNotifications.showProblemsDetection(detections.length, scanType);
  }
};
