import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import {
  StatusBarTexts,
  TrayNotificationTexts,
  extensionId,
} from "../utils/texts";
import { validateCliCommonErrors } from "./common";
import {
  getWorkspaceState,
  setContext,
  updateWorkspaceState,
} from "../utils/context";
import { Detection } from "../types/detection";
import { IConfig } from "../cli-wrapper/types";
import TrayNotifications from "../utils/TrayNotifications";
import { refreshTreeViewData } from "../providers/tree-view/utils";
import { TreeView } from "../providers/tree-view/types";
import { ScanType } from '../constants';
import { VscodeStates } from '../utils/states';

// Entry
export async function secretScan(
  context: vscode.ExtensionContext,
  params: {
    documentToScan: vscode.TextDocument;
    workspaceFolderPath?: string;
    diagnosticCollection: vscode.DiagnosticCollection;
    config: IConfig;
  },
  treeView?: TreeView,
) {
  try {
    if (getWorkspaceState(VscodeStates.SecretsScanInProgress)) {
      return;
    }

    // TODO (MarshalX): support folder support
    if (!params.documentToScan) {
      return;
    }

    extensionOutput.info(StatusBarTexts.ScanWait);
    statusBar.showScanningInProgress();

    const filePath = params.documentToScan.fileName;

    extensionOutput.info("Initiating scan for file: " + filePath);
    updateWorkspaceState(VscodeStates.SecretsScanInProgress, true);

    // Run scan through CLI
    let cliParams = {
      path: filePath,
      workspaceFolderPath: params.workspaceFolderPath,
      config: params.config,
    };
    const { result, error, exitCode } = await cliWrapper.runScan(cliParams);

    updateWorkspaceState(VscodeStates.SecretsScanInProgress, false);

    if (validateCliCommonErrors(error, exitCode)) {
      return;
    }

    // Check if an error occurred
    if (error && !result.detections?.length) {
      throw new Error(error);
    }

    if (result.error) {
      throw new Error(result.message);
    }

    extensionOutput.info(
      "Scan complete: " + JSON.stringify({ result, error }, null, 3)
    );

    // Show in "problems" tab
    handleScanDetections(
      result,
      filePath,
      params.diagnosticCollection,
      params.documentToScan,
      treeView
    );

    statusBar.showScanComplete();
  } catch (error: any) {
    extensionOutput.error("Error while creating scan: " + error);
    statusBar.showScanError();
    updateWorkspaceState(VscodeStates.SecretsScanInProgress, false);

    let notificationText: string = TrayNotificationTexts.ScanError;
    if (error.message !== undefined) {
      notificationText = `${TrayNotificationTexts.ScanError}. ${error.message}`;
    }

    vscode.window.showErrorMessage(notificationText);
  }
}

export const detectionsToDiagnostics = (
  detections: Detection[],
  document: vscode.TextDocument
): vscode.Diagnostic[] => {
  const diagnotics: vscode.Diagnostic[] = [];

  for (const detection of detections) {
    const startPosition = document?.positionAt(
      detection.detection_details.start_position
    );

    const endPosition = document?.positionAt(
      detection.detection_details.start_position +
      detection.detection_details.length
    );

    if (!startPosition || !endPosition) {
      continue;
    }

    let message = `Severity: ${detection.severity}\n`;
    message += `${detection.type}: ${detection.message.replace(
      "within '' repository",
      ""
    )}\n`;
    message += `Rule ID: ${detection.detection_rule_id}\n`;
    message += `In file: ${detection.detection_details.file_name}\n`;
    message += `Secret SHA: ${detection.detection_details.sha512}`;

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(startPosition, endPosition),
      message,
      vscode.DiagnosticSeverity.Error
    );

    diagnostic.source = extensionId;
    diagnostic.code = detection.detection_rule_id;

    diagnotics.push(diagnostic);
  }

  return diagnotics;
};

const handleScanDetections = (
  result: { detections?: Detection[] },
  filePath: string,
  diagnosticCollection: vscode.DiagnosticCollection,
  document: vscode.TextDocument,
  treeView?: TreeView
) => {
  const { detections } = result;

  if (detections === undefined) {
    return;
  }

  const hasDetections = detections.length > 0;
  setContext(VscodeStates.HasDetections, hasDetections);
  setContext(VscodeStates.TreeViewIsOpen, hasDetections);

  const diagnostics = detectionsToDiagnostics(detections, document) || [];
  const uri = vscode.Uri.file(filePath);
  diagnosticCollection.set(uri, diagnostics); // Show in "problems" tab

  if (!diagnostics.length) {
    return;
  }

  if (detections.length && !getWorkspaceState(VscodeStates.NotificationIsOpen)) {
    updateWorkspaceState(VscodeStates.NotificationIsOpen, true);
    TrayNotifications.showProblemsDetection(diagnostics.length, ScanType.Secrets);
  }

  refreshTreeViewData({
    detections,
    treeView: treeView,
    scanType: ScanType.Secrets
  });
};
