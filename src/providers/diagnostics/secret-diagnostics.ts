import * as vscode from 'vscode';
import { extensionId } from '../../utils/texts';
import { DiagnosticCode } from '../../services/common';
import { ScanType } from '../../constants';
import { calculateUniqueDetectionId } from '../../services/scan-results-service';
import { FileDiagnostics } from './types';
import { SecretDetection } from '../../cli/models/scan-result/secret/secret-detection';

interface SecretDetectionIdeData {
  documentPath: string;
  document: vscode.TextDocument;
  range: vscode.Range;
  value: string;
}

export const getSecretDetectionIdeData = async (detection: SecretDetection): Promise<SecretDetectionIdeData> => {
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
    const ideData = await getSecretDetectionIdeData(detection);

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
    diagnostic.code = new DiagnosticCode(ScanType.Secret, calculateUniqueDetectionId(detection)).toString();

    result[ideData.documentPath] = result[ideData.documentPath] || [];
    result[ideData.documentPath].push(diagnostic);
  }

  return result;
};
