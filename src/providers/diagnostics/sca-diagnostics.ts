import * as path from 'path';
import * as vscode from 'vscode';
import { getPackageFileForLockFile, isSupportedLockFile } from '../../constants';
import { extensionId } from '../../utils/texts';
import { DiagnosticCode } from '../../utils/diagnostic-code';
import { FileDiagnostics } from './types';
import { ScaDetection } from '../../cli/models/scan-result/sca/sca-detection';
import { CliScanType } from '../../cli/models/cli-scan-type';

export const createDiagnostics = async (
  detections: ScaDetection[],
): Promise<FileDiagnostics> => {
  const result: FileDiagnostics = {};

  for (const detection of detections) {
    const { detectionDetails } = detection;
    const fileName = detectionDetails.fileName;
    const uri = vscode.Uri.file(fileName);
    const document = await vscode.workspace.openTextDocument(uri);

    let message = `Severity: ${detection.severity}\n`;
    message += `${detection.getFormattedMessage()}\n`;
    if (detectionDetails.alert?.firstPatchedVersion) {
      message += `First patched version: ${detectionDetails.alert.firstPatchedVersion}\n`;
    }

    if (isSupportedLockFile(fileName)) {
      const packageFileName = getPackageFileForLockFile(path.basename(fileName));
      message += `\n\nAvoid manual packages upgrades in lock files. 
      Update the ${packageFileName} file and re-generate the lock file.`;
    }

    const diagnostic = new vscode.Diagnostic(
      // BE of SCA counts lines from 1, while VSCode counts from 0
      document.lineAt(detectionDetails.lineInFile - 1).range,
      message,
      vscode.DiagnosticSeverity.Error,
    );

    diagnostic.source = extensionId;
    diagnostic.code = DiagnosticCode.fromDetection(CliScanType.Sca, detection).toString();

    result[fileName] = result[fileName] || [];
    result[fileName].push(diagnostic);
  }

  return result;
};
