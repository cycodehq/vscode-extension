import * as path from 'path';
import * as vscode from 'vscode';
import {IacDetection} from '../../types/detection';
import {extensionId} from '../../utils/texts';
import {DiagnosticCode} from '../common';
import {ScanType} from '../../constants';
import {calculateUniqueDetectionId} from '../scan-results-service';
import {FileDiagnostics} from './types';

export const createDiagnostics = async (
    detections: IacDetection[],
): Promise<FileDiagnostics> => {
  const result: FileDiagnostics = {};

  for (const detection of detections) {
    const {detection_details} = detection;

    const documentPath = detection_details.file_name;
    const documentUri = vscode.Uri.file(documentPath);
    const document = await vscode.workspace.openTextDocument(documentUri);

    let message = `Severity: ${detection.severity}\n`;
    message += `Rule: ${detection.message}\n`;

    message += `IaC Provider: ${detection_details.infra_provider}\n`;

    const fileName = path.basename(detection_details.file_name);
    message += `In file: ${fileName}\n`;

    const diagnostic = new vscode.Diagnostic(
        document.lineAt(detection_details.line_in_file - 1).range,
        message,
        vscode.DiagnosticSeverity.Error
    );

    diagnostic.source = extensionId;
    diagnostic.code = new DiagnosticCode(ScanType.Iac, calculateUniqueDetectionId(detection)).toString();

    result[documentPath] = result[documentPath] || [];
    result[documentPath].push(diagnostic);
  }

  return result;
};
