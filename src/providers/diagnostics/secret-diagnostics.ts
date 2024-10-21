import * as vscode from 'vscode';
import { extensionId } from '../../utils/texts';
import { DiagnosticCode } from '../../utils/diagnostic-code';
import { FileDiagnostics } from './types';
import { SecretDetection } from '../../cli/models/scan-result/secret/secret-detection';
import { CliScanType } from '../../cli/models/cli-scan-type';

interface SecretDetectionIdeData {
  documentPath: string;
  document: vscode.TextDocument;
  range: vscode.Range;
  value: string;
}

const _getSecretDetectionIdeData = async (detection: SecretDetection): Promise<SecretDetectionIdeData> => {
  const documentPath = detection.detectionDetails.getFilepath();
  const documentUri = vscode.Uri.file(documentPath);
  const document = await vscode.workspace.openTextDocument(documentUri);

  const startPosition = document.positionAt(
    detection.detectionDetails.startPosition,
  );
  const endPosition = document.positionAt(
    detection.detectionDetails.startPosition
    + detection.detectionDetails.length,
  );
  const range = new vscode.Range(startPosition, endPosition);

  const value = document.getText(range);

  return {
    documentPath,
    document,
    range,
    value,
  };
};

export const createDiagnostics = async (
  detections: SecretDetection[],
): Promise<FileDiagnostics> => {
  const result: FileDiagnostics = {};

  for (const detection of detections) {
    const ideData = await _getSecretDetectionIdeData(detection);

    // tricky mutation for ignoring by value
    detection.detectionDetails.detectedValue = ideData.value;

    let message = `Severity: ${detection.severity}\n`;
    message += detection.getFormattedTitle();
    message += `In file: ${detection.detectionDetails.fileName}\n`;
    message += `Secret SHA: ${detection.detectionDetails.sha512}`;

    const diagnostic = new vscode.Diagnostic(
      ideData.range,
      message,
      vscode.DiagnosticSeverity.Error,
    );

    diagnostic.source = extensionId;
    diagnostic.code = DiagnosticCode.fromDetection(CliScanType.Secret, detection).toString();

    result[ideData.documentPath] = result[ideData.documentPath] || [];
    result[ideData.documentPath].push(diagnostic);
  }

  return result;
};
