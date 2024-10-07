import * as vscode from 'vscode';
import {AnyDetection, IacDetection, SastDetection, ScaDetection, SecretDetection} from '../../types/detection';
import {createDiagnostics as createDiagnosticsSecret} from './SecretDiagnostics';
import {createDiagnostics as createDiagnosticsSca} from './ScaDiagnostics';
import {createDiagnostics as createDiagnosticsIac} from './IacDiagnostics';
import {createDiagnostics as createDiagnosticsSast} from './SastDiagnostics';
import {ScanType} from '../../constants';
import {FileDiagnostics} from './types';
import {validateTextRangeInOpenDoc} from '../../utils/range';
import {container} from 'tsyringe';
import {IScanResultsService} from '../ScanResultsService';
import {ScanResultsServiceSymbol} from '../../symbols';

const createDiagnostics = async (
    scanType: ScanType, detections: AnyDetection[]
): Promise<FileDiagnostics> => {
  switch (scanType) {
    case ScanType.Secrets:
      return await createDiagnosticsSecret(detections as SecretDetection[]);
    case ScanType.Sca:
      return await createDiagnosticsSca(detections as ScaDetection[]);
    case ScanType.Iac:
      return await createDiagnosticsIac(detections as IacDetection[]);
    case ScanType.Sast:
      return await createDiagnosticsSast(detections as SastDetection[]);
    default:
      throw new Error('Unsupported scan type');
  }
};

const setDiagnostics = (
    diagnostics: FileDiagnostics, diagnosticCollection: vscode.DiagnosticCollection
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
    scanType: ScanType, detections: AnyDetection[], diagnosticCollection: vscode.DiagnosticCollection
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
