import * as path from 'path';
import * as vscode from 'vscode';
import { extensionId } from '../../utils/texts';
import { DiagnosticCode } from '../../utils/diagnostic-code';
import { FileDiagnostics } from './types';
import { IacDetection } from '../../cli/models/scan-result/iac/iac-detection';
import { CliScanType } from '../../cli/models/cli-scan-type';

export const createDiagnostics = async (
  detections: IacDetection[],
): Promise<FileDiagnostics> => {
  const result: FileDiagnostics = {};

  for (const detection of detections) {
    const { detectionDetails } = detection;

    const documentPath = detectionDetails.fileName;
    const documentUri = vscode.Uri.file(documentPath);
    const document = await vscode.workspace.openTextDocument(documentUri);

    let message = `Severity: ${detection.severity}\n`;
    message += `Rule: ${detection.getFormattedMessage()}\n`;

    message += `IaC Provider: ${detectionDetails.infraProvider}\n`;

    const fileName = path.basename(detectionDetails.fileName);
    message += `In file: ${fileName}\n`;

    const diagnostic = new vscode.Diagnostic(
      document.lineAt(detectionDetails.getLineInFile() - 1).range,
      message,
      vscode.DiagnosticSeverity.Error,
    );

    diagnostic.source = extensionId;
    diagnostic.code = DiagnosticCode.fromDetection(CliScanType.Iac, detection).toString();

    result[documentPath] = result[documentPath] || [];
    result[documentPath].push(diagnostic);
  }

  return result;
};
