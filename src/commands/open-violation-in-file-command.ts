import * as vscode from 'vscode';
import { DetectionBase } from '../cli/models/scan-result/detection-base';

const VSCODE_LINE_NUMBER_DIFF = 1; // CLI starts counting from 0, although vscode starts from line 1.

export default async (detection: DetectionBase) => {
  const vscodeLineNumber = detection.detectionDetails.getLineInFile() - VSCODE_LINE_NUMBER_DIFF;

  const uri = vscode.Uri.file(detection.detectionDetails.getFilepath());
  await vscode.window.showTextDocument(uri, {
    viewColumn: vscode.ViewColumn.One,
    selection: new vscode.Range(vscodeLineNumber, 0, vscodeLineNumber, 0),
  });
};
