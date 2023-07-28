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
import { refreshHardcodedSecretsTreeViewData } from "../providers/tree-data-providers/utils";
import { HardcodedSecretsTree } from "../providers/tree-data-providers/types";

// Entry
export async function scan(
  context: vscode.ExtensionContext,
  params: {
    workspaceFolderPath: string;
    diagnosticCollection: vscode.DiagnosticCollection;
    config: IConfig;
  },
  hardcodedSecretsTree?: HardcodedSecretsTree,
  extFilePath?: string
) {
  try {
    if (getWorkspaceState("scan.isScanning")) {
      return;
    }

    const document = vscode.window.activeTextEditor?.document;

    if (!document) {
      return;
    }

    extensionOutput.info(StatusBarTexts.ScanWait);
    statusBar.showScanningInProgress();

    let filePath = extFilePath || document?.fileName || "";

    extensionOutput.info("Initiating scan for file: " + filePath);
    updateWorkspaceState("scan.isScanning", true);

    // Run scan through CLI
    let cliParams = {
      path: filePath,
      workspaceFolderPath: params.workspaceFolderPath,
      config: params.config,
    };
    const { result, error, exitCode } = await cliWrapper.runScan(cliParams);

    updateWorkspaceState("scan.isScanning", false);

    if (validateCliCommonErrors(error, exitCode)) {
      return;
    }

    // Check if an error occurred
    if (error && !result.detections?.length) {
      throw new Error(error);
    }

    extensionOutput.info(
      "Scan complete: " + JSON.stringify({ result, error }, null, 3)
    );

    // Show in problems tab
    handleScanDetections(
      result,
      filePath,
      params.diagnosticCollection,
      document,
      hardcodedSecretsTree
    );

    statusBar.showScanComplete();
  } catch (error) {
    extensionOutput.error("Error while creating scan: " + error);
    statusBar.showScanError();
    updateWorkspaceState("scan.isScanning", false);

    vscode.window.showErrorMessage(TrayNotificationTexts.ScanError);
  }
}

export const detectionsToDiagnostings = (
  detections: Detection[],
  document: vscode.TextDocument
): vscode.Diagnostic[] => {
  return detections
    ?.map((detection) => {
      const startPosition = document?.positionAt(
        detection.detection_details.start_position
      );

      const endPosition = document?.positionAt(
        detection.detection_details.start_position +
          detection.detection_details.length
      );

      if (!startPosition || !endPosition) {
        return;
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

      return diagnostic;
    })
    .filter((diagnostic) => diagnostic !== undefined) as vscode.Diagnostic[];
};

const handleScanDetections = (
  result: { detections?: Detection[] },
  filePath: string,
  diagnosticCollection: vscode.DiagnosticCollection,
  document: vscode.TextDocument,
  hardcodedSecretsTree?: HardcodedSecretsTree
) => {
  let diagnostics = [];
  const { detections } = result;
  const hasDetections = detections !== undefined && detections.length > 0;
  setContext("scan.hasDetections", hasDetections);

  if (detections !== undefined) {
    diagnostics = detectionsToDiagnostings(detections, document) || [];
    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.set(uri, diagnostics); // Show in problems tab

    if (!diagnostics.length) {
      return;
    }

    if (detections.length && !getWorkspaceState("cycode.notifOpen")) {
      updateWorkspaceState("cycode.notifOpen", true);
      TrayNotifications.showProblemsDetection(diagnostics.length);
    }

    refreshHardcodedSecretsTreeViewData({
      detections,
      hardcodedSecretsTree,
    });
  }
};
