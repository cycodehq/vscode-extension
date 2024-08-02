import * as path from 'path';
import * as vscode from 'vscode';
import {ScaDetection} from '../../types/detection';
import {getPackageFileForLockFile, isSupportedLockFile, ScanType} from '../../constants';
import {extensionId} from '../../utils/texts';
import {DiagnosticCode} from '../common';
import {calculateUniqueDetectionId} from '../ScanResultsService';
import {FileDiagnostics} from './types';

export const createDiagnostics = async (
    detections: ScaDetection[]
): Promise<FileDiagnostics> => {
  const result: FileDiagnostics = {};

  for (const detection of detections) {
    const {detection_details} = detection;
    const file_name = detection_details.file_name;
    const uri = vscode.Uri.file(file_name);
    const document = await vscode.workspace.openTextDocument(uri);

    let message = `Severity: ${detection.severity}\n`;
    message += `${detection.message}\n`;
    if (detection_details.alert?.first_patched_version) {
      message += `First patched version: ${detection_details.alert?.first_patched_version}\n`;
    }

    if (isSupportedLockFile(file_name)) {
      const packageFileName = getPackageFileForLockFile(path.basename(file_name));
      message += `\n\nAvoid manual packages upgrades in lock files. 
      Update the ${packageFileName} file and re-generate the lock file.`;
    }

    const diagnostic = new vscode.Diagnostic(
        // BE of SCA counts lines from 1, while VSCode counts from 0
        document.lineAt(detection_details.line_in_file - 1).range,
        message,
        vscode.DiagnosticSeverity.Error
    );

    diagnostic.source = extensionId;
    diagnostic.code = new DiagnosticCode(ScanType.Sca, calculateUniqueDetectionId(detection)).toString();

    result[file_name] = result[file_name] || [];
    result[file_name].push(diagnostic);
  }

  return result;
};
