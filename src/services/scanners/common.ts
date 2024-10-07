import * as vscode from 'vscode';
import {AnyDetection} from '../../types/detection';
import {TreeView} from '../../providers/tree-view/types';
import {updateDetectionState} from '../common';
import {ScanType} from '../../constants';
import {refreshDiagnosticCollectionData} from '../diagnostics/common';
import {getWorkspaceState, updateWorkspaceState} from '../../utils/context';
import {VscodeStates} from '../../utils/states';
import TrayNotifications from '../../utils/TrayNotifications';
import {refreshTreeViewData} from '../../providers/tree-view/utils';
import {container} from 'tsyringe';
import {IScanResultsService} from '../ScanResultsService';
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

  if (detections.length && !getWorkspaceState(VscodeStates.NotificationIsOpen)) {
    updateWorkspaceState(VscodeStates.NotificationIsOpen, true);
    TrayNotifications.showProblemsDetection(detections.length, scanType);
  }
};
