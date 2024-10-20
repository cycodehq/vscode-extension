import * as vscode from 'vscode';
import { extensionId } from '../../utils/texts';
import { DiagnosticCode } from '../../utils/diagnostic-code';
import { FileDiagnostics } from './types';
import { SastDetection } from '../../cli/models/scan-result/sast/sast-detection';
import { CliScanType } from '../../cli/models/cli-scan-type';

export const createDiagnostics = async (
  detections: SastDetection[],
): Promise<FileDiagnostics> => {
  const result: FileDiagnostics = {};

  for (const detection of detections) {
    const { detectionDetails } = detection;

    const documentPath = detectionDetails.filePath;
    const documentUri = vscode.Uri.file(documentPath);
    const document = await vscode.workspace.openTextDocument(documentUri);

    let message = `Severity: ${detection.severity}\n`;
    message += `Rule: ${detection.detectionDetails.policyDisplayName}\n`;
    message += `In file: ${detection.detectionDetails.fileName}\n`;

    const diagnostic = new vscode.Diagnostic(
      document.lineAt(detectionDetails.lineInFile - 1).range,
      message,
      vscode.DiagnosticSeverity.Error,
    );

    diagnostic.source = extensionId;
    diagnostic.code = DiagnosticCode.fromDetection(CliScanType.Sast, detection).toString();

    result[documentPath] = result[documentPath] || [];
    result[documentPath].push(diagnostic);
  }

  return result;
};
