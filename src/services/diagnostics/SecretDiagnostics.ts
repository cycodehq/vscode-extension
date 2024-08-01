import * as vscode from 'vscode';
import {SecretDetection} from '../../types/detection';
import {extensionId} from '../../utils/texts';
import {DiagnosticCode} from '../common';
import {ScanType} from '../../constants';
import {calculateUniqueDetectionId} from '../ScanResultsService';
import {getSecretDetectionIdeData} from '../scanners/SecretScanner';
import {FileDiagnostics} from './types';

export const createDiagnostics = async (
    detections: SecretDetection[],
): Promise<FileDiagnostics> => {
  const result: FileDiagnostics = {};

  for (const detection of detections) {
    const ideData = await getSecretDetectionIdeData(detection);

    let message = `Severity: ${detection.severity}\n`;
    message += `${detection.type}: ${detection.message.replace(
        'within \'\' repository',
        ''
    )}\n`;
    message += `In file: ${detection.detection_details.file_name}\n`;
    message += `Secret SHA: ${detection.detection_details.sha512}`;

    const diagnostic = new vscode.Diagnostic(
        ideData.range,
        message,
        vscode.DiagnosticSeverity.Error
    );

    diagnostic.source = extensionId;
    diagnostic.code = new DiagnosticCode(ScanType.Secrets, calculateUniqueDetectionId(detection)).toString();

    result[ideData.documentPath] = result[ideData.documentPath] || [];
    result[ideData.documentPath].push(diagnostic);
  }

  return result;
};
