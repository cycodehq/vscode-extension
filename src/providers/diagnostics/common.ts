import * as vscode from 'vscode';
import { createDiagnostics as createDiagnosticsSecret } from './secret-diagnostics';
import { createDiagnostics as createDiagnosticsSca } from './sca-diagnostics';
import { createDiagnostics as createDiagnosticsIac } from './iac-diagnostics';
import { createDiagnostics as createDiagnosticsSast } from './sast-diagnostics';
import { ScanType } from '../../constants';
import { FileDiagnostics } from './types';
import { validateTextRangeInOpenDoc } from '../../utils/range';
import { container } from 'tsyringe';
import { IScanResultsService } from '../../services/scan-results-service';
import { ScanResultsServiceSymbol } from '../../symbols';
import { SecretDetection } from '../../cli/models/scan-result/secret/secret-detection';
import { DetectionBase } from '../../cli/models/scan-result/detection-base';
import { ScaDetection } from '../../cli/models/scan-result/sca/sca-detection';
import { IacDetection } from '../../cli/models/scan-result/iac/iac-detection';
import { SastDetection } from '../../cli/models/scan-result/sast/sast-detection';

const createDiagnostics = async (
  scanType: ScanType, detections: DetectionBase[],
): Promise<FileDiagnostics> => {
  const diagnosticFunctions = {
    [ScanType.Secret]: (detections: DetectionBase[]) => createDiagnosticsSecret(detections as SecretDetection[]),
    [ScanType.Sca]: (detections: DetectionBase[]) => createDiagnosticsSca(detections as ScaDetection[]),
    [ScanType.Iac]: (detections: DetectionBase[]) => createDiagnosticsIac(detections as IacDetection[]),
    [ScanType.Sast]: (detections: DetectionBase[]) => createDiagnosticsSast(detections as SastDetection[]),
  };

  const createDiagnosticsFunction = diagnosticFunctions[scanType];
  if (!createDiagnosticsFunction) {
    throw new Error('Unsupported scan type');
  }

  return await createDiagnosticsFunction(detections);
};

const setDiagnostics = (
  diagnostics: FileDiagnostics, diagnosticCollection: vscode.DiagnosticCollection,
) => {
  for (const [filePath, fileDiagnostics] of Object.entries(diagnostics)) {
    const uri = vscode.Uri.file(filePath);

    const validFileDiagnostics = fileDiagnostics.filter((diagnostic) => {
      return validateTextRangeInOpenDoc(uri, diagnostic.range);
    });

    diagnosticCollection.set(uri, validFileDiagnostics);
  }
};

const updateDiagnosticCollection = async (
  scanType: ScanType, detections: DetectionBase[], diagnosticCollection: vscode.DiagnosticCollection,
) => {
  const diagnostics = await createDiagnostics(scanType, detections);
  setDiagnostics(diagnostics, diagnosticCollection);
};

export const refreshDiagnosticCollectionData = async (diagnosticCollection: vscode.DiagnosticCollection) => {
  diagnosticCollection.clear();

  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  for (const scanType of Object.values(ScanType)) {
    const detections = scanResultsService.getDetections(scanType);
    await updateDiagnosticCollection(scanType, detections, diagnosticCollection);
  }
};
