import * as vscode from 'vscode';
import { VscodeCommands } from './index';
import { CliScanType } from '../cli/models/cli-scan-type';
import { DetectionBase } from '../cli/models/scan-result/detection-base';

export default async (scanType: CliScanType, detection: DetectionBase) => {
  await vscode.commands.executeCommand(VscodeCommands.OpenViolationInFile, detection);
  await vscode.commands.executeCommand(VscodeCommands.OpenViolationPanel, scanType, detection);
};
