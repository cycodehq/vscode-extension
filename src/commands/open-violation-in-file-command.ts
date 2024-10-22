import * as vscode from 'vscode';
import { DetectionBase } from '../cli/models/scan-result/detection-base';
import { SecretDetection } from '../cli/models/scan-result/secret/secret-detection';
import { ScaDetection } from '../cli/models/scan-result/sca/sca-detection';
import { IacDetection } from '../cli/models/scan-result/iac/iac-detection';
import { SastDetection } from '../cli/models/scan-result/sast/sast-detection';

const VSCODE_LINE_NUMBER_DIFF = 1; // CLI starts counting from 0, although vscode starts from line 1.

export default async (detection: DetectionBase) => {
  let vscodeLineNumber = 0;
  if (detection instanceof SecretDetection) {
    // secret detection line is 0-based
    vscodeLineNumber = detection.detectionDetails.line + 1;
  } else if (detection instanceof ScaDetection) {
    vscodeLineNumber = detection.detectionDetails.lineInFile;
  } else if (detection instanceof IacDetection) {
    vscodeLineNumber = detection.detectionDetails.lineInFile;
  } else if (detection instanceof SastDetection) {
    vscodeLineNumber = detection.detectionDetails.lineInFile;
  }

  vscodeLineNumber -= VSCODE_LINE_NUMBER_DIFF;

  const uri = vscode.Uri.file(detection.detectionDetails.getFilepath());
  await vscode.window.showTextDocument(uri, {
    viewColumn: vscode.ViewColumn.One,
    selection: new vscode.Range(vscodeLineNumber, 0, vscodeLineNumber, 0),
  });
};
